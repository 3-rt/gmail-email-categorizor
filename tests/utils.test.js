import { hashEmail } from '../src/utils.js';

// Simple test runner (no framework — runs in Node)
function assert(condition, msg) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

// Test: deterministic hash
const hash1 = hashEmail('Subject A', 'sender@example.com', 'snippet text');
const hash2 = hashEmail('Subject A', 'sender@example.com', 'snippet text');
assert(hash1 === hash2, 'Same input produces same hash');

// Test: different inputs produce different hashes
const hash3 = hashEmail('Subject B', 'sender@example.com', 'snippet text');
assert(hash1 !== hash3, 'Different input produces different hash');

// Test: returns a string
assert(typeof hash1 === 'string', 'Hash is a string');
assert(hash1.length > 0, 'Hash is not empty');

console.log('All utils tests passed.');
