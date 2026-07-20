'use strict';

const test = require('node:test');
const assert = require('node:assert');

const ids = require('../src/shared/identifiers');
const cryptoLib = require('../src/shared/crypto');
const { bootFederation } = require('../src/cluster');

// One booted federation shared across the whole suite.
let fed;
const mordSchemes = ids.clientId('GOV', 'MORD', 'schemes');
const mordPortal = ids.clientId('GOV', 'MORD', 'portal');

test.before(async () => {
  // Use an offset port range so it never clashes with a running `npm start`.
  fed = await bootFederation({ centralPort: 7300 });
});

test.after(async () => {
  if (fed) await fed.stop();
});

function mord() {
  return fed.servers.get('IN/GOV/MORD').ss;
}

test('cross-government orchestration returns an eligible verdict', async () => {
  const r = await mord().call({
    client: mordSchemes,
    service: ids.serviceId('GOV', 'MORD', 'schemes', 'pmaygEligibility', 'v1'),
    body: { aadhaarRef: '9999-1111-2222', name: 'Sunita Devi', pan: 'PQRSX9876L', stateCode: 'BR', surveyNo: 'PAT-BKT-88/3' },
  });
  assert.strictEqual(r.data.eligible, true);
  // It really consulted three different governments.
  const providers = r.data.steps.map((s) => s.provider);
  assert.deepStrictEqual(providers, ['REG/UIDAI', 'GOV/CBDT', 'STATE/BR']);
});

test('a taxpayer with land is found ineligible', async () => {
  const r = await mord().call({
    client: mordSchemes,
    service: ids.serviceId('GOV', 'MORD', 'schemes', 'pmaygEligibility', 'v1'),
    body: { aadhaarRef: '9999-3333-4444', name: 'Ramesh Kumar', pan: 'ABCDE1234F', stateCode: 'MH', surveyNo: 'PUN-HAV-114/2' },
  });
  assert.strictEqual(r.data.eligible, false);
});

test('access control refuses an ungranted consumer', async () => {
  await assert.rejects(
    () =>
      mord().call({
        client: mordPortal, // no grant on verifyAadhaar
        service: ids.serviceId('REG', 'UIDAI', 'identity', 'verifyAadhaar', 'v1'),
        body: { aadhaarRef: '9999-1111-2222' },
      }),
    (e) => e.fault && e.fault.code === 'ACCESS_DENIED'
  );
});

test('a sender whose certificate is not CA-signed is rejected', async () => {
  const uidai = fed.servers.get('IN/REG/UIDAI').ss;
  // Forge a request signed by a rogue CA's certificate.
  const rogueCa = new cryptoLib.CertificateAuthority({ name: 'Rogue' });
  const kp = cryptoLib.generateKeyPair();
  const rogueCert = rogueCa.issue({ subject: 'http://evil', subjectPublicKey: kp.publicKey });
  const message = require('../src/shared/message');
  const forged = message.buildRequest({
    client: mordSchemes,
    service: ids.serviceId('REG', 'UIDAI', 'identity', 'verifyAadhaar', 'v1'),
    body: { aadhaarRef: '9999-1111-2222' },
    consumerSecurityServer: 'http://evil',
    producerSecurityServer: uidai.address,
    privateKey: kp.privateKey,
    cert: rogueCert,
  });
  const resp = await uidai.handleExchange(forged);
  assert.ok(resp.fault);
  assert.strictEqual(resp.fault.code, 'UNTRUSTED_SENDER');
});

test('every Security Server keeps an intact tamper-evident log', () => {
  for (const [, node] of fed.servers) {
    assert.ok(node.ss.log.verifyChain().ok, 'chain intact for ' + node.ss.address);
  }
});

test('the global configuration is signed and verifiable', async () => {
  const signed = fed.central.signedGlobalConf();
  const anchor = fed.central.trustAnchor();
  assert.ok(cryptoLib.verify(anchor.configSigningKey, signed.conf, signed.signature));
});
