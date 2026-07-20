'use strict';

// The dashboard is served by the Central Server, so its origin IS the central URL.
const CENTRAL = window.location.origin;

const state = { registry: null, conf: null, ssByMember: {} };

async function j(url, opts) {
  const res = await fetch(url, opts);
  return res.json();
}

function idStr(id) {
  if (!id) return '';
  const p = [id.instance, id.memberClass, id.memberCode];
  if (id.subsystem) p.push(id.subsystem);
  if (id.service) p.push(id.service);
  if (id.version) p.push(id.version);
  return p.join('/');
}

async function load() {
  state.registry = await j(CENTRAL + '/registry');
  const gc = await j(CENTRAL + '/globalconf');
  state.conf = gc.conf;

  state.ssByMember = {};
  for (const m of state.registry.members) {
    if (m.securityServer) state.ssByMember[idStr(m.id)] = m.securityServer;
  }

  renderKpis();
  renderTrust(gc);
  renderMembers();
  renderLogPicker();
  await refreshLog();
}

function renderKpis() {
  const active = state.registry.members.filter((m) => m.securityServer).length;
  document.getElementById('k-members').textContent = active;
  document.getElementById('k-services').textContent = state.registry.services.length;
  document.getElementById('k-version').textContent = 'v' + state.conf.version;
}

function renderTrust(gc) {
  const el = document.getElementById('trust');
  const fp = (pem) => pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '').slice(0, 32);
  el.innerHTML = `
    <table>
      <tr><th>Central Server</th><td>${gc.conf.centralServer}</td></tr>
      <tr><th>Instance</th><td class="mono">${gc.conf.instance}</td></tr>
      <tr><th>Federation CA</th><td>${gc.conf.ca.name} <span class="mono" style="color:#64748b">· key ${fp(gc.conf.ca.publicKey)}…</span></td></tr>
      <tr><th>Config signature</th><td class="mono status ok">✔ signed by Central Server (${fp(gc.signature)}…)</td></tr>
      <tr><th>Security Servers</th><td>${gc.conf.securityServers.length} registered, each with a CA-issued certificate</td></tr>
    </table>`;
}

function renderMembers() {
  const el = document.getElementById('members');
  el.innerHTML = '';
  for (const m of state.registry.members) {
    const svcs = state.registry.services.filter(
      (s) => idStr({ instance: s.service.instance, memberClass: s.service.memberClass, memberCode: s.service.memberCode }) === idStr(m.id)
    );
    const div = document.createElement('div');
    div.className = 'member';
    div.innerHTML = `
      <span class="pill ${m.id.memberClass}">${m.id.memberClass}</span>
      <span class="id">${idStr(m.id)}</span>
      <h3>${m.name}</h3>
      <div style="font-size:12px;color:#64748b;margin-bottom:6px">
        <span class="dot ${m.securityServer ? 'on' : 'off'}"></span>
        ${m.securityServer ? 'Security Server ' + m.securityServer : 'no Security Server'} · ${m.sector || ''}
      </div>
      ${svcs.map((s) => `<div class="svc"><code>${s.service.service}/${s.service.version}</code> — ${s.title}</div>`).join('') || '<div class="svc" style="color:#94a3b8">consumer only</div>'}
    `;
    el.appendChild(div);
  }
}

// ---- Scenarios --------------------------------------------------------------

