'use client'

import React from 'react'

interface NewsListProps {
  headlines: string[]
}

export default function NewsList({ headlines }: NewsListProps) {
  return (
    <div className="news-card">
      <div className="news-header">
        <span className="news-icon">📰</span>
        <h3>Top Headlines</h3>
      </div>
      <ul className="news-list">
        {headlines.map((headline, index) => (
          <li key={index} className="news-item">
            <span className="news-number">{index + 1}</span>
            <p className="news-title">{headline}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
