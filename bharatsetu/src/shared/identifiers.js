'use strict';

/**
 * X-Road-style identifiers, adapted for India.
 *
 * The whole federation shares a single INSTANCE identifier: "IN".
 *
 * A MEMBER is a government body. It is addressed as:
 *      IN / <memberClass> / <memberCode>
 *
 * A member can host several SUBSYSTEMS (logical information systems):
 *      IN / <memberClass> / <memberCode> / <subsystem>
 *
 * A SERVICE offered by a subsystem is addressed as:
 *      IN / <memberClass> / <memberCode> / <subsystem> / <service> / <version>
 *
 * Member classes model the Indian government structure:
 *   GOV  - Union / Central government ministry or department
 *   STATE- State government department
 *   MUN  - Urban / Rural local body (municipality, panchayat)
 *   PSU  - Public sector undertaking / statutory authority
 *   REG  - Regulator (RBI, SEBI, UIDAI, ...)
 */

const INSTANCE = 'IN';

const MEMBER_CLASSES = ['GOV', 'STATE', 'MUN', 'PSU', 'REG'];

function memberId(memberClass, memberCode) {
  return { instance: INSTANCE, memberClass, memberCode };
}

function clientId(memberClass, memberCode, subsystem) {
  return { instance: INSTANCE, memberClass, memberCode, subsystem };
}

function serviceId(memberClass, memberCode, subsystem, service, version) {
  return {
    instance: INSTANCE,
    memberClass,
    memberCode,
    subsystem,
    service,
    version: version || 'v1',
  };
}

/** Render an identifier object as a canonical, sortable string. */
function toString(id) {
  if (!id) return '';
  const parts = [id.instance, id.memberClass, id.memberCode];
  if (id.subsystem) parts.push(id.subsystem);
  if (id.service) parts.push(id.service);
  if (id.version) parts.push(id.version);
  return parts.join('/');
}

/** Parse a canonical identifier string back into an object. */
function parse(str) {
  const p = String(str).split('/');
  const id = { instance: p[0], memberClass: p[1], memberCode: p[2] };
  if (p[3]) id.subsystem = p[3];
  if (p[4]) id.service = p[4];
  if (p[5]) id.version = p[5];
  return id;
}

/** The member (IN/class/code) that owns a client or service identifier. */
function ownerOf(id) {
  return { instance: id.instance, memberClass: id.memberClass, memberCode: id.memberCode };
}

/** Two client identifiers point at the same subsystem. */
function sameClient(a, b) {
  return (
    a.instance === b.instance &&
    a.memberClass === b.memberClass &&
    a.memberCode === b.memberCode &&
    (a.subsystem || null) === (b.subsystem || null)
  );
}

module.exports = {
  INSTANCE,
  MEMBER_CLASSES,
  memberId,
  clientId,
  serviceId,
  toString,
  parse,
  ownerOf,
  sameClient,
};
