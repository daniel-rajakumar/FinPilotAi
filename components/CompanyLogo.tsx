'use client'

import React from 'react'

const LOGO_DEV_TOKEN = "pk_RKanTxdrR_GgB4xqKGeyaA"

export default function CompanyLogo({ symbol, size = 24 }: { symbol: string, size?: number }) {
  const cleanSymbol = symbol.replace(/[^A-Za-z0-9]/g, '')
  if (!cleanSymbol) return null

  return (
    <img 
      src={`https://img.logo.dev/ticker/${cleanSymbol}?token=${LOGO_DEV_TOKEN}&format=png&theme=dark`}
      alt={`${symbol} logo`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'contain',
        display: 'inline-block',
        flexShrink: 0,
        backgroundColor: 'transparent'
      }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none'
      }}
    />
  )
}
