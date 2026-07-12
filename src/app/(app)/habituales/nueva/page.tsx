'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { peatScoreBg, peatScoreColor } from '@/lib/utils'
import type { TipoComida } from '@/types/database'
import type { MealAnalysis } from '@/app/api/analyze-meal/route'
import { ArrowLeft, Loader2, X } from 'lucide-react'

const TIPOS: TipoComida[] = ['desayuno', 'comida', 'cena', 'snack']
const TIPO_COLOR: Record<string, string> = {
  desayuno: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  comida: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cena: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  snack: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

interface EditableItem {
  alimento: string
  cantidad: string
  kcal: number
  proteina_g: number
  carbohidratos_g: number
  grasa_g: number
  pufa_g: number
}

function NuevaHabitual() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const tipoParam = (searchParams.get('tipo') ?? 'comida') as TipoComida

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoComida>(tipoParam)
  const [items, setItems] = useState<EditableItem[]>([])
  const [peatScore, setPeatScore] = useState(5)
  const [peatComentario, setPeatComentario] = useState('')
  const [calcio, setCalcio] = useState(0)
  const [fosforo, setFosforo] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function analyze() {
      try {
        const res = await fetch('/api/analyze-meal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: q }),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
        const data: MealAnalysis = await res.json()
        setNombre(q.slice(0, 50))
        setItems(data.desglose)
        setPeatScore(data.peat_score)
        setPeatComentario(data.peat_comentario)
        setCalcio(data.calcio_mg)
        setFosforo(data.fosforo_mg)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al analizar')
      } finally {
        setLoading(false)
      }
    }
    if (q) analyze()
    else setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totals = {
    kcal: Math.round(items.reduce((s, i) => s + i.kcal, 0)),
    proteina_g: Math.round(items.reduce((s, i) => s + i.proteina_g, 0) * 10) / 10,
    carbohidratos_g: Math.round(items.reduce((s, i) => s + i.carbohidratos_g, 0) * 10) / 10,
    grasa_g: Math.round(items.reduce((s, i) => s + i.grasa_g, 0) * 10) / 10,
    pufa_g: Math.round(items.reduce((s, i) => s + i.pufa_g, 0) * 10) / 10,
  }

  async function handleSave() {
    if (!nombre.trim() || items.length === 0) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('saved_meals').insert({
      user_id: user.id,
      nombre: nombre.trim().slice(0, 50),
      tipo,
      ...totals,
      calcio_mg: calcio,
      fosforo_mg: fosforo,
      peat_score: peatScore,
      peat_comentario: peatComentario,
      desglose: items as unknown as import('@/types/database').Json,
      veces_usada: 1,
      ultima_vez: new Date().toISOString(),
    })
    router.push('/habituales')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={40} className="animate-spin text-orange-500" />
        <p className="text-base font-medium text-gray-600 dark:text-gray-400">Analizando con Claude...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto space-y-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={() => router.back()} className="text-sm text-orange-500">Volver</button>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-32 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Guardar habitual</h1>
      </div>

      {/* Nombre */}
      <input
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Nombre de la comida"
        className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-4 py-3 text-base font-semibold outline-none focus:border-orange-500"
      />

      {/* Tipo */}
      <div className="flex gap-2">
        {TIPOS.map(t => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
              tipo === t ? TIPO_COLOR[t] : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Peat score */}
      <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3">
        <span className={`text-2xl font-bold ${peatScoreColor(peatScore)}`}>
          {peatScore}/10
        </span>
        <div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${peatScoreBg(peatScore)}`}>
            Peat Score
          </span>
          <p className="text-sm text-gray-500 mt-1">{peatComentario}</p>
        </div>
      </div>

      {/* Alimentos */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Alimentos ({items.length})
        </p>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.alimento}</p>
              <p className="text-xs text-gray-400">
                {item.cantidad} · {Math.round(item.kcal)} kcal · {Math.round(item.proteina_g)}g prot
              </p>
            </div>
            <button
              onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
              className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 active:text-red-400 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="rounded-2xl bg-orange-50 dark:bg-orange-950 px-4 py-3 space-y-1">
        <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wide">Total</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          <span className="text-sm font-bold text-gray-900 dark:text-white">{totals.kcal} kcal</span>
          <span className="text-sm text-gray-600 dark:text-gray-300">{totals.proteina_g}g prot</span>
          <span className="text-sm text-gray-500">{totals.carbohidratos_g}g carbs</span>
          <span className="text-sm text-gray-500">{totals.grasa_g}g grasa</span>
          <span className="text-sm text-gray-500">{totals.pufa_g}g PUFA</span>
        </div>
      </div>

      {/* Guardar */}
      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
        <button
          onClick={handleSave}
          disabled={saving || !nombre.trim() || items.length === 0}
          className="w-full rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          {saving ? 'Guardando...' : 'Guardar como habitual'}
        </button>
      </div>
    </div>
  )
}

export default function NuevaHabitualPage() {
  return (
    <Suspense>
      <NuevaHabitual />
    </Suspense>
  )
}
