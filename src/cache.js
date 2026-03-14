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
