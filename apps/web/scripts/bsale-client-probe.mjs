#!/usr/bin/env node
/**
 * bsale-client-probe.mjs — manual reproduction for BSale client creation.
 *
 * WARNING: this script WRITES to the BSale account behind apps/web/.env
 * (production token). It creates up to two test clients named
 * "ONA PROBE ..." and, with --quote, one cotización for the second one.
 * Run it by hand only when you want that; nothing in the repo calls it.
 *
 * Usage (from the repo root):
 *   node <scratchpad>/bsale-client-probe.mjs [--dry-run] [--quote] [--rut 12345678-5]
 *
 *   --dry-run   print the payloads and exit without calling BSale (default is live)
 *   --rut       valid Chilean RUT to use for the "new payload" test client
 *               (default 11111111-1, a formally valid test RUT; BSale may already
 *               have a client with it, in which case the POST reports the conflict)
 *   --quote     after creating the new-payload client, POST a cotización for it
 *               (one comment line, no variant) to confirm documents accept the client
 *
 * Steps:
 *   1. POST /clients.json with the CURRENT payload the web app sends
 *      (code = email, no RUT, no activity) → prints status + raw body.
 *   2. POST /clients.json with the NEW payload (valid RUT as code, activity
 *      "Sin Giro", companyOrPerson 0, isForeigner 0) → prints status + raw body.
 *   3. POST /clients.json with the NEW payload for a FOREIGN guest
 *      (isForeigner 1, passport in code) → prints status + raw body.
 *   4. (--quote) POST /documents.json for the client created in step 2.
 *
 * Clean-up afterwards: DELETE /clients/{id}.json soft-deletes (state 99), or
 * delete the probe clients from the BSale admin UI. Created ids are printed.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const withQuote = args.includes('--quote');
const rutArg = args[args.indexOf('--rut') + 1];
const testRut = args.includes('--rut') && rutArg ? rutArg : '11111111-1';

const repoRoot = findRepoRoot();
const env = loadDotEnv(resolve(repoRoot, 'apps/web/.env'));
const token = env.BSALE_ACCESS_TOKEN;
const base = (env.BSALE_API_BASE_URL || 'https://api.bsale.io/v1').replace(/\/$/, '');
if (!token && !dryRun) {
  console.error('BSALE_ACCESS_TOKEN not found in apps/web/.env');
  process.exit(1);
}

const stamp = Date.now().toString(36);
const emailCurrent = `ona.probe.current.${stamp}@example.com`;
const emailNew = `ona.probe.new.${stamp}@example.com`;
const emailForeign = `ona.probe.foreign.${stamp}@example.com`;

// 1. Exactly what apps/web sends today (toBsaleClientPayload before the fix,
//    after JSON.stringify drops undefined fields).
const currentPayload = {
  firstName: 'ONA PROBE',
  lastName: 'Current payload (delete me)',
  code: emailCurrent,
  email: emailCurrent,
  companyOrPerson: 0
};

// 2. New payload for a Chilean guest.
const newPayload = {
  firstName: 'ONA PROBE',
  lastName: 'New payload (delete me)',
  email: emailNew,
  code: testRut,
  activity: 'Sin Giro',
  companyOrPerson: 0,
  isForeigner: 0
};

// 3. New payload for a foreign guest (passport optional; omit `code` to let
//    BSale assign 55555555-5).
const foreignPayload = {
  firstName: 'ONA PROBE',
  lastName: 'Foreign payload (delete me)',
  email: emailForeign,
  code: 'PROBE-PASS-123',
  activity: 'Sin Giro',
  companyOrPerson: 0,
  isForeigner: 1
};

async function call(method, path, body) {
  const url = `${base}${path}`;
  console.log(`\n→ ${method} ${url}`);
  console.log(JSON.stringify(body, null, 2));
  if (dryRun) {
    console.log('(dry-run: not sent)');
    return { status: 0, json: null };
  }
  const response = await fetch(url, {
    method,
    headers: { access_token: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep raw text
  }
  console.log(`← HTTP ${response.status}`);
  console.log(json ? JSON.stringify(json, null, 2) : text);
  return { status: response.status, json };
}

const created = [];

const step1 = await call('POST', '/clients.json', currentPayload);
if (step1.json?.id) created.push(step1.json.id);

const step2 = await call('POST', '/clients.json', newPayload);
if (step2.json?.id) created.push(step2.json.id);

const step3 = await call('POST', '/clients.json', foreignPayload);
if (step3.json?.id) created.push(step3.json.id);

if (withQuote && step2.json?.id) {
  const today = Math.floor(Date.UTC(
    new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()
  ) / 1000);
  await call('POST', '/documents.json', {
    documentTypeId: env.BSALE_QUOTE_DOCUMENT_TYPE_ID,
    officeId: env.BSALE_OFFICE_ID,
    priceListId: env.BSALE_PRICE_LIST_ID,
    emissionDate: today,
    expirationDate: today + 7 * 86400,
    declareSii: 0,
    sendEmail: 0,
    salesId: `ONA-PROBE-${stamp}`,
    clientId: step2.json.id,
    details: [{ comment: 'ONA PROBE cotización (delete me)', netUnitValue: 1000, quantity: 1 }]
  });
}

console.log('\nCreated client ids (delete from BSale when done):', created.length ? created : 'none');

function findRepoRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    try {
      readFileSync(resolve(dir, 'apps/web/.env'));
      return dir;
    } catch {
      dir = dirname(dir);
    }
  }
  // Fallback: the script lives in the scratchpad, so rely on cwd.
  return resolve(dirname(fileURLToPath(import.meta.url)));
}

function loadDotEnv(path) {
  const out = {};
  let content = '';
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return out;
  }
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
