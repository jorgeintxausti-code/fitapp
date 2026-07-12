'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setEnviado(true)
    }
    setCargando(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-white dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-3xl">
            🍊
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">App Fit</h1>
          <p className="mt-1 text-sm text-gray-500">Nutrición con criterio Ray Peat</p>
        </div>

        {enviado ? (
          <div className="rounded-2xl bg-green-50 p-6 text-center dark:bg-green-950">
            <p className="text-lg font-medium text-green-800 dark:text-green-200">
              Revisa tu email
            </p>
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              Hemos enviado un enlace de acceso a <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-gray-700 dark:bg-gray-900"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={cargando || !email}
              className="w-full rounded-xl bg-orange-500 py-3 text-base font-semibold text-white transition-opacity disabled:opacity-50"
            >
              {cargando ? 'Enviando...' : 'Enviar enlace de acceso'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
