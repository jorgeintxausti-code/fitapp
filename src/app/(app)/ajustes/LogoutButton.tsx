'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-2xl border border-red-200 py-3 text-sm font-semibold text-red-500 dark:border-red-900 dark:text-red-400 active:scale-95 transition-transform"
    >
      Cerrar sesión
    </button>
  )
}
