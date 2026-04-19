'use client'

import { type LucideIcon } from 'lucide-react'

interface PageHeaderIconProps {
  icon: LucideIcon
}

export default function PageHeaderIcon({ icon: Icon }: PageHeaderIconProps) {
  return (
    <div className="page-header-icon" aria-hidden="true">
      <Icon size={20} strokeWidth={1.8} />
    </div>
  )
}
