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
    const isGeneralMarketQuery = isGeneralMarketNewsQuery(ticker)

    const [newsApiArticles, finnhubArticles] = await Promise.all([
      fetchNewsAPI(ticker),
      fetchFinnhub(ticker),
    ])

    let allArticles = [...newsApiArticles, ...finnhubArticles]
    
    // Strict Post-Processing Validation
    // If the query is a specific ticker (not 'stock market'), nuke any aggregator articles that don't expressly have the ticker in the headline
    if (ticker && ticker.toLowerCase() !== 'stock market' && ticker.length <= 5) {
      const strictArticles = allArticles.filter(a => a.title.toUpperCase().includes(ticker.toUpperCase()))
      // Fallback to loose matching ONLY if strict matching yields zero results, preventing an empty UI
      if (strictArticles.length > 0) {
        allArticles = strictArticles
      }
    }

    if (isGeneralMarketQuery && allArticles.length === 0) {
      allArticles = await fetchMarketWatchTopStories()
    }

    return allArticles
      .filter((article) => article.title && article.url)
      .sort((a, b) => {
        const aTime = Date.parse(a.publishedAt)
        const bTime = Date.parse(b.publishedAt)
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
      })
      .slice(0, 5)
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

    const url = `https://newsapi.org/v2/everything?qInTitle=${encodeURIComponent(ticker)}&domains=${trustedDomains}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${apiKey}`
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
      publishedAt: normalizePublishedAt(getProperty(article, 'publishedAt')),
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
      publishedAt: normalizePublishedAt(getProperty(article, 'datetime')),
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

function normalizePublishedAt(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const timestamp = value < 1e12 ? value * 1000 : value
    return new Date(timestamp).toISOString()
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return ''
    }

    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed)
      if (Number.isFinite(numeric)) {
        const timestamp = numeric < 1e12 ? numeric * 1000 : numeric
        return new Date(timestamp).toISOString()
      }
    }

    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString()
    }
  }

  return ''
}

function isGeneralMarketNewsQuery(ticker: string): boolean {
  const normalized = ticker.trim().toLowerCase()
  return normalized === 'stock market' || normalized === 'market' || normalized === 'top news' || normalized === 'trending'
}

async function fetchMarketWatchTopStories(): Promise<NewsArticle[]> {
  try {
    const response = await fetch('https://feeds.marketwatch.com/marketwatch/topstories/', {
      next: { revalidate: 300 },
      headers: {
        'User-Agent': 'Mozilla/5.0 FinPilotAI/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`MarketWatch RSS responded with status ${response.status}`)
    }

    const xml = await response.text()
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10)

    return items.map((match) => {
      const itemXml = match[1]

      return {
        title: decodeHtmlEntities(extractXmlTag(itemXml, 'title')),
        description: decodeHtmlEntities(extractXmlTag(itemXml, 'description')) || null,
        url: decodeHtmlEntities(extractXmlTag(itemXml, 'link')),
        source: 'MarketWatch',
        publishedAt: normalizePublishedAt(extractXmlTag(itemXml, 'pubDate')),
      }
    })
  } catch (error) {
    console.error('Error fetching MarketWatch top stories:', error)
    return []
  }
}

function extractXmlTag(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/&#8217;|&#x2019;/g, "'")
    .replace(/&#8216;|&#x2018;/g, "'")
    .replace(/&#8220;|&#x201c;/g, '"')
    .replace(/&#8221;|&#x201d;/g, '"')
    .replace(/&#8212;|&#x2014;/g, ' - ')
    .replace(/&#8211;|&#x2013;/g, '-')
    .replace(/&#169;/g, '(c)')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}
