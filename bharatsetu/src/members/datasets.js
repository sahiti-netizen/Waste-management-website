'use strict';

/**
 * Mock reference datasets standing in for the real systems of record held by
 * different arms of the Indian government. All records are fictional.
 *
 * These never leave their owning member: a Security Server exposes a *service*
 * over them, and only the specific fields a query is entitled to are returned.
 */

// UIDAI — Aadhaar demographic store (only ever returns a yes/no + minimal KYC).
const AADHAAR = {
  '9999-1111-2222': { name: 'Sunita Devi', yob: 1986, gender: 'F', state: 'Bihar', mobileHash: 'a1b2' },
  '9999-3333-4444': { name: 'Ramesh Kumar', yob: 1979, gender: 'M', state: 'Maharashtra', mobileHash: 'c3d4' },
  '9999-5555-6666': { name: 'Fatima Sheikh', yob: 1992, gender: 'F', state: 'Telangana', mobileHash: 'e5f6' },
};

// CBDT — PAN / income-band store.
const PAN = {
  ABCDE1234F: { name: 'Ramesh Kumar', status: 'VALID', incomeBand: 'ABOVE_TAXABLE', linkedAadhaar: '9999-3333-4444' },
  PQRSX9876L: { name: 'Sunita Devi', status: 'VALID', incomeBand: 'BELOW_TAXABLE', linkedAadhaar: '9999-1111-2222' },
};

// MoRTH — VAHAN vehicle registry.
const VEHICLES = {
  MH12AB1234: { owner: 'Ramesh Kumar', make: 'Tata', model: 'Nexon', class: 'LMV', fuel: 'EV', regDate: '2022-03-11', rcStatus: 'ACTIVE' },
  TS09CD5678: { owner: 'Fatima Sheikh', make: 'Bajaj', model: 'Chetak', class: '2WN', fuel: 'EV', regDate: '2023-08-02', rcStatus: 'ACTIVE' },
};

// Maharashtra Revenue Dept — Bhulekh land records (survey-number keyed).
const LAND_MH = {
  'PUN-HAV-114/2': { owner: 'Ramesh Kumar', villageCode: 'HAV', areaHa: 0.42, tenure: 'OCCUPANT_CLASS_I', encumbrance: 'NONE' },
  'PUN-HAV-207/1': { owner: 'Sunita Devi', villageCode: 'HAV', areaHa: 0.0, tenure: 'LANDLESS', encumbrance: 'NONE' },
};

// Bihar Revenue Dept — land records.
const LAND_BR = {
  'PAT-BKT-88/3': { owner: 'Sunita Devi', villageCode: 'BKT', areaHa: 0.0, tenure: 'LANDLESS', encumbrance: 'NONE' },
};

module.exports = { AADHAAR, PAN, VEHICLES, LAND_MH, LAND_BR };
