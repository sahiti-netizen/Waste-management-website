'use strict';

/**
 * PKI helpers built entirely on Node's built-in `crypto` module.
 *
 * This mirrors X-Road's trust model:
 *   - A federation Certificate Authority (CA) signs a certificate for each
 *     Security Server / member.
 *   - Every message a Security Server emits is signed with its private key.
 *   - The receiver verifies the signature against the sender's certificate
 *     and checks that the certificate itself was issued by the trusted CA.
 *
 * We keep the "certificate" deliberately simple (a signed JSON claim binding a
 * subject identifier to a public key) so the whole system stays dependency
 * free and easy to read, while still exercising real RSA signatures.
 */

const crypto = require('crypto');

/** Generate an RSA key pair, returned as PEM strings. */
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

/** Deterministic SHA-256 hex digest of a value (object or string). */
function sha256(value) {
  const data = typeof value === 'string' ? value : stableStringify(value);
  return crypto.createHash('sha256').update(data).digest('hex');
}

/** JSON.stringify with sorted keys, so hashing/signing is deterministic. */
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

/** RSA-SHA256 signature over a canonicalised value, returned base64. */
function sign(privateKeyPem, value) {
  const data = typeof value === 'string' ? value : stableStringify(value);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

/** Verify a base64 RSA-SHA256 signature. */
function verify(publicKeyPem, value, signatureB64) {
  try {
    const data = typeof value === 'string' ? value : stableStringify(value);
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(data);
    verifier.end();
    return verifier.verify(publicKeyPem, signatureB64, 'base64');
  } catch (_e) {
    return false;
  }
}

/**
 * A Certificate Authority: it holds the CA key pair and issues certificates.
 * A "certificate" binds a subject (identifier string) to a public key and is
 * signed by the CA.
 */
class CertificateAuthority {
  constructor({ name, keyPair }) {
    this.name = name;
    this.keyPair = keyPair || generateKeyPair();
  }

  get publicKey() {
    return this.keyPair.publicKey;
  }

  /** Issue a certificate for a subject holding `subjectPublicKey`. */
  issue({ subject, subjectPublicKey, notAfterDays = 365, role = 'security-server' }) {
    const claim = {
      subject,
      role,
      publicKey: subjectPublicKey,
      issuer: this.name,
      issuedAt: new Date().toISOString(),
      // Fixed horizon; not time-sensitive for the demo but included for realism.
      notAfter: new Date(Date.now() + notAfterDays * 864e5).toISOString(),
      serial: sha256(subject + subjectPublicKey).slice(0, 16),
    };
    const signature = sign(this.keyPair.privateKey, claim);
    return { claim, signature };
  }

  /** Verify a certificate was issued by THIS CA and is internally consistent. */
  validate(cert) {
    if (!cert || !cert.claim || !cert.signature) return false;
    return verify(this.keyPair.publicKey, cert.claim, cert.signature);
  }
}

/** Verify a certificate against a known CA public key. */
function validateCertificate(caPublicKeyPem, cert) {
  if (!cert || !cert.claim || !cert.signature) return false;
  return verify(caPublicKeyPem, cert.claim, cert.signature);
}

module.exports = {
  generateKeyPair,
  sha256,
  stableStringify,
  sign,
  verify,
  CertificateAuthority,
  validateCertificate,
};
