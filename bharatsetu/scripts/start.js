'use strict';

/**
 * Boot the federation and keep it running, serving the web dashboard from the
 * Central Server. Ctrl-C to stop.
 *
 *   node scripts/start.js
 */

const { bootFederation } = require('../src/cluster');

async function main() {
  console.log('Starting Bharat Setu federation...\n');
  const fed = await bootFederation({ log: (m) => console.log('  ' + m) });

  console.log('\nDashboard:  ' + fed.centralUrl + '/');
  console.log('Registry:   ' + fed.centralUrl + '/registry');
  console.log('Global conf:' + fed.centralUrl + '/globalconf');
  console.log('\nSecurity Servers expose /call, /listClients, /messagelog, /verify-log');
  console.log('\nPress Ctrl-C to stop.');

  const shutdown = async () => {
    console.log('\nShutting down...');
    await fed.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
