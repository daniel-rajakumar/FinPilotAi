import { NextRequest, NextResponse } from 'next/server'
import { streamChatWithAI } from '@/lib/openai'
import { ChatRequest, NewsArticle } from '@/types'
import { getMostActiveStocks, getStockQuote, getStockHistory, getStockHistoryRange, getStockQuotes, getStockVolumeStats, formatStockDataForAI, StockHistory, StockQuote } from '@/lib/yfinance'
import { getStockNews } from '@/lib/news'
import { FredSeries, getMultipleSeries, DEFAULT_INDICATORS } from '@/lib/fred'
import { getOptionFlow, OptionFlowData } from '@/lib/option-flow'

// Common stock tickers to detect in user messages
const KNOWN_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD',
  'NFLX', 'DIS', 'BA', 'JPM', 'V', 'MA', 'WMT', 'KO', 'PEP', 'INTC',
  'CSCO', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'SQ', 'SNAP', 'UBER', 'LYFT',
  'SHOP', 'SPOT', 'ZM', 'COIN', 'HOOD', 'PLTR', 'SOFI', 'NIO', 'RIVN',
  'F', 'GM', 'T', 'VZ', 'XOM', 'CVX', 'JNJ', 'PFE', 'MRNA', 'UNH',
  'SPY', 'QQQ', 'VOO', 'VTI', 'IWM', 'DIA',
]

const COMPANY_ALIASES: Array<{ pattern: RegExp; ticker: string }> = [
  { pattern: /\bapple\b/i, ticker: 'AAPL' },
  { pattern: /\bmicrosoft\b/i, ticker: 'MSFT' },
  { pattern: /\b(alphabet|google)\b/i, ticker: 'GOOGL' },
  { pattern: /\bamazon\b/i, ticker: 'AMZN' },
  { pattern: /\b(meta|facebook)\b/i, ticker: 'META' },
  { pattern: /\btesla\b/i, ticker: 'TSLA' },
  { pattern: /\bnvidia\b/i, ticker: 'NVDA' },
  { pattern: /\bamd\b|advanced micro devices/i, ticker: 'AMD' },
  { pattern: /\bnetflix\b/i, ticker: 'NFLX' },
  { pattern: /\bberkshire\b/i, ticker: 'BRK-B' },
]

const MARKET_CAP_CANDIDATES = [
  'NVDA', 'MSFT', 'AAPL', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK-B', 'AVGO',
  'TSM', 'WMT', 'JPM', 'LLY', 'V', 'ORCL', 'MA', 'NFLX', 'XOM', 'COST',
  'PG', 'JNJ', 'HD', 'ABBV', 'BAC', 'KO',
]

const EARNINGS_CANDIDATES = [...new Set([
  ...MARKET_CAP_CANDIDATES,
  ...KNOWN_TICKERS,
  'BRK-B', 'BAC', 'GS', 'NKE', 'PG', 'MRK', 'QCOM', 'AVGO', 'TSM',
])]

const MARKET_CAP_QUERY_PATTERN = /\b(top|largest|biggest|highest)\b[\s\S]{0,60}\bmarket\s*cap\b|\bmarket\s*cap\b[\s\S]{0,60}\b(top|largest|biggest|highest)\b|\b(top|largest|biggest|highest)\b[\s\S]{0,30}\bmarketcap\b|\bmarketcap\b[\s\S]{0,30}\b(top|largest|biggest|highest)\b/i
const ANALYSIS_QUERY_PATTERN = /\b(why|because|analysis|analyze|sentiment|impact|compare|versus|vs\.?|news|explain|macro)\b/i
const HISTORICAL_YEAR_PATTERN = /\b(19|20)\d{2}\b/
const HISTORICAL_QUERY_PATTERN = /\b(stock price history|share price history|history|historical|earliest|oldest|first available|how far back)\b/i
const MONTHLY_VOLUME_QUERY_PATTERN = /\b(top|highest|most)\b[\s\S]{0,40}\bvolume\b[\s\S]{0,50}\b(last month|past month|over the last month|30 days|past 30 days|last 30 days)\b|\b(last month|past month|over the last month|30 days|past 30 days|last 30 days)\b[\s\S]{0,50}\b(top|highest|most)\b[\s\S]{0,40}\bvolume\b/i
const EARNINGS_QUERY_PATTERN = /\b(earning|earnings|earnings report|financials)\b[\s\S]{0,30}\b(next week|this week|tomorrow|today)\b|\b(next week|this week|tomorrow|today)\b[\s\S]{0,30}\b(earning|earnings|earnings report|financials)\b/i