const SCENARIOS = {
  'pmayg-eligible': {
    ss: 'IN/GOV/MORD',
    flow: ['MORD/schemes', 'MORD SS', 'UIDAI · CBDT · BR-Revenue'],
    payload: {
      client: { instance: 'IN', memberClass: 'GOV', memberCode: 'MORD', subsystem: 'schemes' },
      service: { instance: 'IN', memberClass: 'GOV', memberCode: 'MORD', subsystem: 'schemes', service: 'pmaygEligibility', version: 'v1' },
      userId: 'officer-2291', issue: 'PMAYG-APP-55012',
      body: { aadhaarRef: '9999-1111-2222', name: 'Sunita Devi', pan: 'PQRSX9876L', stateCode: 'BR', surveyNo: 'PAT-BKT-88/3', applicationId: 'PMAYG-APP-55012', officerId: 'officer-2291' },
    },
  },
  'pmayg-ineligible': {
    ss: 'IN/GOV/MORD',
    flow: ['MORD/schemes', 'MORD SS', 'UIDAI · CBDT · MH-Revenue'],
    payload: {
      client: { instance: 'IN', memberClass: 'GOV', memberCode: 'MORD', subsystem: 'schemes' },
      service: { instance: 'IN', memberClass: 'GOV', memberCode: 'MORD', subsystem: 'schemes', service: 'pmaygEligibility', version: 'v1' },
      body: { aadhaarRef: '9999-3333-4444', name: 'Ramesh Kumar', pan: 'ABCDE1234F', stateCode: 'MH', surveyNo: 'PUN-HAV-114/2', applicationId: 'PMAYG-APP-55013' },
    },
  },
  vehicle: {
    ss: 'IN/GOV/MORD',
    flow: ['MORD/portal', 'MORD SS', 'MoRTH SS', 'VAHAN'],
    payload: {
      client: { instance: 'IN', memberClass: 'GOV', memberCode: 'MORD', subsystem: 'portal' },
      service: { instance: 'IN', memberClass: 'GOV', memberCode: 'MORTH', subsystem: 'vahan', service: 'vehicleDetails', version: 'v1' },
      body: { regNo: 'MH12AB1234' },
    },
  },
  denied: {
    ss: 'IN/GOV/MORD',
    flow: ['MORD/portal', 'MORD SS', 'UIDAI SS ✖'],
    payload: {
      client: { instance: 'IN', memberClass: 'GOV', memberCode: 'MORD', subsystem: 'portal' },
      service: { instance: 'IN', memberClass: 'REG', memberCode: 'UIDAI', subsystem: 'identity', service: 'verifyAadhaar', version: 'v1' },
      body: { aadhaarRef: '9999-1111-2222' },
    },
  },
};

function renderFlow(steps) {
  const el = document.getElementById('flow');
  el.innerHTML = steps
    .map((s, i) => `${i ? '<span class="arrow">→</span>' : ''}<span class="node">${s}</span>`)
    .join('');
}

async function runScenario() {
  const key = document.getElementById('scenario').value;
  const sc = SCENARIOS[key];
  renderFlow(sc.flow);
  const ss = state.ssByMember[sc.ss];
  document.getElementById('result').textContent = '// sending signed request…';
  try {
    const out = await j(ss + '/call', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sc.payload),
    });
    document.getElementById('result').textContent = JSON.stringify(out.ok ? out.data : out, null, 2);
  } catch (e) {
    document.getElementById('result').textContent = 'Error: ' + e.message;
  }
  await refreshLog();
}

// ---- Message log ------------------------------------------------------------

function renderLogPicker() {
  const el = document.getElementById('logpick');
  el.innerHTML = '';
  for (const m of state.registry.members) {
    if (!m.securityServer) continue;
    const o = document.createElement('option');
    o.value = m.securityServer;
    o.textContent = `${m.name} — ${m.securityServer}`;
    el.appendChild(o);
  }
}

async function refreshLog() {
  const ss = document.getElementById('logpick').value;
  if (!ss) return;
  const [log, verify] = await Promise.all([
    j(ss + '/messagelog'),
    j(ss + '/verify-log'),
  ]);
  const v = document.getElementById('logverify');
  v.className = 'status ' + (verify.ok ? 'ok' : 'bad');
  v.textContent = verify.ok ? `✔ chain valid (${verify.count} records)` : `✖ ${verify.reason} @ #${verify.at}`;

  const tb = document.querySelector('#logtable tbody');
  tb.innerHTML = '';
  for (const r of log.records) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${r.seq}</td>
      <td class="mono">${(r.timestamp || '').slice(11, 19)}</td>
      <td><span class="tag ${r.direction}">${(r.direction || '').replace('-', ' ')}</span></td>
      <td class="mono">${idStr(r.client)}</td>
      <td class="mono">${r.service ? r.service.service + '/' + r.service.version : ''}</td>
      <td><span class="tag ${r.status}">${r.status || ''}</span></td>`;
    tb.appendChild(tr);
  }
}

document.getElementById('run').addEventListener('click', runScenario);
document.getElementById('refresh').addEventListener('click', refreshLog);
document.getElementById('logpick').addEventListener('change', refreshLog);

load().catch((e) => {
  document.body.insertAdjacentHTML('afterbegin', '<pre style="color:red">' + e.message + '</pre>');
});
