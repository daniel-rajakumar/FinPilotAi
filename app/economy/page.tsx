"use client";

import React, { useState, useEffect, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  Landmark, TrendingUp, TrendingDown, RefreshCw, ChevronDown,
  Info, CalendarDays, AlertTriangle, Lightbulb, ChevronRight,
  Calendar, Clock, Zap
} from 'lucide-react'
import { getEventsForWeek, getWeekRangeForOffset, type EconEvent } from '@/lib/econ-calendar'
import AppSidebar from '@/components/AppSidebar'
import PageHeaderIcon from '@/components/PageHeaderIcon'

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

interface IndicatorInsight {
  id: string
  name: string
  what: string
  whyImportant: string
  marketImpact: string
  nextRelease: string
  frequency: string
  icon: string
}

const INDICATOR_INSIGHTS: IndicatorInsight[] = [
  {
    id: 'FEDFUNDS',
    name: 'Federal Funds Rate',
    what: 'The interest rate at which banks lend money to each other overnight. Set by the Federal Reserve\'s FOMC (Federal Open Market Committee), it\'s the most powerful tool the Fed has to influence the economy.',
    whyImportant: 'It directly affects borrowing costs for mortgages, car loans, credit cards, and business loans. When rates rise, borrowing becomes expensive and spending slows. When rates fall, money is cheaper and the economy heats up.',
    marketImpact: 'Rate hikes tend to be bearish for stocks (higher costs, lower valuations) and bullish for the dollar. Rate cuts are generally bullish for stocks and bearish for the dollar. Bond prices move inversely to rates.',
    nextRelease: 'FOMC meets 8 times per year. Next meeting decisions are announced at 2:00 PM ET.',
    frequency: 'Updated after each FOMC meeting (~every 6 weeks)',
    icon: '🏦',
  },
  {
    id: 'CPIAUCSL',
    name: 'Consumer Price Index (CPI)',
    what: 'Measures the average change in prices paid by consumers for a basket of goods and services including food, housing, transportation, and healthcare. It\'s the primary gauge of inflation.',
    whyImportant: 'High inflation erodes purchasing power — your dollar buys less. The Fed targets 2% inflation. When CPI runs hot, the Fed may raise rates to cool the economy. When it\'s too low, it signals weak demand.',
    marketImpact: 'Higher-than-expected CPI is bearish for stocks (fear of rate hikes) and bearish for bonds. Lower-than-expected CPI is bullish, as it may signal rate cuts ahead. Tech and growth stocks are especially sensitive.',
    nextRelease: 'Released monthly by the Bureau of Labor Statistics, usually around the 10th-13th of each month at 8:30 AM ET.',
    frequency: 'Monthly',
    icon: '📊',
  },
  {
    id: 'UNRATE',
    name: 'Unemployment Rate',
    what: 'The percentage of the labor force that is actively looking for work but cannot find a job. It\'s derived from the monthly "Non-Farm Payrolls" report (often called the Jobs Report).',
    whyImportant: 'A key indicator of economic health. Low unemployment means a strong economy with consumer spending power. Rising unemployment signals a weakening economy and potential recession.',
    marketImpact: 'A surprisingly strong jobs report (low unemployment) can be bearish if it signals the Fed will keep rates high. A weak report can be bullish if it means rate cuts are coming. Context matters more than the raw number.',
    nextRelease: 'Released on the first Friday of every month at 8:30 AM ET by the Bureau of Labor Statistics.',
    frequency: 'Monthly (first Friday)',
    icon: '👷',
  },
  {
    id: 'DGS10',
    name: '10-Year Treasury Yield',
    what: 'The yield (interest rate) on U.S. government bonds that mature in 10 years. It\'s considered the benchmark "risk-free" rate and influences all other interest rates in the economy.',
    whyImportant: 'It sets the floor for mortgage rates, corporate bond rates, and loan pricing. When the 10Y yield rises, borrowing costs increase across the entire economy. It also reflects market expectations about growth and inflation.',
    marketImpact: 'Rising yields compete with stocks for investor dollars (why buy risky stocks when bonds pay well?). A yield above 4.5-5% has historically pressured stock valuations. An inverted yield curve (2Y > 10Y) signals recession risk.',
    nextRelease: 'Updates continuously during market hours. Key moves happen around Fed speeches, CPI/jobs data, and Treasury auctions.',
    frequency: 'Daily (market hours)',
    icon: '📈',
  },
  {
    id: 'PAYEMS',
    name: 'Non-Farm Payrolls (NFP)',
    what: 'The total number of paid workers in the U.S. economy, excluding farm workers, government employees, private household employees, and nonprofit workers. It measures how many jobs the economy added or lost.',
    whyImportant: 'The single most market-moving economic report. It shows whether the economy is creating enough jobs to sustain growth. Economists typically expect 150K-250K new jobs per month in a healthy economy.',
    marketImpact: 'A big beat (more jobs than expected) can be bearish if markets fear the Fed will stay hawkish. A big miss can be bullish on rate-cut hopes. The report often causes massive intraday volatility in stocks, bonds, and forex.',
    nextRelease: 'Released on the first Friday of every month at 8:30 AM ET, alongside the unemployment rate.',
    frequency: 'Monthly (first Friday)',
    icon: '💼',
  },
  {
    id: 'NAPM',
    name: 'ISM Manufacturing PMI',
    what: 'The Purchasing Managers\' Index measures manufacturing sector activity. A reading above 50 indicates expansion; below 50 indicates contraction. It surveys purchasing managers on new orders, production, employment, and inventories.',
    whyImportant: 'It\'s a leading indicator — it shows where the economy is heading before GDP data confirms it. Manufacturing weakness often precedes broader economic slowdowns.',
    marketImpact: 'PMI above 50 is bullish for stocks, especially industrials and materials. PMI below 50 signals caution. The "prices paid" sub-index is closely watched as an inflation signal that can move Fed policy expectations.',
    nextRelease: 'Released on the first business day of every month at 10:00 AM ET by the Institute for Supply Management.',
    frequency: 'Monthly (1st business day)',
    icon: '🏭',
  },
  {
    id: 'GDP',
    name: 'Gross Domestic Product (GDP)',
    what: 'The total value of all goods and services produced in the U.S. economy. It\'s the broadest measure of economic activity. Reported as an annualized quarter-over-quarter growth rate.',
    whyImportant: 'Two consecutive quarters of negative GDP growth is the informal definition of a recession. Healthy GDP growth (2-3% annually) supports corporate earnings and stock prices.',
    marketImpact: 'Strong GDP = bullish for stocks but potentially hawkish for Fed policy. Weak GDP = bearish initially but may bring rate cuts. The market often reacts more to the "surprise" factor than the absolute number.',
    nextRelease: 'Released quarterly (advance estimate ~30 days after quarter ends, then two revisions). Released at 8:30 AM ET by the BEA.',
    frequency: 'Quarterly (3 estimates per quarter)',
    icon: '🌎',
  },
  {
    id: 'DEXUSEU',
    name: 'USD/EUR Exchange Rate',
    what: 'The price of one Euro in U.S. dollars. It reflects the relative strength of the U.S. and European economies, interest rate differentials, and global risk sentiment.',
    whyImportant: 'A strong dollar makes U.S. exports more expensive abroad (hurting multinationals) but makes imports cheaper. It affects the earnings of companies with significant international revenue (about 40% of S&P 500 revenue comes from overseas).',
    marketImpact: 'A strengthening dollar is headwind for large-cap multinationals (AAPL, MSFT) as it reduces the value of overseas revenue. A weakening dollar helps exporters and emerging markets. Currency moves reflect capital flows and risk appetite.',
    nextRelease: 'Updates continuously during forex trading hours (24/5). Major moves around central bank decisions, economic data releases.',
    frequency: 'Daily (continuous)',
    icon: '💱',
  },
]