interface TickerContextResult {
  ticker: string
  quote: StockQuote | null
  history: StockHistory[]
  news: NewsArticle[]
}

interface SectorStock {
  symbol: string
  name: string
}

const SECTOR_STOCKS: Record<string, { label: string; stocks: SectorStock[] }> = {
  technology: {
    label: 'Technology',
    stocks: [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corp.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'META', name: 'Meta Platforms' },
      { symbol: 'CRM', name: 'Salesforce Inc.' },
      { symbol: 'ORCL', name: 'Oracle Corp.' },
    ],
  },
  'consumer goods': {
    label: 'Consumer Goods',
    stocks: [
      { symbol: 'AMZN', name: 'Amazon.com' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'NKE', name: 'Nike Inc.' },
      { symbol: 'PG', name: 'Procter & Gamble' },
      { symbol: 'KO', name: 'Coca-Cola Co.' },
      { symbol: 'PEP', name: 'PepsiCo Inc.' },
    ],
  },
  finance: {
    label: 'Finance',
    stocks: [
      { symbol: 'JPM', name: 'JPMorgan Chase' },
      { symbol: 'BAC', name: 'Bank of America' },
      { symbol: 'GS', name: 'Goldman Sachs' },
      { symbol: 'V', name: 'Visa Inc.' },
      { symbol: 'MA', name: 'Mastercard Inc.' },
      { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
    ],
  },
  healthcare: {
    label: 'Healthcare',
    stocks: [
      { symbol: 'JNJ', name: 'Johnson & Johnson' },
      { symbol: 'UNH', name: 'UnitedHealth Group' },
      { symbol: 'PFE', name: 'Pfizer Inc.' },
      { symbol: 'ABBV', name: 'AbbVie Inc.' },
      { symbol: 'MRK', name: 'Merck & Co.' },
      { symbol: 'LLY', name: 'Eli Lilly & Co.' },
    ],
  },
  semiconductors: {
    label: 'Semiconductors',
    stocks: [
      { symbol: 'NVDA', name: 'NVIDIA Corp.' },
      { symbol: 'AMD', name: 'Advanced Micro Devices' },
      { symbol: 'INTC', name: 'Intel Corp.' },
      { symbol: 'TSM', name: 'Taiwan Semiconductor' },
      { symbol: 'AVGO', name: 'Broadcom Inc.' },
      { symbol: 'QCOM', name: 'Qualcomm Inc.' },
    ],
  },
  energy: {
    label: 'Energy',
    stocks: [
      { symbol: 'XOM', name: 'Exxon Mobil' },
      { symbol: 'CVX', name: 'Chevron Corp.' },
      { symbol: 'COP', name: 'ConocoPhillips' },
      { symbol: 'SLB', name: 'Schlumberger' },
      { symbol: 'EOG', name: 'EOG Resources' },
      { symbol: 'NEE', name: 'NextEra Energy' },
    ],
  },
}

function isPureMarketCapLeaderboardRequest(message: string): boolean {
  return MARKET_CAP_QUERY_PATTERN.test(message) && !ANALYSIS_QUERY_PATTERN.test(message)
}

