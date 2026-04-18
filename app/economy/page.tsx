"use client";

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts'
import {
  BarChart3, MessageSquare, Newspaper, Settings,
  Landmark, TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react'

interface Observation {
  date: string
  value: number | null
}

interface SeriesData {
  id: string
  title: string
  units: string
  frequency: string
  observations: Observation[]
}

interface IndicatorMeta {
  id: string
  title: string
  units: string
  description: string
  color: string
}

export default function EconomyPage() {
  const [indicators, setIndicators] = useState<Record<string, IndicatorMeta>>({})
  const [data, setData] = useState<Record<string, SeriesData>>({})
  const [selectedSeries, setSelectedSeries] = useState<string>('GDP')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/fred?all=true')
      const result = await res.json()
      if (result.error) {
        setError(result.error)
        return
      }
      setIndicators(result.indicators || {})
      setData(result.data || {})
    } catch (err) {
      setError('Failed to connect to FRED API')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number, units: string) => {
    if (units.includes('%')) return `${value.toFixed(2)}%`
    if (units.includes('Billions')) return `$${value.toLocaleString()}B`
    if (units.includes('Index')) return value.toFixed(1)
    return value.toLocaleString()
  }

  const getLatestValue = (seriesId: string) => {
    const series = data[seriesId]
    if (!series || series.observations.length === 0) return null
    const latest = series.observations[series.observations.length - 1]
    return latest.value
  }

  const getChange = (seriesId: string) => {
    const series = data[seriesId]
    if (!series || series.observations.length < 2) return null
    const latest = series.observations[series.observations.length - 1].value
    const prev = series.observations[series.observations.length - 2].value
    if (latest === null || prev === null || prev === 0) return null
    return ((latest - prev) / Math.abs(prev)) * 100
  }

  const selectedData = data[selectedSeries]
  const selectedMeta = indicators[selectedSeries]

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
          <Link href="/news" className="icon-btn" title="News">
            <Newspaper size={22} strokeWidth={1.5} />
          </Link>
          <Link href="/economy" className="icon-btn active" title="Economy">
            <div className="active-bg">
              <Settings size={22} strokeWidth={1.5} />
            </div>
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
        <div className="econ-container">
          {/* Header */}
          <div className="econ-header">
            <div className="econ-header-title">
              <Landmark size={28} strokeWidth={1.5} />
              <h1>Economic Dashboard</h1>
            </div>
            <p className="econ-subtitle">Key macroeconomic indicators from the Federal Reserve (FRED)</p>
            <button onClick={fetchAllData} className="econ-refresh" disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>

          {error && (
            <div className="econ-error">
              <p>⚠️ {error}</p>
              <p className="econ-error-hint">Make sure FRED_API_KEY is set in .env.local. Get a free key at <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank">fred.stlouisfed.org</a></p>
            </div>
          )}

          {/* Indicator Cards */}
          {!loading && !error && (
            <>
              <div className="econ-cards">
                {Object.entries(indicators).map(([key, meta]) => {
                  const value = getLatestValue(key)
                  const change = getChange(key)
                  const isSelected = selectedSeries === key

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedSeries(key)}
                      className={`econ-card ${isSelected ? 'selected' : ''}`}
                      style={{ borderColor: isSelected ? meta.color : undefined }}
                    >
                      <span className="econ-card-label">{meta.title}</span>
                      <span className="econ-card-value">
                        {value !== null ? formatValue(value, meta.units) : 'N/A'}
                      </span>
                      {change !== null && (
                        <span className={`econ-card-change ${change >= 0 ? 'up' : 'down'}`}>
                          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Selected Chart */}
              {selectedData && selectedMeta && (
                <div className="econ-chart-card">
                  <div className="econ-chart-header">
                    <div>
                      <h2 className="econ-chart-title">{selectedMeta.title}</h2>
                      <p className="econ-chart-desc">{selectedMeta.description}</p>
                    </div>
                    <span className="econ-chart-units">{selectedMeta.units}</span>
                  </div>

                  <div className="econ-chart">
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={selectedData.observations} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`grad-${selectedSeries}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={selectedMeta.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={selectedMeta.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={false}
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
                          formatter={(value: any) => [
                            formatValue(Number(value), selectedMeta.units),
                            selectedMeta.title
                          ]}
                          labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={selectedMeta.color}
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill={`url(#grad-${selectedSeries})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="econ-chart-footer">
                    <span>Source: Federal Reserve Bank of St. Louis (FRED)</span>
                    <span>Series: {selectedSeries} · {selectedData.frequency}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Loading */}
          {loading && (
            <div className="econ-loading">
              <div className="news-loading-spinner" />
              <p>Fetching economic data from FRED...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
