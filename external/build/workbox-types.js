/**
 * @fileoverview Fetches and preprocesses types from Workbox.
 */

const dtsParse = require('./lib/dts-parse.js');
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

// Just contains SW packages for now.
const workboxPackages = [
  'workbox-background-sync',
  'workbox-broadcast-update',
  'workbox-build',
  'workbox-cacheable-response',
  'workbox-core',
  'workbox-expiration',
  'workbox-google-analytics',
  'workbox-navigation-preload',
  'workbox-precaching',
  'workbox-range-requests',
  'workbox-recipes',
  'workbox-routing',
  'workbox-strategies',
  'workbox-streams',
  // 'workbox-webpack-plugin',
  'workbox-window',
];

/**
 * @param {string[]} packages
 * @param {string} targetDir
 */
async function fetchAndPrepare(packages, targetDir) {
  /** @type {childProcess.ExecFileSyncOptions} */
  const options = {cwd: targetDir, stdio: 'inherit'};

  childProcess.execFileSync('npm', ['install', ...packages], options);

  const versionData = Object.fromEntries(
    packages.map(name => {
      const p = path.join(targetDir, 'node_modules', name, 'package.json');

      /** @type {{version: string}} */
      const packageJson = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return [name, packageJson.version];
    })
  );
  console.warn('fetched', versionData);
}

async function run() {
  const t = tmp.dirSync();
  try {
    await fetchAndPrepare(workboxPackages, t.name);

    const sources = workboxPackages.map(packageName => {
      const packageJsonPath = path.join(
        t.name,
        'node_modules',
        packageName,
        'package.json'
      );
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      return path.join(
        t.name,
        'node_modules',
        packageName,
        packageJson.types || 'index.d.ts'
      );
    });

    const defs = await dtsParse({sources, mode: 'workbox'});
    const outputFile = path.join(__dirname, '../data/workbox-types.json');
    fs.writeFileSync(outputFile, JSON.stringify(defs, undefined, 2));
  } finally {
    fs.rmSync(t.name, {recursive: true});
  }
}

run();
