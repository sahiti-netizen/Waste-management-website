'use strict';

const test = require('node:test');
const assert = require('node:assert');

const ids = require('../src/shared/identifiers');
const cryptoLib = require('../src/shared/crypto');
const message = require('../src/shared/message');
const { MessageLog } = require('../src/shared/messagelog');

test('identifiers round-trip through string form', () => {
  const svc = ids.serviceId('REG', 'UIDAI', 'identity', 'verifyAadhaar', 'v1');
  assert.strictEqual(ids.toString(svc), 'IN/REG/UIDAI/identity/verifyAadhaar/v1');
  const parsed = ids.parse(ids.toString(svc));
  assert.deepStrictEqual(parsed, svc);
  assert.deepStrictEqual(ids.ownerOf(svc), ids.memberId('REG', 'UIDAI'));
});

test('sign/verify detects tampering', () => {
  const { publicKey, privateKey } = cryptoLib.generateKeyPair();
  const doc = { a: 1, b: [2, 3] };
  const sig = cryptoLib.sign(privateKey, doc);
  assert.ok(cryptoLib.verify(publicKey, doc, sig));
  assert.ok(!cryptoLib.verify(publicKey, { a: 1, b: [2, 4] }, sig));
});

test('CA issues certificates that only the CA validates', () => {
  const ca = new cryptoLib.CertificateAuthority({ name: 'Test CA' });
  const kp = cryptoLib.generateKeyPair();
  const cert = ca.issue({ subject: 'http://ss', subjectPublicKey: kp.publicKey });
  assert.ok(ca.validate(cert));
  assert.ok(cryptoLib.validateCertificate(ca.publicKey, cert));

  const rogue = new cryptoLib.CertificateAuthority({ name: 'Rogue CA' });
  assert.ok(!cryptoLib.validateCertificate(rogue.publicKey, cert));
});

test('message envelope integrity and signature', () => {
  const ca = new cryptoLib.CertificateAuthority({ name: 'CA' });
  const kp = cryptoLib.generateKeyPair();
  const cert = ca.issue({ subject: 'http://ss-a', subjectPublicKey: kp.publicKey });
  const req = message.buildRequest({
    client: ids.clientId('GOV', 'MORD', 'schemes'),
    service: ids.serviceId('REG', 'UIDAI', 'identity', 'verifyAadhaar', 'v1'),
    body: { aadhaarRef: '9999-1111-2222' },
    consumerSecurityServer: 'http://ss-a',
    producerSecurityServer: 'http://ss-b',
    privateKey: kp.privateKey,
    cert,
  });
  assert.ok(message.verifyRequest(req).ok);

  // Tamper with the body -> payload hash mismatch.
  const tampered = JSON.parse(JSON.stringify(req));
  tampered.body.aadhaarRef = '0000-0000-0000';
  assert.ok(!message.verifyRequest(tampered).ok);
});

test('message log hash chain detects edits and deletions', () => {
  const kp = cryptoLib.generateKeyPair();
  const log = new MessageLog({ owner: 'http://ss', keyPair: kp });
  for (let i = 0; i < 4; i++) {
    log.append({ direction: 'request-in', queryId: 'q' + i, status: 'ACCEPTED' });
  }
  assert.ok(log.verifyChain().ok);

  log.records[1].status = 'FORGED';
  const bad = log.verifyChain();
  assert.ok(!bad.ok);
  assert.strictEqual(bad.at, 1);
});
