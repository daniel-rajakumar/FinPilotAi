"use client";

import React, { useState, useEffect } from 'react'
import {
  Zap, TrendingUp, TrendingDown, Clock,
  ArrowUpRight, ArrowDownRight, Info
} from 'lucide-react'
import { OptionFlowData, OptionFlowTicker } from '@/lib/option-flow'
import CompanyLogo from '@/components/CompanyLogo'
import AppSidebar from '@/components/AppSidebar'
import PageHeaderIcon from '@/components/PageHeaderIcon'

export default function OptionFlowPage() {
  const [data, setData] = useState<OptionFlowData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/option-flow')
        const result = await res.json()
        setData(result)
      } catch (err) {
        console.error('Failed to fetch option flow:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const SentimentBadge = ({ score }: { score: number }) => {
    const percentage = Math.round(score * 100)
    let color = 'var(--text-secondary)'
    if (score >= 0.8) color = 'var(--success)'
    else if (score >= 0.6) color = 'var(--success-light)'
    
    return (
      <div className="sentiment-badge" style={{ color }}>
        {percentage}% Confidence
      </div>
    )
  }

  const BearishSentimentBadge = ({ score }: { score: number }) => {
    const percentage = Math.round(score * 100)
    let color = 'var(--text-secondary)'
    if (score >= 0.8) color = 'var(--error)'
    else if (score >= 0.6) color = 'var(--error-light)'
    
    return (
      <div className="sentiment-badge" style={{ color }}>
        {percentage}% Confidence
      </div>
    )
  }

    return (
    <div className="app-container">
      <AppSidebar active="options" />

      {/* Main Area */}
      <main className="main-area">
        <div className="options-container">
          {/* Header */}
          <div className="options-header">
            <div className="options-header-title">
              <PageHeaderIcon icon={Zap} />
              <h1>Option Flow</h1>
              <div className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </div>
            </div>
            <div className="options-header-actions">
              {data && (
                <div className="last-updated">
                  <Clock size={14} />
                  <span>Last Updated: {formatTime(data.lastUpdated)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="options-info-card">
            <Info size={18} />
            <p>
              Analyzing real-time unusual options activity from <strong>OptionStrat</strong>. 
              We track high-premium sweeps, block trades, and aggressive sentiment to identify where the "smart money" is moving.
            </p>
          </div>

          {loading ? (
            <div className="options-loading">
              <div className="options-loading-spinner"></div>
              <p>Analyzing market flow data...</p>
            </div>
          ) : (
            <div className="flow-grid">
              {/* Bullish Section */}
              <div className="flow-section bullish">
                <div className="section-header">
                  <TrendingUp size={20} color="var(--success)" />
                  <h2>Top 5 Bullish Names</h2>
                  <span className="sentiment-label bullish">CALL BUYING / PUT SELLING</span>
                </div>
                
                <div className="flow-table-wrapper">
                  <table className="flow-table">
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Sentiment</th>
                        <th>Premium</th>
                        <th>Trades</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.topBullish.map((ticker) => (
                        <tr key={ticker.symbol}>
                          <td>
                            <div className="symbol-cell">
                              <span className="symbol-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CompanyLogo symbol={ticker.symbol} size={20} />
                                {ticker.symbol}
                              </span>
                              <span className="full-name">{ticker.name}</span>
                            </div>
                          </td>
                          <td>
                            <SentimentBadge score={ticker.sentimentScore} />
                          </td>
                          <td className="premium-cell">{ticker.premium}</td>
                          <td>{ticker.tradeCount}</td>
                          <td>
                            <div className="price-cell">
                              <span className="current-price">${ticker.price.toFixed(2)}</span>
                              <span className="price-change up">
                                <ArrowUpRight size={12} />
                                {ticker.changePercent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bearish Section */}
              <div className="flow-section bearish">
                <div className="section-header">
                  <TrendingDown size={20} color="var(--error)" />
                  <h2>Top 5 Bearish Names</h2>
                  <span className="sentiment-label bearish">PUT BUYING / CALL SELLING</span>
                </div>
                
                <div className="flow-table-wrapper">
                  <table className="flow-table">
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Sentiment</th>
                        <th>Premium</th>
                        <th>Trades</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.topBearish.map((ticker) => (
                        <tr key={ticker.symbol}>
                          <td>
                            <div className="symbol-cell">
                              <span className="symbol-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CompanyLogo symbol={ticker.symbol} size={20} />
                                {ticker.symbol}
                              </span>
                              <span className="full-name">{ticker.name}</span>
                            </div>
                          </td>
                          <td>
                            <BearishSentimentBadge score={ticker.sentimentScore} />
                          </td>
                          <td className="premium-cell">{ticker.premium}</td>
                          <td>{ticker.tradeCount}</td>
                          <td>
                            <div className="price-cell">
                              <span className="current-price">${ticker.price.toFixed(2)}</span>
                              <span className="price-change down">
                                <ArrowDownRight size={12} />
                                {ticker.changePercent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .options-container {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }
        
        .options-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .options-header-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .zap-icon-wrapper {
          background: var(--accent-gradient);
          color: white;
          padding: 0.75rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .options-header h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }
        
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        
        .live-dot {
          width: 8px;
          height: 8px;
          background-color: var(--success);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        
        .last-updated {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        
        .options-info-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        
        .options-info-card strong {
          color: var(--text-primary);
        }
        
        .flow-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        
        @media (max-width: 1200px) {
          .flow-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .flow-section {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }
        
        .section-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        
        .section-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          flex-grow: 1;
        }
        
        .sentiment-label {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }
        
        .sentiment-label.bullish {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
        }
        
        .sentiment-label.bearish {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }
        
        .flow-table-wrapper {
          overflow-x: auto;
        }
        
        .flow-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        
        .flow-table th {
          padding: 1rem 1.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-color);
        }
        
        .flow-table td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          vertical-align: middle;
        }
        
        .flow-table tr:last-child td {
          border-bottom: none;
        }
        
        .flow-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        
        .symbol-cell {
          display: flex;
          flex-direction: column;
        }
        
        .symbol-name {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 1rem;
        }
        
        .full-name {
          font-size: 0.75rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }
        
        .premium-cell {
          font-weight: 600;
          color: var(--text-primary);
          font-family: 'JetBrains Mono', monospace;
        }
        
        .sentiment-badge {
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .price-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        
        .current-price {
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .price-change {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .price-change.up { color: var(--success); }
        .price-change.down { color: var(--error); }
        
        .options-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10rem 0;
          gap: 1.5rem;
          color: var(--text-secondary);
        }
        
        .options-loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
