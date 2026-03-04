'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AppSettings,
  DEFAULT_SOURCES,
  clearHistoryInStorage,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  sanitizeSettings,
} from '@/lib/app-settings';

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettingsFromStorage());
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [message, setMessage] = useState('');
  const [extensionCopied, setExtensionCopied] = useState(false);
  const [extensionTarget, setExtensionTarget] = useState<'chrome' | 'firefox'>('chrome');

  const persist = (next: AppSettings) => {
    const safe = sanitizeSettings(next);
    setSettings(safe);
    saveSettingsToStorage(safe);
  };

  const addSource = () => {
    const label = sourceLabel.trim();
    const url = normalizeUrl(sourceUrl);

    if (!label || !url) {
      setMessage('Kaynak adı ve URL gerekli.');
      return;
    }

    const alreadyExists = settings.recommendedSources.some((item) => item.url === url);
    if (alreadyExists) {
      setMessage('Bu kaynak zaten listede.');
      return;
    }

    persist({
      ...settings,
      recommendedSources: [...settings.recommendedSources, { label, url }],
      selectedRecommendedSourceUrls: [...settings.selectedRecommendedSourceUrls, url],
    });
    setSourceLabel('');
    setSourceUrl('');
    setMessage('Kaynak eklendi.');
  };

  const removeSource = (url: string) => {
    persist({
      ...settings,
      recommendedSources: settings.recommendedSources.filter((item) => item.url !== url),
      selectedRecommendedSourceUrls: settings.selectedRecommendedSourceUrls.filter((item) => item !== url),
    });
    setMessage('Kaynak kaldırıldı.');
  };

  const toggleSourceSelection = (url: string) => {
    const selected = settings.selectedRecommendedSourceUrls.includes(url);
    const nextSelected = selected
      ? settings.selectedRecommendedSourceUrls.filter((item) => item !== url)
      : [...settings.selectedRecommendedSourceUrls, url];

    persist({
      ...settings,
      selectedRecommendedSourceUrls: nextSelected,
    });
  };

  const selectAllSources = () => {
    persist({
      ...settings,
      selectedRecommendedSourceUrls: settings.recommendedSources.map((source) => source.url),
    });
    setMessage('Tüm kaynaklar seçildi.');
  };

  const clearSourceSelection = () => {
    persist({
      ...settings,
      selectedRecommendedSourceUrls: [],
    });
    setMessage('Kaynak seçimleri temizlendi.');
  };

  const mergeRecommendedPack = () => {
    const existingByUrl = new Map(settings.recommendedSources.map((source) => [source.url, source]));
    for (const source of DEFAULT_SOURCES) {
      if (!existingByUrl.has(source.url)) {
        existingByUrl.set(source.url, source);
      }
    }

    const mergedSources = Array.from(existingByUrl.values());
    const nextSelected = Array.from(
      new Set([...settings.selectedRecommendedSourceUrls, ...DEFAULT_SOURCES.map((source) => source.url)])
    );

    persist({
      ...settings,
      recommendedSources: mergedSources,
      selectedRecommendedSourceUrls: nextSelected.filter((url) => mergedSources.some((source) => source.url === url)),
    });
    setMessage('Önerilen kaynak paketi eklendi/güncellendi.');
  };

  const toggleHistory = () => {
    const next = {
      ...settings,
      enableHistory: !settings.enableHistory,
    };
    persist(next);
    setMessage(next.enableHistory ? 'Geçmiş kaydı açıldı.' : 'Geçmiş kaydı kapatıldı.');
  };

  const clearHistory = () => {
    clearHistoryInStorage();
    setMessage('Geçmiş tamamen temizlendi.');
  };

  const toggleAnalysis = () => {
    const next = {
      ...settings,
      showAnalysis: !settings.showAnalysis,
    };
    persist(next);
    setMessage(next.showAnalysis ? 'Analiz sonuçları açıldı.' : 'Analiz sonuçları kapatıldı.');
  };

  const toggleRecommendedSources = () => {
    const next = {
      ...settings,
      showRecommendedSources: !settings.showRecommendedSources,
    };
    persist(next);
    setMessage(next.showRecommendedSources ? 'Öneri kaynakları görünür.' : 'Öneri kaynakları gizlendi.');
  };

  const copyExtensionReadmePath = async () => {
    if (typeof window === 'undefined') return;
    const absolute = `${window.location.origin}/extensions/${extensionTarget}/README.md`;
    await navigator.clipboard.writeText(absolute);
    setExtensionCopied(true);
    setTimeout(() => setExtensionCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-amber-600 dark:text-amber-500">Porsuk Ayarları</h1>
          <Link href="/">
            <Button variant="outline">Ana Sayfa</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Öneri Kaynakları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 border border-border rounded-md p-3">
              <div>
                <p className="font-medium">Ana Sayfada Öneri Kaynaklarını Göster</p>
                <p className="text-xs text-muted-foreground">Kapalıysa öneri butonları ana sayfada görünmez.</p>
              </div>
              <Button
                variant={settings.showRecommendedSources ? 'default' : 'outline'}
                className={settings.showRecommendedSources ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                onClick={toggleRecommendedSources}
              >
                {settings.showRecommendedSources ? 'Açık' : 'Kapalı'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                placeholder="Kaynak adı (örn: Artado)"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
              />
              <Input
                placeholder="Kaynak URL (örn: forum.artado.xyz/)"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
              <Button onClick={addSource} className="bg-amber-600 hover:bg-amber-700 text-white">
                Kaynak Ekle
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 pb-2">
                <Button size="sm" variant="outline" onClick={mergeRecommendedPack}>
                  Önerilenleri Ekle
                </Button>
                <Button size="sm" variant="outline" onClick={selectAllSources}>
                  Tümünü Seç
                </Button>
                <Button size="sm" variant="outline" onClick={clearSourceSelection}>
                  Seçimi Temizle
                </Button>
              </div>
              {settings.recommendedSources.map((source) => (
                <div key={source.url} className="border border-border rounded-md p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{source.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={settings.selectedRecommendedSourceUrls.includes(source.url) ? 'default' : 'outline'}
                      className={settings.selectedRecommendedSourceUrls.includes(source.url) ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                      onClick={() => toggleSourceSelection(source.url)}
                    >
                      {settings.selectedRecommendedSourceUrls.includes(source.url) ? 'Seçili' : 'Seç'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => removeSource(source.url)}>
                      Kaldır
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gizlilik ve Görünüm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 border border-border rounded-md p-3">
              <div>
                <p className="font-medium">Geçmiş Kaydı</p>
                <p className="text-xs text-muted-foreground">Kapalıysa ana sayfada URL geçmişi tutulmaz.</p>
              </div>
              <Button
                variant={settings.enableHistory ? 'default' : 'outline'}
                className={settings.enableHistory ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                onClick={toggleHistory}
              >
                {settings.enableHistory ? 'Açık' : 'Kapalı'}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 border border-border rounded-md p-3">
              <div>
                <p className="font-medium">Analiz Sonuçları</p>
                <p className="text-xs text-muted-foreground">Kapalıysa ana sayfada analiz/arındırma raporu görünmez.</p>
              </div>
              <Button
                variant={settings.showAnalysis ? 'default' : 'outline'}
                className={settings.showAnalysis ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                onClick={toggleAnalysis}
              >
                {settings.showAnalysis ? 'Açık' : 'Kapalı'}
              </Button>
            </div>

            <Button variant="outline" onClick={clearHistory}>
              Geçmişi Temizle
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarayıcı Uzantısı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tarayıcınızı seçin, ayrı hazırlanmış paketi indirin ve rehberden kurun.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={extensionTarget === 'chrome' ? 'default' : 'outline'}
                className={extensionTarget === 'chrome' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                onClick={() => setExtensionTarget('chrome')}
              >
                Chrome / Edge / Brave
              </Button>
              <Button
                variant={extensionTarget === 'firefox' ? 'default' : 'outline'}
                className={extensionTarget === 'firefox' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                onClick={() => setExtensionTarget('firefox')}
              >
                Firefox
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`/extensions/${extensionTarget}/README.md`} target="_blank" rel="noreferrer">
                <Button variant="outline">Kurulum Rehberi</Button>
              </a>
              <a
                href={extensionTarget === 'chrome'
                  ? '/extensions/chrome/porsuk-chrome-extension.zip'
                  : '/extensions/firefox/porsuk-firefox-extension.zip'}
                download
              >
                <Button variant="outline">ZIP İndir</Button>
              </a>
              <Button variant="outline" onClick={() => void copyExtensionReadmePath()}>
                Rehber Yolunu Kopyala
              </Button>
              {extensionCopied && <span className="text-xs text-muted-foreground">Kopyalandı</span>}
            </div>
            {extensionTarget === 'firefox' && (
              <div className="border border-amber-600/30 rounded-md p-3 bg-amber-950/20">
                <p className="text-sm">
                  Firefox, doğrulanmamış uzantıları normal kurulumda engeller. Geçici yükleme için:
                  `about:debugging#/runtime/this-firefox` üzerinden `manifest.json` seçin.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kalıcı dağıtım için eklentiyi AMO (addons.mozilla.org) üzerinden imzalatmak gerekir.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              GitHub dağıtımı için `public/extensions/chrome` ve `public/extensions/firefox` klasörlerini ayrı release asset olarak yayınlayabilirsiniz.
            </p>
          </CardContent>
        </Card>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
