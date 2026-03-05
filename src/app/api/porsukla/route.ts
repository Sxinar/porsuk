import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface TrackerReport {
  totalRemoved: number;
  byType: Record<string, number>;
  domains: Array<{ domain: string; count: number }>;
  scannedElements: number;
  linkParamsRemoved: number;
}

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  excerpt: string;
  summary: string;
  image: string;
  source: string;
  readingTimeMinutes: number;
}

interface ListingItem {
  title: string;
  link: string;
  excerpt: string;
  summary: string;
  image: string;
  source: string;
  pubDate: string;
  readingTimeMinutes: number;
}

const TRACKER_PATTERNS = [
  'googletagmanager.com',
  'google-analytics.com',
  'doubleclick.net',
  'googlesyndication.com',
  'facebook.net',
  'connect.facebook.net',
  'analytics',
  'pixel',
  'hotjar',
  'mixpanel',
  'segment',
  'matomo',
  'clarity.ms',
  'taboola',
  'outbrain',
  'adservice',
  'adsystem',
  'optimizely',
  'quantserve',
  'scorecardresearch',
];

function wordsToMinutesFromText(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function cleanSnippet(raw: string) {
  if (!raw) return '';
  const fragment = new JSDOM(`<body>${raw}</body>`);
  return (fragment.window.document.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function normalizeSourceDomain(input: string) {
  try {
    const host = new URL(input).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return input.toLowerCase().replace(/^www\./, '');
  }
}

function summaryFromText(raw: string) {
  const clean = cleanSnippet(raw);
  if (!clean) return '';

  const parts = clean
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 20)
    .slice(0, 2);

  if (parts.length > 0) {
    return parts.join(' ');
  }

  return clean.slice(0, 180);
}

function extractImageFromNode(node: Element, baseUrl: string) {
  const direct =
    node.querySelector('media\\:content')?.getAttribute('url') ||
    node.querySelector('enclosure[type^="image/"]')?.getAttribute('url') ||
    node.querySelector('img')?.getAttribute('src') ||
    '';

  if (!direct) return '';

  try {
    return new URL(direct, baseUrl).toString();
  } catch {
    return '';
  }
}

function isLikelyFeed(raw: string, contentType: string) {
  const body = raw.slice(0, 2500).toLowerCase();
  return (
    contentType.includes('xml') ||
    body.includes('<rss') ||
    body.includes('<feed') ||
    body.includes('<rdf:rdf')
  );
}

function parseFeed(raw: string, baseUrl: string) {
  const xmlDom = new JSDOM(raw, { contentType: 'text/xml', url: baseUrl });
  const document = xmlDom.window.document;

  const rssItems = Array.from(document.querySelectorAll('channel > item'));
  const atomItems = Array.from(document.querySelectorAll('feed > entry'));
  const sourceItems = rssItems.length ? rssItems : atomItems;

  const feedTitle = cleanSnippet(
    document.querySelector('channel > title')?.textContent?.trim() ||
      document.querySelector('feed > title')?.textContent?.trim() ||
      new URL(baseUrl).hostname
  );

  const feedDescription = cleanSnippet(
    document.querySelector('channel > description')?.textContent?.trim() ||
      document.querySelector('feed > subtitle')?.textContent?.trim() ||
      ''
  );

  const items: FeedItem[] = sourceItems
    .map((item) => {
      const title = item.querySelector('title')?.textContent?.trim() || 'Başlıksız';

      const rssLink = item.querySelector('link')?.textContent?.trim() || '';
      const atomLink =
        item.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
        item.querySelector('link')?.getAttribute('href') ||
        '';
      const rawLink = rssLink || atomLink;

      const link = rawLink ? new URL(rawLink, baseUrl).toString() : '';

      const pubDate =
        item.querySelector('pubDate')?.textContent?.trim() ||
        item.querySelector('published')?.textContent?.trim() ||
        item.querySelector('updated')?.textContent?.trim() ||
        '';

      const excerptRaw =
        item.querySelector('description')?.textContent?.trim() ||
        item.querySelector('summary')?.textContent?.trim() ||
        item.querySelector('content')?.textContent?.trim() ||
        '';

      const safeExcerpt = cleanSnippet(excerptRaw).slice(0, 280);
      const summary = summaryFromText(safeExcerpt || title);
      const image = extractImageFromNode(item, baseUrl);
      const source = normalizeSourceDomain(link || baseUrl);
      const readingTimeMinutes = wordsToMinutesFromText(`${title} ${safeExcerpt}`);

      return {
        title,
        link,
        pubDate,
        excerpt: safeExcerpt,
        summary,
        image,
        source,
        readingTimeMinutes,
      };
    })
    .filter((item) => item.link)
    .slice(0, 50);

  return {
    type: 'feed' as const,
    title: feedTitle,
    description: feedDescription,
    itemCount: items.length,
    items,
  };
}

function removeTrackers(document: Document, pageUrl: string): TrackerReport {
  const byType: Record<string, number> = {};
  const domains: Record<string, number> = {};
  let totalRemoved = 0;
  let scannedElements = 0;

  const addRemoval = (type: string, resourceUrl: string) => {
    totalRemoved += 1;
    byType[type] = (byType[type] || 0) + 1;

    if (resourceUrl) {
      try {
        const domain = new URL(resourceUrl, pageUrl).hostname;
        domains[domain] = (domains[domain] || 0) + 1;
      } catch {
        // Ignore invalid URLs.
      }
    }
  };

  const candidates = Array.from(document.querySelectorAll('script, iframe, img, link, source, noscript'));
  scannedElements = candidates.length;

  for (const node of candidates) {
    const sourceUrl =
      node.getAttribute('src') ||
      node.getAttribute('href') ||
      node.getAttribute('data-src') ||
      '';

    const idClass = `${node.id} ${node.className}`.toLowerCase();
    const sourceLower = sourceUrl.toLowerCase();

    const isTrackerResource = TRACKER_PATTERNS.some((pattern) => sourceLower.includes(pattern));
    const isCookieBanner = /cookie|consent|gdpr|onetrust/.test(idClass);

    const widthAttr = Number(node.getAttribute('width') || 0);
    const heightAttr = Number(node.getAttribute('height') || 0);
    const styleAttr = (node.getAttribute('style') || '').toLowerCase();

    const isPixel =
      (widthAttr === 1 && heightAttr === 1) ||
      styleAttr.includes('width:1px') ||
      styleAttr.includes('height:1px');

    if (isTrackerResource || isCookieBanner || isPixel) {
      const type = node.tagName.toLowerCase();
      addRemoval(type, sourceUrl);
      node.remove();
    }
  }

  for (const el of Array.from(document.querySelectorAll('[id*="cookie"], [class*="cookie"], [id*="consent"], [class*="consent"]'))) {
    addRemoval('cookie-banner', '');
    el.remove();
  }

  const domainList = Object.entries(domains)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRemoved,
    byType,
    domains: domainList,
    scannedElements,
    linkParamsRemoved: 0,
  };
}

function stripTrackingParamsFromLinks(html: string, pageUrl: string) {
  const contentDom = new JSDOM(`<body>${html}</body>`, { url: pageUrl });
  const document = contentDom.window.document;

  const trackingKeys = ['fbclid', 'gclid', 'mc_cid', 'mc_eid', 'igshid', 'si'];

  let removedParams = 0;

  for (const anchor of Array.from(document.querySelectorAll('a[href]'))) {
    const href = anchor.getAttribute('href');
    if (!href) continue;

    try {
      const parsed = new URL(href, pageUrl);
      const keys = Array.from(parsed.searchParams.keys());

      for (const key of keys) {
        if (key.startsWith('utm_') || trackingKeys.includes(key)) {
          parsed.searchParams.delete(key);
          removedParams += 1;
        }
      }

      anchor.setAttribute('href', parsed.toString());
    } catch {
      // Ignore malformed URLs.
    }
  }

  return {
    html: document.body.innerHTML,
    removedParams,
  };
}

function enhanceContent(content: string) {
  let html = content || '';
  html = html.replace(/<\/p>\s*<p>/g, '</p><p class="mb-4">');
  html = html.replace(/<(h[1-6])>/g, '<$1 class="mt-6 mb-3">');
  html = html.replace(/<ul>/g, '<ul class="ml-6 mb-4 list-disc">');
  html = html.replace(/<ol>/g, '<ol class="ml-6 mb-4 list-decimal">');
  html = html.replace(/<blockquote>/g, '<blockquote class="border-l-4 border-amber-600 dark:border-amber-400 pl-4 italic text-muted-foreground my-4">');
  html = html.replace(/<img([^>]*?)>/g, '<img$1 class="max-w-full h-auto rounded-lg my-4" />');
  html = html.replace(/<code>/g, '<code class="bg-muted px-2 py-1 rounded text-sm font-mono">');
  html = html.replace(/<pre>/g, '<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4">');
  return html;
}

function extractNewsListing(document: Document, pageUrl: string) {
  const items = new Map<string, ListingItem>();
  const baseHost = new URL(pageUrl).hostname;

  const anchors = Array.from(document.querySelectorAll('a[href]'));
  for (const anchor of anchors) {
    const text = anchor.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (text.length < 25 || text.length > 180) continue;

    const href = anchor.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      continue;
    }

    try {
      const linkUrl = new URL(href, pageUrl);
      if (!/^https?:$/.test(linkUrl.protocol)) continue;

      const looksLikeArticlePath = /news|article|story|haber|gundem|dunya|ekonomi|spor|teknoloji|\d{4}\//i.test(linkUrl.pathname);
      const sameHost = linkUrl.hostname === baseHost;
      if (!looksLikeArticlePath && !sameHost) continue;

      const link = linkUrl.toString();
      if (items.has(link)) continue;

      const container = anchor.closest('article, li, section, div');
      const excerpt = cleanSnippet(container?.querySelector('p')?.innerHTML || '');
      const summary = summaryFromText(excerpt || text);

      const imageSrc =
        container?.querySelector('img')?.getAttribute('src') ||
        anchor.querySelector('img')?.getAttribute('src') ||
        '';

      let image = '';
      if (imageSrc) {
        try {
          image = new URL(imageSrc, pageUrl).toString();
        } catch {
          image = '';
        }
      }

      const timeElement = container?.querySelector('time');
      const pubDate =
        timeElement?.getAttribute('datetime') ||
        timeElement?.textContent?.replace(/\s+/g, ' ').trim() ||
        '';

      const source = normalizeSourceDomain(linkUrl.toString());
      const readingTimeMinutes = wordsToMinutesFromText(`${text} ${excerpt}`);

      items.set(link, {
        title: text,
        link,
        excerpt: excerpt.slice(0, 180),
        summary,
        image,
        source,
        pubDate,
        readingTimeMinutes,
      });
    } catch {
      // Ignore malformed URL.
    }

    if (items.size >= 40) break;
  }

  return Array.from(items.values()).slice(0, 24);
}

