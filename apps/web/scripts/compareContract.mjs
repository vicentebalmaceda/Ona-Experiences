/* Ad-hoc contract comparison between the Express API (3002) and the BFF (3003). */
const OLD = 'http://localhost:3002';
const NEW = 'http://localhost:3003';

const checks = [
  { name: 'health', method: 'GET', path: '/health' },
  { name: 'lodges list', method: 'GET', path: '/api/v1/lodges?limit=5&offset=0' },
  { name: 'guides list', method: 'GET', path: '/api/v1/guides?limit=5&offset=0' },
  { name: 'lodges bad limit', method: 'GET', path: '/api/v1/lodges?limit=999' },
  { name: 'lodges bad offset', method: 'GET', path: '/api/v1/lodges?offset=-1' },
  { name: 'lodge bad id', method: 'GET', path: '/api/v1/lodges/abc' },
  { name: 'lodge not found', method: 'GET', path: '/api/v1/lodges/99999999' },
  { name: 'guide not found', method: 'GET', path: '/api/v1/guides/99999999' },
  {
    name: 'sale validation error',
    method: 'POST',
    path: '/api/v1/lodges/1/sales',
    body: { customer: { email: 'not-an-email' }, notes: 'short' }
  },
  {
    name: 'sale product not found',
    method: 'POST',
    path: '/api/v1/lodges/99999999/sales',
    body: {
      customer: { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
      reservationDate: '2026-08-01',
      reservationEndDate: '2026-08-03',
      notes: 'Reserva de prueba para comparación de contrato'
    }
  }
];

async function call(base, check) {
  const response = await fetch(`${base}${check.path}`, {
    method: check.method,
    headers: check.body ? { 'Content-Type': 'application/json' } : {},
    body: check.body ? JSON.stringify(check.body) : undefined
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

let failures = 0;
for (const check of checks) {
  const [oldRes, newRes] = await Promise.all([call(OLD, check), call(NEW, check)]);
  const same =
    oldRes.status === newRes.status &&
    JSON.stringify(oldRes.body) === JSON.stringify(newRes.body);

  if (same) {
    console.log(`PASS  ${check.name} (${oldRes.status})`);
  } else {
    failures += 1;
    console.log(`FAIL  ${check.name}`);
    console.log(`  express: ${oldRes.status} ${JSON.stringify(oldRes.body).slice(0, 400)}`);
    console.log(`  bff:     ${newRes.status} ${JSON.stringify(newRes.body).slice(0, 400)}`);
  }
}

process.exit(failures > 0 ? 1 : 0);
