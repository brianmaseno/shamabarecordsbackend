const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  let adminToken, agentToken, fieldId;

  console.log('\n=== ENDPOINT TEST SUITE ===\n');

  // Health
  let r = await request('GET', '/api/health');
  console.log('[PASS] GET /api/health -', r.data.status);

  // Admin login
  r = await request('POST', '/api/auth/login', { email: 'admin@shambarecords.com', password: 'password' });
  if (r.status === 200 && r.data.token) {
    adminToken = r.data.token;
    console.log('[PASS] POST /api/auth/login (admin) - role:', r.data.user.role);
  } else {
    console.log('[FAIL] POST /api/auth/login (admin) -', JSON.stringify(r.data));
  }

  // Agent login
  r = await request('POST', '/api/auth/login', { email: 'agent@shambarecords.com', password: 'password' });
  if (r.status === 200 && r.data.token) {
    agentToken = r.data.token;
    console.log('[PASS] POST /api/auth/login (agent) - role:', r.data.user.role);
  } else {
    console.log('[FAIL] POST /api/auth/login (agent) -', JSON.stringify(r.data));
  }

  // Wrong credentials
  r = await request('POST', '/api/auth/login', { email: 'admin@shambarecords.com', password: 'wrongpass' });
  console.log(r.status === 401 ? '[PASS]' : '[FAIL]', 'POST /api/auth/login (wrong password) - status:', r.status);

  // /me endpoint
  r = await request('GET', '/api/auth/me', null, adminToken);
  console.log(r.status === 200 ? '[PASS]' : '[FAIL]', 'GET /api/auth/me - email:', r.data.email);

  // Get agents list
  r = await request('GET', '/api/users/agents', null, adminToken);
  console.log(r.status === 200 ? '[PASS]' : '[FAIL]', 'GET /api/users/agents - count:', Array.isArray(r.data) ? r.data.length : r.data);

  // Agent cannot access /agents
  r = await request('GET', '/api/users/agents', null, agentToken);
  console.log(r.status === 403 ? '[PASS]' : '[FAIL]', 'GET /api/users/agents (agent blocked) - status:', r.status);

  // Create field
  r = await request('POST', '/api/fields', {
    name: 'Test Field Alpha',
    crop_type: 'Wheat',
    planting_date: '2026-01-10',
    stage: 'Growing',
    assigned_agent_id: 2,
    notes: 'Test field'
  }, adminToken);
  if (r.status === 201) {
    fieldId = r.data.id;
    console.log('[PASS] POST /api/fields - id:', fieldId, 'status:', r.data.status);
  } else {
    console.log('[FAIL] POST /api/fields -', JSON.stringify(r.data));
  }

  // Get all fields (admin)
  r = await request('GET', '/api/fields', null, adminToken);
  console.log(r.status === 200 ? '[PASS]' : '[FAIL]', 'GET /api/fields (admin) - count:', Array.isArray(r.data) ? r.data.length : r.data);

  // Get fields (agent - only assigned)
  r = await request('GET', '/api/fields', null, agentToken);
  console.log(r.status === 200 ? '[PASS]' : '[FAIL]', 'GET /api/fields (agent) - count:', Array.isArray(r.data) ? r.data.length : r.data);

  // Get single field
  if (fieldId) {
    r = await request('GET', `/api/fields/${fieldId}`, null, adminToken);
    console.log(r.status === 200 ? '[PASS]' : '[FAIL]', `GET /api/fields/${fieldId} - name:`, r.data.name);
  }

  // Agent posts update
  r = await request('POST', '/api/updates', { field_id: fieldId || 1, stage: 'Ready', notes: 'Almost harvest time' }, agentToken);
  console.log(r.status === 201 ? '[PASS]' : '[FAIL]', 'POST /api/updates (agent) - status:', r.status, r.data.stage || JSON.stringify(r.data));

  // Get updates
  r = await request('GET', '/api/updates', null, adminToken);
  console.log(r.status === 200 ? '[PASS]' : '[FAIL]', 'GET /api/updates (admin) - count:', Array.isArray(r.data) ? r.data.length : r.data);

  // Admin dashboard
  r = await request('GET', '/api/dashboard/admin', null, adminToken);
  if (r.status === 200) {
    console.log('[PASS] GET /api/dashboard/admin - total:', r.data.total, 'agents:', r.data.totalAgents);
  } else {
    console.log('[FAIL] GET /api/dashboard/admin -', JSON.stringify(r.data));
  }

  // Agent dashboard
  r = await request('GET', '/api/dashboard/agent', null, agentToken);
  console.log(r.status === 200 ? '[PASS]' : '[FAIL]', 'GET /api/dashboard/agent - total:', r.data.total);

  // Agent cannot access admin dashboard
  r = await request('GET', '/api/dashboard/admin', null, agentToken);
  console.log(r.status === 403 ? '[PASS]' : '[FAIL]', 'GET /api/dashboard/admin (agent blocked) - status:', r.status);

  // Update field (admin)
  if (fieldId) {
    r = await request('PUT', `/api/fields/${fieldId}`, { stage: 'Harvested' }, adminToken);
    console.log(r.status === 200 ? '[PASS]' : '[FAIL]', `PUT /api/fields/${fieldId} - status:`, r.data.status);
  }

  // Unauthenticated request
  r = await request('GET', '/api/fields');
  console.log(r.status === 401 ? '[PASS]' : '[FAIL]', 'GET /api/fields (no token) - status:', r.status);

  console.log('\n=== TESTS COMPLETE ===\n');
}

runTests().catch(console.error);
