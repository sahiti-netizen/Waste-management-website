'use strict';

/**
 * Security Server — the node every member government runs at its own edge.
 *
 * It is the ONLY component that touches real data traffic. Two roles:
 *
 *   Provider side  — hosts local subsystems + their service adapters, enforces
 *                    access control, and answers signed requests from peers.
 *   Consumer side  — lets a local information system call a remote service; it
 *                    signs the request, routes it straight to the provider's
 *                    Security Server (peer-to-peer), and verifies the reply.
 *
 * Everything it emits is signed with its CA-issued certificate; everything it
 * accepts is verified against the federation CA it learned from the signed
 * global configuration. Every exchange is written to a tamper-evident log.
 */

const http = require('http');
const ids = require('../shared/identifiers');
const cryptoLib = require('../shared/crypto');
const message = require('../shared/message');
const { MessageLog } = require('../shared/messagelog');
const { postJson, getJson, readBody, sendJson } = require('../shared/http');

class SecurityServer {
  /**
   * @param {object} p
   * @param {object} p.owner        member identifier this SS belongs to
   * @param {string} p.address      base URL other SSs use to reach this one
   * @param {object} p.keyPair      this SS's key pair
   * @param {object} p.cert         this SS's CA-issued certificate
   * @param {object} p.trustAnchor  central server trust anchor
   * @param {string} p.centralUrl   central server base URL
   */
  constructor(p) {
    this.owner = p.owner;
    this.address = p.address;
    this.keyPair = p.keyPair;
    this.cert = p.cert;
    this.trustAnchor = p.trustAnchor;
    this.centralUrl = p.centralUrl;

    this.name = p.name || ids.toString(p.owner);
    this.globalConf = null;

    // service adapters: key "subsystem/service/version" -> { handler, meta }
    this.services = new Map();
    // access grants: key "subsystem/service/version" -> Set of client id strings
    this.grants = new Map();
    // local subsystems this SS is allowed to speak for
    this.subsystems = new Set();

    this.log = new MessageLog({ owner: this.address, keyPair: this.keyPair });
  }

  // ---- Local configuration -------------------------------------------------

  registerSubsystem(subsystem) {
    this.subsystems.add(subsystem);
    return this;
  }

  /**
   * Publish a service hosted by a local subsystem.
   * @param {object} svc  service identifier (must belong to this.owner)
   * @param {(body:any, ctx:object)=>any} handler
   */
  addService(svc, handler, meta = {}) {
    this._assertLocal(svc);
    this.subsystems.add(svc.subsystem);
    const key = this._svcKey(svc);
    this.services.set(key, { svc, handler, meta });
    if (!this.grants.has(key)) this.grants.set(key, new Set());
    return this;
  }

  /** Grant a consumer subsystem access to a local service. */
  grantAccess(svc, clientId) {
    const key = this._svcKey(svc);
    if (!this.grants.has(key)) this.grants.set(key, new Set());
    this.grants.get(key).add(ids.toString(clientId));
    return this;
  }

  isAllowed(svc, clientId) {
    const key = this._svcKey(svc);
    const set = this.grants.get(key);
    return !!set && set.has(ids.toString(clientId));
  }

  // ---- Global configuration ------------------------------------------------

  async refreshGlobalConf() {
    const { body } = await getJson(this.centralUrl + '/globalconf');
    const ok = cryptoLib.verify(this.trustAnchor.configSigningKey, body.conf, body.signature);
    if (!ok) throw new Error('global configuration signature INVALID — refusing to trust it');
    if (body.conf.ca.publicKey !== this.trustAnchor.caPublicKey) {
      throw new Error('global configuration CA does not match trust anchor');
    }
    this.globalConf = body.conf;
    return this.globalConf;
  }

  _findServiceProviderAddress(svc) {
    if (!this.globalConf) throw new Error('no global configuration loaded');
    const ownerKey = ids.toString(ids.ownerOf(svc));
    const member = this.globalConf.members.find((m) => ids.toString(m.id) === ownerKey);
    if (!member || !member.securityServer) {
      throw new Error('no Security Server known for provider ' + ownerKey);
    }
    return member.securityServer;
  }

