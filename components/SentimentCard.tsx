'use client'

import React from 'react'
import { getSentimentColor, getSentimentEmoji } from '@/lib/helpers'

interface SentimentCardProps {
  sentiment: string
  ticker: string
}

export default function SentimentCard({ sentiment, ticker }: SentimentCardProps) {
  const color = getSentimentColor(sentiment)
  const emoji = getSentimentEmoji(sentiment)

  return (
    <div className="sentiment-card" style={{ '--accent': color } as React.CSSProperties}>
      <div className="sentiment-badge">
        <span className="sentiment-emoji">{emoji}</span>
        <span className="sentiment-label">{sentiment}</span>
      </div>
      <p className="sentiment-ticker">{ticker}</p>
      <div
        className="sentiment-bar"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}