export default function EconomyPage() {
  const [indicators, setIndicators] = useState<Record<string, IndicatorMeta>>({})
  const [data, setData] = useState<Record<string, SeriesData>>({})
  const [selectedSeries, setSelectedSeries] = useState<string>('FEDFUNDS')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewAll, setViewAll] = useState(false)
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    fetchData(false)
  }, [])

  const fetchData = async (all: boolean) => {
    setLoading(true)
    setError('')
    try {
      const param = all ? 'viewAll=true' : 'all=true'
      const res = await fetch(`/api/fred?${param}`)
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

  const handleViewAll = () => {
    setViewAll(true)
    fetchData(true)
  }

  const handleViewDefault = () => {
    setViewAll(false)
    fetchData(false)
  }

  const formatValue = (value: number, units: string) => {
    if (units.includes('%')) return `${value.toFixed(2)}%`
    if (units.includes('Billions')) return `$${value.toLocaleString()}B`
    if (units.includes('Thousands')) return `${value.toLocaleString()}K`
    if (units.includes('Index')) return value.toFixed(1)
    if (units.includes('USD per')) return value.toFixed(4)
    return value.toLocaleString()
  }

  const getLatestValue = (seriesId: string) => {
    const series = data[seriesId]
    if (!series || series.observations.length === 0) return null
    return series.observations[series.observations.length - 1].value
  }

  const getChange = (seriesId: string) => {
    const series = data[seriesId]
    if (!series || series.observations.length < 2) return null
    const latest = series.observations[series.observations.length - 1].value
    const prev = series.observations[series.observations.length - 2].value
    if (latest === null || prev === null || prev === 0) return null
    return ((latest - prev) / Math.abs(prev)) * 100
  }

  const toggleInsight = (id: string) => {
    setExpandedInsight(prev => prev === id ? null : id)
  }

  const selectedData = data[selectedSeries]
  const selectedMeta = indicators[selectedSeries]

  // Filter insights to show only ones that match loaded indicators
  const activeInsights = INDICATOR_INSIGHTS.filter(
    insight => indicators[insight.id] || Object.keys(indicators).length === 0
  )

  return (
    <div className="app-container">
      <AppSidebar active="economy" />

      {/* Main Area */}
      <main className="main-area">
        <div className="econ-container">
          {/* Header */}
          <div className="econ-header">
            <div className="econ-header-title">
              <PageHeaderIcon icon={Landmark} />
              <h1>Economic Dashboard</h1>
            </div>
            <p className="econ-subtitle">Key macroeconomic indicators from the Federal Reserve (FRED)</p>
            <div className="econ-header-actions">
              <button onClick={() => fetchData(viewAll)} className="econ-refresh" disabled={loading}>
                <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <button
                onClick={viewAll ? handleViewDefault : handleViewAll}
                className="econ-view-toggle"
                disabled={loading}
              >
                <ChevronDown size={16} />
                {viewAll ? 'Show Default' : 'View All'}
              </button>
            </div>
          </div>

          {error && (
            <div className="econ-error">
              <p>⚠️ {error}</p>
              <p className="econ-error-hint">Make sure FRED_API_KEY is set in .env.local. Get a free key at <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank">fred.stlouisfed.org</a></p>
            </div>
          )}

          {/* ==================== WEEKLY CALENDAR ==================== */}
          {(() => {
            const events = getEventsForWeek(weekOffset)
            const weekRange = getWeekRangeForOffset(weekOffset)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            return (
              <div className="econ-calendar-section">
                <div className="econ-calendar-header">
                  <div className="econ-calendar-title-row">
                    <h2 className="econ-calendar-title">
                      <Calendar size={20} />
                      Economic Calendar
                    </h2>
                    <div className="econ-calendar-nav">
                      <button className="econ-cal-nav-btn" onClick={() => setWeekOffset(w => w - 1)} disabled={weekOffset <= -4}>
                        ‹
                      </button>
                      <button className="econ-cal-nav-label" onClick={() => setWeekOffset(0)}>
                        {weekRange.label}
                      </button>
                      <button className="econ-cal-nav-btn" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 4}>
                        ›
                      </button>
                    </div>
                    <span className="econ-calendar-range">{weekRange.start} – {weekRange.end}</span>
                  </div>

                  {/* Column headers */}
                  <div className="econ-cal-col-headers">
                    <span className="econ-cal-col-h date-col">Date</span>
                    <span className="econ-cal-col-h name-col">Event</span>
                    <span className="econ-cal-col-h data-col">Forecast</span>
                    <span className="econ-cal-col-h data-col">Previous</span>
                    <span className="econ-cal-col-h data-col">Actual</span>
                  </div>
                </div>

                {events.length === 0 ? (
                  <div className="econ-calendar-empty">
                    <Calendar size={32} strokeWidth={1} />
                    <p>No major economic releases this week</p>
                    <span>Markets should be driven primarily by earnings and geopolitics</span>
                  </div>
                ) : (
                  <div className="econ-calendar-list">
                    {events.map((event, i) => {
                      const eventDate = new Date(event.date)
                      eventDate.setHours(0, 0, 0, 0)
                      const isToday = eventDate.getTime() === today.getTime()
                      const isPast = eventDate < today

                      return (
                        <div key={`${event.name}-${i}`}>
                          <div
                            className={`econ-calendar-item ${isToday ? 'today' : ''} ${isPast && !event.actual ? 'past' : ''}`}
                          >
                            <div className="econ-cal-date date-col">
                              <span className="econ-cal-day">{event.dayLabel.slice(0, 3)}</span>
                              <span className="econ-cal-datenum">{event.dateLabel}</span>
                            </div>
                            <div className="econ-cal-info name-col">
                              <div className="econ-cal-name-row">
                                <span className="econ-cal-icon-inline">{event.icon}</span>
                                <span className="econ-cal-name">{event.name}</span>
                                <span className={`econ-cal-impact ${event.impact}`}>
                                  {event.impact === 'high' ? <Zap size={10} /> : null}
                                  {event.impact === 'high' ? 'High' : 'Med'}
                                </span>
                              </div>
                              <div className="econ-cal-meta">
                                <span className="econ-cal-time"><Clock size={11} /> {event.time}</span>
                                <span className="econ-cal-category">{event.category}</span>
                              </div>
                            </div>
                            <div className="econ-cal-data data-col">
                              <span className="econ-cal-data-label">Forecast</span>
                              <span className="econ-cal-data-value">{event.forecast ?? '—'}</span>
                            </div>
                            <div className="econ-cal-data data-col">
                              <span className="econ-cal-data-label">Previous</span>
                              <span className="econ-cal-data-value prev">{event.previous ?? '—'}</span>
                            </div>
                            <div className="econ-cal-data data-col">
                              <span className="econ-cal-data-label">Actual</span>
                              {event.actual ? (
                                <span className={`econ-cal-data-value actual ${event.insightType === 'beat' ? 'beat' : event.insightType === 'miss' ? 'miss' : ''}`}>
                                  {event.actual}
                                </span>
                              ) : (
                                <span className="econ-cal-data-value pending">Pending</span>
                              )}
                            </div>
                            {isToday && <span className="econ-cal-today-badge">TODAY</span>}
                          </div>

                          {/* Insight bar */}
                          {event.insight && (
                            <div className={`econ-cal-insight ${event.insightType}`}>
                              <span className="econ-cal-insight-badge">
                                {event.insightType === 'beat' ? '✅ Beat' : event.insightType === 'miss' ? '❌ Miss' : '➖ In Line'}
                              </span>
                              <span className="econ-cal-insight-text">{event.insight}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

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

              {/* ==================== INDICATOR INSIGHTS ==================== */}
              {(() => {
                const insight = INDICATOR_INSIGHTS.find(i => i.id === selectedSeries)
                if (!insight) return null
                const latestVal = getLatestValue(insight.id)
                const meta = indicators[insight.id]

                return (
                  <div className="econ-insights-section">
                    <div className="econ-insights-header">
                      <h2 className="econ-insights-title">
                        <Lightbulb size={20} />
                        About This Indicator
                      </h2>
                    </div>

                    <div className="econ-insight-card expanded">
                      <div className="econ-insight-trigger-static">
                        <span className="econ-insight-icon">{insight.icon}</span>
                        <div className="econ-insight-trigger-info">
                          <span className="econ-insight-name">{insight.name}</span>
                          {latestVal !== null && meta && (
                            <span className="econ-insight-current">
                              Current: {formatValue(latestVal, meta.units)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="econ-insight-body">
                        <div className="econ-insight-detail">
                          <div className="econ-insight-detail-header">
                            <Info size={14} />
                            <span>What is it?</span>
                          </div>
                          <p>{insight.what}</p>
                        </div>

                        <div className="econ-insight-detail">
                          <div className="econ-insight-detail-header">
                            <AlertTriangle size={14} />
                            <span>Why it&apos;s important</span>
                          </div>
                          <p>{insight.whyImportant}</p>
                        </div>

                        <div className="econ-insight-detail">
                          <div className="econ-insight-detail-header">
                            <TrendingUp size={14} />
                            <span>How it affects the market</span>
                          </div>
                          <p>{insight.marketImpact}</p>
                        </div>

                        <div className="econ-insight-detail schedule">
                          <div className="econ-insight-detail-header">
                            <CalendarDays size={14} />
                            <span>Release schedule</span>
                          </div>
                          <p>{insight.nextRelease}</p>
                          <span className="econ-insight-freq">{insight.frequency}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
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