function getLinkStats(html: string, pageUrl: string) {
  const dom = new JSDOM(`<body>${html}</body>`, { url: pageUrl });
  const doc = dom.window.document;
  const plainTextLength = (doc.body.textContent || '').replace(/\s+/g, ' ').trim().length;
  const links = Array.from(doc.querySelectorAll('a'));
  const linkTextLength = links.reduce((sum, link) => sum + ((link.textContent || '').trim().length), 0);
  const linkDensity = plainTextLength ? linkTextLength / plainTextLength : 0;

  return {
    linkCount: links.length,
    linkDensity,
  };
}

function summaryBulletsFromHtml(html: string) {
  const dom = new JSDOM(`<body>${html}</body>`);
  const text = (dom.window.document.body.textContent || '').replace(/\s+/g, ' ').trim();
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 40)
    .slice(0, 3);

  return sentences.length ? sentences : text ? [text.slice(0, 220)] : [];
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL gerekli' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Geçersiz URL formatı' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const raw = await response.text();

    if (isLikelyFeed(raw, contentType)) {
      return NextResponse.json(parseFeed(raw, parsedUrl.toString()));
    }

    const dom = new JSDOM(raw, { url: parsedUrl.toString() });
    const document = dom.window.document;

    const trackerReport = removeTrackers(document, parsedUrl.toString());
    const listingItems = extractNewsListing(document, parsedUrl.toString());

    const reader = new Readability(document, {
      charThreshold: 180,
      classesToPreserve: ['caption', 'figcaption', 'img'],
    });

    const article = reader.parse();

    if (!article) {
      if (listingItems.length >= 6) {
        return NextResponse.json({
          type: 'listing',
          title: document.querySelector('title')?.textContent?.trim() || parsedUrl.hostname,
          description: 'Bu sayfa haber listesi olarak algılandı. Aşağıdan bir haberi seçebilirsiniz.',
          siteName: parsedUrl.hostname,
          items: listingItems,
          trackerReport,
        });
      }

      const title = document.querySelector('title')?.textContent || 'Başlık Bulunamadı';
      const content =
        document.querySelector('article, .content, .post-content, .entry-content, main')?.innerHTML ||
        document.querySelector('body')?.innerHTML || '';

      if (!content.trim()) {
        return NextResponse.json({ error: 'Bu sayfadan içerik çıkarılamadı' }, { status: 422 });
      }

      const cleanContent = content
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<nav[^>]*>.*?<\/nav>/gi, '')
        .replace(/<header[^>]*>.*?<\/header>/gi, '')
        .replace(/<footer[^>]*>.*?<\/footer>/gi, '')
        .replace(/<aside[^>]*>.*?<\/aside>/gi, '');

      const stripped = stripTrackingParamsFromLinks(cleanContent, parsedUrl.toString());
      const finalContent = enhanceContent(stripped.html);
      const trackerReportWithParams: TrackerReport = {
        ...trackerReport,
        linkParamsRemoved: stripped.removedParams,
      };

      return NextResponse.json({
        type: 'article',
        title: title.trim(),
        content: finalContent,
        byline: '',
        siteName: parsedUrl.hostname,
        excerpt: '',
        length: cleanContent.length,
        originalUrl: parsedUrl.toString(),
        trackerReport: trackerReportWithParams,
        readingTimeMinutes: wordsToMinutesFromText(cleanContent),
        summaryBullets: summaryBulletsFromHtml(finalContent),
      });
    }

    const stripped = stripTrackingParamsFromLinks(article.content || '', parsedUrl.toString());
    const cleaned = stripped.html;
    const stats = getLinkStats(cleaned, parsedUrl.toString());
    const trackerReportWithParams: TrackerReport = {
      ...trackerReport,
      linkParamsRemoved: stripped.removedParams,
    };

    const looksLikeListing =
      listingItems.length >= 8 &&
      (parsedUrl.pathname === '/' || stats.linkCount > 40 || stats.linkDensity > 0.45 || (article.length || 0) < 900);

    if (looksLikeListing) {
      return NextResponse.json({
        type: 'listing',
        title: article.title || document.querySelector('title')?.textContent?.trim() || parsedUrl.hostname,
        description: 'Ana sayfa/haber akışı tespit edildi. Kartlardan okuyacağınız haberi seçin.',
        siteName: article.siteName || parsedUrl.hostname,
        items: listingItems,
        trackerReport: trackerReportWithParams,
      });
    }

    const finalContent = enhanceContent(cleaned);

    return NextResponse.json({
      type: 'article',
      title: article.title || 'Başlık Bulunamadı',
      content: finalContent,
      byline: article.byline || '',
      siteName: article.siteName || parsedUrl.hostname,
      excerpt: article.excerpt || '',
      length: article.length || 0,
      originalUrl: parsedUrl.toString(),
      trackerReport: trackerReportWithParams,
      readingTimeMinutes: wordsToMinutesFromText(article.textContent || article.excerpt || article.title || ''),
      summaryBullets: summaryBulletsFromHtml(finalContent),
    });
  } catch (error) {
    console.error('Porsukla API Error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({ error: 'İstek zaman aşımına uğradı' }, { status: 408 });
      }
      if (error.message.includes('Failed to fetch')) {
        return NextResponse.json({ error: 'URL erişilemedi. Site otomasyon engeli uyguluyor olabilir.' }, { status: 403 });
      }

      const status = /Method Not Allowed/i.test(error.message) ? 405 : 500;
      return NextResponse.json(
        {
          error: 'URL işlenemedi. Lütfen adresi kontrol edin.',
          detail: process.env.NODE_ENV !== 'production' ? error.message : undefined,
        },
        { status }
      );
    }

    return NextResponse.json(
      { error: 'URL işlenemedi. Lütfen adresi kontrol edin.' },
      { status: 500 }
    );
  }
}
