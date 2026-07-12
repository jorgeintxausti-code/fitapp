'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, TrendingUp, Plus, Settings, BookMarked } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        <NavLink href="/hoy" active={pathname === '/hoy'} icon={<Home size={20} />} label="Hoy" />
        <NavLink href="/habituales" active={pathname === '/habituales'} icon={<BookMarked size={20} />} label="Habituales" />

        <Link
          href="/nueva-ingesta"
          className="flex h-13 w-13 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg -mt-4 active:scale-95 transition-transform"
          style={{ width: 52, height: 52 }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </Link>

        <NavLink href="/tendencias" active={pathname === '/tendencias'} icon={<TrendingUp size={20} />} label="Tendencias" />
        <NavLink href="/ajustes" active={pathname === '/ajustes'} icon={<Settings size={20} />} label="Ajustes" />
      </div>
    </nav>
  )
}

function NavLink({ href, active, icon, label }: {
  href: string; active: boolean; icon: React.ReactNode; label: string
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${
        active ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'
      }`}
    >
      {icon}
      <span className="text-[9px] font-medium">{label}</span>
    </Link>
  )
}