function getRequestedLimit(message: string, fallback: number = 5): number {
  const topMatch = message.match(/\btop\s+(\d{1,2})\b/i)
  if (topMatch) {
    return Math.min(Math.max(Number(topMatch[1]), 1), 10)
  }

  const standaloneNumber = message.match(/\b(\d{1,2})\b/)
  if (standaloneNumber) {
    return Math.min(Math.max(Number(standaloneNumber[1]), 1), 10)
  }

  return fallback
}

function isHistoricalStockQuery(message: string): boolean {
  return HISTORICAL_QUERY_PATTERN.test(message) || HISTORICAL_YEAR_PATTERN.test(message)
}

function isMonthlyVolumeLeaderboardQuery(message: string): boolean {
  return MONTHLY_VOLUME_QUERY_PATTERN.test(message)
}

function isUpcomingEarningsQuery(message: string): boolean {
  return EARNINGS_QUERY_PATTERN.test(message)
}

function detectSectorKey(message: string): string | null {
  const normalized = message.toLowerCase()

  if (/\bsemiconductor(s)?\b|\bchip(s)?\b/.test(normalized)) return 'semiconductors'
  if (/\btechnology\b|\btech\b/.test(normalized)) return 'technology'
  if (/\bconsumer goods\b|\bconsumer\b/.test(normalized)) return 'consumer goods'
  if (/\bfinance\b|\bfinancials?\b|\bbanks?\b/.test(normalized)) return 'finance'
  if (/\bhealthcare\b|\bhealth care\b|\bpharma\b/.test(normalized)) return 'healthcare'
  if (/\benergy\b|\boil\b|\bgas\b/.test(normalized)) return 'energy'

  return null
}

function isSectorSuggestionQuery(message: string): boolean {
  const normalized = message.toLowerCase()
  return Boolean(detectSectorKey(message)) && /\b(suggest|good stocks|stock ideas|names|best stocks|stocks in|sector)\b/.test(normalized)
}

function extractHistoricalYear(message: string): number | null {
  const match = message.match(HISTORICAL_YEAR_PATTERN)
  if (!match) return null
  return Number(match[0])
}

function isEarliestHistoryQuery(message: string): boolean {
  return /\b(earliest|oldest|first available|how far back|max history)\b/i.test(message)
}

function formatMarketCap(value: number | null): string {
  if (!value) {
    return 'N/A'
  }

  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`
  }

  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`
  }

  return `$${(value / 1e6).toFixed(2)}M`
}

