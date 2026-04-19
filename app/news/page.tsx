"use client";

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BarChart3, MessageSquare, Settings, Landmark,
  Newspaper, ExternalLink, Clock, Search,
  TrendingUp, TrendingDown, Flame, Zap
} from 'lucide-react'
import CompanyLogo from '@/components/CompanyLogo'

interface NewsArticle {
  title: string
  description: string | null
  url: string
  source: string
  publishedAt: string
}

interface QuickQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  name: string
  loading: boolean
}

const TRENDING_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'AMZN', 'META', 'MSFT']

const MARKET_MOVERS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'META', name: 'Meta' },
]

export default function NewsPage() {
  const [ticker, setTicker] = useState('')
  const [activeTicker, setActiveTicker] = useState('')
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [trendingArticles, setTrendingArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [quotes, setQuotes] = useState<QuickQuote[]>([])

  // Auto-load trending news and ticker quotes on mount
  useEffect(() => {
    loadTrendingNews()
    loadQuickQuotes()
  }, [])

  const loadTrendingNews = async () => {
    setTrendingLoading(true)
    try {
      const res = await fetch('/api/news?ticker=stock market')
      const data = await res.json()
      setTrendingArticles(data.articles || [])
    } catch (err) {
      console.error('Failed to fetch trending news:', err)
    } finally {
      setTrendingLoading(false)
    }
  }

  const loadQuickQuotes = async () => {
    // Initialize with loading state
    setQuotes(MARKET_MOVERS.map(m => ({
      ...m,
      price: 0,
      change: 0,
      changePercent: 0,
      loading: true,
    })))

    // Fetch each quote
    const results = await Promise.allSettled(
      MARKET_MOVERS.map(async (m) => {
        const res = await fetch(`/api/stock?symbol=${m.symbol}&period=1`)
        const data = await res.json()
        return {
          symbol: m.symbol,
          name: m.name,
          price: data.quote?.price ?? 0,
          change: data.quote?.change ?? 0,
          changePercent: data.quote?.changePercent ?? 0,
          loading: false,
        }
      })
    )

    const resolved = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { ...MARKET_MOVERS[i], price: 0, change: 0, changePercent: 0, loading: false }
    )
    setQuotes(resolved)
  }

  const fetchNews = async (symbol: string) => {
    if (!symbol.trim()) return
    setLoading(true)
    setActiveTicker(symbol.toUpperCase())

    try {
      const res = await fetch(`/api/news?ticker=${symbol}`)
      const data = await res.json()
      setArticles(data.articles || [])
    } catch (err) {
      console.error('Failed to fetch news:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (ticker.trim()) fetchNews(ticker)
  }

  const clearSearch = () => {
    setActiveTicker('')
    setArticles([])
    setTicker('')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHrs < 1) return 'Just now'
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Determine which articles to show
  const displayArticles = activeTicker ? articles : trendingArticles
  const isShowingTrending = !activeTicker
  const isArticlesLoading = activeTicker ? loading : trendingLoading

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link href="/graphs" className="icon-btn" title="Graphs">
            <BarChart3 size={22} strokeWidth={1.5} />
          </Link>
          <Link href="/" className="icon-btn" title="Chat">
            <MessageSquare size={22} strokeWidth={1.5} />
          </Link>
          <Link href="/news" className="icon-btn active" title="News">
            <div className="active-bg">
              <Newspaper size={22} strokeWidth={1.5} />
            </div>
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
        <div className="news-container">
          {/* Header */}
          <div className="news-header">
            <div className="news-header-title">
              <Newspaper size={28} strokeWidth={1.5} />
              <h1>Market News</h1>
            </div>
            <p className="news-subtitle">Stay updated with the latest financial headlines</p>
          </div>

          {/* Search */}
          <form onSubmit={handleSubmit} className="news-search">
            <div className="news-search-wrapper">
              <Search size={18} className="news-search-icon" />
              <input
                type="text"
                placeholder="Search news by ticker (e.g., AAPL, TSLA)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="news-search-input"
              />
            </div>
            <button type="submit" className="news-search-btn" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Trending Tickers */}
          <div className="news-tickers">
            <span className="news-tickers-label">Trending:</span>
            {TRENDING_TICKERS.map(t => (
              <button
                key={t}
                onClick={() => { setTicker(t); fetchNews(t); }}
                className={`news-ticker-chip ${activeTicker === t ? 'active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <CompanyLogo symbol={t} size={14} />
                {t}
              </button>
            ))}
          </div>

          {/* ==================== MARKET MOVERS TICKER STRIP ==================== */}
          <div className="market-movers-strip">
            <div className="market-movers-label">
              <Zap size={14} />
              <span>Market Movers</span>
            </div>
            <div className="market-movers-cards">
              {quotes.map(q => (
                <button
                  key={q.symbol}
                  className="mover-card"
                  onClick={() => { setTicker(q.symbol); fetchNews(q.symbol); }}
                >
                  {q.loading ? (
                    <div className="mover-skeleton">
                      <div className="skel-line short" />
                      <div className="skel-line" />
                    </div>
                  ) : (
                    <>
                      <div className="mover-top">
                        <span className="mover-symbol" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CompanyLogo symbol={q.symbol} size={16} />
                          {q.symbol}
                        </span>
                        <span className={`mover-badge ${q.change >= 0 ? 'up' : 'down'}`}>
                          {q.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {q.change >= 0 ? '+' : ''}{q.changePercent.toFixed(1)}%
                        </span>
                      </div>
                      <span className="mover-price">${q.price.toFixed(2)}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ==================== NEWS CONTENT ==================== */}
          {/* Results Label */}
          {activeTicker && !loading && (
            <div className="news-results-header">
              <h2 className="news-results-title">
                Latest News for <span className="news-ticker-highlight">{activeTicker}</span>
              </h2>
              <button className="news-clear-btn" onClick={clearSearch}>
                ← Back to trending
              </button>
            </div>
          )}

          {isShowingTrending && !trendingLoading && trendingArticles.length > 0 && (
            <div className="news-results-header">
              <h2 className="news-results-title">
                <Flame size={18} /> Trending Headlines
              </h2>
            </div>
          )}

          {/* Loading */}
          {isArticlesLoading && (
            <div className="news-loading">
              <div className="news-loading-spinner" />
              <p>{activeTicker ? `Fetching latest news for ${activeTicker}...` : 'Loading trending news...'}</p>
            </div>
          )}

          {/* Articles Grid */}
          {!isArticlesLoading && displayArticles.length > 0 && (
            <div className="news-grid">
              {displayArticles.map((article, i) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`news-card ${i === 0 ? 'featured' : ''}`}
                >
                  <div className="news-card-content">
                    <div className="news-card-source">
                      <span className="news-source-name">{article.source}</span>
                      <span className="news-card-time">
                        <Clock size={12} />
                        {formatDate(article.publishedAt)}
                      </span>
                    </div>
                    <h3 className="news-card-title">{article.title}</h3>
                    {article.description && (
                      <p className="news-card-desc">{article.description}</p>
                    )}
                    <div className="news-card-link">
                      Read full article <ExternalLink size={14} />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Empty State - only when search returns nothing */}
          {!loading && articles.length === 0 && activeTicker && (
            <div className="news-empty">
              <Newspaper size={48} strokeWidth={1} className="news-empty-icon" />
              <h3>No articles found for {activeTicker}</h3>
              <p>Try a different ticker or check back later for new stories.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
