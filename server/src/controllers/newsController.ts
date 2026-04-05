import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

function normalizeArticles(payload: any) {
  const sourceArticles = Array.isArray(payload?.articles)
    ? payload.articles
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.results)
        ? payload.results
        : [];

  return sourceArticles
    .map((article: any, index: number) => ({
      id: article.id || article.guid || article.article_id || article.url || article.link || `article-${index}`,
      title: article.title || 'Cricket Update',
      url: article.url || article.link || '',
      imageUrl: article.urlToImage || article.image || article.image_url || '',
      source: article.source?.name || article.source_name || article.source || article.source_id || 'Cricket News',
      publishedAt: article.publishedAt || article.pubDate || article.published_at || '',
    }))
    .filter((article: any) => article.url && article.title);
}

export async function getCricketNews(_req: Request, res: Response) {
  const endpoint = env.cricketNewsApiUrl;
  if (!endpoint) {
    return res.json({ enabled: false, articles: [] });
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ enabled: true, articles: [], error: 'News provider request failed' });
    }

    const payload = await response.json();
    const articles = normalizeArticles(payload).slice(0, 8);
    return res.json({ enabled: true, articles });
  } catch (error) {
    logger.error('Failed to fetch cricket news', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ enabled: true, articles: [], error: 'Unable to fetch cricket news' });
  }
}
