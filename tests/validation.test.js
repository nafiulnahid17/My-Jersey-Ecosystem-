import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProduct, schemas, validate, ValidationError } from '../server/validation.js';

test('accepts a valid contact message', () => {
  const result = validate(schemas.contact, {
    name: 'Customer Name', email: 'customer@example.com', subject: 'Question',
    message: 'This is a real question about a future order.',
  });
  assert.equal(result.email, 'customer@example.com');
});

test('rejects invalid contact data', () => {
  assert.throws(() => validate(schemas.contact, { name: '', email: 'invalid', subject: '', message: 'short' }), ValidationError);
});

test('normalizes a product without seeding catalog data', () => {
  const product = normalizeProduct({
    slug: 'real-product', name: 'Real Product', category: 'Football', active: true,
  });
  assert.equal(product.description, '');
  assert.equal(product.active, true);
  assert.equal(product.base_price, null);
});
