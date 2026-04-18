'use client'

import React from 'react'

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <span className="logo-icon">💹</span>
          <h1>FinPilot<span className="logo-accent">AI</span></h1>
        </div>
        <p className="tagline">AI-Powered Stock Sentiment Analysis</p>
      </div>
    </header>
  )
}
