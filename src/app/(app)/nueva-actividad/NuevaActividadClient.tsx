'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Flame, Clock, Activity } from 'lucide-react'
import type { ActivityAnalysis } from '@/app/api/analyze-activity/route'

interface Props {
  pesoKg: number
}

type Step = 'input' | 'analyzing' | 'confirm' | 'saving'

export default function NuevaActividadClient({ pesoKg }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('input')
  const [texto, setTexto] = useState('')
  const [result, setResult] = useState<ActivityAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kcalEdit, setKcalEdit] = useState(0)

  async function handleAnalyze() {
    if (!texto.trim()) return
    setStep('analyzing')
    setError(null)
    try {
      const res = await fetch('/api/analyze-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, peso_kg: pesoKg }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error en el servidor')
      const data: ActivityAnalysis = await res.json()
      setResult(data)
      setKcalEdit(Math.round(data.kcal_estimadas))
      setStep('confirm')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setStep('input')
    }
  }

  async function handleSave() {
    if (!result) return
    setStep('saving')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toLocaleDateString('sv', { timeZone: 'Europe/Madrid' })

    const { error: err } = await supabase.from('activities').insert({
      user_id: user.id,
      fecha: today,
      descripcion: texto,
      kcal_estimadas: kcalEdit,
      desglose_claude: result.desglose as unknown as import('@/types/database').Json,
    })

    if (err) {
      setError(err.message)
      setStep('confirm')
      return
    }

    router.push('/hoy')
    router.refresh()
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (step === 'analyzing' || step === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={40} className="animate-spin text-blue-500" />
        <p className="text-base font-medium text-gray-600 dark:text-gray-400">
          {step === 'analyzing' ? 'Estimando calorías...' : 'Guardando...'}
        </p>
      </div>
    )
  }

  // ── Confirmación ──────────────────────────────────────────────────────────
  if (step === 'confirm' && result) {
    const d = result.desglose
    return (
      <div className="px-4 pt-6 pb-36 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('input')} className="p-2 -ml-2 rounded-xl text-gray-500">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar actividad</h1>
        </div>

        {/* Actividad descrita */}
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950 px-4 py-3">
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{texto}</p>
        </div>

        {/* Desglose */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-gray-500">
              <Activity size={14} /> Actividad
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.actividad}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={14} /> Duración
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.duracion_min} min</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500">MET</span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.met}</span>
          </div>
          {d.notas && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400">{d.notas}</p>
            </div>
          )}
        </div>

        {/* Kcal editable */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-blue-500" />
            <span className="text-base font-semibold text-gray-900 dark:text-white">Calorías quemadas</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={kcalEdit}
              onChange={(e) => setKcalEdit(parseInt(e.target.value) || 0)}
              className="w-20 text-right rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 px-2 py-1 text-lg font-bold text-blue-600 outline-none focus:border-blue-500"
            />
            <span className="text-sm text-gray-400">kcal</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
          <button
            onClick={handleSave}
            className="w-full rounded-2xl bg-blue-500 py-4 text-base font-semibold text-white shadow-lg active:scale-95 transition-transform"
          >
            Guardar actividad
          </button>
        </div>
      </div>
    )
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-36 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Registrar actividad</h1>
      </div>

      <div className="rounded-2xl bg-blue-50 dark:bg-blue-950 px-4 py-3">
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Peso actual: <strong>{pesoKg} kg</strong> · Se usa para calcular el gasto calórico
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Describe la actividad</p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej: Corrí 35 minutos a ritmo moderado, luego 10 min de estiramientos"
          rows={4}
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-4 py-3 text-base resize-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
        <button
          onClick={handleAnalyze}
          disabled={!texto.trim()}
          className="w-full rounded-2xl bg-blue-500 py-4 text-base font-semibold text-white shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          Calcular calorías →
        </button>
      </div>
    </div>
  )
}
