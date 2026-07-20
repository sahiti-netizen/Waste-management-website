'use strict';

/**
 * The demo federation: a slice of the Indian government wired onto the exchange.
 *
 * Members (each runs its own Security Server on its own port):
 *   REG/UIDAI      — Unique Identification Authority (Aadhaar)
 *   GOV/CBDT       — Central Board of Direct Taxes (PAN / income)
 *   GOV/MORTH      — Ministry of Road Transport & Highways (VAHAN)
 *   STATE/MH       — Maharashtra Revenue Dept (Bhulekh land records)
 *   STATE/BR       — Bihar Revenue Dept (land records)
 *   GOV/MORD       — Ministry of Rural Development (welfare schemes)
 *
 * The headline scenario is a cross-government eligibility check: MORD's scheme
 * subsystem answers "is this citizen eligible for PMAY-G rural housing?" by
 * consuming Aadhaar (identity), CBDT (income band) and the citizen's state land
 * record (landless test) — three different governments, one signed request in.
 */

const ids = require('../shared/identifiers');
const data = require('./datasets');

// -- Member + Security Server topology ---------------------------------------

const MEMBERS = [
  { memberClass: 'REG',   memberCode: 'UIDAI', name: 'Unique Identification Authority of India', sector: 'Identity',   port: 7101 },
  { memberClass: 'GOV',   memberCode: 'CBDT',  name: 'Central Board of Direct Taxes',            sector: 'Revenue',    port: 7102 },
  { memberClass: 'GOV',   memberCode: 'MORTH', name: 'Ministry of Road Transport & Highways',    sector: 'Transport',  port: 7103 },
  { memberClass: 'STATE', memberCode: 'MH',    name: 'Maharashtra Revenue Department',           sector: 'Land',       port: 7104 },
  { memberClass: 'STATE', memberCode: 'BR',    name: 'Bihar Revenue Department',                 sector: 'Land',       port: 7105 },
  { memberClass: 'GOV',   memberCode: 'MORD',  name: 'Ministry of Rural Development',            sector: 'Welfare',    port: 7106 },
];

function addr(port) {
  return `http://127.0.0.1:${port}`;
}

// -- Service handlers --------------------------------------------------------
// A handler is (body, ctx) => result. Handlers that orchestrate other members
// are built by a factory that receives the owning Security Server.

function aadhaarVerify() {
  return async (body) => {
    const rec = data.AADHAAR[body.aadhaarRef];
    if (!rec) return { matched: false, reason: 'no such Aadhaar reference' };
    const nameMatch = !body.name || rec.name.toLowerCase() === String(body.name).toLowerCase();
    return {
      matched: nameMatch,
      // Minimal KYC — never the raw record.
      kyc: nameMatch ? { name: rec.name, yob: rec.yob, gender: rec.gender, state: rec.state } : null,
    };
  };
}

function panVerify() {
  return async (body) => {
    const rec = data.PAN[body.pan];
    if (!rec) return { valid: false };
    return { valid: rec.status === 'VALID', incomeBand: rec.incomeBand, name: rec.name };
  };
}

function vehicleDetails() {
  return async (body) => {
    const rec = data.VEHICLES[body.regNo];
    if (!rec) return { found: false };
    return { found: true, ...rec };
  };
}

function landRecordFor(store) {
  return async (body) => {
    const rec = store[body.surveyNo];
    if (!rec) return { found: false };
    return { found: true, ...rec };
  };
}

/**
 * PMAY-G eligibility orchestrator — runs INSIDE the MORD Security Server and
 * fans out to three other governments via its own consumer side.
 */
function pmaygEligibility(ss) {
  const schemesClient = ids.clientId('GOV', 'MORD', 'schemes');
  return async (body) => {
    const steps = [];
    const fail = (reason) => ({ eligible: false, reason, steps });

    // 1. Identity — UIDAI.
    const idRes = await ss.call({
      client: schemesClient,
      service: ids.serviceId('REG', 'UIDAI', 'identity', 'verifyAadhaar', 'v1'),
      body: { aadhaarRef: body.aadhaarRef, name: body.name },
      userId: body.officerId,
      issue: body.applicationId,
    });
    steps.push({ check: 'identity', provider: 'REG/UIDAI', result: idRes.data });
    if (!idRes.data.matched) return fail('identity verification failed');

    // 2. Income band — CBDT (only if the applicant has a PAN).
    if (body.pan) {
      const taxRes = await ss.call({
        client: schemesClient,
        service: ids.serviceId('GOV', 'CBDT', 'taxpayer', 'verifyPAN', 'v1'),
        body: { pan: body.pan },
        userId: body.officerId,
        issue: body.applicationId,
      });
      steps.push({ check: 'income', provider: 'GOV/CBDT', result: taxRes.data });
      if (taxRes.data.valid && taxRes.data.incomeBand === 'ABOVE_TAXABLE') {
        return fail('applicant is an income-tax payer — above the welfare threshold');
      }
    }

    // 3. Landless test — the applicant's STATE land record.
    const stateCode = body.stateCode; // 'MH' | 'BR'
    const landRes = await ss.call({
      client: schemesClient,
      service: ids.serviceId('STATE', stateCode, 'bhulekh', 'landRecord', 'v1'),
      body: { surveyNo: body.surveyNo },
      userId: body.officerId,
      issue: body.applicationId,
    });
    steps.push({ check: 'land', provider: 'STATE/' + stateCode, result: landRes.data });
    const landAcres = landRes.data.found ? landRes.data.areaHa : 0;
    if (landAcres > 0.2) {
      return fail('applicant owns significant agricultural land');
    }

    return {
      eligible: true,
      scheme: 'PMAY-G (Pradhan Mantri Awas Yojana - Gramin)',
      applicant: idRes.data.kyc,
      steps,
    };
  };
}

