# Gmail Email Categorizer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that categorizes Gmail emails into colored buckets using the Claude API.

**Architecture:** Manifest V3 Chrome extension with a content script for Gmail DOM interaction, a service worker for Claude API calls and caching, and options/popup pages for configuration. Communication between content script and service worker uses `chrome.runtime.sendMessage`.

**Tech Stack:** Vanilla JavaScript, Chrome Extension APIs (Manifest V3), Claude API (Anthropic), CSS

---

## File Structure

```
gmail-email-categorizer/
  manifest.json         # Extension manifest (Manifest V3)
  src/
    content.js          # Gmail DOM: extract emails, inject button, apply badges
    content.css         # Badge/pill and button styling
    background.js       # Service worker: API calls, caching, message handling
    selectors.js        # Centralized Gmail DOM selectors
    utils.js            # Hash function, shared constants
    prompt.js           # Classification prompt builder
    cache.js            # Cache read/write/expiry logic
    categories.js       # Default categories, category helpers
  popup/
    popup.html          # Quick status popup
    popup.js            # Popup logic
  options/
    options.html        # Settings page
    options.js          # Settings logic (API key, categories, colors)
    options.css         # Settings page styling
  tests/
    utils.test.js       # Tests for hash function
    cache.test.js       # Tests for cache logic
    prompt.test.js      # Tests for prompt builder
    categories.test.js  # Tests for category helpers
```

---

## Chunk 1: Foundation — Utils, Categories, and Project Scaffold

### Task 1: Project Scaffold

**Files:**
- Create: `gmail-email-categorizer/manifest.json`

- [ ] **Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Gmail Email Categorizer",
  "version": "1.0.0",
  "description": "Categorize Gmail emails into colored buckets using AI",
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://mail.google.com/*",
    "https://api.anthropic.com/*"
  ],
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://mail.google.com/*"],
      "js": ["src/selectors.js", "src/utils.js", "src/content.js"],
      "css": ["src/content.css"]
    }
  ],
  "action": {
    "default_popup": "popup/popup.html"
  },
  "options_page": "options/options.html"
}
```

- [ ] **Step 2: Create placeholder files**

Create empty files for every path listed in the file structure above so the extension can load without errors.

- [ ] **Step 3: Commit**

```bash
git add gmail-email-categorizer/
git commit -m "feat: scaffold Chrome extension project structure"
```

---

### Task 2: Utils — Hash Function

**Files:**
- Create: `gmail-email-categorizer/src/utils.js`
- Create: `gmail-email-categorizer/tests/utils.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/utils.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node gmail-email-categorizer/tests/utils.test.js`
Expected: FAIL — `hashEmail` is not defined or module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/utils.js

/**
 * Generate a simple hash string from email metadata.
 * Uses a basic string hash (djb2) — no crypto needed for cache keys.
 */
export function hashEmail(subject, sender, snippet) {
  const input = `${subject}|${sender}|${snippet}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(36);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node gmail-email-categorizer/tests/utils.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gmail-email-categorizer/src/utils.js gmail-email-categorizer/tests/utils.test.js
git commit -m "feat: add email hash utility with tests"
```

---

### Task 3: Categories — Default Categories and Helpers

**Files:**
- Create: `gmail-email-categorizer/src/categories.js`
- Create: `gmail-email-categorizer/tests/categories.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node gmail-email-categorizer/tests/categories.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/categories.js

export const DEFAULT_CATEGORIES = [
  { name: 'Jobs', color: '#2196f3' },
  { name: 'Promotions', color: '#f44336' },
  { name: 'Friends', color: '#4caf50' },
  { name: 'Finance', color: '#ffeb3b' },
  { name: 'Travel', color: '#009688' },
  { name: 'Social Media', color: '#ff9800' },
  { name: 'Newsletters', color: '#9c27b0' },
  { name: 'Other', color: '#9e9e9e' },
];

const OTHER_CATEGORY = { name: 'Other', color: '#9e9e9e' };

