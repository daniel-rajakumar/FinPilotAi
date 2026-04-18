'use client'

import React, { useState, FormEvent } from 'react'

interface SearchBarProps {
  onSearch: (ticker: string) => void
  isLoading: boolean
}

const popularTickers = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA']

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [ticker, setTicker] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (ticker.trim() && !isLoading) {
      onSearch(ticker.trim().toUpperCase())
    }
  }

  const handleQuickPick = (t: string) => {
    setTicker(t)
    onSearch(t)
  }

  return (
    <div className="search-section">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Enter stock ticker (e.g., AAPL)"
            className="search-input"
            maxLength={5}
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className="search-button"
          disabled={!ticker.trim() || isLoading}
        >
          {isLoading ? (
            <span className="button-loading">
              <span className="spinner"></span>
              Analyzing...
            </span>
          ) : (
            'Analyze'
          )}
        </button>
      </form>

      <div className="quick-picks">
        <span className="quick-label">Popular:</span>
        {popularTickers.map((t) => (
          <button
            key={t}
            className="quick-pick-btn"
            onClick={() => handleQuickPick(t)}
            disabled={isLoading}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
