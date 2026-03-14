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
