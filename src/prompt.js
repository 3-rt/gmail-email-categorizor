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
