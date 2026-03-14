# Gmail Email Categorizer — Chrome Extension Design

## Overview

A Chrome extension (Manifest V3) that categorizes Gmail emails into user-defined buckets using the Claude API and visually highlights them with colored badges in the inbox view.

## Architecture

Three main components:

1. **Content Script** (`content.js`) — Injected into Gmail pages. Reads email rows (subject, sender, snippet) from the DOM. Applies colored pill badges to categorized emails. Injects a "Categorize" button into Gmail's toolbar.

2. **Service Worker** (`background.js`) — Handles Claude API calls. Receives email data from the content script via `runtime.sendMessage`, sends classification requests, returns categories. Manages a local cache to avoid re-classifying the same emails.

3. **Options/Popup Pages** — Settings UI for API key configuration, category customization (add/remove/rename), and color assignment.

## Data Flow

1. User clicks the "Categorize" button in Gmail's toolbar.
2. Content script extracts from each visible email row: subject line, sender name/address, first ~200 characters of the preview snippet.
3. Content script sends the batch to the service worker via `chrome.runtime.sendMessage`.
4. Service worker filters out already-cached emails, then sends uncached ones to the Claude API in a single batch request.
5. Claude returns a JSON array mapping each email to a category.
6. Service worker caches results and sends them back to the content script.
7. Content script injects colored pill badges next to each email's subject line.

## Claude API Integration

### Prompt Strategy

Emails are batched into a single API call per button press. The prompt dynamically includes the user's configured categories:

```
Classify each email into exactly one category from this list: [Jobs, Promotions, Friends, Finance, Travel, Social Media, Newsletters, Other].

For each email, I provide the subject, sender, and a short snippet.

Return ONLY valid JSON: [{"id": 0, "category": "Jobs"}, ...]
```

### What Gets Sent

Per email:
- Subject line
- Sender name/address
- First ~200 characters of the preview snippet

### Caching

- Results cached in `chrome.storage.local`, keyed by a hash of (subject + sender + snippet).
- Cache entries expire after 7 days.
- Already-cached emails are excluded from API calls.

### Error Handling

- API failures (rate limit, network error, invalid key) display a toast notification in the Gmail UI.
- No silent failures.

## Gmail UI Integration

### Categorize Button

A button injected into Gmail's toolbar area (near the search bar), styled to match Gmail's existing UI. Triggers categorization of all visible emails in the current view.

### Visual Highlights

Each categorized email row gets a small colored pill badge appended next to the subject line, similar to Gmail's native labels.

Default colors:
| Category      | Color  |
|---------------|--------|
| Jobs          | Blue   |
| Promotions    | Red    |
| Friends       | Green  |
| Finance       | Yellow |
| Travel        | Teal   |
| Social Media  | Orange |
| Newsletters   | Purple |
| Other         | Gray   |

### DOM Interaction

- Uses well-known CSS selectors for Gmail inbox email rows (`<tr>` elements in the inbox table).
- Selectors centralized in a single file for easy maintenance when Gmail updates its markup.
- Extension operates on the inbox list view only — does not modify the email detail/reading view.

## Categories & Customization

### Default Categories

Jobs, Promotions, Friends, Finance, Travel, Social Media, Newsletters, Other.

### Options Page

- Add new categories (name + color)
- Remove unwanted categories
- Rename existing categories
- Reassign colors
- "Other" is always present as a fallback and cannot be removed

### Dynamic Prompt Updates

The classification prompt automatically reflects whatever categories the user has configured. Adding or removing a category in settings updates the prompt sent to Claude.

### No Learning

The tool does not learn from corrections or maintain feedback loops. If classification is inaccurate, users adjust category names/descriptions to improve results.

## Extension Structure

```
gmail-email-categorizer/
  manifest.json        # Manifest V3, permissions: activeTab, storage, host permissions
  content.js           # Gmail DOM injection, highlighting, categorize button
  content.css          # Badge/pill styling
  background.js        # Service worker: Claude API calls, caching
  popup.html           # Quick status view
  popup.js
  options.html         # Full settings: API key, categories, colors
  options.js
  selectors.js         # Centralized Gmail DOM selectors
  utils.js             # Hashing, shared utilities
```

### Permissions

- `activeTab` — access to the current Gmail tab
- `storage` — for caching and settings
- Host permissions: `https://mail.google.com/*`, `https://api.anthropic.com/*`

### Tech Stack

- Vanilla JavaScript (no framework)
- CSS for badge styling
- Chrome Extension APIs: `storage.local`, `runtime.sendMessage`

## Security

- API key stored in `chrome.storage.local` (sandboxed per-extension).
- Email data sent directly to `api.anthropic.com` over HTTPS — no intermediary servers.
- No data leaves the extension except to the Anthropic API.

## Testing

- Unit tests for the classification prompt builder and cache logic (hash generation, expiry).
- Manual testing against live Gmail for DOM integration (Gmail's DOM is impractical to mock).