// -- Service catalog ---------------------------------------------------------
// `handler` is a factory (ss) => fn so orchestrators can reach their own SS.

const SERVICES = [
  {
    provider: ids.clientId('REG', 'UIDAI', 'identity'),
    service: ids.serviceId('REG', 'UIDAI', 'identity', 'verifyAadhaar', 'v1'),
    title: 'Aadhaar verification',
    description: 'Confirm an Aadhaar reference and return minimal KYC.',
    handler: () => aadhaarVerify(),
  },
  {
    provider: ids.clientId('GOV', 'CBDT', 'taxpayer'),
    service: ids.serviceId('GOV', 'CBDT', 'taxpayer', 'verifyPAN', 'v1'),
    title: 'PAN verification & income band',
    description: 'Validate a PAN and return a coarse income band.',
    handler: () => panVerify(),
  },
  {
    provider: ids.clientId('GOV', 'MORTH', 'vahan'),
    service: ids.serviceId('GOV', 'MORTH', 'vahan', 'vehicleDetails', 'v1'),
    title: 'Vehicle (RC) details',
    description: 'Look up a vehicle registration in the VAHAN registry.',
    handler: () => vehicleDetails(),
  },
  {
    provider: ids.clientId('STATE', 'MH', 'bhulekh'),
    service: ids.serviceId('STATE', 'MH', 'bhulekh', 'landRecord', 'v1'),
    title: 'Maharashtra land record',
    description: 'Fetch a Bhulekh land record by survey number.',
    handler: () => landRecordFor(data.LAND_MH),
  },
  {
    provider: ids.clientId('STATE', 'BR', 'bhulekh'),
    service: ids.serviceId('STATE', 'BR', 'bhulekh', 'landRecord', 'v1'),
    title: 'Bihar land record',
    description: 'Fetch a land record by survey number.',
    handler: () => landRecordFor(data.LAND_BR),
  },
  {
    provider: ids.clientId('GOV', 'MORD', 'schemes'),
    service: ids.serviceId('GOV', 'MORD', 'schemes', 'pmaygEligibility', 'v1'),
    title: 'PMAY-G eligibility (cross-government)',
    description: 'Decide rural-housing eligibility by consulting UIDAI, CBDT and state land records.',
    handler: (ss) => pmaygEligibility(ss),
  },
];

// -- Access grants (provider decides who may consume) ------------------------

const GRANTS = [
  // The caseworker subsystem may invoke its own department's eligibility service.
  { service: ids.serviceId('GOV', 'MORD', 'schemes', 'pmaygEligibility', 'v1'), consumer: ids.clientId('GOV', 'MORD', 'schemes') },
  { service: ids.serviceId('REG', 'UIDAI', 'identity', 'verifyAadhaar', 'v1'), consumer: ids.clientId('GOV', 'MORD', 'schemes') },
  { service: ids.serviceId('GOV', 'CBDT', 'taxpayer', 'verifyPAN', 'v1'),      consumer: ids.clientId('GOV', 'MORD', 'schemes') },
  { service: ids.serviceId('STATE', 'MH', 'bhulekh', 'landRecord', 'v1'),      consumer: ids.clientId('GOV', 'MORD', 'schemes') },
  { service: ids.serviceId('STATE', 'BR', 'bhulekh', 'landRecord', 'v1'),      consumer: ids.clientId('GOV', 'MORD', 'schemes') },
  // A citizen-facing MORD portal may look up vehicles for subsidy checks.
  { service: ids.serviceId('GOV', 'MORTH', 'vahan', 'vehicleDetails', 'v1'),   consumer: ids.clientId('GOV', 'MORD', 'portal') },
];

module.exports = { MEMBERS, SERVICES, GRANTS, addr };
