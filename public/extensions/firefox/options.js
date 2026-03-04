const api = typeof browser !== 'undefined' ? browser : chrome;
const DEFAULT_BASE = 'https://porsuk.vercel.app';

function normalizeBase(url) {
  if (!url) return DEFAULT_BASE;
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_BASE;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '');
  return `https://${trimmed.replace(/\/$/, '')}`;
}

async function init() {
  const input = document.getElementById('base');
  const status = document.getElementById('status');
  const saveBtn = document.getElementById('save');

  const stored = await api.storage.sync.get('porsukBaseUrl');
  input.value = normalizeBase(stored.porsukBaseUrl || DEFAULT_BASE);

  saveBtn.addEventListener('click', async () => {
    const value = normalizeBase(input.value);
    await api.storage.sync.set({ porsukBaseUrl: value });
    status.textContent = `Kaydedildi: ${value}`;
    status.className = 'ok';
  });
}

void init();
