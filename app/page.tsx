"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  BarChart3,
  MessageSquare,
  Newspaper,
  Settings,
  Landmark,
  X,
  Send,
  Aperture,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { ChatMessage } from '@/types'
import ReactMarkdown from 'react-markdown'

interface MiniStockData {
  quote: {
    name: string
    symbol: string
    price: number
    change: number
    changePercent: number
    dayHigh: number
    dayLow: number
    volume: number
    marketCap: number
  } | null
  history: { date: string; close: number }[]
}

const PERIOD_OPTIONS = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
]

function InlineStockCard({ ticker }: { ticker: string }) {
  const [data, setData] = useState<MiniStockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePeriod, setActivePeriod] = useState(1) // default 1M
  const [expanded, setExpanded] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)

  const fetchStockData = useCallback(async (days: number, isInitial = false) => {
    if (isInitial) setLoading(true)
    else setChartLoading(true)
    try {
      const res = await fetch(`/api/stock?symbol=${ticker}&period=${days}`)
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error('Failed to fetch stock for card:', err)
    } finally {
      if (isInitial) setLoading(false)
      else setChartLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchStockData(PERIOD_OPTIONS[activePeriod].days, true)
  }, [ticker]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (index: number) => {
    if (index === activePeriod) return
    setActivePeriod(index)
    fetchStockData(PERIOD_OPTIONS[index].days)
  }

  if (loading) {
    return (
      <div className="inline-stock-card loading-card">
        <div className="isc-shimmer" />
        <div className="isc-shimmer short" />
        <div className="isc-shimmer chart-shimmer" />
      </div>
    )
  }

  if (!data?.quote) return null

  const isPositive = data.quote.change >= 0
  const gradientColor = isPositive ? '#22c55e' : '#ef4444'
  const lineColor = isPositive ? '#16a34a' : '#dc2626'

  // Compute 30d performance from history
  let periodReturn = ''
  if (data.history.length >= 2) {
    const oldest = data.history[0].close
    const newest = data.history[data.history.length - 1].close
    const pct = ((newest - oldest) / oldest) * 100
    periodReturn = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
  }

  return (
    <div className={`inline-stock-card ${expanded ? 'expanded' : ''}`}>
      {/* Live indicator */}
      <div className="isc-live-badge">
        <span className="isc-live-dot" />
        LIVE
      </div>

      <div className="isc-header">
        <div className="isc-info">
          <span className="isc-symbol">{data.quote.symbol}</span>
          <span className="isc-name">{data.quote.name}</span>
        </div>
        <div className="isc-price-block">
          <span className="isc-price">${data.quote.price.toFixed(2)}</span>
          <span className={`isc-change ${isPositive ? 'up' : 'down'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isPositive ? '+' : ''}{data.quote.change.toFixed(2)} ({isPositive ? '+' : ''}{data.quote.changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Period toggles */}
      <div className="isc-period-row">
        <div className="isc-period-toggles">
          {PERIOD_OPTIONS.map((p, i) => (
            <button
              key={p.label}
              className={`isc-period-btn ${activePeriod === i ? 'active' : ''}`}
              onClick={() => handlePeriodChange(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {periodReturn && (
          <span className={`isc-period-return ${data.history.length >= 2 && data.history[data.history.length - 1].close >= data.history[0].close ? 'up' : 'down'}`}>
            {PERIOD_OPTIONS[activePeriod].label}: {periodReturn}
          </span>
        )}
      </div>

      {/* Chart */}
      {data.history.length > 0 && (
        <div className={`isc-chart ${chartLoading ? 'chart-loading' : ''}`}>
          <ResponsiveContainer width="100%" height={expanded ? 180 : 120}>
            <AreaChart data={data.history} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${ticker}-${activePeriod}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={gradientColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={(val: string) => {
                  const d = new Date(val)
                  return `${d.getMonth() + 1}/${d.getDate()}`
                }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(val: number) => `$${val.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  background: '#1c1c1e', border: 'none', borderRadius: '10px',
                  padding: '8px 14px', color: '#fff', fontSize: '13px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
                formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
                labelStyle={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}
                labelFormatter={(label: any) => {
                  const d = new Date(String(label))
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={lineColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#grad-${ticker}-${activePeriod})`}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats grid */}
      <div className="isc-stats">
        <div className="isc-stat">
          <span className="isc-stat-label">Day Range</span>
          <span className="isc-stat-value">${data.quote.dayLow.toFixed(2)} – ${data.quote.dayHigh.toFixed(2)}</span>
        </div>
        <div className="isc-stat">
          <span className="isc-stat-label">Volume</span>
          <span className="isc-stat-value">{(data.quote.volume / 1e6).toFixed(1)}M</span>
        </div>
        <div className="isc-stat">
          <span className="isc-stat-label">Mkt Cap</span>
          <span className="isc-stat-value">
            {data.quote.marketCap >= 1e12
              ? `$${(data.quote.marketCap / 1e12).toFixed(2)}T`
              : `$${(data.quote.marketCap / 1e9).toFixed(1)}B`}
          </span>
        </div>
      </div>

      {/* Expandable extra stats */}
      {expanded && (
        <div className="isc-stats isc-stats-extra">
          <div className="isc-stat">
            <span className="isc-stat-label">Open</span>
            <span className="isc-stat-value">${data.quote.price.toFixed(2)}</span>
          </div>
          <div className="isc-stat">
            <span className="isc-stat-label">Prev Close</span>
            <span className="isc-stat-value">${(data.quote.price - data.quote.change).toFixed(2)}</span>
          </div>
          <div className="isc-stat">
            <span className="isc-stat-label">Today</span>
            <span className={`isc-stat-value ${isPositive ? 'stat-up' : 'stat-down'}`}>
              {isPositive ? '+' : ''}{data.quote.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Expand / Collapse toggle */}
      <button className="isc-expand-btn" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Show Less' : 'More Details'}
      </button>
    </div>
  )
}

export default function ChatDashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-save history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      fetch('/api/data/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages)
      }).catch(err => console.error('Failed to auto-save:', err))
    }
  }, [messages])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      })

      const data = await response.json()
      if (data.message) {
        setMessages(prev => [...prev, data.message])
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptClick = (text: string) => {
    handleSend(text)
  }

  return (
    <div className="app-container">
      {/* Sidebar - Same as before */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link href="/graphs" className="icon-btn" title="Graphs">
            <BarChart3 size={22} strokeWidth={1.5} />
          </Link>
          <Link href="/" className="icon-btn active" title="Chat">
            <div className="active-bg">
              <MessageSquare size={22} strokeWidth={1.5} />
            </div>
          </Link>
          <Link href="/news" className="icon-btn" title="News">
            <Newspaper size={22} strokeWidth={1.5} />
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

      {/* Main Content Area */}
      <main className="main-area">
        {/* Top Tabs - Same as before */}
        <div className="tabs-container">
          <div className="tab active-tab">
            <span className="tab-text">New Chat</span>
            <X size={14} className="tab-close" />
          </div>
          <div className="tab">
            <span className="tab-text">The Roman Empire</span>
            <X size={14} className="tab-close" />
          </div>
          <div className="tab">
            <span className="tab-text">Effects of the French Revolution</span>
            <X size={14} className="tab-close" />
          </div>
        </div>

        {/* Chat Window */}
        <div className="chat-window-wrapper">
          <div className="chat-window" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="chat-content-center">
                <div className="logo-container">
                   <Aperture size={32} strokeWidth={1.5} color="#888" />
                </div>
                <h1 className="welcome-title">Let&#39;s chat! What&#39;s on your mind?</h1>
                <p className="welcome-subtitle">
                  Choose from the prompts below or start asking queries. I&#39;m here to help with<br/>
                  whatever you need.
                </p>

                <div className="prompts-section">
                  <p className="prompts-label">Try these prompts:</p>
                  <div className="prompts-grid">
                    <button onClick={() => handlePromptClick("What's happening with NVDA stock today?")} className="prompt-btn">What's happening with NVDA stock today?</button>
                    <button onClick={() => handlePromptClick("Compare AAPL and MSFT performance this month.")} className="prompt-btn">Compare AAPL and MSFT performance this month.</button>
                    <button onClick={() => handlePromptClick("Is TSLA a good buy right now?")} className="prompt-btn">Is TSLA a good buy right now?</button>
                    <button onClick={() => handlePromptClick("Explain what a P/E ratio means.")} className="prompt-btn">Explain what a P/E ratio means.</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="message-list">
                {messages.map((m) => (
                  <div key={m.id} className={`message-bubble-wrapper ${m.role}`}>
                    {/* Inline stock charts */}
                    {m.role === 'assistant' && m.tickers && m.tickers.length > 0 && (
                      <div className="inline-stock-cards">
                        {m.tickers.map(t => <InlineStockCard key={t} ticker={t} />)}
                      </div>
                    )}
                    <div className="message-bubble">
                      {m.role === 'assistant' ? (
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      ) : (
                        <p>{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="message-bubble-wrapper assistant">
                    <div className="message-bubble loading">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input Area */}
            <div className="input-area-container">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
                className="input-wrapper"
              >
                <input 
                  type="text" 
                  placeholder="Ask Something" 
                  className="chat-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading}
                />
                <button type="submit" className="send-btn" disabled={!inputValue.trim() || isLoading}>
                  <Send size={18} strokeWidth={1.5} color={inputValue.trim() ? "#1c1c1e" : "#7b8390"} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
