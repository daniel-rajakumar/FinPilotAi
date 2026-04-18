'use client'

import React from 'react'

interface SummaryCardProps {
  explanation: string
  prediction: string
}

export default function SummaryCard({ explanation, prediction }: SummaryCardProps) {
  return (
    <div className="summary-card">
      <div className="summary-section">
        <div className="summary-header">
          <span className="summary-icon">🧠</span>
          <h3>Analysis</h3>
        </div>
        <p className="summary-text">{explanation}</p>
      </div>

      <div className="summary-divider" />

      <div className="summary-section">
        <div className="summary-header">
          <span className="summary-icon">🔮</span>
          <h3>Prediction</h3>
        </div>
        <p className="summary-text">{prediction}</p>
      </div>
    </div>
  )
}
