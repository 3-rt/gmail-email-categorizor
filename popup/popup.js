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
