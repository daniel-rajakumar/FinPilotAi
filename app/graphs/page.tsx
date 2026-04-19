"use client";

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  BarChart3, MessageSquare, Newspaper, Settings, Landmark,
  ArrowLeft, Cpu, ShoppingBag, Banknote, HeartPulse, CircuitBoard, Flame,
  TrendingUp, TrendingDown
} from 'lucide-react'
import { StockQuote } from '@/lib/yfinance'

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
  stocks: SectorStock[]
}

const SECTORS: Sector[] = [
  {
    id: 'technology',
    name: 'Technology',
    icon: <Cpu size={24} />,
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
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

export default function GraphsPage() {
  const [activeSector, setActiveSector] = useState<Sector | null>(null)
  const [activeTicker, setActiveTicker] = useState('')
  const [activeStockName, setActiveStockName] = useState('')
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [ticker, setTicker] = useState('')

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
          <Link href="/economy" className="icon-btn" title="Economy">
            <Landmark size={22} strokeWidth={1.5} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <button className="icon-btn">
            <Settings size={22} strokeWidth={1.5} />
          </button>
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
                    <span className="sector-count">{sector.stocks.length} stocks</span>
                  </div>
                  <div className="sector-tickers">
                    {sector.stocks.slice(0, 3).map(s => (
                      <span key={s.symbol} className="sector-ticker-chip">{s.symbol}</span>
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
            <div className="sector-stocks-grid">
              {activeSector.stocks.map(stock => (
                <button
                  key={stock.symbol}
                  className="sector-stock-card"
                  style={{ '--sector-color': activeSector.color } as React.CSSProperties}
                  onClick={() => { setTicker(stock.symbol); fetchStock(stock.symbol, stock.name); }}
                >
                  <div className="sector-stock-symbol">{stock.symbol}</div>
                  <div className="sector-stock-name">{stock.name}</div>
                  <div className="sector-stock-action">View Chart →</div>
                </button>
              ))}
            </div>
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
                <div className="stock-info">
                  <h2 className="stock-name">{data.quote.name}</h2>
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
