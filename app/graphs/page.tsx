"use client";

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  BarChart3, MessageSquare, Star, Settings
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

const POPULAR_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'AMZN', 'META', 'MSFT']

export default function GraphsPage() {
  const [ticker, setTicker] = useState('')
  const [activeTicker, setActiveTicker] = useState('')
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'TSLA', 'NVDA'])

  const fetchStock = useCallback(async (symbol: string, days: number = period) => {
    if (!symbol.trim()) return
    setLoading(true)
    setActiveTicker(symbol.toUpperCase())

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
      fetchStock(ticker)
      if (!watchlist.includes(ticker.toUpperCase())) {
        setWatchlist(prev => [...prev, ticker.toUpperCase()])
      }
    }
  }

  const handlePeriodChange = (days: number) => {
    setPeriod(days)
    if (activeTicker) fetchStock(activeTicker, days)
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
          <button className="icon-btn">
            <Star size={22} strokeWidth={1.5} />
          </button>
          <button className="icon-btn">
            <Settings size={22} strokeWidth={1.5} />
          </button>
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
          <div className="graphs-header">
            <h1 className="graphs-title">📊 Live Market Charts</h1>
            <p className="graphs-subtitle">Real-time stock data powered by Yahoo Finance</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="graph-search">
            <input
              type="text"
              placeholder="Enter ticker (e.g., AAPL, TSLA)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="graph-search-input"
            />
            <button type="submit" className="graph-search-btn" disabled={loading}>
              {loading ? 'Loading...' : 'Search'}
            </button>
          </form>

          {/* Quick Picks */}
          <div className="quick-picks">
            {POPULAR_TICKERS.map(t => (
              <button
                key={t}
                onClick={() => { setTicker(t); fetchStock(t); }}
                className={`quick-pick-btn ${activeTicker === t ? 'active' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Stock Info + Chart */}
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
                    {isPositive ? '+' : ''}{data.quote.change.toFixed(2)} ({isPositive ? '+' : ''}{data.quote.changePercent.toFixed(2)}%)
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

          {/* Watchlist */}
          {!data && !loading && (
            <div className="watchlist-section">
              <h3 className="watchlist-title">Your Watchlist</h3>
              <div className="watchlist-grid">
                {watchlist.map(t => (
                  <button
                    key={t}
                    onClick={() => { setTicker(t); fetchStock(t); }}
                    className="watchlist-card"
                  >
                    <span className="watchlist-ticker">{t}</span>
                    <span className="watchlist-action">View Chart →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
