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
    const apiKey = process.env.NEWS_API_KEY
    if (!apiKey) {
      console.warn('NEWS_API_KEY not configured')
      return []
    }

    // Trusted US financial/news sources
    const trustedDomains = [
      'cnbc.com', 'finance.yahoo.com', 'bloomberg.com', 'wsj.com', 'reuters.com', 
      'barrons.com', 'marketwatch.com', 'forbes.com', 'nytimes.com', 'washingtonpost.com', 
      'abcnews.go.com', 'cbsnews.com', 'nbcnews.com', 'usnews.com'
    ].join(',')

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(ticker)}&domains=${trustedDomains}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${apiKey}`
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
      description: getProperty(article, 'description') ? String(getProperty(article, 'description')) : null,
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
    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey) {
      console.warn('FINNHUB_API_KEY not configured')
      return []
    }

    // Use dynamic dates: last 30 days to ensure recent news
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const fromDate = startDate.toISOString().split('T')[0] // YYYY-MM-DD
    const toDate = endDate.toISOString().split('T')[0] // YYYY-MM-DD

    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${fromDate}&to=${toDate}&token=${apiKey}`
    const response = await fetch(url, { next: { revalidate: 300 } })

    if (!response.ok) {
      throw new Error(`Finnhub responded with status ${response.status}`)
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    // Trusted US financial/news sources (Finnhub returns source names like 'CNBC', 'Yahoo', 'Reuters')
    const trustedSourcesUpper = [
      'CNBC', 'YAHOO', 'BLOOMBERG', 'WSJ', 'WALL STREET JOURNAL', 'REUTERS', 
      'BARRONS', 'BARRON\'S', 'MARKETWATCH', 'FORBES', 'NEW YORK TIMES', 'NY TIMES',
      'WASHINGTON POST', 'ABC', 'ABC NEWS', 'CBS', 'CBS NEWS', 'NBC', 'NBC NEWS', 'US NEWS'
    ]

    const mapped = data.map((article: unknown) => ({
      title: String(getProperty(article, 'headline') ?? ''),
      description: getProperty(article, 'summary') ? String(getProperty(article, 'summary')) : null,
      url: String(getProperty(article, 'url') ?? ''),
      source: String(getProperty(article, 'source') ?? ''),
      publishedAt: String(getProperty(article, 'datetime') ?? ''),
    }))

    // Filter by trusted sources
    const filtered = mapped.filter((article: { source: string }) => {
      const sourceUpper = article.source.toUpperCase()
      return trustedSourcesUpper.some(trusted => sourceUpper.includes(trusted))
    })

    return filtered
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
