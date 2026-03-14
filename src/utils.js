// Utility functions

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
