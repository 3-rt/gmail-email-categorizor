// tests/categories.test.js
import { DEFAULT_CATEGORIES, validateCategories } from '../src/categories.js';

function assert(condition, msg) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

// Test: default categories exist and include "Other"
assert(Array.isArray(DEFAULT_CATEGORIES), 'DEFAULT_CATEGORIES is an array');
assert(DEFAULT_CATEGORIES.length === 8, 'Has 8 default categories');
const other = DEFAULT_CATEGORIES.find(c => c.name === 'Other');
assert(other !== undefined, 'Other category exists');
assert(other.color === '#9e9e9e', 'Other has gray color');

// Test: validateCategories always keeps "Other"
const withoutOther = [{ name: 'Jobs', color: '#2196f3' }];
const validated = validateCategories(withoutOther);
const hasOther = validated.find(c => c.name === 'Other');
assert(hasOther !== undefined, 'validateCategories adds Other if missing');

// Test: validateCategories does not duplicate Other
const withOther = [
  { name: 'Jobs', color: '#2196f3' },
  { name: 'Other', color: '#9e9e9e' }
];
const validated2 = validateCategories(withOther);
const otherCount = validated2.filter(c => c.name === 'Other').length;
assert(otherCount === 1, 'validateCategories does not duplicate Other');

console.log('All categories tests passed.');