  _certForServer(address) {
    const s = (this.globalConf.securityServers || []).find((x) => x.address === address);
    return s ? s.cert : null;
  }

  // ---- Consumer side: call a remote service --------------------------------

  async call({ client, service, body, userId, issue }) {
    if (!this.subsystems.has(client.subsystem)) {
      throw new Error(`subsystem ${client.subsystem} is not hosted on this Security Server`);
    }
    if (!this.globalConf) await this.refreshGlobalConf();

    const producerAddress = this._findServiceProviderAddress(service);
    const req = message.buildRequest({
      client,
      service,
      body,
      userId,
      issue,
      consumerSecurityServer: this.address,
      producerSecurityServer: producerAddress,
      privateKey: this.keyPair.privateKey,
      cert: this.cert,
    });

    this.log.append({
      direction: 'request-out',
      queryId: req.header.queryId,
      client,
      service,
      status: 'SENT',
      payloadHash: req.payloadHash,
      meta: { to: producerAddress },
    });

    const { status, body: resp } = await postJson(producerAddress + '/exchange', req);

    if (status !== 200 || !resp || resp.fault) {
      const fault = (resp && resp.fault) || { code: 'HTTP_' + status, message: 'exchange failed' };
      this.log.append({
        direction: 'response-in',
        queryId: req.header.queryId,
        client,
        service,
        status: 'FAULT',
        meta: fault,
      });
      const err = new Error(fault.message || 'service fault');
      err.fault = fault;
      throw err;
    }

    // Verify the provider's response signature against its certificate.
    const providerCert = resp.cert;
    const caOk = cryptoLib.validateCertificate(this.globalConf.ca.publicKey, providerCert);
    const sigOk = cryptoLib.verify(providerCert.claim.publicKey, {
      header: resp.header,
      payloadHash: resp.payloadHash,
    }, resp.signature);
    const hashOk = cryptoLib.sha256(resp.body) === resp.payloadHash;
    if (!caOk || !sigOk || !hashOk) {
      throw new Error('response failed verification (cert/signature/integrity)');
    }

    this.log.append({
      direction: 'response-in',
      queryId: req.header.queryId,
      client,
      service,
      status: resp.header.status || 'OK',
      payloadHash: resp.payloadHash,
      meta: { from: producerAddress },
    });

    return { header: resp.header, data: resp.body };
  }

  // ---- Provider side: answer an inbound exchange ---------------------------

  async handleExchange(req) {
    // 1. Integrity + signature of the request against the attached certificate.
    const v = message.verifyRequest(req);
    if (!v.ok) return this._fault('AUTH_FAILED', v.reason, req);

    // 2. The attached certificate must be issued by the federation CA.
    if (!this.globalConf) await this.refreshGlobalConf();
    if (!cryptoLib.validateCertificate(this.globalConf.ca.publicKey, req.cert)) {
      return this._fault('UNTRUSTED_SENDER', 'sender certificate not signed by federation CA', req);
    }

    const { header } = req;
    const svc = header.service;

    // 3. The service must be hosted here.
    this._assertLocal(svc, true);
    const key = this._svcKey(svc);
    const entry = this.services.get(key);
    if (!entry) return this._fault('UNKNOWN_SERVICE', 'no such service: ' + ids.toString(svc), req);

    // 4. Access control — the consumer must have an explicit grant.
    if (!this.isAllowed(svc, header.client)) {
      this.log.append({
        direction: 'request-in',
        queryId: header.queryId,
        client: header.client,
        service: svc,
        status: 'ACCESS_DENIED',
      });
      return this._fault(
        'ACCESS_DENIED',
        `${ids.toString(header.client)} is not authorised for ${ids.toString(svc)}`,
        req
      );
    }

    this.log.append({
      direction: 'request-in',
      queryId: header.queryId,
      client: header.client,
      service: svc,
      status: 'ACCEPTED',
      payloadHash: req.payloadHash,
    });

    // 5. Dispatch to the local adapter.
    let resultBody;
    try {
      resultBody = await entry.handler(req.body, {
        client: header.client,
        service: svc,
        userId: header.userId,
        issue: header.issue,
        queryId: header.queryId,
      });
    } catch (e) {
      return this._fault('SERVICE_ERROR', e.message, req);
    }

    const resp = message.buildResponse({
      queryId: header.queryId,
      client: header.client,
      service: svc,
      body: resultBody,
      status: 'OK',
      privateKey: this.keyPair.privateKey,
      cert: this.cert,
    });

    this.log.append({
      direction: 'response-out',
      queryId: header.queryId,
      client: header.client,
      service: svc,
      status: 'OK',
      payloadHash: resp.payloadHash,
    });

    return resp;
  }

