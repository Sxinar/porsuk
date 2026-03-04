'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AppSettings,
  loadSettingsFromStorage,
  readHistoryFromStorage,
  saveHistoryToStorage,
} from '@/lib/app-settings';

interface TrackerReport {
  totalRemoved: number;
  byType: Record<string, number>;
  domains: Array<{ domain: string; count: number }>;
  scannedElements: number;
  linkParamsRemoved: number;
}

interface ArticleData {
  type: 'article';
  title: string;
  content: string;
  byline: string;
  siteName: string;
  excerpt: string;
  length: number;
  originalUrl: string;
  trackerReport: TrackerReport;
  readingTimeMinutes: number;
  summaryBullets: string[];
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  excerpt: string;
  summary: string;
  image: string;
  source: string;
  readingTimeMinutes: number;
}

interface FeedData {
  type: 'feed';
  title: string;
  description: string;
  itemCount: number;
  items: NewsItem[];
}

interface ListingData {
  type: 'listing';
  title: string;
  description: string;
  siteName: string;
  items: NewsItem[];
  trackerReport: TrackerReport;
}

type ApiResponse = ArticleData | FeedData | ListingData;

const TRACKER_PURPOSES: Record<string, string> = {
  script: 'Kullanıcı davranışı izleme, reklam çağrısı ve analitik amaçlı olabilir.',
  iframe: 'Harici takip/ölçüm servisleri veya gömülü reklam bileşenleri olabilir.',
  img: '1x1 piksel izleme görselleri (tracking pixel) olarak kullanılabilir.',
  link: 'Harici takip stilleri/bağlantı enjektörleri olabilir.',
  source: 'Medya kaynakları üzerinden takipli çağrılar olabilir.',
  noscript: 'JavaScript kapalı durumda bile takip amaçlı içerik taşıyabilir.',
  'cookie-banner': 'Çerez/izin katmanları okuma akışını ve izlemeyi etkileyebilir.',
};

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function parseMultipleUrls(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeDomain(source: string) {
  return source.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
}

function isToday(pubDate: string) {
  if (!pubDate) return false;
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return false;

  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
}

function formatDate(pubDate: string) {
  if (!pubDate) return '';
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return pubDate;
  return parsed.toLocaleString('tr-TR');
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [listing, setListing] = useState<ListingData | null>(null);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettingsFromStorage());
  const [urlHistory, setUrlHistory] = useState<string[]>(() => {
    const initialSettings = loadSettingsFromStorage();
    return initialSettings.enableHistory ? readHistoryFromStorage() : [];
  });
  const [selectedRecommendedUrls, setSelectedRecommendedUrls] = useState<string[]>(() => {
    const initialSettings = loadSettingsFromStorage();
    return initialSettings.selectedRecommendedSourceUrls;
  });
  const [selectedFilterSources, setSelectedFilterSources] = useState<string[]>([]);
  const [todayOnly, setTodayOnly] = useState(false);
  const [silentMode, setSilentMode] = useState(false);
  const [reportExpanded, setReportExpanded] = useState(true);

  useEffect(() => {
    if (!settings.enableHistory) return;
    saveHistoryToStorage(urlHistory);
  }, [settings.enableHistory, urlHistory]);

  useEffect(() => {
    const syncSettings = () => {
      const next = loadSettingsFromStorage();
      setSettings(next);
      setSelectedRecommendedUrls(next.selectedRecommendedSourceUrls);
      if (next.enableHistory) {
        setUrlHistory(readHistoryFromStorage());
      } else {
        setUrlHistory([]);
      }
    };

    window.addEventListener('storage', syncSettings);
    return () => window.removeEventListener('storage', syncSettings);
  }, []);

  const combinedSuggestions = useMemo(() => {
    const history = settings.enableHistory ? urlHistory : [];
    const suggested = settings.showRecommendedSources ? settings.recommendedSources.map((source) => source.url) : [];
    const set = new Set([...history, ...suggested]);
    return Array.from(set);
  }, [settings.enableHistory, settings.recommendedSources, settings.showRecommendedSources, urlHistory]);

  const filteredSuggestions = useMemo(() => {
    const current = url.toLowerCase().trim();
    if (!current) return combinedSuggestions.slice(0, 8);
    return combinedSuggestions
      .filter((candidate) => candidate.toLowerCase().includes(current))
      .slice(0, 8);
  }, [combinedSuggestions, url]);

  const processResponse = useCallback((data: ApiResponse, normalized: string) => {
    if (settings.enableHistory) {
      setUrlHistory((prev) => [normalized, ...prev.filter((item) => item !== normalized)].slice(0, 20));
    }

    if (data.type === 'feed') {
      setFeed(data);
      return;
    }

    if (data.type === 'listing') {
      setListing(data);
      return;
    }

    setArticle(data);
  }, [settings.enableHistory]);

  const processUrl = useCallback(async (targetUrl: string) => {
    const normalized = normalizeUrl(targetUrl);

    if (!normalized) {
      setError('Lütfen bir URL girin');
      return;
    }

    setLoading(true);
    setError('');
    setArticle(null);
    setFeed(null);
    setListing(null);
    setSelectedFilterSources([]);
    setTodayOnly(false);

    try {
      const response = await fetch('/api/porsukla', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalized }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Bir hata oluştu');
      }

      setUrl(normalized);
      const data = (await response.json()) as ApiResponse;
      processResponse(data, normalized);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [processResponse]);

  const processUrlBatch = useCallback(async (targets: string[], title: string, description: string) => {
    if (!targets.length) {
      setError('Önce en az bir URL girin.');
      return;
    }

    setLoading(true);
    setError('');
    setArticle(null);
    setFeed(null);
    setListing(null);
    setSelectedFilterSources([]);
    setTodayOnly(false);

    try {
      const results = await Promise.all(
        targets.map(async (target) => {
          const normalized = normalizeUrl(target);
          if (!normalized) return null;
          const response = await fetch('/api/porsukla', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: normalized }),
          });
          if (!response.ok) return null;
          const data = (await response.json()) as ApiResponse;
          return { normalized, data };
        })
      );

      const valid = results.filter((item): item is { normalized: string; data: ApiResponse } => Boolean(item));
      if (!valid.length) {
        setError('Girilen URL\'lerden içerik alınamadı.');
        return;
      }

      const mergedItems = new Map<string, NewsItem>();
      const trackerSeed: TrackerReport = {
        totalRemoved: 0,
        byType: {},
        domains: [],
        scannedElements: 0,
        linkParamsRemoved: 0,
      };

      for (const entry of valid) {
        if (settings.enableHistory) {
          setUrlHistory((prev) => [entry.normalized, ...prev.filter((item) => item !== entry.normalized)].slice(0, 20));
        }
        if (entry.data.type === 'feed' || entry.data.type === 'listing') {
          for (const item of entry.data.items) {
            if (!mergedItems.has(item.link)) mergedItems.set(item.link, item);
          }
        }
      }

      if (mergedItems.size) {
        setFeed(null);
        setArticle(null);
        setListing({
          type: 'listing',
          title,
          description,
          siteName: 'çoklu-kaynak',
          items: Array.from(mergedItems.values()),
          trackerReport: trackerSeed,
        });
        setUrl(targets.join(', '));
      } else {
        setError('Girilen URL\'lerden listelenebilir haber bulunamadı.');
      }
    } catch {
      setError('URL\'ler toplu işlenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [settings.enableHistory]);

  const processMultipleSources = useCallback(async () => {
    const targets = selectedRecommendedUrls.length ? selectedRecommendedUrls : settings.recommendedSources.map((source) => source.url);
    await processUrlBatch(targets, 'Seçili Kaynaklar', 'Birden fazla kaynaktan birleştirilmiş akış');
  }, [processUrlBatch, selectedRecommendedUrls, settings.recommendedSources]);

  const handlePorsukla = async () => {
    const parts = parseMultipleUrls(url);
    if (parts.length > 1) {
      await processUrlBatch(parts, 'Çoklu URL Sonucu', 'Arama kutusuna girilen birden fazla URL birleştirildi.');
      return;
    }
    await processUrl(url);
  };

  useEffect(() => {
    const queryUrl = new URLSearchParams(window.location.search).get('url');
    if (!queryUrl) return;
    setUrl(queryUrl);
    void processUrl(queryUrl);
  }, [processUrl]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handlePorsukla();
    }
  };

  const trackerRows = article
    ? Object.entries(article.trackerReport.byType)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    : listing
      ? Object.entries(listing.trackerReport.byType)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
      : [];

  const trackerDomains = article?.trackerReport.domains || listing?.trackerReport.domains || [];
  const trackerTotal = article?.trackerReport.totalRemoved || listing?.trackerReport.totalRemoved || 0;
  const activeTrackerReport = article?.trackerReport || listing?.trackerReport || null;

  const newsItems = feed?.items || listing?.items || [];
  const sourceOptions = Array.from(new Set(newsItems.map((item) => normalizeDomain(item.source)))).sort();

  const filteredNewsItems = newsItems.filter((item) => {
    const sourcePass = selectedFilterSources.length === 0 ? true : selectedFilterSources.includes(normalizeDomain(item.source));
    const todayPass = todayOnly ? isToday(item.pubDate) : true;
    return sourcePass && todayPass;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8 relative">
          <div className="absolute right-0 top-0">
            <Link href="/settings">
              <Button variant="outline" size="sm">Ayarlar</Button>
            </Link>
          </div>
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold mb-3 text-amber-600 dark:text-amber-500 flex items-center justify-center gap-3">
              <Image src="/favicon.ico" alt="Porsuk" width={42} height={42} className="h-10 w-10 rounded-md" />
              <span>Porsuk</span>
            </h1>
          </Link>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            İnternetin tozunu pasını kazar, sana sadece huzurlu bir okuma bırakır.
          </p>
        </div>

        <div className="max-w-5xl mx-auto mb-8 space-y-4">
          <Card className="border-amber-800/30 bg-gradient-to-br from-card to-card/40">
            <CardContent className="pt-5 space-y-4">
              <div className="flex gap-3">
            <Input
              type="url"
              list="url-suggestions"
              placeholder="URL girin (çoklu için virgül veya alt satır kullanın)..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={() => void handlePorsukla()} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
              {loading ? 'Porsuklanıyor...' : 'Porsukla'}
            </Button>
              </div>

              {settings.showRecommendedSources && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Öneri Kaynakları (çoklu seçim)</p>
                  <div className="flex flex-wrap gap-2">
                    {settings.recommendedSources.length === 0 && (
                      <p className="text-xs text-muted-foreground">Öneri kaynağı yok. `/settings` sayfasından ekleyebilirsiniz.</p>
                    )}
                    {settings.recommendedSources.map((source) => {
                      const selected = selectedRecommendedUrls.includes(source.url);
                      return (
                        <Button
                          key={source.url}
                          type="button"
                          size="sm"
                          variant={selected ? 'default' : 'outline'}
                          className={selected ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                          onClick={() => {
                            setSelectedRecommendedUrls((prev) =>
                              prev.includes(source.url) ? prev.filter((urlItem) => urlItem !== source.url) : [...prev, source.url]
                            );
                          }}
                        >
                          {source.label}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={processMultipleSources}>
                      Seçilenleri Tara
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRecommendedUrls(settings.recommendedSources.map((source) => source.url))}
                    >
                      Tümünü Seç
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedRecommendedUrls([])}>
                      Seçimi Temizle
                    </Button>
                  </div>
                </div>
              )}

              <datalist id="url-suggestions">
            {combinedSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
              </datalist>

              {filteredSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setUrl(suggestion)}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
                </div>
              )}
            </CardContent>
          </Card>

          {(feed || listing) && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Kaynak Filtresi (çoklu seçim)</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={selectedFilterSources.length === 0 ? 'default' : 'outline'}
                      className={selectedFilterSources.length === 0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                      onClick={() => setSelectedFilterSources([])}
                    >
                      Tüm Kaynaklar
                    </Button>
                    {sourceOptions.map((source) => (
                      <Button
                        key={source}
                        size="sm"
                        variant={selectedFilterSources.includes(source) ? 'default' : 'outline'}
                        className={selectedFilterSources.includes(source) ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                        onClick={() =>
                          setSelectedFilterSources((prev) =>
                            prev.includes(source) ? prev.filter((item) => item !== source) : [...prev, source]
                          )
                        }
                      >
                        {source}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={todayOnly ? 'default' : 'outline'}
                    onClick={() => setTodayOnly((prev) => !prev)}
                    className={todayOnly ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                  >
                    Bugünün Haberleri
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={silentMode ? 'default' : 'outline'}
                    onClick={() => setSilentMode((prev) => !prev)}
                    className={silentMode ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                  >
                    Sessiz Mod
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedFilterSources([])}>
                    Filtreyi Sıfırla
                  </Button>
                  <p className="text-xs text-muted-foreground">Filtre sonrası: {filteredNewsItems.length} kayıt</p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
        </div>

        {loading && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
        )}

        {(feed || listing) && !loading && (
          <div className="max-w-6xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-amber-700 dark:text-amber-400">{feed?.title || listing?.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{feed?.description || listing?.description}</p>
                <p className="text-xs text-muted-foreground">Toplam kayıt: {filteredNewsItems.length}</p>
              </CardHeader>
              <CardContent>
                {filteredNewsItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Filtreye uygun haber bulunamadı.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredNewsItems.map((item) => (
                      <article key={item.link} className="border border-border rounded-lg p-4 bg-card hover:border-amber-500/40 transition-colors">
                        {!silentMode && item.image && (
                          <div className="relative w-full h-36 mb-3 overflow-hidden rounded-md">
                            <Image src={item.image} alt={item.title} fill className="object-cover" unoptimized />
                          </div>
                        )}

                        <p className="font-semibold leading-snug mb-2">{item.title}</p>

                        <div className="flex flex-wrap gap-2 mb-2 text-xs text-muted-foreground">
                          <span className="px-2 py-1 rounded-full bg-muted">{normalizeDomain(item.source)}</span>
                          <span className="px-2 py-1 rounded-full bg-muted">{item.readingTimeMinutes} dk</span>
                          {item.pubDate && <span className="px-2 py-1 rounded-full bg-muted">{formatDate(item.pubDate)}</span>}
                        </div>

                        {!silentMode && item.summary && <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>}

                        <Button size="sm" onClick={() => void processUrl(item.link)} className="bg-amber-600 hover:bg-amber-700 text-white">
                          Haberi Oku
                        </Button>
                      </article>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {article && !loading && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400">{article.title}</CardTitle>
                  {article.byline && <p className="text-muted-foreground">{article.byline}</p>}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-1 rounded-full bg-muted">{article.siteName}</span>
                    <span className="px-2 py-1 rounded-full bg-muted">{article.readingTimeMinutes} dk okuma</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-w-none article-content text-[16px]" dangerouslySetInnerHTML={{ __html: article.content }} />
                {article.excerpt && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-sm text-muted-foreground italic">{article.excerpt}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {article.summaryBullets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-amber-700 dark:text-amber-400">Haber Özeti</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-muted-foreground">
                    {article.summaryBullets.map((bullet, index) => (
                      <li key={`${index}-${bullet.slice(0, 20)}`}>{bullet}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {settings.showAnalysis && (article || listing) && !loading && (
          <div className="max-w-4xl mx-auto mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-xl text-amber-700 dark:text-amber-400">Analiz ve Arındırma Raporu</CardTitle>
                  <Button type="button" size="sm" variant="outline" onClick={() => setReportExpanded((prev) => !prev)}>
                    {reportExpanded ? 'Detayı Gizle' : 'Detayı Göster'}
                  </Button>
                </div>
              </CardHeader>
              {reportExpanded && activeTrackerReport && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border border-border rounded-md p-3">
                      <p className="text-xs text-muted-foreground">Temizlenen Öğe</p>
                      <p className="text-lg font-semibold">{trackerTotal}</p>
                    </div>
                    <div className="border border-border rounded-md p-3">
                      <p className="text-xs text-muted-foreground">Taranan Öğe</p>
                      <p className="text-lg font-semibold">{activeTrackerReport.scannedElements}</p>
                    </div>
                    <div className="border border-border rounded-md p-3">
                      <p className="text-xs text-muted-foreground">Temizlenen URL Parametresi</p>
                      <p className="text-lg font-semibold">{activeTrackerReport.linkParamsRemoved}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Bu rapor neden var?</p>
                    <p className="text-sm text-muted-foreground">
                      Amaç, sayfadaki potansiyel takip mekanizmalarını şeffaf biçimde göstermek ve hangi öğelerin neden temizlendiğini görünür kılmaktır.
                    </p>
                  </div>

                  {trackerRows.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Temizlenen türler ve amaçları</p>
                      <div className="space-y-2">
                        {trackerRows.map((row) => (
                          <div key={row.type} className="border border-border rounded-md p-3">
                            <p className="text-sm font-medium">
                              {row.type} ({row.count})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {TRACKER_PURPOSES[row.type] || 'Bu öğe, sayfa takibini veya okuma deneyimini etkileyebileceği için temizlenir.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trackerDomains.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">En çok temizlenen tracker alan adları</p>
                      <div className="flex flex-wrap gap-2">
                        {trackerDomains.map((domainRow) => (
                          <span key={domainRow.domain} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            {domainRow.domain} ({domainRow.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {!article && !feed && !listing && !loading && !error && (
          <div className="text-center py-12">
            <div className="mb-4 flex justify-center">
              <Image src="/favicon.ico" alt="Porsuk" width={56} height={56} className="h-14 w-14 rounded-xl" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-amber-600 dark:text-amber-500">Temiz bir okuma deneyimi için hazır</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              URL veya RSS girin. Kaynak filtreleyin, bugünün haberlerine bakın, sessiz moda geçin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
