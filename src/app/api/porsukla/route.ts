import { NextRequest, NextResponse } from 'next/server';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Fetch the webpage with better headers and timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Create a DOM and use Readability to extract the main content
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // Try to extract content with Readability
    const reader = new Readability(document, {
      charThreshold: 100,
      classesToPreserve: ['caption', 'figcaption', 'img'],
    });
    
    const article = reader.parse();

    if (!article) {
      // Fallback: try to extract basic content manually
      const title = document.querySelector('title')?.textContent || 'Başlık Bulunamadı';
      const content = document.querySelector('article, .content, .post-content, .entry-content, main')?.innerHTML || 
                     document.querySelector('body')?.innerHTML || '';
      
      if (!content.trim()) {
        return NextResponse.json({ error: 'Could not extract content from this page' }, { status: 422 });
      }

      // Basic cleanup for fallback content
      const cleanContent = content
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<nav[^>]*>.*?<\/nav>/gi, '')
        .replace(/<header[^>]*>.*?<\/header>/gi, '')
        .replace(/<footer[^>]*>.*?<\/footer>/gi, '')
        .replace(/<aside[^>]*>.*?<\/aside>/gi, '');

      return NextResponse.json({
        title: title.trim(),
        content: cleanContent,
        byline: '',
        siteName: new URL(url).hostname,
        excerpt: '',
        length: cleanContent.length,
      });
    }

    // Enhance content with better formatting
    let enhancedContent = article.content || '';
    
    // Add proper paragraph spacing
    enhancedContent = enhancedContent.replace(/<\/p>\s*<p>/g, '</p><p class="mb-4">');
    
    // Ensure headings have proper spacing
    enhancedContent = enhancedContent.replace(/<(h[1-6])>/g, '<$1 class="mt-6 mb-3">');
    
    // Format lists properly
    enhancedContent = enhancedContent.replace(/<ul>/g, '<ul class="ml-6 mb-4 list-disc">');
    enhancedContent = enhancedContent.replace(/<ol>/g, '<ol class="ml-6 mb-4 list-decimal">');
    
    // Format blockquotes
    enhancedContent = enhancedContent.replace(/<blockquote>/g, '<blockquote class="border-l-4 border-amber-600 dark:border-amber-400 pl-4 italic text-muted-foreground my-4">');
    
    // Format images
    enhancedContent = enhancedContent.replace(/<img([^>]*?)>/g, '<img$1 class="max-w-full h-auto rounded-lg my-4" />');
    
    // Format code blocks
    enhancedContent = enhancedContent.replace(/<code>/g, '<code class="bg-muted px-2 py-1 rounded text-sm font-mono">');
    enhancedContent = enhancedContent.replace(/<pre>/g, '<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4">');

    return NextResponse.json({
      title: article.title || 'Başlık Bulunamadı',
      content: enhancedContent,
      byline: article.byline || '',
      siteName: article.siteName || new URL(url).hostname,
      excerpt: article.excerpt || '',
      length: article.length || 0,
    });

  } catch (error) {
    console.error('Porsukla API Error:', error);
    
    // More specific error messages
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({ error: 'Request timeout - the site took too long to respond' }, { status: 408 });
      }
      if (error.message.includes('Failed to fetch')) {
        return NextResponse.json({ error: 'Could not access this URL. The site might block automated requests.' }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process the URL. Please check if the URL is correct and accessible.' },
      { status: 500 }
    );
  }
}
