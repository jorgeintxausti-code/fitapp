'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcularBMR, calcularTDEE } from '@/lib/bmr'
import type { NivelActividad } from '@/types/database'
import { ChevronRight, ChevronLeft } from 'lucide-react'

const TOTAL_STEPS = 3

interface FormData {
  nombre: string
  sexo: 'masculino' | 'femenino'
  fecha_nacimiento: string
  altura_cm: string
  peso_actual_kg: string
  objetivo_peso_kg: string
  nivel_actividad_base: NivelActividad
  deficit_objetivo_kcal: string
  proteina_objetivo_g: string
}

const defaultForm: FormData = {
  nombre: '',
  sexo: 'masculino',
  fecha_nacimiento: '',
  altura_cm: '',
  peso_actual_kg: '',
  objetivo_peso_kg: '',
  nivel_actividad_base: 'ligero',
  deficit_objetivo_kcal: '400',
  proteina_objetivo_g: '',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  function calcularObjetivos() {
    const peso = parseFloat(form.peso_actual_kg)
    const altura = parseFloat(form.altura_cm)
    if (!form.fecha_nacimiento || !peso || !altura) return null
    const bmr = calcularBMR(form.sexo, peso, altura, form.fecha_nacimiento)
    const tdee = calcularTDEE(bmr, form.nivel_actividad_base)
    const deficit = parseInt(form.deficit_objetivo_kcal) || 400
    const kcalObj = tdee - deficit
    const pesoObj = parseFloat(form.objetivo_peso_kg) || peso
    const proteinaObj = Math.round(pesoObj * 1.8)
    return { bmr: Math.round(bmr), tdee, kcalObj, proteinaObj }
  }

  const calculados = calcularObjetivos()

  // Auto-fill proteína objetivo cuando se calcula
  function onNextStep() {
    if (step === 2 && calculados && !form.proteina_objetivo_g) {
      setForm((f) => ({ ...f, proteina_objetivo_g: calculados.proteinaObj.toString() }))
    }
    setStep((s) => s + 1)
  }

  async function handleSubmit() {
    setGuardando(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const pesoActual = parseFloat(form.peso_actual_kg)

      const [profileResult, weightResult] = await Promise.all([
        supabase.from('profiles').upsert({
          user_id: user.id,
          nombre: form.nombre || null,
          sexo: form.sexo,
          fecha_nacimiento: form.fecha_nacimiento || null,
          altura_cm: parseFloat(form.altura_cm) || null,
          peso_inicial_kg: pesoActual || null,
          objetivo_peso_kg: parseFloat(form.objetivo_peso_kg) || null,
          nivel_actividad_base: form.nivel_actividad_base,
          deficit_objetivo_kcal: parseInt(form.deficit_objetivo_kcal) || 400,
          proteina_objetivo_g: parseInt(form.proteina_objetivo_g) || null,
          timezone: 'Europe/Madrid',
        }),
        pesoActual
          ? supabase.from('weights').insert({
              user_id: user.id,
              fecha: new Date().toLocaleDateString('sv', { timeZone: 'Europe/Madrid' }),
              peso_kg: pesoActual,
            })
          : Promise.resolve({ error: null }),
      ])

      if (profileResult.error) throw profileResult.error
      router.push('/hoy')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* Cabecera */}
      <div className="px-6 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xl">🍊</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">App Fit</h1>
            <p className="text-xs text-gray-400">Configuración inicial</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i + 1 <= step ? 'bg-orange-500' : 'bg-gray-100 dark:bg-gray-800'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">Paso {step} de {TOTAL_STEPS}</p>
      </div>

      {/* Contenido por paso */}
      <div className="flex-1 px-6 pb-6">
        {step === 1 && <Step1 form={form} set={set} />}
        {step === 2 && <Step2 form={form} set={set} />}
        {step === 3 && <Step3 form={form} set={set} calculados={calculados} />}
      </div>

      {/* Navegación */}
      <div className="px-6 pb-10 flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700"
          >
            <ChevronLeft size={22} className="text-gray-500" />
          </button>
        )}

        {step < TOTAL_STEPS ? (
          <button
            onClick={onNextStep}
            disabled={!canProceed(step, form)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 font-semibold text-white disabled:opacity-40"
          >
            Siguiente <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={guardando || !canProceed(step, form)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 font-semibold text-white disabled:opacity-40"
          >
            {guardando ? 'Guardando...' : 'Empezar →'}
          </button>
        )}
      </div>

      {error && (
        <div className="mx-6 mb-6 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
    </div>
  )
}

function canProceed(step: number, form: FormData): boolean {
  if (step === 1) return !!form.sexo && !!form.fecha_nacimiento && !!form.altura_cm
  if (step === 2) return !!form.peso_actual_kg
  return true
}

function Step1({ form, set }: { form: FormData; set: (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tus datos</h2>
        <p className="text-sm text-gray-400 mt-1">Los usamos para calcular tu metabolismo basal</p>
      </div>

      <Field label="Nombre (opcional)">
        <input type="text" value={form.nombre} onChange={set('nombre')} placeholder="Tu nombre" className={inputCls} />
      </Field>

      <Field label="Sexo biológico">
        <div className="grid grid-cols-2 gap-2">
          {(['masculino', 'femenino'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set('sexo')({ target: { value: s } } as React.ChangeEvent<HTMLInputElement>)}
              className={`rounded-xl py-3 text-sm font-medium border transition-colors ${
                form.sexo === s
                  ? 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-950'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Fecha de nacimiento">
        <input type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} className={inputCls} />
      </Field>

      <Field label="Altura (cm)">
        <input type="number" value={form.altura_cm} onChange={set('altura_cm')} placeholder="175" min={100} max={250} className={inputCls} />
      </Field>
    </div>
  )
}

function Step2({ form, set }: { form: FormData; set: (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tu peso</h2>
        <p className="text-sm text-gray-400 mt-1">Registra tu punto de partida y dónde quieres llegar</p>
      </div>

      <Field label="Peso actual (kg)">
        <input type="number" value={form.peso_actual_kg} onChange={set('peso_actual_kg')} placeholder="80.0" step="0.1" className={inputCls} />
      </Field>

      <Field label="Peso objetivo (kg)">
        <input type="number" value={form.objetivo_peso_kg} onChange={set('objetivo_peso_kg')} placeholder="72.0" step="0.1" className={inputCls} />
      </Field>

      <Field label="Nivel de actividad base">
        <p className="text-xs text-gray-400 mb-2">No cuentes el ejercicio que vas a registrar — solo tu actividad diaria habitual</p>
        <select value={form.nivel_actividad_base} onChange={set('nivel_actividad_base')} className={inputCls}>
          <option value="sedentario">Sedentario (trabajo de oficina, poco movimiento)</option>
          <option value="ligero">Ligero (caminar, tareas del hogar, actividad normal)</option>
          <option value="moderado">Moderado (trabajo físico o muy activo)</option>
        </select>
      </Field>
    </div>
  )
}

function Step3({
  form,
  set,
  calculados,
}: {
  form: FormData
  set: (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  calculados: { bmr: number; tdee: number; kcalObj: number; proteinaObj: number } | null
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tus objetivos</h2>
        <p className="text-sm text-gray-400 mt-1">Calculados a medida, editables cuando quieras</p>
      </div>

      {calculados && (
        <div className="rounded-2xl bg-orange-50 dark:bg-orange-950 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Metabolismo basal (BMR)</span>
            <span className="font-semibold">{calculados.bmr} kcal</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Gasto estimado (TDEE)</span>
            <span className="font-semibold">{calculados.tdee} kcal</span>
          </div>
          <div className="border-t border-orange-200 dark:border-orange-800 pt-2 flex justify-between">
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Objetivo diario</span>
            <span className="font-bold text-orange-600">{calculados.kcalObj} kcal</span>
          </div>
        </div>
      )}

      <Field label="Déficit objetivo (kcal/día)">
        <input type="number" value={form.deficit_objetivo_kcal} onChange={set('deficit_objetivo_kcal')} step={50} min={0} max={1000} className={inputCls} />
        <p className="text-xs text-gray-400 mt-1">300–500 es sostenible. 400 es un buen punto de partida.</p>
      </Field>

      <Field label="Objetivo de proteína (g/día)">
        <input type="number" value={form.proteina_objetivo_g} onChange={set('proteina_objetivo_g')} placeholder={calculados?.proteinaObj.toString() ?? '144'} className={inputCls} />
        <p className="text-xs text-gray-400 mt-1">Calculado en 1,8g por kg de peso objetivo. Puedes ajustarlo.</p>
      </Field>
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-gray-700 dark:bg-gray-900'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
    </div>
  )
}