function buildTextStreamResponse(text: string, tickers: string[] = []) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      if (tickers.length > 0) {
        const metaEvent = JSON.stringify({ meta: { tickers } })
        controller.enqueue(encoder.encode(`data: ${metaEvent}\n\n`))
      }

      const textEvent = JSON.stringify({ text })
      controller.enqueue(encoder.encode(`data: ${textEvent}\n\n`))
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`
}

async function buildHistoricalStockResponse(message: string, detectedTickers: string[]) {
  const primaryTicker = detectedTickers[0]
  if (!primaryTicker) {
    return buildTextStreamResponse('Tell me which stock you want, for example AAPL or Apple.')
  }

  const quote = await getStockQuote(primaryTicker)
  const displayName = quote?.name || primaryTicker

  if (isEarliestHistoryQuery(message)) {
    const history = await getStockHistoryRange(primaryTicker, {
      startDate: new Date('1900-01-01'),
      endDate: new Date(),
      interval: '1mo',
    })

    const firstPoint = history[0]
    if (!firstPoint) {
      return buildTextStreamResponse(
        `I could not find historical price data for ${displayName} (${primaryTicker}).`,
        [primaryTicker]
      )
    }

    return buildTextStreamResponse(
      `The earliest ${displayName} (${primaryTicker}) price data I can access is ${firstPoint.date}, with a close of ${formatPrice(firstPoint.close)}.`,
      [primaryTicker]
    )
  }

  const year = extractHistoricalYear(message)
  if (year) {
    const history = await getStockHistoryRange(primaryTicker, {
      startDate: new Date(`${year}-01-01T00:00:00Z`),
      endDate: new Date(`${year}-12-31T23:59:59Z`),
      interval: '1d',
    })

    if (history.length === 0) {
      return buildTextStreamResponse(
        `I could not find ${displayName} (${primaryTicker}) price data for ${year}.`,
        [primaryTicker]
      )
    }

    const firstPoint = history[0]
    const lastPoint = history[history.length - 1]
    const lowPoint = history.reduce((lowest, point) => point.close < lowest.close ? point : lowest, history[0])
    const highPoint = history.reduce((highest, point) => point.close > highest.close ? point : highest, history[0])

    return buildTextStreamResponse(
      `${displayName} (${primaryTicker}) in ${year}: first available close was ${formatPrice(firstPoint.close)} on ${firstPoint.date}, last close was ${formatPrice(lastPoint.close)} on ${lastPoint.date}. The ${year} range was ${formatPrice(lowPoint.close)} to ${formatPrice(highPoint.close)}.`,
      [primaryTicker]
    )
  }

  return buildTextStreamResponse('I need a year or a clearer historical time period for that stock question.', [primaryTicker])
}

function formatLargeVolume(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`
  }

  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`
  }

  return value.toLocaleString()
}

async function buildMonthlyVolumeLeaderboardResponse(message: string) {
  const limit = getRequestedLimit(message, 25)
  const candidates = await getMostActiveStocks(100)

  const equities = candidates.filter((candidate) => candidate.quoteType === 'EQUITY')
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  const volumeStats = (await Promise.all(
    equities.map(async (candidate) => {
      const stats = await getStockVolumeStats(candidate.symbol, {
        startDate,
        endDate,
        interval: '1d',
      })

      if (!stats) return null

      return {
        ...candidate,
        ...stats,
      }
    })
  )).filter(Boolean) as Array<{
    symbol: string
    name: string
    quoteType: string | null
    totalVolume: number
    averageDailyVolume: number
    tradingDays: number
  }>

  if (volumeStats.length === 0) {
    return buildTextStreamResponse(
      'I could not compute a monthly volume leaderboard from my active market feed right now.'
    )
  }

  const topVolume = volumeStats
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, limit)

  const rankings = topVolume.map((stock, index) => {
    const avgDailyVolume = formatLargeVolume(stock.averageDailyVolume)
    const totalVolume = formatLargeVolume(stock.totalVolume)
    return `${index + 1}. ${stock.name} (${stock.symbol}) - ${totalVolume} shares over ${stock.tradingDays} trading days (avg ${avgDailyVolume}/day)`
  }).join('\n')

  return buildTextStreamResponse(
    `Top ${topVolume.length} highest-volume traded US equities over the last 30 calendar days from the Yahoo most-active equity universe:\n\n${rankings}`,
    topVolume.map((stock) => stock.symbol)
  )
}

async function buildSectorSuggestionResponse(message: string) {
  const sectorKey = detectSectorKey(message)
  if (!sectorKey) {
    return buildTextStreamResponse('Tell me which sector you want, for example semiconductors, technology, healthcare, finance, consumer goods, or energy.')
  }

  const sector = SECTOR_STOCKS[sectorKey]
  const limit = Math.min(getRequestedLimit(message, 5), sector.stocks.length)

  const enriched = (await Promise.all(
    sector.stocks.map(async (stock) => {
      const [quote, history] = await Promise.all([
        getStockQuote(stock.symbol),
        getStockHistory(stock.symbol, 30),
      ])

      const monthReturn = history.length >= 2
        ? ((history[history.length - 1].close - history[0].close) / history[0].close) * 100
        : null

      return {
        ...stock,
        quote,
        monthReturn,
      }
    })
  )).filter((stock) => stock.quote) as Array<{
    symbol: string
    name: string
    quote: StockQuote
    monthReturn: number | null
  }>

  if (enriched.length === 0) {
    return buildTextStreamResponse(`I could not pull live ${sector.label} stock data from my active market feed right now.`)
  }

  const ranked = enriched
    .sort((a, b) => {
      const marketCapDiff = (b.quote.marketCap ?? 0) - (a.quote.marketCap ?? 0)
      if (marketCapDiff !== 0) return marketCapDiff
      return (b.monthReturn ?? -Infinity) - (a.monthReturn ?? -Infinity)
    })
    .slice(0, limit)

  const lines = ranked.map((stock, index) => {
    const today = `${stock.quote.changePercent >= 0 ? '+' : ''}${stock.quote.changePercent.toFixed(2)}%`
    const month = stock.monthReturn == null
      ? '30d N/A'
      : `30d ${stock.monthReturn >= 0 ? '+' : ''}${stock.monthReturn.toFixed(2)}%`

    return `${index + 1}. ${stock.name} (${stock.symbol}) - ${formatPrice(stock.quote.price)}, today ${today}, ${month}`
  }).join('\n')

  return buildTextStreamResponse(
    `Here are ${ranked.length} tracked ${sector.label.toLowerCase()} stocks from this app's sector universe, ranked by current market cap and annotated with live price action:\n\n${lines}\n\nIf you want, I can also rank the same sector by 30-day performance, market cap, or volume.`,
    ranked.map((stock) => stock.symbol)
  )
}

