"use client";

import React, { useState } from 'react'
import Link from 'next/link'
import {
  BarChart3, MessageSquare, Settings, Landmark,
  Newspaper, ExternalLink, Clock, Search
} from 'lucide-react'

interface NewsArticle {
  title: string
  description: string | null
  url: string
  source: string
  publishedAt: string
}

const TRENDING_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'AMZN', 'META', 'MSFT']
const CATEGORIES = ['All', 'Tech', 'Finance', 'Crypto', 'Energy']

export default function NewsPage() {
  const [ticker, setTicker] = useState('')
  const [activeTicker, setActiveTicker] = useState('')
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(false)

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
              >
                {t}
              </button>
            ))}
          </div>

          {/* News Content */}
          {loading && (
            <div className="news-loading">
              <div className="news-loading-spinner" />
              <p>Fetching latest news for {activeTicker}...</p>
            </div>
          )}

          {!loading && articles.length > 0 && (
            <>
              <h2 className="news-results-title">
                Latest News for <span className="news-ticker-highlight">{activeTicker}</span>
              </h2>
              <div className="news-grid">
                {articles.map((article, i) => (
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
            </>
          )}

          {/* Empty State */}
          {!loading && articles.length === 0 && !activeTicker && (
            <div className="news-empty">
              <Newspaper size={48} strokeWidth={1} className="news-empty-icon" />
              <h3>Search for Stock News</h3>
              <p>Enter a ticker above or click a trending stock to see the latest headlines.</p>
            </div>
          )}

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
