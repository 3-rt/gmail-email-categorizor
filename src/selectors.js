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
