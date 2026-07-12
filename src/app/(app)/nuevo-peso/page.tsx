'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Scale } from 'lucide-react'

export default function NuevoPesoPage() {
  const router = useRouter()
  const [peso, setPeso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const pesoNum = parseFloat(peso)
    if (!pesoNum || pesoNum < 30 || pesoNum > 300) {
      setError('Introduce un peso válido (entre 30 y 300 kg)')
      return
    }
    setGuardando(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toLocaleDateString('sv', { timeZone: 'Europe/Madrid' })

    const { error: err } = await supabase.from('weights').upsert(
      { user_id: user.id, fecha: today, peso_kg: pesoNum },
      { onConflict: 'user_id,fecha' }
    )

    if (err) {
      setError(err.message)
      setGuardando(false)
      return
    }

    router.push('/hoy')
    router.refresh()
  }

  return (
    <div className="px-4 pt-6 pb-36 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Registrar peso</h1>
      </div>

      <div className="flex flex-col items-center gap-6 pt-6">
        <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
          <Scale size={36} className="text-purple-500" />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm text-gray-500">Peso de hoy</p>
          <div className="flex items-end justify-center gap-2">
            <input
              type="number"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="75.5"
              step="0.1"
              min={30}
              max={300}
              autoFocus
              className="w-36 text-center text-5xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:border-purple-500 outline-none pb-1 transition-colors"
            />
            <span className="text-xl text-gray-400 pb-2">kg</span>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
        <button
          onClick={handleSave}
          disabled={!peso || guardando}
          className="w-full rounded-2xl bg-purple-500 py-4 text-base font-semibold text-white shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          {guardando ? 'Guardando...' : 'Guardar peso'}
        </button>
      </div>
    </div>
  )
}
