'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, ChevronRight } from 'lucide-react'
import type { RecommendResult } from '@/app/api/recommend/route'

interface Props {
  kcalRestantes: number
  proteinaRestante: number
  tipoComida: string
  comidaHoy: string[]
}

export default function RecomendacionesSection({ kcalRestantes, proteinaRestante, tipoComida, comidaHoy }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecommendResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFetch() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kcalRestantes, proteinaRestante, tipoComida, comidaHoy }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border border-orange-100 dark:border-orange-900 px-4 py-3.5 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          <div className="flex items-center gap-3">
            {loading
              ? <Loader2 size={18} className="text-orange-500 animate-spin" />
              : <Sparkles size={18} className="text-orange-500" />}
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">¿Qué como ahora?</p>
              <p className="text-xs text-gray-500">
                {Math.round(kcalRestantes)} kcal · {Math.round(proteinaRestante)}g prot restantes
              </p>
            </div>
          </div>
          {!loading && <ChevronRight size={16} className="text-orange-400" />}
        </button>
        {error && <p className="text-xs text-red-500 mt-2 px-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Sparkles size={15} className="text-orange-500" /> Sugerencias Peat
        </h2>
        <button onClick={() => setResult(null)} className="text-xs text-gray-400">Cerrar</button>
      </div>

      {result.sugerencias.map((s, i) => (
        <button
          key={i}
          onClick={() => router.push(`/nueva-ingesta?q=${encodeURIComponent(s.nombre)}`)}
          className="flex w-full items-start gap-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3 text-left shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.nombre}</p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.descripcion}</p>
            <p className="text-xs text-orange-500 mt-1 italic">{s.peat_razon}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">~{s.kcal_aprox}</p>
            <p className="text-[11px] text-gray-400">~{s.proteina_aprox}g prot</p>
          </div>
        </button>
      ))}
    </div>
  )
}