export function validateCategories(categories) {
  const hasOther = categories.some(c => c.name === 'Other');
  if (hasOther) return [...categories];
  return [...categories, OTHER_CATEGORY];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node gmail-email-categorizer/tests/categories.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gmail-email-categorizer/src/categories.js gmail-email-categorizer/tests/categories.test.js
git commit -m "feat: add default categories and validation helper"
```

---

## Chunk 2: Cache and Prompt Builder

### Task 4: Cache Logic

**Files:**
- Create: `gmail-email-categorizer/src/cache.js`
- Create: `gmail-email-categorizer/tests/cache.test.js`

The cache module provides `getCached` and `setCached` functions. In production, these use `chrome.storage.local`. For testing, we inject a mock storage object.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/cache.test.js
import { getCached, setCached, clearExpired } from '../src/cache.js';

function assert(condition, msg) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

// Mock chrome.storage.local as a simple in-memory store
function createMockStorage() {
  const store = {};
  return {
    get: (keys) => {
      return new Promise(resolve => {
        const result = {};
        for (const key of keys) {
          if (store[key] !== undefined) result[key] = store[key];
        }
        resolve(result);
      });
    },
    set: (items) => {
      return new Promise(resolve => {
        Object.assign(store, items);
        resolve();
      });
    },
    remove: (keys) => {
      return new Promise(resolve => {
        for (const key of keys) delete store[key];
        resolve();
      });
    },
    _store: store,
  };
}

async function runTests() {
  // Test: cache miss returns null
  const storage1 = createMockStorage();
  const result1 = await getCached('nonexistent', storage1);
  assert(result1 === null, 'Cache miss returns null');

  // Test: set and get a cached value
  const storage2 = createMockStorage();
  await setCached('key1', 'Jobs', storage2);
  const result2 = await getCached('key1', storage2);
  assert(result2 === 'Jobs', 'Cache hit returns stored category');

  // Test: expired entries return null
  const storage3 = createMockStorage();
  // Manually insert an expired entry
  const expiredTime = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
  storage3._store['cache_key2'] = { category: 'Finance', timestamp: expiredTime };
  const result3 = await getCached('key2', storage3);
  assert(result3 === null, 'Expired cache entry returns null');

  // Test: clearExpired removes old entries
  const storage4 = createMockStorage();
  const freshTime = Date.now();
  storage4._store['cache_fresh'] = { category: 'Jobs', timestamp: freshTime };
  storage4._store['cache_old'] = { category: 'Finance', timestamp: expiredTime };
  await clearExpired(storage4);
  assert(storage4._store['cache_fresh'] !== undefined, 'Fresh entry preserved');
  assert(storage4._store['cache_old'] === undefined, 'Expired entry removed');

  console.log('All cache tests passed.');
}

runTests().catch(e => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node gmail-email-categorizer/tests/cache.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/cache.js

const CACHE_PREFIX = 'cache_';
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getStorage(injectedStorage) {
  return injectedStorage || chrome.storage.local;
}

export async function getCached(hashKey, injectedStorage) {
  const storage = getStorage(injectedStorage);
  const fullKey = CACHE_PREFIX + hashKey;
  const result = await storage.get([fullKey]);
  const entry = result[fullKey];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > EXPIRY_MS) return null;
  return entry.category;
}

export async function setCached(hashKey, category, injectedStorage) {
  const storage = getStorage(injectedStorage);
  const fullKey = CACHE_PREFIX + hashKey;
  await storage.set({ [fullKey]: { category, timestamp: Date.now() } });
}

export async function clearExpired(injectedStorage) {
  const storage = getStorage(injectedStorage);
  const all = await storage.get(null);
  const keysToRemove = [];
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(CACHE_PREFIX) && value.timestamp) {
      if (Date.now() - value.timestamp > EXPIRY_MS) {
        keysToRemove.push(key);
      }
    }
  }
  if (keysToRemove.length > 0) {
    await storage.remove(keysToRemove);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node gmail-email-categorizer/tests/cache.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gmail-email-categorizer/src/cache.js gmail-email-categorizer/tests/cache.test.js
git commit -m "feat: add cache logic with expiry and injectable storage"
```

---

### Task 5: Prompt Builder

**Files:**
- Create: `gmail-email-categorizer/src/prompt.js`
- Create: `gmail-email-categorizer/tests/prompt.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node gmail-email-categorizer/tests/prompt.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/prompt.js

export function buildClassificationPrompt(categories, emails) {
  const categoryList = categories.join(', ');

  const emailLines = emails.map((e, i) =>
    `Email ${e.id}:\n  Subject: ${e.subject}\n  From: ${e.sender}\n  Snippet: ${e.snippet}`
  ).join('\n\n');

  return `Classify each email into exactly one category from this list: [${categoryList}].

For each email, I provide the subject, sender, and a short snippet.

Return ONLY valid JSON as an array: [{"id": 0, "category": "Jobs"}, ...]
Do not include any other text.

${emailLines}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node gmail-email-categorizer/tests/prompt.test.js`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gmail-email-categorizer/src/prompt.js gmail-email-categorizer/tests/prompt.test.js
git commit -m "feat: add classification prompt builder with tests"
```

---

## Chunk 3: Service Worker (Background Script)

### Task 6: Gmail DOM Selectors

**Files:**
- Create: `gmail-email-categorizer/src/selectors.js`

- [ ] **Step 1: Write selectors module**

```javascript
// src/selectors.js
// Centralized Gmail DOM selectors.
// If Gmail changes its markup, update only this file.

const SELECTORS = {
  // Inbox email rows
  emailRow: 'tr.zA',
  // Subject span within an email row
  subject: '.bog span',
  // Sender name within an email row
  sender: '.yW span[email]',
  // Snippet text within an email row
  snippet: '.y2',
  // Gmail top toolbar (where we inject the Categorize button)
  toolbar: '.G-atb',
  // Subject cell (where we inject badges)
  subjectCell: '.a4W',
};

// Make available as global for content script (loaded without module type)
if (typeof window !== 'undefined') {
  window.GMAIL_SELECTORS = SELECTORS;
}

// Also export for module usage
if (typeof module !== 'undefined') {
  module.exports = SELECTORS;
}
```

- [ ] **Step 2: Commit**

```bash
git add gmail-email-categorizer/src/selectors.js
git commit -m "feat: add centralized Gmail DOM selectors"
```

---

### Task 7: Background Service Worker

**Files:**
- Create: `gmail-email-categorizer/src/background.js`

This task wires together the cache, prompt builder, and Claude API call.

- [ ] **Step 1: Write the service worker**

```javascript
// src/background.js
import { hashEmail } from './utils.js';
import { getCached, setCached } from './cache.js';
import { buildClassificationPrompt } from './prompt.js';
import { DEFAULT_CATEGORIES, validateCategories } from './categories.js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_BATCH_SIZE = 50;

async function getApiKey() {
  const result = await chrome.storage.local.get(['apiKey']);
  return result.apiKey || null;
}

async function getCategories() {
  const result = await chrome.storage.local.get(['categories']);
  if (result.categories) {
    return validateCategories(result.categories);
  }
  return DEFAULT_CATEGORIES;
}

async function classifyEmails(emails) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return { error: 'API key not configured. Set it in the extension options.' };
  }

  const categories = await getCategories();
  const categoryNames = categories.map(c => c.name);

  // Check cache, separate cached from uncached
  const results = [];
  const uncached = [];

  for (const email of emails) {
    const hash = hashEmail(email.subject, email.sender, email.snippet);
    const cached = await getCached(hash);
    if (cached) {
      results.push({ id: email.id, category: cached });
    } else {
      uncached.push({ ...email, _hash: hash });
    }
  }

  // If everything was cached, return immediately
  if (uncached.length === 0) {
    return { results, fromCache: true };
  }

  // Batch limit
  const batch = uncached.slice(0, MAX_BATCH_SIZE);

  const prompt = buildClassificationPrompt(categoryNames, batch);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { error: `API error (${response.status}): ${errorBody}` };
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { error: 'Failed to parse classification response.' };
    }

    const classifications = JSON.parse(jsonMatch[0]);

    // Cache results and merge with previously cached
    for (const cls of classifications) {
      const email = batch.find(e => e.id === cls.id);
      if (email) {
        await setCached(email._hash, cls.category);
        results.push({ id: cls.id, category: cls.category });
      }
    }

    return { results };
  } catch (err) {
    return { error: `Network error: ${err.message}` };
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CLASSIFY_EMAILS') {
    classifyEmails(message.emails).then(sendResponse);
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_CATEGORIES') {
    getCategories().then(categories => sendResponse({ categories }));
    return true;
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add gmail-email-categorizer/src/background.js
git commit -m "feat: add background service worker with Claude API integration"
```

---

## Chunk 4: Content Script and Styling

### Task 8: Content CSS — Badge and Button Styling

**Files:**
- Create: `gmail-email-categorizer/src/content.css`

- [ ] **Step 1: Write the CSS**

```css
/* content.css — Badge and button styling for Gmail Email Categorizer */

/* Category badge pill */
.gec-badge {
  display: inline-block;
  padding: 1px 8px;
  margin-left: 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  vertical-align: middle;
  white-space: nowrap;
}

/* Categorize button in Gmail toolbar */
.gec-categorize-btn {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  height: 36px;
  margin-left: 8px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: #fff;
  color: #3c4043;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}

.gec-categorize-btn:hover {
  background: #f1f3f4;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.gec-categorize-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Toast notification */
.gec-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #323232;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  z-index: 10000;
  opacity: 0;
  transition: opacity 0.3s;
}

.gec-toast.gec-toast--visible {
  opacity: 1;
}
```

- [ ] **Step 2: Commit**

```bash
git add gmail-email-categorizer/src/content.css
git commit -m "feat: add content CSS for badges, button, and toast"
```

---

### Task 9: Content Script — Email Extraction, Button, and Badges

**Files:**
- Create: `gmail-email-categorizer/src/content.js`

- [ ] **Step 1: Write the content script**

```javascript
// src/content.js
// Gmail Email Categorizer — Content Script
// Injected into Gmail. Reads email metadata, triggers classification,
// and applies colored badge labels.

(function () {
  'use strict';

  const SEL = window.GMAIL_SELECTORS;

  // --- Toast notifications ---

  function showToast(message, durationMs = 4000) {
    const existing = document.querySelector('.gec-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'gec-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('gec-toast--visible'));

    setTimeout(() => {
      toast.classList.remove('gec-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }

  // --- Email extraction ---

  function extractEmails() {
    const rows = document.querySelectorAll(SEL.emailRow);
    const emails = [];

    rows.forEach((row, index) => {
      const subjectEl = row.querySelector(SEL.subject);
      const senderEl = row.querySelector(SEL.sender);
      const snippetEl = row.querySelector(SEL.snippet);

      const subject = subjectEl ? subjectEl.textContent.trim() : '';
      const sender = senderEl
        ? (senderEl.getAttribute('email') || senderEl.textContent.trim())
        : '';
      const snippet = snippetEl
        ? snippetEl.textContent.trim().slice(0, 200)
        : '';

      if (subject || sender) {
        emails.push({ id: index, subject, sender, snippet, _row: row });
      }
    });

    return emails;
  }

  // --- Badge injection ---

  function applyBadges(emails, results, categoryMap) {
    for (const result of results) {
      const email = emails.find(e => e.id === result.id);
      if (!email || !email._row) continue;

      // Remove existing badge if any
      const existing = email._row.querySelector('.gec-badge');
      if (existing) existing.remove();

      const category = categoryMap.find(c => c.name === result.category);
      if (!category) continue;

      const badge = document.createElement('span');
      badge.className = 'gec-badge';
      badge.textContent = result.category;
      badge.style.backgroundColor = category.color;

      const subjectCell = email._row.querySelector(SEL.subjectCell);
      if (subjectCell) {
        subjectCell.appendChild(badge);
      }
    }
  }

  // --- Categorize button ---

  async function handleCategorize(button) {
    button.disabled = true;
    button.textContent = 'Categorizing...';

    try {
      // Get categories for color mapping
      const catResponse = await chrome.runtime.sendMessage({ type: 'GET_CATEGORIES' });
      const categories = catResponse.categories;

      // Extract emails from DOM
      const emails = extractEmails();
      if (emails.length === 0) {
        showToast('No emails found to categorize.');
        return;
      }

      // Send to background for classification (strip DOM refs)
      const emailData = emails.map(({ _row, ...rest }) => rest);
      const response = await chrome.runtime.sendMessage({
        type: 'CLASSIFY_EMAILS',
        emails: emailData,
      });

      if (response.error) {
        showToast(response.error);
        return;
      }

      applyBadges(emails, response.results, categories);

      const cachedNote = response.fromCache ? ' (from cache)' : '';
      showToast(`Categorized ${response.results.length} emails${cachedNote}`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      button.disabled = false;
      button.textContent = 'Categorize';
    }
  }

  function injectButton() {
    // Avoid duplicate buttons
    if (document.querySelector('.gec-categorize-btn')) return;

    const toolbar = document.querySelector(SEL.toolbar);
    if (!toolbar) return;

    const button = document.createElement('button');
    button.className = 'gec-categorize-btn';
    button.textContent = 'Categorize';
    button.addEventListener('click', () => handleCategorize(button));

    toolbar.appendChild(button);
  }

  // --- Initialization ---
  // Gmail is a SPA — the toolbar may not exist on first load.
  // Observe the DOM and inject when the toolbar appears.

  function init() {
    injectButton();

    const observer = new MutationObserver(() => {
      injectButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Commit**

```bash
git add gmail-email-categorizer/src/content.js
git commit -m "feat: add content script with email extraction, badges, and categorize button"
```

---

## Chunk 5: Options Page, Popup, and Final Wiring

### Task 10: Options Page

**Files:**
- Create: `gmail-email-categorizer/options/options.html`
- Create: `gmail-email-categorizer/options/options.js`
- Create: `gmail-email-categorizer/options/options.css`

- [ ] **Step 1: Write options.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gmail Email Categorizer — Settings</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="container">
    <h1>Gmail Email Categorizer</h1>

    <section>
      <h2>API Key</h2>
      <input type="password" id="apiKey" placeholder="Enter your Anthropic API key">
      <button id="saveKey">Save Key</button>
      <span id="keyStatus"></span>
    </section>

    <section>
      <h2>Categories</h2>
      <div id="categoryList"></div>
      <div class="add-category">
        <input type="text" id="newCategoryName" placeholder="Category name">
        <input type="color" id="newCategoryColor" value="#607d8b">
        <button id="addCategory">Add</button>
      </div>
    </section>

    <p class="note">"Other" cannot be removed — it's the fallback category.</p>
  </div>
  <script type="module" src="options.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write options.css**

```css
/* options/options.css */
body {
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  margin: 0;
  padding: 24px;
  background: #f5f5f5;
  color: #202124;
}
.container {
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
h1 { font-size: 20px; margin-top: 0; }
h2 { font-size: 16px; margin-top: 24px; }
input[type="password"], input[type="text"] {
  padding: 8px 12px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 14px;
  width: 300px;
}
input[type="color"] {
  width: 40px; height: 36px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  cursor: pointer;
}
button {
  padding: 8px 16px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  margin-left: 8px;
}
button:hover { background: #f1f3f4; }
button.remove { color: #d93025; border-color: #d93025; }
.category-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}
.category-row .swatch {
  width: 20px; height: 20px;
  border-radius: 50%;
  display: inline-block;
}
.category-row .name { flex: 1; font-size: 14px; }
.add-category { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.note { font-size: 12px; color: #5f6368; margin-top: 16px; }
#keyStatus { margin-left: 8px; font-size: 13px; }
```

- [ ] **Step 3: Write options.js**

```javascript
// options/options.js
import { DEFAULT_CATEGORIES, validateCategories } from '../src/categories.js';

const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKey');
const keyStatus = document.getElementById('keyStatus');
const categoryListEl = document.getElementById('categoryList');
const newNameInput = document.getElementById('newCategoryName');
const newColorInput = document.getElementById('newCategoryColor');
const addCategoryBtn = document.getElementById('addCategory');

// --- Load saved settings ---

async function loadSettings() {
  const result = await chrome.storage.local.get(['apiKey', 'categories']);
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
    keyStatus.textContent = 'Saved';
    keyStatus.style.color = '#188038';
  }
  const categories = result.categories
    ? validateCategories(result.categories)
    : DEFAULT_CATEGORIES;
  renderCategories(categories);
}

// --- API Key ---

saveKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  await chrome.storage.local.set({ apiKey: key });
  keyStatus.textContent = 'Saved';
  keyStatus.style.color = '#188038';
});

// --- Categories ---

function renderCategories(categories) {
  categoryListEl.innerHTML = '';
  for (const cat of categories) {
    const row = document.createElement('div');
    row.className = 'category-row';

    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = cat.color;

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = cat.name;

    row.appendChild(swatch);
    row.appendChild(name);

    if (cat.name !== 'Other') {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => removeCategory(cat.name));
      row.appendChild(removeBtn);
    }

    categoryListEl.appendChild(row);
  }
}

async function getCategories() {
  const result = await chrome.storage.local.get(['categories']);
  return result.categories
    ? validateCategories(result.categories)
    : DEFAULT_CATEGORIES;
}

async function saveCategories(categories) {
  await chrome.storage.local.set({ categories });
  renderCategories(categories);
}

async function removeCategory(name) {
  const categories = await getCategories();
  const filtered = categories.filter(c => c.name !== name);
  await saveCategories(validateCategories(filtered));
}

addCategoryBtn.addEventListener('click', async () => {
  const name = newNameInput.value.trim();
  if (!name) return;
  const color = newColorInput.value;
  const categories = await getCategories();
  if (categories.some(c => c.name === name)) {
    alert('Category already exists.');
    return;
  }
  categories.push({ name, color });
  await saveCategories(categories);
  newNameInput.value = '';
});

// --- Init ---
loadSettings();
```

- [ ] **Step 4: Commit**

```bash
git add gmail-email-categorizer/options/
git commit -m "feat: add options page for API key and category management"
```

---

### Task 11: Popup Page

**Files:**
- Create: `gmail-email-categorizer/popup/popup.html`
- Create: `gmail-email-categorizer/popup/popup.js`

- [ ] **Step 1: Write popup.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      width: 260px;
      padding: 16px;
      margin: 0;
    }
    h3 { margin: 0 0 12px; font-size: 16px; }
    .status { font-size: 13px; color: #5f6368; margin-bottom: 12px; }
    .status.ok { color: #188038; }
    .status.missing { color: #d93025; }
    a {
      display: inline-block;
      margin-top: 8px;
      font-size: 13px;
      color: #1a73e8;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h3>Gmail Email Categorizer</h3>
  <div id="status" class="status">Checking...</div>
  <a href="#" id="openOptions">Settings</a>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write popup.js**

```javascript
// popup/popup.js
const statusEl = document.getElementById('status');
const optionsLink = document.getElementById('openOptions');

async function checkStatus() {
  const result = await chrome.storage.local.get(['apiKey', 'categories']);
  if (result.apiKey) {
    statusEl.textContent = 'API key configured. Ready to categorize.';
    statusEl.className = 'status ok';
  } else {
    statusEl.textContent = 'API key not set. Open Settings to configure.';
    statusEl.className = 'status missing';
  }
}

optionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

checkStatus();
```

- [ ] **Step 3: Commit**

```bash
git add gmail-email-categorizer/popup/
git commit -m "feat: add popup page with status check"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run all unit tests**

```bash
node gmail-email-categorizer/tests/utils.test.js
node gmail-email-categorizer/tests/categories.test.js
node gmail-email-categorizer/tests/cache.test.js
node gmail-email-categorizer/tests/prompt.test.js
```

Expected: All tests PASS.

- [ ] **Step 2: Verify extension loads in Chrome**

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `gmail-email-categorizer/` directory
4. Verify: no errors in the extension card
5. Open Gmail — verify the "Categorize" button appears in the toolbar

- [ ] **Step 3: Manual end-to-end test**

1. Open extension options, enter a valid Anthropic API key
2. Open Gmail inbox
3. Click "Categorize"
4. Verify: colored badges appear next to email subjects
5. Click "Categorize" again — verify results come from cache (toast says "from cache")

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Gmail Email Categorizer Chrome extension v1.0"
```
