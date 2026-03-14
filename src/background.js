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
