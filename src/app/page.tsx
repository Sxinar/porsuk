'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ArticleData {
  title: string;
  content: string;
  byline: string;
  siteName: string;
  excerpt: string;
  length: number;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [error, setError] = useState('');

  const handlePorsukla = async () => {
    if (!url.trim()) {
      setError('Lütfen bir URL girin');
      return;
    }

    setLoading(true);
    setError('');
    setArticle(null);

    try {
      const response = await fetch('/api/porsukla', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Bir hata oluştu');
      }

      const data = await response.json();
      setArticle(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePorsukla();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-amber-600 dark:text-amber-500">
            🦫 Porsuk
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            &quot;İnternetin tozunu pasını kazar, sana sadece huzurlu bir okuma bırakır.&quot;
          </p>
        </div>

        {/* URL Input Section */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="Okunacak makalenin URL'sini girin..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handlePorsukla} 
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? 'Porsuklanıyor...' : 'Porsukla'}
            </Button>
          </div>
          {error && (
            <p className="text-destructive text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Loading State */}
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

        {/* Article Display */}
        {article && !loading && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {article.title}
                  </CardTitle>
                  {article.byline && (
                    <p className="text-muted-foreground">{article.byline}</p>
                  )}
                  {article.siteName && (
                    <p className="text-sm text-muted-foreground">
                      Kaynak: {article.siteName}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="max-w-none leading-relaxed space-y-4 article-content"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
                {article.excerpt && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-sm text-muted-foreground italic">
                      {article.excerpt}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!article && !loading && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🦫</div>
            <h2 className="text-2xl font-semibold mb-2 text-amber-600 dark:text-amber-500">
              Temiz bir okuma deneyimi için hazır
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Yukarıya bir URL girin ve Porsuk&apos;un sihrini izleyin. Reklamlar, çerez bannerları ve görsel kirlilik ortadan kalksın.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
