'use strict';

/**
 * Run a scripted set of cross-government exchanges against a freshly booted
 * federation, printing what happens at each hop. Exits when done.
 *
 *   node scripts/demo.js
 */

const ids = require('../src/shared/identifiers');
const { bootFederation } = require('../src/cluster');

function h(title) {
  console.log('\n' + '='.repeat(72) + '\n' + title + '\n' + '='.repeat(72));
}

async function main() {
  h('Booting Bharat Setu federation');
  const fed = await bootFederation({ log: (m) => console.log('  ' + m) });

  const mord = fed.servers.get('IN/GOV/MORD').ss;
  const mordSchemes = ids.clientId('GOV', 'MORD', 'schemes');
  const mordPortal = ids.clientId('GOV', 'MORD', 'portal');

  // --- Scenario 1: cross-government welfare eligibility (the headline) -------
  h('Scenario 1 — PMAY-G eligibility (landless applicant, Bihar)');
  console.log('MORD/schemes asks its own Security Server one question. The SS fans');
  console.log('out to UIDAI, CBDT and Bihar Revenue — three governments — point to point.\n');
  let r = await mord.call({
    client: mordSchemes,
    service: ids.serviceId('GOV', 'MORD', 'schemes', 'pmaygEligibility', 'v1'),
    userId: 'officer-2291',
    issue: 'PMAYG-APP-55012',
    body: {
      aadhaarRef: '9999-1111-2222',
      name: 'Sunita Devi',
      pan: 'PQRSX9876L',
      stateCode: 'BR',
      surveyNo: 'PAT-BKT-88/3',
      officerId: 'officer-2291',
      applicationId: 'PMAYG-APP-55012',
    },
  });
  console.log(JSON.stringify(r.data, null, 2));

  // --- Scenario 2: ineligible (owns land + pays tax) ------------------------
  h('Scenario 2 — PMAY-G eligibility (land-owning taxpayer, Maharashtra)');
  r = await mord.call({
    client: mordSchemes,
    service: ids.serviceId('GOV', 'MORD', 'schemes', 'pmaygEligibility', 'v1'),
    body: {
      aadhaarRef: '9999-3333-4444',
      name: 'Ramesh Kumar',
      pan: 'ABCDE1234F',
      stateCode: 'MH',
      surveyNo: 'PUN-HAV-114/2',
      applicationId: 'PMAYG-APP-55013',
    },
  });
  console.log(JSON.stringify(r.data, null, 2));

  // --- Scenario 3: a direct, single-hop query -------------------------------
  h('Scenario 3 — direct query: MORD/portal -> MoRTH VAHAN vehicle lookup');
  r = await mord.call({
    client: mordPortal,
    service: ids.serviceId('GOV', 'MORTH', 'vahan', 'vehicleDetails', 'v1'),
    body: { regNo: 'MH12AB1234' },
  });
  console.log(JSON.stringify(r.data, null, 2));

  // --- Scenario 4: access control blocks an ungranted consumer --------------
  h('Scenario 4 — access control: MORD/portal -> UIDAI (no grant) is refused');
  try {
    await mord.call({
      client: mordPortal, // portal has NO grant on verifyAadhaar (only schemes does)
      service: ids.serviceId('REG', 'UIDAI', 'identity', 'verifyAadhaar', 'v1'),
      body: { aadhaarRef: '9999-1111-2222' },
    });
    console.log('  UNEXPECTED: call was allowed');
  } catch (e) {
    console.log('  Correctly refused ->', e.fault ? e.fault.code : e.message);
  }

  // --- Message log integrity ------------------------------------------------
  h('Tamper-evident message log (UIDAI Security Server)');
  const uidai = fed.servers.get('IN/REG/UIDAI').ss;
  console.log('  chain verification:', JSON.stringify(uidai.log.verifyChain()));
  console.log('  records:', uidai.log.records.length);
  console.log('\n  Demonstrating tamper detection — editing one past record...');
  if (uidai.log.records.length) {
    uidai.log.records[0].status = 'FORGED';
    console.log('  chain verification after edit:', JSON.stringify(uidai.log.verifyChain()));
  }

  await fed.stop();
  h('Demo complete — federation shut down');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
