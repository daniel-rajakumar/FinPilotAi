"use client";

import React, { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  BarChart3, MessageSquare, Newspaper, Settings, Landmark,
  ArrowLeft, Cpu, ShoppingBag, Banknote, HeartPulse, CircuitBoard, Flame,
  TrendingUp, TrendingDown, ExternalLink, Clock, Zap
} from 'lucide-react'
import { StockQuote } from '@/lib/yfinance'
import CompanyLogo from '@/components/CompanyLogo'

interface StockHistory {
  date: string
  close: number
}

interface StockData {
  quote: StockQuote | null
  history: StockHistory[]
}

interface SectorStock {
  symbol: string
  name: string
}

interface Sector {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  gradient: string
  etf: string
  stocks: SectorStock[]
}

const SECTORS: Sector[] = [
  {
    id: 'technology',
    name: 'Technology',
    icon: <Cpu size={24} />,
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    etf: 'XLK',
    stocks: [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corp.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'META', name: 'Meta Platforms' },
      { symbol: 'CRM', name: 'Salesforce Inc.' },
      { symbol: 'ORCL', name: 'Oracle Corp.' },
    ]
  },
  {
    id: 'consumer-goods',
    name: 'Consumer Goods',
    icon: <ShoppingBag size={24} />,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    etf: 'XLY',
    stocks: [
      { symbol: 'AMZN', name: 'Amazon.com' },
      { symbol: 'TSLA', name: 'Tesla Inc.' },
      { symbol: 'NKE', name: 'Nike Inc.' },
      { symbol: 'PG', name: 'Procter & Gamble' },
      { symbol: 'KO', name: 'Coca-Cola Co.' },
      { symbol: 'PEP', name: 'PepsiCo Inc.' },
    ]
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: <Banknote size={24} />,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    etf: 'XLF',
    stocks: [
      { symbol: 'JPM', name: 'JPMorgan Chase' },
      { symbol: 'BAC', name: 'Bank of America' },
      { symbol: 'GS', name: 'Goldman Sachs' },
      { symbol: 'V', name: 'Visa Inc.' },
      { symbol: 'MA', name: 'Mastercard Inc.' },
      { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: <HeartPulse size={24} />,
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
    etf: 'XLV',
    stocks: [
      { symbol: 'JNJ', name: 'Johnson & Johnson' },
      { symbol: 'UNH', name: 'UnitedHealth Group' },
      { symbol: 'PFE', name: 'Pfizer Inc.' },
      { symbol: 'ABBV', name: 'AbbVie Inc.' },
      { symbol: 'MRK', name: 'Merck & Co.' },
      { symbol: 'LLY', name: 'Eli Lilly & Co.' },
    ]
  },
  {
    id: 'semiconductors',
    name: 'Semiconductors',
    icon: <CircuitBoard size={24} />,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    etf: 'SMH',
    stocks: [
      { symbol: 'NVDA', name: 'NVIDIA Corp.' },
      { symbol: 'AMD', name: 'Advanced Micro Devices' },
      { symbol: 'INTC', name: 'Intel Corp.' },
      { symbol: 'TSM', name: 'Taiwan Semiconductor' },
      { symbol: 'AVGO', name: 'Broadcom Inc.' },
      { symbol: 'QCOM', name: 'Qualcomm Inc.' },
    ]
  },
  {
    id: 'energy',
    name: 'Energy',
    icon: <Flame size={24} />,
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
    etf: 'XLE',
    stocks: [
      { symbol: 'XOM', name: 'Exxon Mobil' },
      { symbol: 'CVX', name: 'Chevron Corp.' },
      { symbol: 'COP', name: 'ConocoPhillips' },
      { symbol: 'SLB', name: 'Schlumberger' },
      { symbol: 'EOG', name: 'EOG Resources' },
      { symbol: 'NEE', name: 'NextEra Energy' },
    ]
  },
]

// Search query map for better sector-specific news results
const SECTOR_NEWS_QUERIES: Record<string, string> = {
  'Technology': 'AAPL',
  'Consumer Goods': 'AMZN',
  'Finance': 'JPM',
  'Healthcare': 'UNH',
  'Semiconductors': 'NVDA',
  'Energy': 'XOM',
}

interface NewsArticle {
  title: string
  description: string
  url: string
  source: { name: string }
  publishedAt: string
  urlToImage: string | null
}

function SectorNews({ sectorName, sectorColor }: { sectorName: string; sectorColor: string }) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true)
      try {
        const query = SECTOR_NEWS_QUERIES[sectorName] || `${sectorName} stocks`
        const res = await fetch(`/api/news?ticker=${encodeURIComponent(query)}`)
        const result = await res.json()
        setArticles((result.articles || []).slice(0, 6))
      } catch (err) {
        console.error('Failed to fetch sector news:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchNews()
  }, [sectorName])

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div className="sector-news-section">
      <div className="sector-news-header">
        <h3 className="sector-news-title">
          <Newspaper size={18} />
          {sectorName} News
        </h3>
        <span className="sector-news-subtitle">Latest headlines affecting this sector</span>
      </div>

      {loading ? (
        <div className="sector-news-loading">
          {[1, 2, 3].map(i => (
            <div key={i} className="sector-news-skeleton">
              <div className="skel-line skel-title" />
              <div className="skel-line skel-desc" />
              <div className="skel-line skel-meta" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="sector-news-empty">
          <Newspaper size={24} strokeWidth={1} />
          <p>No recent news found for {sectorName}</p>
        </div>
      ) : (
        <div className="sector-news-grid">
          {articles.map((article, i) => (
            <a
              key={i}
              href={article.url !== '#' ? article.url : undefined}
              onClick={(e) => {
                if (article.url === '#') e.preventDefault()
              }}
              target={article.url !== '#' ? "_blank" : undefined}
              rel="noopener noreferrer"
              className={`sector-news-card ${article.url === '#' ? 'cursor-default' : ''}`}
              style={{ '--sector-accent': sectorColor } as React.CSSProperties}
            >
              {article.urlToImage && (
                <div className="sector-news-img">
                  <img src={article.urlToImage} alt="" />
                </div>
              )}
              <div className="sector-news-content">
                <h4 className="sector-news-article-title">{article.title}</h4>
                {article.description && (
                  <p className="sector-news-desc">{article.description}</p>
                )}
                <div className="sector-news-meta">
                  <span className="sector-news-source">{article.source.name}</span>
                  <span className="sector-news-time"><Clock size={11} /> {timeAgo(article.publishedAt)}</span>
                  <ExternalLink size={12} className="sector-news-link-icon" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GraphsPage() {
  const [activeSector, setActiveSector] = useState<Sector | null>(null)
  const [activeTicker, setActiveTicker] = useState('')
  const [activeStockName, setActiveStockName] = useState('')
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [ticker, setTicker] = useState('')
  const [sectorPerf, setSectorPerf] = useState<Record<string, number | null>>({})

  useEffect(() => {
    const fetchSectors = async () => {
      const results = await Promise.allSettled(
        SECTORS.map(async (s) => {
          const res = await fetch(`/api/stock?symbol=${s.etf}&period=1`)
          const data = await res.json()
          return { id: s.id, changePercent: data.quote?.changePercent ?? null }
        })
      )
      const perf: Record<string, number | null> = {}
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          perf[r.value.id] = r.value.changePercent
        }
      })
      setSectorPerf(perf)
    }
    fetchSectors()
  }, [])

  const fetchStock = useCallback(async (symbol: string, name: string, days: number = period) => {
    if (!symbol.trim()) return
    setLoading(true)
    setActiveTicker(symbol.toUpperCase())
    setActiveStockName(name)

    try {
      const res = await fetch(`/api/stock?symbol=${symbol}&period=${days}`)
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error('Failed to fetch stock:', err)
    } finally {
      setLoading(false)
    }
  }, [period])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (ticker.trim()) {
      fetchStock(ticker, ticker.toUpperCase())
    }
  }

  const handlePeriodChange = (days: number) => {
    setPeriod(days)
    if (activeTicker) fetchStock(activeTicker, activeStockName, days)
  }

  const handleBack = () => {
    if (data) {
      setData(null)
      setActiveTicker('')
    } else if (activeSector) {
      setActiveSector(null)
    }
  }

  const formatPrice = (value: number) => `$${value.toFixed(2)}`
  const isPositive = data?.quote ? data.quote.change >= 0 : true
  const gradientColor = isPositive ? '#22c55e' : '#ef4444'
  const lineColor = isPositive ? '#16a34a' : '#dc2626'

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link href="/graphs" className="icon-btn active" title="Graphs">
            <div className="active-bg">
              <BarChart3 size={22} strokeWidth={1.5} />
            </div>
          </Link>
          <Link href="/" className="icon-btn" title="Chat">
            <MessageSquare size={22} strokeWidth={1.5} />
          </Link>
          <Link href="/news" className="icon-btn" title="News">
            <Newspaper size={22} strokeWidth={1.5} />
          </Link>
          <Link href="/options" className="icon-btn" title="Option Flow">
            <Zap size={22} strokeWidth={1.5} />
          </Link>
          <Link href="/economy" className="icon-btn" title="Economy">
            <Landmark size={22} strokeWidth={1.5} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <Link href="/settings" className="icon-btn" title="Settings">
            <Settings size={22} strokeWidth={1.5} />
          </Link>
          <button className="avatar-btn">
            <div className="avatar">
              <img src="https://i.pravatar.cc/150?img=47" alt="User avatar" />
            </div>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        <div className="graphs-container">
          {/* Header */}
          <div className="graphs-header">
            <div className="graphs-header-row">
              {(activeSector || data) && (
                <button className="back-btn" onClick={handleBack}>
                  <ArrowLeft size={18} />
                </button>
              )}
              <div>
                <h1 className="graphs-title">
                  {data?.quote
                    ? `${data.quote.name}`
                    : activeSector
                    ? `${activeSector.name}`
                    : '📊 Live Market Charts'}
                </h1>
                <p className="graphs-subtitle">
                  {data?.quote
                    ? `${data.quote.symbol} — Real-time data`
                    : activeSector
                    ? `Browse ${activeSector.name} stocks`
                    : 'Select a sector to explore stocks'}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar — always visible */}
          <form onSubmit={handleSubmit} className="graph-search">
            <input
              type="text"
              placeholder="Search any ticker (e.g., AAPL, TSLA)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="graph-search-input"
            />
            <button type="submit" className="graph-search-btn" disabled={loading}>
              {loading ? 'Loading...' : 'Search'}
            </button>
          </form>

          {/* ======================== SECTOR GRID VIEW ======================== */}
          {!activeSector && !data && !loading && (
            <div className="sectors-grid">
              {SECTORS.map(sector => (
                <button
                  key={sector.id}
                  className="sector-card"
                  style={{
                    '--sector-color': sector.color,
                    '--sector-gradient': sector.gradient,
                  } as React.CSSProperties}
                  onClick={() => setActiveSector(sector)}
                >
                  <div className="sector-icon-wrapper">
                    {sector.icon}
                  </div>
                  <div className="sector-info">
                    <span className="sector-name">{sector.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span className="sector-count">{sector.stocks.length} stocks</span>
                      {sectorPerf[sector.id] !== undefined && sectorPerf[sector.id] !== null && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: sectorPerf[sector.id]! >= 0 ? 'var(--success)' : 'var(--error)',
                          backgroundColor: sectorPerf[sector.id]! >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          {sectorPerf[sector.id]! >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {sectorPerf[sector.id]! >= 0 ? 'Good' : 'Bad'} ({sectorPerf[sector.id]! > 0 ? '+' : ''}{sectorPerf[sector.id]!.toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="sector-tickers">
                    {sector.stocks.slice(0, 3).map(s => (
                      <span key={s.symbol} className="sector-ticker-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CompanyLogo symbol={s.symbol} size={14} />
                        {s.symbol}
                      </span>
                    ))}
                    {sector.stocks.length > 3 && (
                      <span className="sector-ticker-chip more">+{sector.stocks.length - 3}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ======================== STOCK LIST FOR SECTOR ======================== */}
          {activeSector && !data && !loading && (
            <>
              <div className="sector-stocks-grid">
                {activeSector.stocks.map(stock => (
                  <button
                    key={stock.symbol}
                    className="sector-stock-card"
                    style={{ '--sector-color': activeSector.color } as React.CSSProperties}
                    onClick={() => { setTicker(stock.symbol); fetchStock(stock.symbol, stock.name); }}
                  >
                    <div className="sector-stock-symbol" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CompanyLogo symbol={stock.symbol} size={20} />
                      {stock.symbol}
                    </div>
                    <div className="sector-stock-name">{stock.name}</div>
                    <div className="sector-stock-action">View Chart →</div>
                  </button>
                ))}
              </div>

              {/* Sector News */}
              <SectorNews sectorName={activeSector.name} sectorColor={activeSector.color} />
            </>
          )}

          {/* ======================== LOADING ======================== */}
          {loading && (
            <div className="stock-loading">
              <div className="stock-loading-spinner" />
              <p>Loading {activeTicker} data...</p>
            </div>
          )}

          {/* ======================== STOCK CHART VIEW ======================== */}
          {data?.quote && (
            <div className="stock-card">
              {/* Stock Header */}
              <div className="stock-card-header">
                <div className="stock-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CompanyLogo symbol={data.quote.symbol} size={28} />
                    <h2 className="stock-name" style={{ margin: 0 }}>{data.quote.name}</h2>
                  </div>
                  <span className="stock-symbol">{data.quote.symbol}</span>
                </div>
                <div className="stock-price-block">
                  <span className="stock-price">${data.quote.price.toFixed(2)}</span>
                  <span className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {' '}{isPositive ? '+' : ''}{data.quote.change.toFixed(2)} ({isPositive ? '+' : ''}{data.quote.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Period Toggles */}
              <div className="period-toggles">
                {[
                  { label: '1W', days: 7 },
                  { label: '1M', days: 30 },
                  { label: '3M', days: 90 },
                  { label: '6M', days: 180 },
                  { label: '1Y', days: 365 },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => handlePeriodChange(p.days)}
                    className={`period-btn ${period === p.days ? 'active' : ''}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div className="chart-container">
                {data.history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatPrice}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#1c1c1e',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          color: '#fff',
                          fontSize: '14px',
                        }}
                        formatter={(value: any) => [formatPrice(Number(value)), 'Price']}
                        labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke={lineColor}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorClose)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-data">No historical data available for this period.</p>
                )}
              </div>

              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Open</span>
                  <span className="stat-value">${data.quote.open.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Previous Close</span>
                  <span className="stat-value">${data.quote.previousClose.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Day Range</span>
                  <span className="stat-value">${data.quote.dayLow.toFixed(2)} - ${data.quote.dayHigh.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">52W Range</span>
                  <span className="stat-value">${data.quote.fiftyTwoWeekLow.toFixed(2)} - ${data.quote.fiftyTwoWeekHigh.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Volume</span>
                  <span className="stat-value">{data.quote.volume.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Market Cap</span>
                  <span className="stat-value">
                    {data.quote.marketCap 
                      ? data.quote.marketCap >= 1e12
                        ? `$${(data.quote.marketCap / 1e12).toFixed(2)}T`
                        : `$${(data.quote.marketCap / 1e9).toFixed(2)}B`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
