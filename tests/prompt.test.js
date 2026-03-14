// tests/prompt.test.js
import { buildClassificationPrompt } from '../src/prompt.js';

function assert(condition, msg) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

const categories = ['Jobs', 'Promotions', 'Other'];
const emails = [
  { id: 0, subject: 'Software Engineer Role', sender: 'hr@company.com', snippet: 'We are excited to...' },
  { id: 1, subject: '50% off sale!', sender: 'shop@store.com', snippet: 'Limited time offer...' },
];

const result = buildClassificationPrompt(categories, emails);

// Test: prompt includes all categories
assert(result.includes('Jobs'), 'Prompt includes Jobs');
assert(result.includes('Promotions'), 'Prompt includes Promotions');
assert(result.includes('Other'), 'Prompt includes Other');

// Test: prompt includes email data
assert(result.includes('Software Engineer Role'), 'Prompt includes first email subject');
assert(result.includes('hr@company.com'), 'Prompt includes first email sender');
assert(result.includes('50% off sale!'), 'Prompt includes second email subject');

// Test: prompt requests JSON output
assert(result.includes('JSON'), 'Prompt requests JSON output');

// Test: empty email list
const emptyResult = buildClassificationPrompt(categories, []);
assert(emptyResult.includes('Jobs'), 'Empty list prompt still includes categories');

console.log('All prompt tests passed.');
