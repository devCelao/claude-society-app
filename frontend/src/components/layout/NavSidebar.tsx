'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, CalendarDays, Trophy, Settings, RefreshCcw } from 'lucide-react'

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/jogadores',    label: 'Jogadores',    icon: Users },
  { href: '/ciclos',       label: 'Ciclos',       icon: Trophy },
  { href: '/dias-de-jogo', label: 'Dias de Jogo', icon: CalendarDays },
]

const configItems = [
  {
    href: '/ciclos?acao=configurar',
    label: 'Configurar Ciclo',
    icon: RefreshCcw,
    description: 'Datas de inicio e encerramento',
  },
]

function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-barlow-condensed text-sm font-bold tracking-wide transition-all cursor-pointer"
        style={{
          background: open ? 'rgba(245,196,0,0.2)' : 'rgba(245,196,0,0.12)',
          border: '1.5px solid #a38400',
          color: '#f5c400',
        }}
        aria-label="Configurações"
      >
        CM
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-xl border py-1.5 z-50"
          style={{ background: '#111111', borderColor: '#242424', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
        >
          <div
            className="px-3.5 py-2 mb-1 font-barlow-condensed text-[10px] tracking-[0.15em] uppercase"
            style={{ color: '#555' }}
          >
            Configurações
          </div>

          {configItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 px-3.5 py-2.5 mx-1 rounded-lg transition-colors group"
                style={{ color: '#f0ede0' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1a1a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Icon size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#f5c400' }} />
                <div>
                  <div className="font-barlow-condensed text-sm tracking-wide">{item.label}</div>
                  <div className="font-barlow-condensed text-[11px] tracking-wide" style={{ color: '#666' }}>
                    {item.description}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function NavSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop top nav */}
      <header
        className="sticky top-0 z-50 hidden md:flex items-center h-14 px-7 gap-6 border-b border-border"
        style={{ background: '#050505' }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-6 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: '#f5c400', boxShadow: '0 0 0 2px #1a1600' }}
          >
            🦍
          </div>
          <div className="leading-none">
            <div className="font-bebas text-[18px] text-gold tracking-widest">
              CONFRA MONSTRA
            </div>
            <div className="font-barlow-condensed text-[10px] text-muted-foreground tracking-widest mt-0.5">
              PEL@D4 · SOCCER
            </div>
          </div>
        </Link>

        <nav className="flex gap-1 flex-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-barlow-condensed text-[14px] tracking-wide transition-all"
                style={{
                  color: active ? '#f5c400' : '#888888',
                  background: active ? 'rgba(245,196,0,0.12)' : 'transparent',
                  borderColor: active ? 'rgba(245,196,0,0.2)' : 'transparent',
                }}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <SettingsMenu />
      </header>

      {/* Mobile header */}
      <header
        className="md:hidden px-4 py-2.5 flex items-center justify-between border-b border-border"
        style={{ background: '#050505' }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-base flex-shrink-0"
            style={{ background: '#f5c400', boxShadow: '0 0 0 2px #1a1600' }}
          >
            🦍
          </div>
          <div className="leading-none">
            <div className="font-bebas text-[17px] text-gold tracking-widest">
              CONFRA MONSTRA
            </div>
            <div className="font-barlow-condensed text-[9px] text-muted-foreground tracking-widest mt-0.5">
              PEL@D4 · SOCCER
            </div>
          </div>
        </Link>
        <SettingsMenu />
      </header>

      {/* Content */}
      <div className="flex-1 max-w-[720px] w-full mx-auto px-4 py-6 pb-28 md:px-7 md:py-8 md:pb-12">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex pt-2 pb-4 px-1 border-t border-border"
        style={{ background: '#050505' }}
      >
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 flex-1 py-1"
            >
              <div
                className="w-10 h-[27px] rounded-[13px] flex items-center justify-center transition-all"
                style={{ background: active ? 'rgba(245,196,0,0.15)' : 'transparent' }}
              >
                <Icon
                  size={20}
                  style={{ color: active ? '#f5c400' : '#888888' }}
                />
              </div>
              <span
                className="font-barlow-condensed text-[10px] tracking-wide"
                style={{
                  color: active ? '#f5c400' : '#888888',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
