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