  _fault(code, msg, req) {
    const header = (req && req.header) || {};
    return message.buildResponse({
      queryId: header.queryId,
      client: header.client,
      service: header.service,
      body: null,
      status: 'FAULT',
      fault: { code, message: msg },
      privateKey: this.keyPair.privateKey,
      cert: this.cert,
    });
  }

  // ---- Meta services -------------------------------------------------------

  listClients() {
    return {
      owner: this.owner,
      subsystems: [...this.subsystems],
      services: [...this.services.values()].map((e) => ({
        service: e.svc,
        title: e.meta.title || e.svc.service,
        description: e.meta.description || '',
      })),
    };
  }

  allowedMethods(clientId) {
    const out = [];
    for (const [key, set] of this.grants.entries()) {
      if (set.has(ids.toString(clientId)) && this.services.has(key)) {
        out.push(this.services.get(key).svc);
      }
    }
    return out;
  }

  // ---- helpers -------------------------------------------------------------

  _svcKey(svc) {
    return `${svc.subsystem}/${svc.service}/${svc.version || 'v1'}`;
  }

  _assertLocal(svc, viaExchange = false) {
    const ownerOk =
      svc.instance === this.owner.instance &&
      svc.memberClass === this.owner.memberClass &&
      svc.memberCode === this.owner.memberCode;
    if (!ownerOk) {
      const where = viaExchange ? 'exchange' : 'addService';
      throw new Error(`service ${ids.toString(svc)} does not belong to this SS (${where})`);
    }
  }

  // ---- HTTP interface ------------------------------------------------------

  createHttpServer() {
    return http.createServer(async (req, res) => {
      try {
        if (req.method === 'OPTIONS') return sendJson(res, 204, {});
        const url = new URL(req.url, 'http://localhost');
        const route = `${req.method} ${url.pathname}`;

        if (route === 'POST /exchange') {
          const body = await readBody(req);
          const resp = await this.handleExchange(body);
          return sendJson(res, 200, resp);
        }
        if (route === 'POST /call') {
          // local consumer application entrypoint
          const body = await readBody(req);
          try {
            const out = await this.call(body);
            return sendJson(res, 200, { ok: true, ...out });
          } catch (e) {
            return sendJson(res, 200, { ok: false, error: e.message, fault: e.fault || null });
          }
        }
        if (route === 'GET /listClients') {
          return sendJson(res, 200, this.listClients());
        }
        if (route === 'GET /messagelog') {
          return sendJson(res, 200, { owner: this.address, records: this.log.recent(100) });
        }
        if (route === 'GET /verify-log') {
          return sendJson(res, 200, this.log.verifyChain());
        }
        if (route === 'POST /refresh') {
          await this.refreshGlobalConf();
          return sendJson(res, 200, { ok: true, version: this.globalConf.version });
        }
        if (route === 'GET /health') {
          return sendJson(res, 200, {
            ok: true,
            role: 'security-server',
            owner: this.owner,
            address: this.address,
            services: [...this.services.keys()],
          });
        }
        return sendJson(res, 404, { error: 'not found', route });
      } catch (e) {
        return sendJson(res, 500, { error: e.message });
      }
    });
  }
}

module.exports = { SecurityServer };
