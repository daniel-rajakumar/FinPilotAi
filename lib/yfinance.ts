import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
})

export interface StockQuote {
  symbol: string
  name: string
  quoteType: string | null
  price: number
  change: number
  changePercent: number
  previousClose: number
  open: number
  dayHigh: number
  dayLow: number
  volume: number
  marketCap: number | null
  earningsTimestamp: string | null
  earningsTimestampStart: string | null
  earningsTimestampEnd: string | null
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  currency: string
}

export interface StockHistory {
  date: string
  close: number
}

interface StockHistoryOptions {
  startDate?: Date
  endDate?: Date
  interval?: '1d' | '1wk' | '1mo'
}

interface QuoteResult {
  symbol: string
  shortName?: string
  longName?: string
  quoteType?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketPreviousClose?: number
  regularMarketOpen?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketVolume?: number
  marketCap?: number | null
  earningsTimestamp?: Date | string
  earningsTimestampStart?: Date | string
  earningsTimestampEnd?: Date | string
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  currency?: string
}

interface HistoricalQuote {
  date: Date
  close?: number | null
  volume?: number | null
}

interface ScreenerQuoteResult {
  symbol: string
  shortName?: string
  longName?: string
  quoteType?: string
}

export interface MostActiveStockCandidate {
  symbol: string
  name: string
  quoteType: string | null
}

export interface StockVolumeStats {
  symbol: string
  totalVolume: number
  averageDailyVolume: number
  tradingDays: number
}

function mapQuoteResult(result: QuoteResult, fallbackSymbol: string): StockQuote {
  const normalizeDateValue = (value?: Date | string) => {
    if (!value) return null
    if (value instanceof Date) return value.toISOString()
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  return {
    symbol: result.symbol,
    name: result.shortName || result.longName || fallbackSymbol,
    quoteType: result.quoteType ?? null,
    price: result.regularMarketPrice ?? 0,
    change: result.regularMarketChange ?? 0,
    changePercent: result.regularMarketChangePercent ?? 0,
    previousClose: result.regularMarketPreviousClose ?? 0,
    open: result.regularMarketOpen ?? 0,
    dayHigh: result.regularMarketDayHigh ?? 0,
    dayLow: result.regularMarketDayLow ?? 0,
    volume: result.regularMarketVolume ?? 0,
    marketCap: result.marketCap ?? null,
    earningsTimestamp: normalizeDateValue(result.earningsTimestamp),
    earningsTimestampStart: normalizeDateValue(result.earningsTimestampStart),
    earningsTimestampEnd: normalizeDateValue(result.earningsTimestampEnd),
    fiftyTwoWeekHigh: result.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: result.fiftyTwoWeekLow ?? 0,
    currency: result.currency || 'USD',
  }
}

// Fetch real-time stock quote
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const result = await yahooFinance.quote(symbol.toUpperCase()) as QuoteResult

    return mapQuoteResult(result, symbol)
  } catch (error) {
    console.error(`Failed to fetch quote for ${symbol}:`, error)
    return null
  }
}

export async function getStockQuotes(symbols: string[]): Promise<StockQuote[]> {
  if (symbols.length === 0) {
    return []
  }

  try {
    const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))]
    const results = await yahooFinance.quote(uniqueSymbols) as QuoteResult[]

    return results.map((result) => mapQuoteResult(result, result.symbol))
  } catch (error) {
    console.error(`Failed to fetch batch quotes for ${symbols.join(', ')}:`, error)
    return []
  }
}

// Fetch recent stock price history (last 30 days)
export async function getStockHistory(symbol: string, days: number = 30): Promise<StockHistory[]> {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return await getStockHistoryRange(symbol, {
      startDate,
      endDate,
      interval: '1d',
    })
  } catch (error) {
    console.error(`Failed to fetch history for ${symbol}:`, error)
    return []
  }
}

