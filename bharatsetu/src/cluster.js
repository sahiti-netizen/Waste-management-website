'use strict';

/**
 * Boot the entire demo federation in one process:
 *   - a federation CA + Central Server,
 *   - one Security Server per member (each on its own port, talking real HTTP),
 *   - services registered, access grants applied, global config distributed.
 *
 * The Security Servers still communicate strictly peer-to-peer over HTTP, so
 * this is a faithful small-scale model of the real distributed deployment.
 */

const ids = require('./shared/identifiers');
const { CertificateAuthority, generateKeyPair } = require('./shared/crypto');
const { CentralServer } = require('./central/central-server');
const { SecurityServer } = require('./security-server/security-server');
const { MEMBERS, SERVICES, GRANTS, addr } = require('./members/federation');

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function bootFederation({ centralPort = 7000, log = () => {} } = {}) {
  const centralUrl = `http://127.0.0.1:${centralPort}`;

  // 1. Federation trust roots.
  const ca = new CertificateAuthority({ name: 'Bharat Setu Root CA' });
  const centralSigningKey = generateKeyPair();
  const central = new CentralServer({ ca, signingKeyPair: centralSigningKey });

  // 2. Work out which subsystems each member needs (providers + consumers).
  const subsystemsByMember = new Map();
  const note = (memberClass, memberCode, subsystem) => {
    const key = ids.toString(ids.memberId(memberClass, memberCode));
    if (!subsystemsByMember.has(key)) subsystemsByMember.set(key, new Set());
    subsystemsByMember.get(key).add(subsystem);
  };
  for (const s of SERVICES) note(s.provider.memberClass, s.provider.memberCode, s.provider.subsystem);
  for (const g of GRANTS) note(g.consumer.memberClass, g.consumer.memberCode, g.consumer.subsystem);

  // 3. Register members + subsystems in the Central Server registry.
  for (const m of MEMBERS) {
    central.registerMember({
      memberClass: m.memberClass,
      memberCode: m.memberCode,
      name: m.name,
      sector: m.sector,
    });
    const key = ids.toString(ids.memberId(m.memberClass, m.memberCode));
    for (const sub of subsystemsByMember.get(key) || []) {
      central.addSubsystem(m.memberClass, m.memberCode, sub);
    }
  }

  // 4. Create a Security Server per member, issue its certificate, register it.
  const servers = new Map(); // memberKey -> { ss, httpServer, member }
  const trustAnchor = central.trustAnchor();
  for (const m of MEMBERS) {
    const owner = ids.memberId(m.memberClass, m.memberCode);
    const address = addr(m.port);
    const keyPair = generateKeyPair();
    const cert = ca.issue({
      subject: address,
      subjectPublicKey: keyPair.publicKey,
      role: 'security-server',
    });
    const ss = new SecurityServer({
      owner,
      address,
      keyPair,
      cert,
      trustAnchor,
      centralUrl,
      name: m.name,
    });
    const key = ids.toString(owner);
    for (const sub of subsystemsByMember.get(key) || []) ss.registerSubsystem(sub);

    central.registerSecurityServer({
      memberClass: m.memberClass,
      memberCode: m.memberCode,
      address,
      cert,
    });
    servers.set(key, { ss, member: m, httpServer: null });
  }

  // 5. Register services (central catalog + local adapters) and grants.
  for (const s of SERVICES) {
    const key = ids.toString(ids.ownerOf(s.service));
    const node = servers.get(key);
    node.ss.addService(s.service, s.handler(node.ss), {
      title: s.title,
      description: s.description,
    });
    central.registerService({
      provider: s.provider,
      service: s.service,
      title: s.title,
      description: s.description,
    });
  }
  for (const g of GRANTS) {
    const key = ids.toString(ids.ownerOf(g.service));
    servers.get(key).ss.grantAccess(g.service, g.consumer);
  }

  // 6. Start every HTTP server (central first so /globalconf is reachable).
  const centralHttp = await listen(central.createHttpServer(), centralPort);
  log(`Central Server         ${centralUrl}`);
  for (const [, node] of servers) {
    node.httpServer = await listen(node.ss.createHttpServer(), node.member.port);
    log(`Security Server        ${node.ss.address}  (${node.member.name})`);
  }

  // 7. Push signed global configuration to every Security Server.
  for (const [, node] of servers) await node.ss.refreshGlobalConf();

  const stop = async () => {
    const all = [centralHttp, ...[...servers.values()].map((n) => n.httpServer)];
    await Promise.all(all.map((s) => new Promise((r) => s.close(r))));
  };

  return { central, centralUrl, servers, stop };
}

module.exports = { bootFederation };
