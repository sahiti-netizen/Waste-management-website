# भारत सेतु · Bharat Setu

**A working prototype of an [X-Road](https://x-road.global/)–style national data
exchange layer for India** — letting one arm of government securely request data
from another, peer-to-peer, without a central body ever sitting in the data path.

> Estonia's X-Road is the backbone that lets ~1000 public and private
> organisations exchange data over a shared, trusted layer. Bharat Setu models
> the same architecture for the Indian government: ministries, regulators,
> states and local bodies each run a **Security Server** at their edge and
> exchange signed, access-controlled messages directly with one another.

It is written in **plain Node.js with zero external dependencies** (only the
built-in `http` and `crypto` modules), so it runs anywhere Node ≥ 18 is present
and every cryptographic step is real and inspectable.

---

## Quick start

```bash
cd bharatsetu

# Run the scripted cross-government demo (boots the whole federation, prints each hop)
npm run demo

# Or start it and open the live dashboard
npm start
#   -> http://127.0.0.1:7000/

# Run the test suite (unit + end-to-end federation)
npm test
```

No `npm install` is needed — there are no dependencies.

---

## What it demonstrates

| X-Road concept | Bharat Setu component | Where |
|---|---|---|
| **Central Server** — registry + trust, off the data path | `CentralServer` | `src/central/central-server.js` |
| **Signed global configuration** every node trusts | `signedGlobalConf()` / `/globalconf` | same |
| **Security Server** at each member's edge | `SecurityServer` | `src/security-server/security-server.js` |
| **Certificate Authority / PKI** | `CertificateAuthority`, RSA sign/verify | `src/shared/crypto.js` |
| **Standard message protocol & identifiers** | `IN/CLASS/CODE/SUBSYSTEM/SERVICE/vN` | `src/shared/identifiers.js`, `message.js` |
| **Access control** (provider grants per consumer) | `grantAccess` / `isAllowed` | security server |
| **Tamper-evident message log** | hash-chained, signed records | `src/shared/messagelog.js` |
| **Meta / monitoring services** | `/listClients`, `/health`, `/verify-log` | security server |

The headline scenario is a **cross-government welfare eligibility check**: the
Ministry of Rural Development asks a single question — *"is this citizen eligible
for PMAY-G rural housing?"* — and its Security Server fans out, peer-to-peer, to
three different governments (UIDAI for identity, CBDT for income band, the
citizen's State revenue department for the landless test) and composes the answer.

---

## Architecture

```
                        ┌───────────────────────────┐
                        │   Central Server (7000)    │   registry + trust only
                        │   • member registry        │   (NOT in the data path)
                        │   • federation CA           │
                        │   • SIGNED global config    │
                        └────────────┬──────────────┘
                    signed globalconf │ (downloaded & cached by every node)
        ┌───────────────┬────────────┼─────────────┬───────────────┐
        ▼               ▼            ▼              ▼               ▼
  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐   ┌──────────┐
  │ UIDAI SS  │  │  CBDT SS  │  │ MoRTH SS │  │  MH SS   │   │ MORD SS  │
  │  (7101)   │  │  (7102)   │  │  (7103)  │  │  (7104)  │   │  (7106)  │
  └───────────┘  └───────────┘  └──────────┘  └──────────┘   └────┬─────┘
        ▲               ▲                                          │
        │               │        signed, point-to-point           │
        └───────────────┴──────── /exchange requests ─────────────┘
              MORD/schemes → UIDAI, CBDT, State — never via the centre
```

Every message between Security Servers is:

1. **Signed** with the sender's private key and carries its **CA-issued
   certificate**.
2. **Verified** by the receiver: payload hash (integrity) + signature
   (authenticity) + certificate chained to the federation CA (trust).
3. **Access-checked**: the provider must have granted the specific consumer
   subsystem access to the specific service.
4. **Logged** on both ends in a hash-chained, individually signed message log.

The **Central Server is consulted only to download the signed global
configuration** (who is trusted, and which Security Server fronts each member).
Actual data flows straight between the two members involved.

### Identifiers

Modeled on X-Road, adapted to the Indian government structure:

```
Client   IN / <memberClass> / <memberCode> / <subsystem>
Service  IN / <memberClass> / <memberCode> / <subsystem> / <service> / <version>

memberClass ∈ { GOV (Union), STATE, MUN (local body), PSU, REG (regulator) }
```

e.g. `IN/REG/UIDAI/identity/verifyAadhaar/v1`.

---

## The demo federation

| Member | Id | Runs | Service |
|---|---|---|---|
| Unique Identification Authority | `IN/REG/UIDAI` | :7101 | `identity/verifyAadhaar/v1` |
| Central Board of Direct Taxes | `IN/GOV/CBDT` | :7102 | `taxpayer/verifyPAN/v1` |
| Ministry of Road Transport | `IN/GOV/MORTH` | :7103 | `vahan/vehicleDetails/v1` |
| Maharashtra Revenue Dept | `IN/STATE/MH` | :7104 | `bhulekh/landRecord/v1` |
| Bihar Revenue Dept | `IN/STATE/BR` | :7105 | `bhulekh/landRecord/v1` |
| Ministry of Rural Development | `IN/GOV/MORD` | :7106 | `schemes/pmaygEligibility/v1` (orchestrator) |

All members, citizens and records are **fictional**.

---

## HTTP surface

**Central Server** (`:7000`)

| Route | Purpose |
|---|---|
| `GET /globalconf` | signed global configuration |
| `GET /trust-anchor` | keys a Security Server needs to trust the config |
| `GET /registry` | members + service catalogue (for the dashboard) |
| `POST /members`, `/security-servers`, `/services` | registration |
| `GET /` | web dashboard |

**Security Server** (each member port)

| Route | Purpose |
|---|---|
| `POST /call` | local application entrypoint — invoke a remote service |
| `POST /exchange` | inbound peer endpoint — receive a signed request |
| `GET /listClients` | subsystems + services hosted here |
| `GET /messagelog` | recent message-log records |
| `GET /verify-log` | verify the log's hash chain |
| `POST /refresh` | re-download global configuration |

Example — call a service directly:

```bash
curl -s -X POST http://127.0.0.1:7106/call \
  -H 'content-type: application/json' \
  -d '{
    "client":  {"instance":"IN","memberClass":"GOV","memberCode":"MORD","subsystem":"portal"},
    "service": {"instance":"IN","memberClass":"GOV","memberCode":"MORTH","subsystem":"vahan","service":"vehicleDetails","version":"v1"},
    "body":    {"regNo":"MH12AB1234"}
  }'
```

---

## Layout

```
bharatsetu/
├── src/
│   ├── shared/            identifiers, crypto/PKI, message envelope, message log, http
│   ├── central/          Central Server (registry + signed global config)
│   ├── security-server/  Security Server (the only node in the data path)
│   ├── members/          demo federation topology, service handlers, mock datasets
│   ├── dashboard/        zero-dependency web UI (served by the Central Server)
│   └── cluster.js        boots the whole federation in one process
├── scripts/              start.js (serve) · demo.js (scripted walkthrough)
└── test/                 unit + end-to-end tests (node:test)
```

---

## Prototype vs. production

This is a faithful **architectural** model, deliberately kept small and readable.
A production deployment would additionally need: X.509/eIDAS-grade certificates
with OCSP/CRL revocation, RFC 3161 trusted **timestamping** of the message log,
mutual-TLS transport, message-level encryption of payloads, high-availability
Central Servers with a signed configuration *anchor* distribution mechanism,
operational & environmental monitoring, and formal onboarding/governance. The
identifiers, message flow, trust model and access-control semantics here mirror
the real thing so those layers can be added without reshaping the core.

MIT licensed. Inspired by [X-Road](https://x-road.global/) (NIIS) and
[India's API Setu](https://apisetu.gov.in/).
