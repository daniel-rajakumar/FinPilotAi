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

export async function fetchNews(ticker: string): Promise<NewsArticle[]> {
  try {
    const [newsApiArticles, finnhubArticles] = await Promise.all([
      fetchNewsAPI(ticker),
      fetchFinnhub(ticker),
    ])

    const allArticles = [...newsApiArticles, ...finnhubArticles]
    return allArticles.slice(0, 5)
  } catch (error) {
    console.error(`Error fetching news for ${ticker}:`, error)
    return []
  }
}

async function fetchNewsAPI(ticker: string): Promise<NewsArticle[]> {
  try {
    const apiKey = process.env.NEWSAPI_KEY
    if (!apiKey) {
      console.warn('NEWSAPI_KEY not configured')
      return []
    }

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(ticker)}&apiKey=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`NewsAPI responded with status ${response.status}`)
    }

    const data = await response.json()

    if (!data.articles || !Array.isArray(data.articles)) {
      return []
    }

    return data.articles.map((article: unknown) => ({
      title: String(getProperty(article, 'title') ?? ''),
      description: getProperty(article, 'description') ?? null,
      url: String(getProperty(article, 'url') ?? ''),
      source: String(getProperty(getProperty(article, 'source'), 'name') ?? ''),
      publishedAt: String(getProperty(article, 'publishedAt') ?? ''),
    }))
  } catch (error) {
    console.error('Error fetching from NewsAPI:', error)
    return []
  }
}

async function fetchFinnhub(ticker: string): Promise<NewsArticle[]> {
  try {
    const apiKey = process.env.FINNHUB_KEY
    if (!apiKey) {
      console.warn('FINNHUB_KEY not configured')
      return []
    }

    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=2024-01-01&to=2026-01-01&token=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Finnhub responded with status ${response.status}`)
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data.map((article: unknown) => ({
      title: String(getProperty(article, 'headline') ?? ''),
      description: getProperty(article, 'summary') ?? null,
      url: String(getProperty(article, 'url') ?? ''),
      source: String(getProperty(article, 'source') ?? ''),
      publishedAt: String(getProperty(article, 'datetime') ?? ''),
    }))
  } catch (error) {
    console.error('Error fetching from Finnhub:', error)
    return []
  }
}

function getProperty(obj: unknown, key: string): unknown {
  if (typeof obj === 'object' && obj !== null && key in obj) {
    return (obj as Record<string, unknown>)[key]
  }
  return undefined
}
