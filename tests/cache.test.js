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
        if (keys === null) {
          Object.assign(result, store);
        } else {
          for (const key of keys) {
            if (store[key] !== undefined) result[key] = store[key];
          }
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
