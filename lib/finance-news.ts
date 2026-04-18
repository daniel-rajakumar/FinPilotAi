export interface NewsArticle {
  title: string
  description: string | null
  url: string
  source: string
  publishedAt: string
}

export interface NewsResponse {
  ticker: string
  articles: NewsArticle[]
}