export async function getStockHistoryRange(
  symbol: string,
  options: StockHistoryOptions = {}
): Promise<StockHistory[]> {
  try {
    const endDate = options.endDate ?? new Date()
    const startDate = options.startDate ?? new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    const interval = options.interval ?? '1d'

    const result = await yahooFinance.historical(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval,
    }) as HistoricalQuote[]

    return result
      .filter((item) => item.close != null)
      .map((item) => ({
        date: item.date.toISOString().split('T')[0],
        close: item.close ?? 0,
      }))
  } catch (error) {
    console.error(`Failed to fetch history range for ${symbol}:`, error)
    return []
  }
}

export async function getMostActiveStocks(count: number = 100): Promise<MostActiveStockCandidate[]> {
  try {
    const result = await yahooFinance.screener({
      scrIds: 'most_actives',
      count,
    }) as { quotes?: ScreenerQuoteResult[] }

    return (result.quotes ?? []).map((quote) => ({
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || quote.symbol,
      quoteType: quote.quoteType ?? null,
    }))
  } catch (error) {
    console.error(`Failed to fetch most active stocks:`, error)
    return []
  }
}

export async function getStockVolumeStats(
  symbol: string,
  options: StockHistoryOptions = {}
): Promise<StockVolumeStats | null> {
  try {
    const endDate = options.endDate ?? new Date()
    const startDate = options.startDate ?? new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    const interval = options.interval ?? '1d'

    const result = await yahooFinance.historical(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval,
    }) as HistoricalQuote[]

    const volumes = result
      .map((item) => item.volume ?? 0)
      .filter((volume) => typeof volume === 'number' && Number.isFinite(volume) && volume > 0)

    if (volumes.length === 0) {
      return null
    }

    const totalVolume = volumes.reduce((sum, volume) => sum + volume, 0)

    return {
      symbol: symbol.toUpperCase(),
      totalVolume,
      averageDailyVolume: totalVolume / volumes.length,
      tradingDays: volumes.length,
    }
  } catch (error) {
    console.error(`Failed to fetch volume stats for ${symbol}:`, error)
    return null
  }
}

// Format stock data into a human-readable summary for the AI
export function formatStockDataForAI(quote: StockQuote, history: StockHistory[]): string {
  const direction = quote.change >= 0 ? '📈' : '📉'
  const sign = quote.change >= 0 ? '+' : ''

  let summary = `
--- LIVE STOCK DATA for ${quote.name} (${quote.symbol}) ---
${direction} Current Price: $${quote.price.toFixed(2)} ${quote.currency}
${direction} Change: ${sign}$${quote.change.toFixed(2)} (${sign}${quote.changePercent.toFixed(2)}%)
Open: $${quote.open.toFixed(2)} | Previous Close: $${quote.previousClose.toFixed(2)}
Day Range: $${quote.dayLow.toFixed(2)} - $${quote.dayHigh.toFixed(2)}
52-Week Range: $${quote.fiftyTwoWeekLow.toFixed(2)} - $${quote.fiftyTwoWeekHigh.toFixed(2)}
Volume: ${quote.volume.toLocaleString()}`

  if (quote.marketCap) {
    const mcap = quote.marketCap >= 1e12
      ? `$${(quote.marketCap / 1e12).toFixed(2)}T`
      : quote.marketCap >= 1e9
      ? `$${(quote.marketCap / 1e9).toFixed(2)}B`
      : `$${(quote.marketCap / 1e6).toFixed(2)}M`
    summary += `\nMarket Cap: ${mcap}`
  }

  if (history.length > 0) {
    const oldest = history[0]
    const newest = history[history.length - 1]
    const monthChange = newest.close - oldest.close
    const monthPct = ((monthChange / oldest.close) * 100)
    const monthSign = monthChange >= 0 ? '+' : ''
    summary += `\n30-Day Trend: ${monthSign}${monthPct.toFixed(2)}% (from $${oldest.close.toFixed(2)} to $${newest.close.toFixed(2)})`
  }

  summary += '\n--- END LIVE DATA ---'
  return summary
}
