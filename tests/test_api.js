const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  const cookie = res.headers.get('set-cookie');
  return { status: res.status, ok: res.ok, data, cookie, headers: res.headers };
}

async function runTests() {
  console.log('--- Starting StockFlow Automated End-to-End Verification ---');

  // 1. Health check
  const health = await request('/api/health');
  assert.strictEqual(health.status, 200, 'Health check failed');
  console.log('✓ Health check passed');

  // 2. Signup User 1 (Org A)
  const timestamp = Date.now();
  const orgAEmail = `admin_a_${timestamp}@storealpha.com`;
  const signupA = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: orgAEmail,
      password: 'password123',
      confirmPassword: 'password123',
      organizationName: `Store Alpha ${timestamp}`
    })
  });

  assert.strictEqual(signupA.status, 201, 'Signup Org A failed: ' + JSON.stringify(signupA.data));
  const cookieA = signupA.cookie ? signupA.cookie.split(';')[0] : '';
  const orgAId = signupA.data.organization.id;
  console.log(`✓ Org A created: ${signupA.data.organization.name} (ID: ${orgAId})`);

  // 3. Verify Auth Me
  const meA = await request('/api/auth/me', {
    headers: { Cookie: cookieA }
  });
  assert.strictEqual(meA.status, 200, 'Me Org A failed');
  assert.strictEqual(meA.data.user.email, orgAEmail);
  console.log('✓ Auth /me session verified');

  // 4. Fetch Products for Org A (should include seeded starter products)
  const productsA = await request('/api/products', {
    headers: { Cookie: cookieA }
  });
  assert.strictEqual(productsA.status, 200);
  assert(productsA.data.products.length >= 3, 'Expected at least 3 initial products');
  console.log(`✓ Org A has ${productsA.data.products.length} products`);

  // 5. Create a new custom product in Org A
  const createProdA = await request('/api/products', {
    method: 'POST',
    headers: { Cookie: cookieA },
    body: JSON.stringify({
      name: 'Wireless Barcode Scanner',
      sku: `SCAN-${timestamp}`,
      description: 'High-speed 2D QR and barcode scanner',
      quantityOnHand: 4, // Will be low-stock since default threshold is 5
      costPrice: 40.0,
      sellingPrice: 75.0,
      lowStockThreshold: 5
    })
  });
  assert.strictEqual(createProdA.status, 201);
  const newProductId = createProdA.data.product.id;
  console.log(`✓ Created product ${createProdA.data.product.name} (SKU: ${createProdA.data.product.sku})`);

  // 6. Test SKU Uniqueness within the same organization
  const duplicateSkuRes = await request('/api/products', {
    method: 'POST',
    headers: { Cookie: cookieA },
    body: JSON.stringify({
      name: 'Duplicate SKU Product',
      sku: `SCAN-${timestamp}`,
      quantityOnHand: 10
    })
  });
  assert.strictEqual(duplicateSkuRes.status, 400, 'Should reject duplicate SKU in same org');
  console.log('✓ Duplicate SKU validation in same org enforced properly');

  // 7. Check Dashboard for Org A
  const dashA = await request('/api/dashboard', {
    headers: { Cookie: cookieA }
  });
  assert.strictEqual(dashA.status, 200);
  assert(dashA.data.stats.totalProducts >= 4);
  assert(dashA.data.stats.lowStockCount >= 1);
  const foundLowStock = dashA.data.lowStockItems.some(i => i.id === newProductId);
  assert(foundLowStock, 'Newly created product should be flagged as low stock');
  console.log(`✓ Dashboard metrics: Total Products=${dashA.data.stats.totalProducts}, Low Stock Items=${dashA.data.stats.lowStockCount}`);

  // 8. Stock Adjustment (FR-5: Restock +10 units)
  const adjustRes = await request(`/api/products/${newProductId}/adjust-stock`, {
    method: 'POST',
    headers: { Cookie: cookieA },
    body: JSON.stringify({
      delta: 10,
      note: 'Supplier restock received'
    })
  });
  assert.strictEqual(adjustRes.status, 200);
  assert.strictEqual(adjustRes.data.product.quantity_on_hand, 14, 'Quantity should be 4 + 10 = 14');
  console.log('✓ Quick stock adjustment (+10 units) verified: new stock = 14');

  // 9. Verify product detail view (FR-4)
  const detailRes = await request(`/api/products/${newProductId}`, {
    headers: { Cookie: cookieA }
  });
  assert.strictEqual(detailRes.status, 200);
  assert.strictEqual(detailRes.data.product.quantity_on_hand, 14);
  assert.strictEqual(detailRes.data.adjustments.length, 1);
  console.log('✓ Product detail & adjustment history logged');

  // 10. Multi-Tenant Isolation Test (Create Org B)
  const orgBEmail = `admin_b_${timestamp}@storebeta.com`;
  const signupB = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: orgBEmail,
      password: 'password123',
      confirmPassword: 'password123',
      organizationName: `Store Beta ${timestamp}`
    })
  });
  assert.strictEqual(signupB.status, 201);
  const cookieB = signupB.cookie ? signupB.cookie.split(';')[0] : '';
  const orgBId = signupB.data.organization.id;
  assert.notStrictEqual(orgAId, orgBId, 'Orgs must have distinct IDs');

  // Org B can reuse the same SKU name as Org A because SKUs are scoped by org!
  const createSameSkuInB = await request('/api/products', {
    method: 'POST',
    headers: { Cookie: cookieB },
    body: JSON.stringify({
      name: 'Org B Scanner',
      sku: `SCAN-${timestamp}`, // Same SKU as Org A!
      quantityOnHand: 25
    })
  });
  assert.strictEqual(createSameSkuInB.status, 201, 'Same SKU allowed in different org');
  console.log('✓ Per-organization SKU scoping verified');

  // Org B CANNOT read Org A's product!
  const crossTenantRead = await request(`/api/products/${newProductId}`, {
    headers: { Cookie: cookieB }
  });
  assert.strictEqual(crossTenantRead.status, 404, 'Org B must not access Org A product');
  console.log('✓ Multi-tenant isolation verified: Cross-tenant read returned 404');

  // 11. FR-7: Global Settings (Update Org B threshold)
  const updateSettingsB = await request('/api/settings', {
    method: 'PUT',
    headers: { Cookie: cookieB },
    body: JSON.stringify({
      defaultLowStockThreshold: 10,
      name: `Store Beta Updated ${timestamp}`
    })
  });
  assert.strictEqual(updateSettingsB.status, 200);
  assert.strictEqual(updateSettingsB.data.organization.defaultLowStockThreshold, 10);
  console.log('✓ Global Settings updated default threshold to 10');

  // 12. Delete Product in Org A (FR-4 Delete)
  const deleteRes = await request(`/api/products/${newProductId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieA }
  });
  assert.strictEqual(deleteRes.status, 200);
  console.log('✓ Product deletion verified');

  console.log('\n======================================================');
  console.log(' ALL PRD FUNCTIONAL & NON-FUNCTIONAL TESTS PASSED! ');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
