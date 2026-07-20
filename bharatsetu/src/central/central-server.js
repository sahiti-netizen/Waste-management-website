'use strict';

/**
 * Central Server — the single governance node of the federation.
 *
 * It does NOT sit in the data path. Its jobs mirror X-Road's Central Server:
 *   1. Keep the authoritative registry of members, their subsystems and the
 *      Security Server that fronts each of them.
 *   2. Hold the trusted federation CA (trust anchor).
 *   3. Publish a *signed global configuration* that every Security Server
 *      downloads and trusts, so nodes agree on who is who without ever
 *      contacting the Central Server during an actual data exchange.
 *
 * Actual government-to-government data flows point-to-point between Security
 * Servers and never touch this node.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const ids = require('../shared/identifiers');
const cryptoLib = require('../shared/crypto');
const { readBody, sendJson } = require('../shared/http');

class CentralServer {
  constructor({ ca, signingKeyPair, name = 'Bharat Setu Central' }) {
    this.name = name;
    this.ca = ca; // CertificateAuthority instance
    this.signingKeyPair = signingKeyPair; // used to sign global config
    this.version = 0;

    this.members = new Map(); // key: IN/class/code -> member record
    this.securityServers = new Map(); // key: address -> { address, owner, cert }
    this.services = []; // catalog entries
  }

  // ---- Registry management -------------------------------------------------

  registerMember({ memberClass, memberCode, name, sector }) {
    const id = ids.memberId(memberClass, memberCode);
    const key = ids.toString(id);
    if (!this.members.has(key)) {
      this.members.set(key, {
        id,
        name,
        sector: sector || null,
        subsystems: [],
        securityServer: null,
        joinedAt: new Date().toISOString(),
        status: 'REGISTERED',
      });
      this._bump();
    }
    return this.members.get(key);
  }

  addSubsystem(memberClass, memberCode, subsystem) {
    const key = ids.toString(ids.memberId(memberClass, memberCode));
    const m = this.members.get(key);
    if (!m) throw new Error('unknown member ' + key);
    if (!m.subsystems.includes(subsystem)) {
      m.subsystems.push(subsystem);
      this._bump();
    }
    return m;
  }

  /** A member brings its Security Server online and presents its certificate. */
  registerSecurityServer({ memberClass, memberCode, address, cert }) {
    const key = ids.toString(ids.memberId(memberClass, memberCode));
    const m = this.members.get(key);
    if (!m) throw new Error('unknown member ' + key);
    // Central Server only admits Security Servers whose cert the federation CA signed.
    if (!this.ca.validate(cert)) {
      throw new Error('security server certificate not signed by federation CA');
    }
    m.securityServer = address;
    m.status = 'ACTIVE';
    this.securityServers.set(address, { address, owner: m.id, cert });
    this._bump();
    return m;
  }

  /** A subsystem publishes a service to the shared catalog. */
  registerService({ provider, service, title, description, openapi }) {
    const svcKey = ids.toString(service);
    const existing = this.services.find((s) => ids.toString(s.service) === svcKey);
    const entry = {
      service,
      provider,
      title: title || service.service,
      description: description || '',
      openapi: openapi || null,
      publishedAt: new Date().toISOString(),
    };
    if (existing) Object.assign(existing, entry);
    else this.services.push(entry);
    this._bump();
    return entry;
  }

  _bump() {
    this.version += 1;
    this.generatedAt = new Date().toISOString();
  }

  // ---- Global configuration ------------------------------------------------

  /** Build the current global configuration object (unsigned). */
  buildGlobalConf() {
    return {
      instance: ids.INSTANCE,
      centralServer: this.name,
      version: this.version,
      generatedAt: this.generatedAt || new Date().toISOString(),
      ca: { name: this.ca.name, publicKey: this.ca.publicKey },
      members: [...this.members.values()].map((m) => ({
        id: m.id,
        name: m.name,
        sector: m.sector,
        status: m.status,
        subsystems: m.subsystems,
        securityServer: m.securityServer,
      })),
      securityServers: [...this.securityServers.values()].map((s) => ({
        address: s.address,
        owner: s.owner,
        cert: s.cert,
      })),
      services: this.services,
    };
  }

  /** Sign the global configuration so Security Servers can trust it offline. */
  signedGlobalConf() {
    const conf = this.buildGlobalConf();
    const signature = cryptoLib.sign(this.signingKeyPair.privateKey, conf);
    return { conf, signature, signedBy: this.name };
  }

  /** The trust anchor a Security Server needs to verify signed global config. */
  trustAnchor() {
    return {
      instance: ids.INSTANCE,
      centralServer: this.name,
      configSigningKey: this.signingKeyPair.publicKey,
      caPublicKey: this.ca.publicKey,
    };
  }

  // ---- HTTP interface ------------------------------------------------------

  createHttpServer() {
    return http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost');
        const route = `${req.method} ${url.pathname}`;

        if (req.method === 'OPTIONS') return sendJson(res, 204, {});

        if (route === 'GET /globalconf') {
          return sendJson(res, 200, this.signedGlobalConf());
        }
        if (route === 'GET /trust-anchor') {
          return sendJson(res, 200, this.trustAnchor());
        }
        if (route === 'GET /ca/certify') {
          // For the demo we let the CA public key be fetched openly.
          return sendJson(res, 200, { name: this.ca.name, publicKey: this.ca.publicKey });
        }
        if (route === 'POST /members') {
          const b = await readBody(req);
          const m = this.registerMember(b);
          return sendJson(res, 200, m);
        }
        if (route === 'POST /security-servers') {
          const b = await readBody(req);
          const m = this.registerSecurityServer(b);
          return sendJson(res, 200, m);
        }
        if (route === 'POST /services') {
          const b = await readBody(req);
          const e = this.registerService(b);
          return sendJson(res, 200, e);
        }
        if (route === 'GET /registry') {
          return sendJson(res, 200, {
            version: this.version,
            members: [...this.members.values()],
            services: this.services,
          });
        }
        if (route === 'GET /health') {
          return sendJson(res, 200, { ok: true, role: 'central', version: this.version });
        }

        // Serve the dashboard's static files if present.
        if (req.method === 'GET') {
          const served = this._maybeServeStatic(url.pathname, res);
          if (served) return;
        }

        return sendJson(res, 404, { error: 'not found', route });
      } catch (e) {
        return sendJson(res, 500, { error: e.message });
      }
    });
  }

  _maybeServeStatic(pathname, res) {
    const dir = path.join(__dirname, '..', 'dashboard');
    let rel = pathname === '/' ? '/index.html' : pathname;
    const file = path.join(dir, rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return false;
    }
    const ext = path.extname(file);
    const type =
      ext === '.html'
        ? 'text/html'
        : ext === '.js'
        ? 'text/javascript'
        : ext === '.css'
        ? 'text/css'
        : 'application/octet-stream';
    const data = fs.readFileSync(file);
    res.writeHead(200, { 'content-type': type, 'access-control-allow-origin': '*' });
    res.end(data);
    return true;
  }
}

module.exports = { CentralServer };
