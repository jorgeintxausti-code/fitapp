'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { tipoComidaPorHora, peatScoreBg, peatScoreColor } from '@/lib/utils'
import type { SavedMeal, TipoComida } from '@/types/database'
import type { MealAnalysis } from '@/app/api/analyze-meal/route'
import Link from 'next/link'
import { ArrowLeft, Mic, MicOff, Loader2, Clock, Camera, X, Settings2 } from 'lucide-react'

const TIPOS: TipoComida[] = ['desayuno', 'comida', 'cena', 'snack']

interface Props {
  savedMeals: SavedMeal[]
}

type Step = 'input' | 'analyzing' | 'confirm' | 'saving'

interface EditableResult extends MealAnalysis {
  descripcion: string
  tipo: TipoComida
}

interface FotoData {
  base64: string
  mimeType: string
  previewUrl: string
}

async function resizeImage(file: File, maxPx = 1500): Promise<FotoData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve({
        base64: dataUrl.split(',')[1],
        mimeType: 'image/jpeg',
        previewUrl: url,
      })
    }
    img.onerror = reject
    img.src = url
  })
}

export default function NuevaIngestaClient({ savedMeals }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('input')
  const [texto, setTexto] = useState(searchParams.get('q') ?? '')
  const [tipo, setTipo] = useState<TipoComida>(tipoComidaPorHora())
  const [result, setResult] = useState<EditableResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reanalyzeOpen, setReanalyzeOpen] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [listening, setListening] = useState(false)
  const [guardandoHabitual, setGuardandoHabitual] = useState(false)
  const [foto, setFoto] = useState<FotoData | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasSpeech = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    return () => {
      if (foto) URL.revokeObjectURL(foto.previewUrl)
    }
  }, [foto])

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

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await resizeImage(file)
      if (foto) URL.revokeObjectURL(foto.previewUrl)
      setFoto(data)
    } catch {
      setError('No se pudo procesar la imagen')
    }
    e.target.value = ''
  }

  function removeFoto() {
    if (foto) URL.revokeObjectURL(foto.previewUrl)
    setFoto(null)
  }

  async function callAnalyze(textoAnalizar: string): Promise<MealAnalysis> {
    const body: Record<string, string> = {}
    if (textoAnalizar.trim()) body.texto = textoAnalizar
    if (foto) {
      body.fotoBase64 = foto.base64
      body.fotoMimeType = foto.mimeType
    }
    const res = await fetch('/api/analyze-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Error en el servidor')
    return res.json()
  }

  async function handleAnalyze() {
    if (!texto.trim() && !foto) return
    setStep('analyzing')
    setError(null)
    try {
      const data = await callAnalyze(texto)
      setResult({ ...data, descripcion: texto || 'Foto de comida', tipo })
      setStep('confirm')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setStep('input')
    }
  }

  async function handleReanalyze() {
    if (!result || !correctionText.trim()) return
    setReanalyzeOpen(false)
    setStep('analyzing')
    try {
      const combined = `${result.descripcion}\n\nCorrecciones: ${correctionText}`
      const data = await callAnalyze(combined)
      setResult({ ...data, descripcion: result.descripcion, tipo: result.tipo })
      setCorrectionText('')
      setStep('confirm')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setStep('confirm')
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
      const q = encodeURIComponent(result.descripcion)
      router.push(`/habituales/nueva?q=${q}&tipo=${result.tipo}`)
      return
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

  function removeDesgloseItem(index: number) {
    if (!result) return
    const newDesglose = result.desglose.filter((_, i) => i !== index)
    setResult({
      ...result,
      kcal: Math.round(newDesglose.reduce((s, d) => s + d.kcal, 0)),
      proteina_g: Math.round(newDesglose.reduce((s, d) => s + d.proteina_g, 0) * 10) / 10,
      carbohidratos_g: Math.round(newDesglose.reduce((s, d) => s + d.carbohidratos_g, 0) * 10) / 10,
      grasa_g: Math.round(newDesglose.reduce((s, d) => s + d.grasa_g, 0) * 10) / 10,
      pufa_g: Math.round(newDesglose.reduce((s, d) => s + d.pufa_g, 0) * 10) / 10,
      desglose: newDesglose,
    })
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
      <div className="px-4 pt-6 pb-32 max-w-lg mx-auto space-y-4">
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

        {/* Descripción + foto */}
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 px-4 py-3 flex items-start gap-3">
          {foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto.previewUrl} alt="foto comida" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          )}
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

        {/* Alimentos */}
        {result.desglose.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Alimentos ({result.desglose.length})
            </p>
            {result.desglose.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.alimento}</p>
                  <p className="text-xs text-gray-400">
                    {item.cantidad} · {Math.round(item.kcal)} kcal · {Math.round(item.proteina_g)}g prot
                  </p>
                </div>
                <button
                  onClick={() => removeDesgloseItem(i)}
                  className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 active:text-red-400 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Totales */}
        <div className="rounded-2xl bg-orange-50 dark:bg-orange-950 px-4 py-3 space-y-1">
          <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wide">Total</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{Math.round(result.kcal)} kcal</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">{Math.round(result.proteina_g * 10) / 10}g prot</span>
            <span className="text-sm text-gray-500">{Math.round(result.carbohidratos_g * 10) / 10}g carbs</span>
            <span className="text-sm text-gray-500">{Math.round(result.grasa_g * 10) / 10}g grasa</span>
            <span className="text-sm text-gray-500">{Math.round(result.pufa_g * 10) / 10}g PUFA</span>
          </div>
        </div>

        {/* Reanalizar */}
        {reanalyzeOpen ? (
          <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/50 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">¿Qué hay que corregir?</p>
            <textarea
              value={correctionText}
              onChange={e => setCorrectionText(e.target.value)}
              placeholder="Ej: el pollo era 200g no 100g, faltó añadir las patatas..."
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 px-3 py-2.5 text-sm resize-none outline-none focus:border-orange-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setReanalyzeOpen(false); setCorrectionText('') }}
                className="flex-1 py-2.5 text-sm text-gray-500 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleReanalyze}
                disabled={!correctionText.trim()}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-xl disabled:opacity-40"
              >
                Analizar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setReanalyzeOpen(true)}
            className="text-sm text-gray-400 underline underline-offset-2 py-1"
          >
            Algo está mal · Reanalizar con Claude
          </button>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Acciones fijas */}
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

      {/* Comidas habituales filtradas por tipo */}
      {(() => {
        const matching = savedMeals.filter(m => m.tipo === tipo)
        const fallback = matching.length === 0 ? savedMeals.slice(0, 3) : []
        const toShow = (matching.length > 0 ? matching : fallback).slice(0, 5)
        if (toShow.length === 0) return null
        return (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Habituales {matching.length > 0 ? `· ${tipo}` : ''}
              </p>
              <Link href="/habituales" className="flex items-center gap-1 text-[10px] text-gray-400 active:text-orange-500">
                <Settings2 size={10} /> Gestionar
              </Link>
            </div>
            <div className="space-y-2">
              {toShow.map((meal) => (
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
        )
      })()}

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* Vista previa foto */}
      {foto && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto.previewUrl} alt="foto" className="w-24 h-24 rounded-2xl object-cover" />
          <button
            onClick={removeFoto}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-700 text-white flex items-center justify-center shadow"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Textarea */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Describe la comida</p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={foto ? 'Añade contexto opcional (ej: con mantequilla)' : 'Ej: 2 huevos con queso, tostada con mantequilla y zumo de naranja'}
          rows={4}
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 px-4 py-3 text-base resize-none outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
        />

        {/* Botones bajo el textarea */}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm active:scale-95 transition-transform"
          >
            <Camera size={16} />
            <span>Foto</span>
          </button>
          {hasSpeech && (
            <button
              type="button"
              onClick={toggleVoice}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                listening
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
              <span>{listening ? 'Parar' : 'Voz'}</span>
            </button>
          )}
          {listening && (
            <span className="flex items-center gap-1 text-xs text-red-500 ml-1">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Escuchando...
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Botón registrar */}
      <div className="fixed bottom-20 left-0 right-0 px-4 max-w-lg mx-auto">
        <button
          onClick={handleAnalyze}
          disabled={!texto.trim() && !foto}
          className="w-full rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          Registrar ingesta →
        </button>
      </div>
    </div>
  )
}
