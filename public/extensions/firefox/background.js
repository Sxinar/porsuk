const api = typeof browser !== 'undefined' ? browser : chrome;
const MENU_ID = 'porsuk-read-current';
const DEFAULT_BASE = 'https://porsuk.vercel.app';

function normalizeBase(url) {
  if (!url) return DEFAULT_BASE;
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_BASE;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '');
  return `https://${trimmed.replace(/\/$/, '')}`;
}

async function getBaseUrl() {
  const stored = await api.storage.sync.get('porsukBaseUrl');
  return normalizeBase(stored.porsukBaseUrl || DEFAULT_BASE);
}

async function openWithPorsuk(targetUrl) {
  if (!targetUrl) return;
  const base = await getBaseUrl();
  const destination = `${base}/?url=${encodeURIComponent(targetUrl)}`;
  await api.tabs.create({ url: destination });
}

api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({
    id: MENU_ID,
    title: 'Porsuk ile Oku',
    contexts: ['page', 'link']
  });
});

api.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const target = info.linkUrl || info.pageUrl || (tab && tab.url);
  void openWithPorsuk(target);
});

api.browserAction.onClicked.addListener((tab) => {
  void openWithPorsuk(tab.url);
});
