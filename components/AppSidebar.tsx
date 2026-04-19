'use client'

import Link from 'next/link'
import { BarChart3, Landmark, MessageSquare, Newspaper, Settings, type LucideIcon, Zap } from 'lucide-react'

type SidebarItemId = 'graphs' | 'chat' | 'news' | 'options' | 'economy' | 'settings'

interface AppSidebarProps {
  active: SidebarItemId
}

interface SidebarItem {
  id: SidebarItemId
  href: string
  label: string
  icon: LucideIcon
}

const topItems: SidebarItem[] = [
  { id: 'graphs', href: '/graphs', label: 'Graphs', icon: BarChart3 },
  { id: 'chat', href: '/', label: 'Chat', icon: MessageSquare },
  { id: 'news', href: '/news', label: 'News', icon: Newspaper },
  { id: 'options', href: '/options', label: 'Option Flow', icon: Zap },
  { id: 'economy', href: '/economy', label: 'Economy', icon: Landmark },
]

const bottomItems: SidebarItem[] = [
  { id: 'settings', href: '/settings', label: 'Settings', icon: Settings },
]

function SidebarLink({ item, active }: { item: SidebarItem; active: boolean }) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={`icon-btn${active ? ' active' : ''}`}
      title={item.label}
      aria-current={active ? 'page' : undefined}
    >
      {active ? (
        <div className="active-bg">
          <Icon size={21} strokeWidth={1.8} />
        </div>
      ) : (
        <Icon size={21} strokeWidth={1.8} />
      )}
    </Link>
  )
}

export default function AppSidebar({ active }: AppSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {topItems.map((item) => (
          <SidebarLink key={item.id} item={item} active={item.id === active} />
        ))}
      </div>

      <div className="sidebar-bottom">
        {bottomItems.map((item) => (
          <SidebarLink key={item.id} item={item} active={item.id === active} />
        ))}

        <button className="avatar-btn">
          <div className="avatar">
            <img src="https://i.pravatar.cc/150?img=47" alt="User avatar" />
          </div>
        </button>
      </div>
    </aside>
  )
}
