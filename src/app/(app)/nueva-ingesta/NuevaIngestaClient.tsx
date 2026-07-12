'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { tipoComidaPorHora, peatScoreBg, peatScoreColor } from '@/lib/utils'
import type { SavedMeal, TipoComida } from '@/types/database'
import type { MealAnalysis } from '@/app/api/analyze-meal/route'
import { ArrowLeft, Mic, MicOff, Loader2, ChevronDown, ChevronUp, Clock } from 'lucide-react'

const TIPOS: TipoComida[] = ['desayuno', 'comida', 'cena', 'snack']

interface Props {
  savedMeals: SavedMeal[]
}

type Step = 'input' | 'analyzing' | 'confirm' | 'saving'

interface EditableResult extends MealAnalysis {
  descripcion: string
  tipo: TipoComida
}

export default function NuevaIngestaClient({ savedMeals }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('input')
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<TipoComida>(tipoComidaPorHora())
  const [result, setResult] = useState<EditableResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [desglosOpen, setDesglosOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [guardandoHabitual, setGuardandoHabitual] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasSpeech = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = 'es-ES'
    r.continuous = false
    r.interimResults = false
    r.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
      const transcript = e.results[0][0].transcript
      setTexto((prev) => prev ? `${prev} ${transcript}` : transcript)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recognitionRef.current = r
    r.start()
    setListening(true)
  }

  async function handleAnalyze() {
    if (!texto.trim()) return
    setStep('analyzing')
    setError(null)
    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error en el servidor')
      const data: MealAnalysis = await res.json()
      setResult({ ...data, descripcion: texto, tipo })
      setStep('confirm')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setStep('input')
    }
  }

  async function handleSaveMeal(guardarHabitual = false) {
    if (!result) return
    setStep('saving')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const mealData = {
      user_id: user.id,
      eaten_at: new Date().toISOString(),
      tipo: result.tipo,
      descripcion_original: result.descripcion,
      kcal: result.kcal,
      proteina_g: result.proteina_g,
      carbohidratos_g: result.carbohidratos_g,
      grasa_g: result.grasa_g,
      pufa_g: result.pufa_g,
      calcio_mg: result.calcio_mg,
      fosforo_mg: result.fosforo_mg,
      peat_score: result.peat_score,
      peat_comentario: result.peat_comentario,
      desglose: result.desglose as unknown as import('@/types/database').Json,
    }

    const { error: mealError } = await supabase.from('meals').insert(mealData)
    if (mealError) {
      setError(mealError.message)
      setStep('confirm')
      return
    }

    if (guardarHabitual) {
      const nombre = result.descripcion.slice(0, 50)
      await supabase.from('saved_meals').insert({
        user_id: user.id,
        nombre,
        tipo: result.tipo,
        kcal: result.kcal,
        proteina_g: result.proteina_g,
        carbohidratos_g: result.carbohidratos_g,
        grasa_g: result.grasa_g,
        pufa_g: result.pufa_g,
        calcio_mg: result.calcio_mg,
        fosforo_mg: result.fosforo_mg,
        peat_score: result.peat_score,
        peat_comentario: result.peat_comentario,
        desglose: result.desglose as unknown as import('@/types/database').Json,
        veces_usada: 1,
        ultima_vez: new Date().toISOString(),
      })
    }

    router.push('/hoy')
    router.refresh()
  }

  async function handleSavedMeal(meal: SavedMeal) {
    setStep('saving')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('meals').insert({
      user_id: user.id,
      eaten_at: new Date().toISOString(),
      tipo: meal.tipo as TipoComida,
      descripcion_original: meal.nombre,
      kcal: meal.kcal,
      proteina_g: meal.proteina_g,
      carbohidratos_g: meal.carbohidratos_g,
      grasa_g: meal.grasa_g,
      pufa_g: meal.pufa_g,
      calcio_mg: meal.calcio_mg,
      fosforo_mg: meal.fosforo_mg,
      peat_score: meal.peat_score,
      peat_comentario: meal.peat_comentario,
      desglose: meal.desglose,
      saved_meal_id: meal.id,
    })

    await supabase.from('saved_meals').update({
      veces_usada: meal.veces_usada + 1,
      ultima_vez: new Date().toISOString(),
    }).eq('id', meal.id)

    router.push('/hoy')
    router.refresh()
  }

  // ── Pantalla de carga ─────────────────────────────────────────────────────
  if (step === 'analyzing' || step === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <Loader2 size={40} className="animate-spin text-orange-500" />
        <p className="text-base font-medium text-gray-600 dark:text-gray-400">
          {step === 'analyzing' ? 'Analizando con Claude...' : 'Guardando...'}
        </p>
      </div>
    )
  }

  // ── Tarjeta de confirmación ───────────────────────────────────────────────
  if (step === 'confirm' && result) {
    return (
      <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('input')} className="p-2 -ml-2 rounded-xl text-gray-500">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar ingesta</h1>
        </div>

        {/* Selector tipo */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TIPOS.map((t) => (
            <button
              key={t}
              onClick={() => setResult({ ...result, tipo: t })}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                result.tipo === t
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Descripción */}
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 px-4 py-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{result.descripcion}</p>
        </div>

        {/* Peat score */}
        <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3">
          <span className={`text-2xl font-bold ${peatScoreColor(result.peat_score)}`}>
            {result.peat_score}/10
          </span>
          <div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${peatScoreBg(result.peat_score)}`}>
              Peat Score
            </span>
            <p className="text-sm text-gray-500 mt-1">{result.peat_comentario}</p>
          </div>
        </div>

        {/* Macros editables */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          <MacroRow
            label="Calorías"
            value={result.kcal}
            unit="kcal"
            onChange={(v) => setResult({ ...result, kcal: v })}
            highlight
          />
          <MacroRow
            label="Proteína"
            value={result.proteina_g}
            unit="g"
            onChange={(v) => setResult({ ...result, proteina_g: v })}
            highlight
          />
          <MacroRow label="Carbohidratos" value={result.carbohidratos_g} unit="g"
            onChange={(v) => setResult({ ...result, carbohidratos_g: v })} />
          <MacroRow label="Grasa" value={result.grasa_g} unit="g"
            onChange={(v) => setResult({ ...result, grasa_g: v })} />
          <MacroRow label="PUFA" value={result.pufa_g} unit="g"
            onChange={(v) => setResult({ ...result, pufa_g: v })} />
        </div>

        {/* Desglose colapsable */}
        {result.desglose.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden">
            <button
              onClick={() => setDesglosOpen(!desglosOpen)}
              className="flex w-full items-center justify-between px-4 py-3"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Desglose por alimento ({result.desglose.length})
              </span>
              {desglosOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {desglosOpen && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {result.desglose.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.alimento}</p>
                      <p className="text-xs text-gray-400">{item.cantidad}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{Math.round(item.kcal)} kcal</p>
                      <p>{Math.round(item.proteina_g)}g prot</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Acciones */}
        <div className="fixed bottom-20 left-0 right-0 px-4 space-y-2 max-w-lg mx-auto">
          <button
            onClick={() => handleSaveMeal(false)}
            className="w-full rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white shadow-lg active:scale-95 transition-transform"
          >
            Confirmar ingesta
          </button>
          <button
            onClick={async () => {
              setGuardandoHabitual(true)
              await handleSaveMeal(true)
            }}
            disabled={guardandoHabitual}
            className="w-full rounded-2xl border border-orange-200 py-3 text-sm font-medium text-orange-600 dark:border-orange-800 dark:text-orange-400 bg-white dark:bg-gray-950 disabled:opacity-50"
          >
            Confirmar y guardar como habitual
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla de entrada ───────────────────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">¿Qué has comido?</h1>
      </div>

      {/* Selector tipo */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TIPOS.map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
              tipo === t
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-200 dark:border-gray-700 text-gray-500'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Comidas habituales */}
      {savedMeals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Habituales</p>
          <div className="space-y-2">
            {savedMeals.slice(0, 5).map((meal) => (
              <button
                key={meal.id}
                onClick={() => handleSavedMeal(meal)}
                className="flex w-full items-center justify-between rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3 active:scale-[0.98] transition-transform shadow-sm"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{meal.nombre}</p>
                  <p className="text-xs text-gray-400">{Math.round(meal.kcal)} kcal · {Math.round(meal.proteina_g)}g prot</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${peatScoreBg(meal.peat_score)}`}>
                    P{meal.peat_score}
                  </span>
                  <Clock size={14} className="text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Textarea */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Describe la comida</p>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej: 2 huevos revueltos con 50g de queso, una tostada con mantequilla y un vaso de zumo de naranja"
            rows={4}
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-4 py-3 text-base resize-none outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
          {hasSpeech && (
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute bottom-3 right-3 p-2 rounded-xl transition-colors ${
                listening
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>
        {listening && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Escuchando...
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Botón analizar */}
      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
        <button
          onClick={handleAnalyze}
          disabled={!texto.trim()}
          className="w-full rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          Analizar con Claude →
        </button>
      </div>
    </div>
  )
}

function MacroRow({
  label, value, unit, onChange, highlight = false,
}: {
  label: string
  value: number
  unit: string
  onChange: (v: number) => void
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className={`text-sm ${highlight ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500'}`}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={Math.round(value * 10) / 10}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={highlight ? 1 : 0.1}
          className={`w-20 text-right rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 px-2 py-1 text-sm outline-none focus:border-orange-500 ${
            highlight ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
          }`}
        />
        <span className="text-xs text-gray-400 w-6">{unit}</span>
      </div>
    </div>
  )
}