function getWeekRangeLabel(start: Date, end: Date): string {
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function getNextWeekRange(fromDate: Date): { start: Date; end: Date } {
  const start = new Date(fromDate)
  const day = start.getDay()
  const daysUntilNextMonday = ((8 - day) % 7) || 7
  start.setDate(start.getDate() + daysUntilNextMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

async function buildUpcomingEarningsResponse(message: string) {
  const now = new Date()
  const { start, end } = getNextWeekRange(now)
  const quotes = await getStockQuotes(EARNINGS_CANDIDATES)

  const matches = quotes
    .filter((quote) => quote.quoteType === 'EQUITY' && quote.earningsTimestampStart)
    .map((quote) => ({
      ...quote,
      earningsDate: new Date(quote.earningsTimestampStart as string),
    }))
    .filter((quote) => !Number.isNaN(quote.earningsDate.getTime()) && quote.earningsDate >= start && quote.earningsDate <= end)
    .sort((a, b) => a.earningsDate.getTime() - b.earningsDate.getTime() || (b.marketCap ?? 0) - (a.marketCap ?? 0))

  if (matches.length === 0) {
    return buildTextStreamResponse(
      `I did not find any tracked earnings reports in my active market feed for next week (${getWeekRangeLabel(start, end)}).`
    )
  }

  const lines = matches.map((quote, index) => {
    const dateLabel = quote.earningsDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${index + 1}. ${quote.name} (${quote.symbol}) - ${dateLabel}`
  }).join('\n')

  return buildTextStreamResponse(
    `Tracked stocks reporting earnings next week (${getWeekRangeLabel(start, end)}):\n\n${lines}`,
    matches.map((quote) => quote.symbol)
  )
}

async function buildMarketCapLeaderboardResponse(message: string, brainrotMode?: boolean) {
  const limit = getRequestedLimit(message, 5)
  const quotes = await getStockQuotes(MARKET_CAP_CANDIDATES)

  const topCompanies = quotes
    .filter((quote) => quote.quoteType === 'EQUITY' && typeof quote.marketCap === 'number')
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, limit)

  if (topCompanies.length === 0) {
    return buildTextStreamResponse(
      'I do not have access to enough live company market-cap data in my active market feed to rank that right now.'
    )
  }

  const intro = brainrotMode
    ? `Top ${topCompanies.length} companies by market cap from the live feed right now:\n\n`
    : `Top ${topCompanies.length} companies by market cap from the live feed right now:\n\n`

  const rankings = topCompanies
    .map((company, index) => `${index + 1}. ${company.name} (${company.symbol}) - ${formatMarketCap(company.marketCap)}`)
    .join('\n')

  return buildTextStreamResponse(`${intro}${rankings}`, topCompanies.map((company) => company.symbol))
}

// Try to detect stock tickers mentioned in the latest user message
function detectTickers(message: string): string[] {
  const upper = message.toUpperCase()
  const found: string[] = []

  // 1. Check for known baseline tickers
  for (const ticker of KNOWN_TICKERS) {
    if (ticker.length < 2) continue 
    const regex = new RegExp(`\\b${ticker}\\b`)
    if (regex.test(upper)) {
      found.push(ticker)
    }
  }

  // 2. Check explicit "$TICKER" syntax (allows lowercase to map naturally)
  const dollarPattern = /\$([A-Za-z]{1,5})\b/g
  let match
  while ((match = dollarPattern.exec(message)) !== null) {
    const symbol = match[1].toUpperCase()
    if (!found.includes(symbol)) found.push(symbol)
  }

  // 3. Bruteforce extract explicit ALL CAPS words from raw message (filters out basic English stop words)
  const commonWords = new Set(['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'ANY', 'CAN', 'HAS', 'HIM', 'HIS', 'HOW', 'WHY', 'WHO', 'WAY', 'USE', 'TWO', 'TOO', 'TOP', 'TEN', 'SEE', 'SAY', 'RUN', 'OUT', 'OUR', 'ONE', 'OFF', 'NOW', 'NEW', 'MAY', 'MAN', 'LET', 'ITS', 'INTO', 'GET', 'DAY', 'DID', 'FEW', 'YES', 'NO', 'CEO', 'CFO', 'CTO', 'USA', 'LLC', 'INC'])
  const explicitPattern = /\b([A-Z]{2,5})\b/g
  let explicitMatch
  while ((explicitMatch = explicitPattern.exec(message)) !== null) {
    if (!commonWords.has(explicitMatch[1]) && !found.includes(explicitMatch[1])) {
      found.push(explicitMatch[1])
    }
  }

  for (const alias of COMPANY_ALIASES) {
    if (alias.pattern.test(message) && !found.includes(alias.ticker)) {
      found.push(alias.ticker)
    }
  }

  return found.slice(0, 3) // Max 3 dedicated ticker API concurrent queries at a time
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, ticker, brainrotMode } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      )
    }

    // Get the latest user message to detect tickers
    const latestMessage = messages[messages.length - 1]
    const detectedTickers = ticker 
      ? [ticker] 
      : detectTickers(latestMessage.content)

    if (isPureMarketCapLeaderboardRequest(latestMessage.content)) {
      return await buildMarketCapLeaderboardResponse(latestMessage.content, brainrotMode)
    }

    if (isSectorSuggestionQuery(latestMessage.content)) {
      return await buildSectorSuggestionResponse(latestMessage.content)
    }

    if (isUpcomingEarningsQuery(latestMessage.content)) {
      return await buildUpcomingEarningsResponse(latestMessage.content)
    }

    if (isMonthlyVolumeLeaderboardQuery(latestMessage.content)) {
      return await buildMonthlyVolumeLeaderboardResponse(latestMessage.content)
    }

    if (isHistoricalStockQuery(latestMessage.content)) {
      return await buildHistoricalStockResponse(latestMessage.content, detectedTickers)
    }

    // Fetch EVERYTHING concurrently to feed the Financial Intelligence Engine
    const contextPromises: Array<
      Promise<Record<string, FredSeries> | OptionFlowData | NewsArticle[] | TickerContextResult | null>
    > = [
      getMultipleSeries(Object.keys(DEFAULT_INDICATORS)).catch(() => null),
      getOptionFlow().catch(() => null),
      getStockNews('stock market').catch(() => null)
    ]

    // If the user doesn't provide a specific stock, arm the Intelligence Engine with baseline market indices and the Magnificent 7 mega-caps to perform relative leaderboards
    const baselineTickers = detectedTickers.length > 0 ? detectedTickers : ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'];

    if (baselineTickers.length > 0) {
      baselineTickers.forEach(t => {
        contextPromises.push(
          Promise.all([getStockQuote(t), getStockHistory(t), getStockNews(t)])
            .then(([quote, history, news]) => ({ ticker: t, quote, history, news }))
            .catch(() => null)
        )
      })
    }

    const results = await Promise.all(contextPromises)
    
    const macroSeries = results[0] as Record<string, FredSeries> | null
    const optionFlow = results[1] as OptionFlowData | null
    const generalNews = results[2] as NewsArticle[] | null
    const tickerResults = results.slice(3).filter(Boolean) as TickerContextResult[]

    let stockContext = "--- LIVE API CONTEXT FED TO ENGINE ---\n\n"

    // 1. MACRO DATA
    if (macroSeries) {
      stockContext += "LATEST MACROECONOMIC INDICATORS (FRED):\n"
      for (const [id, data] of Object.entries(macroSeries)) {
        if (data.observations.length > 0) {
          const latest = data.observations[data.observations.length - 1]
          const meta = DEFAULT_INDICATORS[id]
          
          let printValue = `${latest.value}${meta.units}`
          
          // Calculate YoY % for Index data if we have at least 13 observations (1 year of monthly data)
          if (meta.units.includes('Index') && data.observations.length >= 13) {
            const yearAgoObs = data.observations[data.observations.length - 13]
            if (yearAgoObs && yearAgoObs.value && latest.value) {
              const yoy = ((latest.value / yearAgoObs.value) - 1) * 100
              printValue = `${latest.value} ${meta.units} (YoY Change: ${yoy.toFixed(2)}%)`
            }
          }
          
          stockContext += `- ${meta.title}: ${printValue} (as of ${latest.date}). ${meta.description}\n`
        }
      }
      stockContext += "\n"
    }

    // 2. OPTION FLOW
    if (optionFlow) {
      stockContext += "UNUSUAL INSTITUTIONAL OPTION FLOW (OPTIONSTRAT):\n"
      stockContext += `Bullish Options: ${optionFlow.topBullish.map((t) => `${t.symbol} (${t.premium} premium, ${Math.round(t.sentimentScore * 100)}% conf)`).join(', ')}\n`
      stockContext += `Bearish Options: ${optionFlow.topBearish.map((t) => `${t.symbol} (${t.premium} premium, ${Math.round(t.sentimentScore * 100)}% conf)`).join(', ')}\n\n`
    }

    // 3. SPECIFIC TICKERS
    if (tickerResults.length > 0) {
      stockContext += "SPECIFIC TICKER DATA:\n"
      tickerResults.forEach((tr) => {
        if (tr.quote) stockContext += formatStockDataForAI(tr.quote, tr.history)
        if (tr.news?.length > 0) {
          stockContext += `\nLatest News for ${tr.ticker}:\n${tr.news.map((n) => `- ${n.title} (${n.source})`).join('\n')}`
        }
        stockContext += "\n\n"
      })
    }

    // 4. GENERAL NEWS
    if (generalNews && generalNews.length > 0) {
      stockContext += "GENERAL MARKET NEWS:\n"
      stockContext += `${generalNews.map((n) => `- ${n.title} (${n.source}) - ${n.description}`).join('\n')}\n\n`
    }

    const completionStream = await streamChatWithAI(messages, ticker, stockContext, brainrotMode)

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 1. Send meta data (detected tickers) first
        if (detectedTickers.length > 0) {
          const metaEvent = JSON.stringify({ meta: { tickers: detectedTickers } });
          controller.enqueue(encoder.encode(`data: ${metaEvent}\n\n`));
        }

        // 2. Stream AI tokens text payload
        try {
          for await (const chunk of completionStream) {
            const text = chunk.choices?.[0]?.delta?.content || '';
            if (text) {
              const textEvent = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${textEvent}\n\n`));
            }
          }
        } catch (e) {
          console.error("Stream generation error:", e);
        } finally {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
