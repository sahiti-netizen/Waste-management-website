'use strict';

/**
 * The standard message envelope exchanged between Security Servers.
 *
 * Modeled on the X-Road message protocol. Every request/response carries the
 * full routing identity (who is asking, what service, a unique id) plus a
 * cryptographic signature produced by the sender's Security Server.
 */

const crypto = require('crypto');
const ids = require('./identifiers');
const { sign, verify, sha256 } = require('./crypto');

/** A short, unique correlation id for a message (like X-Road's queryId). */
function newQueryId() {
  return 'q-' + crypto.randomBytes(9).toString('hex');
}

/**
 * Build the signed body that travels between two Security Servers.
 *
 * @param {object} p
 * @param {object} p.client   consumer client identifier
 * @param {object} p.service  provider service identifier
 * @param {*}      p.body     the request payload
 * @param {string} p.producerSecurityServer  address of the target SS
 * @param {string} p.consumerSecurityServer  address of the calling SS
 * @param {string} p.privateKey  the calling SS private key (PEM)
 * @param {object} p.cert         the calling SS certificate
 */
function buildRequest(p) {
  const header = {
    protocolVersion: '1.0',
    queryId: p.queryId || newQueryId(),
    client: p.client,
    service: p.service,
    userId: p.userId || null,
    issue: p.issue || null, // e.g. a case/file number the request relates to
    consumerSecurityServer: p.consumerSecurityServer,
    producerSecurityServer: p.producerSecurityServer,
    createdAt: new Date().toISOString(),
  };
  const payloadHash = sha256(p.body === undefined ? null : p.body);
  const signed = { header, payloadHash };
  const signature = sign(p.privateKey, signed);
  return {
    header,
    body: p.body === undefined ? null : p.body,
    payloadHash,
    signature,
    cert: p.cert,
  };
}

/**
 * Verify an inbound message:
 *   1. the payload matches its declared hash (integrity),
 *   2. the signature is valid for the attached certificate's public key,
 *   3. (caller separately checks the certificate against the trusted CA).
 */
function verifyRequest(msg) {
  if (!msg || !msg.header || !msg.cert || !msg.signature) {
    return { ok: false, reason: 'malformed message' };
  }
  const expectedHash = sha256(msg.body === undefined ? null : msg.body);
  if (expectedHash !== msg.payloadHash) {
    return { ok: false, reason: 'payload hash mismatch (tampering?)' };
  }
  const signed = { header: msg.header, payloadHash: msg.payloadHash };
  const pub = msg.cert.claim && msg.cert.claim.publicKey;
  if (!pub || !verify(pub, signed, msg.signature)) {
    return { ok: false, reason: 'invalid message signature' };
  }
  return { ok: true };
}

/** Build a signed response envelope. */
function buildResponse(p) {
  const header = {
    protocolVersion: '1.0',
    queryId: p.queryId,
    client: p.client,
    service: p.service,
    respondedAt: new Date().toISOString(),
    status: p.status || 'OK',
  };
  const payloadHash = sha256(p.body === undefined ? null : p.body);
  const signature = sign(p.privateKey, { header, payloadHash });
  return {
    header,
    body: p.body === undefined ? null : p.body,
    payloadHash,
    signature,
    cert: p.cert,
    fault: p.fault || null,
  };
}

function describe(msg) {
  const h = msg.header || {};
  return `${ids.toString(h.client)} -> ${ids.toString(h.service)} [${h.queryId}]`;
}

module.exports = {
  newQueryId,
  buildRequest,
  verifyRequest,
  buildResponse,
  describe,
};
