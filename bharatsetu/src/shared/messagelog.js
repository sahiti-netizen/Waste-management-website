'use strict';

/**
 * Tamper-evident message log.
 *
 * Like X-Road's message log, every exchange a Security Server mediates is
 * recorded and each record is signed. We additionally hash-chain records
 * (each record embeds the hash of the previous one) so that removing or
 * editing any past record is detectable — the classic "timestamped,
 * append-only evidence trail" property.
 */

const { sha256, sign, verify } = require('./crypto');

// The exact fields that are hashed into recordHash, in a fixed order.
const HASHED_FIELDS = [
  'seq',
  'owner',
  'timestamp',
  'prevHash',
  'direction',
  'queryId',
  'client',
  'service',
  'status',
  'payloadHash',
  'meta',
];

function digestOf(record) {
  const subset = {};
  for (const f of HASHED_FIELDS) subset[f] = record[f] === undefined ? null : record[f];
  return sha256(subset);
}

class MessageLog {
  constructor({ owner, keyPair }) {
    this.owner = owner; // security server address / id
    this.keyPair = keyPair;
    this.records = [];
  }

  /**
   * Append a record describing one mediated exchange.
   * `direction` is 'request-in' | 'request-out' | 'response-in' | 'response-out'.
   */
  append(entry) {
    const prevHash = this.records.length
      ? this.records[this.records.length - 1].recordHash
      : 'GENESIS';
    const record = {
      seq: this.records.length,
      owner: this.owner,
      timestamp: new Date().toISOString(),
      prevHash,
      direction: entry.direction || null,
      queryId: entry.queryId || null,
      client: entry.client || null,
      service: entry.service || null,
      status: entry.status || null,
      payloadHash: entry.payloadHash || null,
      meta: entry.meta || null,
    };
    record.recordHash = digestOf(record);
    record.signature = sign(this.keyPair.privateKey, record.recordHash);
    this.records.push(record);
    return record;
  }

  /** Verify the full chain: recomputed hashes, valid signatures, intact links. */
  verifyChain() {
    let prev = 'GENESIS';
    for (const r of this.records) {
      if (r.prevHash !== prev) {
        return { ok: false, at: r.seq, reason: 'broken hash chain' };
      }
      if (digestOf(r) !== r.recordHash) {
        return { ok: false, at: r.seq, reason: 'record content altered' };
      }
      if (!verify(this.keyPair.publicKey, r.recordHash, r.signature)) {
        return { ok: false, at: r.seq, reason: 'invalid record signature' };
      }
      prev = r.recordHash;
    }
    return { ok: true, count: this.records.length };
  }

  recent(n = 50) {
    return this.records.slice(-n).reverse();
  }
}

module.exports = { MessageLog };
