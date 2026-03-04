'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  AppSettings,
  DEFAULT_SETTINGS,
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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [message, setMessage] = useState('');
  const [extensionCopied, setExtensionCopied] = useState(false);
  const [extensionTarget, setExtensionTarget] = useState<'chrome' | 'firefox'>('chrome');
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettings(loadSettingsFromStorage());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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

  const guideSteps = extensionTarget === 'chrome'
    ? [
        'chrome://extensions veya edge://extensions açın.',
        'Developer mode seçeneğini aktif edin.',
        'Load unpacked ile public/extensions/chrome klasörünü seçin.',
        'Uzantı ayarından hedef adresi kontrol edin: https://porsuk.vercel.app',
        'Bir sayfada sağ tık -> Porsuk ile Oku ile kullanın.',
      ]
    : [
        'about:debugging#/runtime/this-firefox adresini açın.',
        'Load Temporary Add-on seçeneğini tıklayın.',
        'public/extensions/firefox/manifest.json dosyasını seçin.',
        'Uzantı ayarından hedef adresi kontrol edin: https://porsuk.vercel.app',
        'Not: Kalıcı dağıtım için AMO imzalı sürüm gerekir.',
      ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col items-start">
            <Image src="/favicon.ico" alt="Porsuk" width={40} height={40} className="h-10 w-10 rounded-md mb-2" />
            <h1 className="text-3xl font-bold text-amber-600 dark:text-amber-500">Porsuk Ayarları</h1>
          </div>
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
              <Button variant="outline" onClick={() => setShowGuideModal(true)}>
                Kurulum Rehberi
              </Button>
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

      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
            <div className="p-5 border-b border-border flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Kurulum Rehberi</p>
                <h2 className="text-xl font-semibold text-amber-600 dark:text-amber-500">
                  {extensionTarget === 'chrome' ? 'Chrome / Edge / Brave' : 'Firefox'} Uzantı Kurulumu
                </h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowGuideModal(false)}>
                Kapat
              </Button>
            </div>

            <div className="p-5 space-y-3">
              {guideSteps.map((step, index) => (
                <div key={`${index}-${step.slice(0, 15)}`} className="rounded-xl border border-border p-3">
                  <p className="text-sm leading-relaxed">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-600 text-white text-xs mr-2">
                      {index + 1}
                    </span>
                    {step}
                  </p>
                </div>
              ))}

              <div className="pt-2 flex flex-wrap gap-2">
                <a href={`/extensions/${extensionTarget}/README.md`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">Detay Dokuman</Button>
                </a>
                <Button variant="outline" size="sm" onClick={() => setShowGuideModal(false)}>
                  Tamam
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
