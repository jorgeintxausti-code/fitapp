'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularBMR, calcularTDEE } from '@/lib/bmr'
import type { Profile, NivelActividad } from '@/types/database'

interface Props {
  profile: Profile
}

export default function EditProfileForm({ profile }: Props) {
  const [form, setForm] = useState({
    nombre: profile.nombre ?? '',
    sexo: profile.sexo ?? 'masculino',
    fecha_nacimiento: profile.fecha_nacimiento ?? '',
    altura_cm: profile.altura_cm?.toString() ?? '',
    objetivo_peso_kg: profile.objetivo_peso_kg?.toString() ?? '',
    nivel_actividad_base: profile.nivel_actividad_base ?? 'ligero',
    deficit_objetivo_kcal: profile.deficit_objetivo_kcal?.toString() ?? '400',
    proteina_objetivo_g: profile.proteina_objetivo_g?.toString() ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function calcularObjetivos() {
    if (!form.sexo || !form.fecha_nacimiento || !form.altura_cm || !form.objetivo_peso_kg) return null
    const peso = parseFloat(form.objetivo_peso_kg)
    const bmr = calcularBMR(
      form.sexo as 'masculino' | 'femenino',
      peso,
      parseFloat(form.altura_cm),
      form.fecha_nacimiento
    )
    const tdee = calcularTDEE(bmr, form.nivel_actividad_base as NivelActividad)
    return { bmr: Math.round(bmr), tdee }
  }

  const calculados = calcularObjetivos()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        nombre: form.nombre || null,
        sexo: form.sexo as 'masculino' | 'femenino',
        fecha_nacimiento: form.fecha_nacimiento || null,
        altura_cm: form.altura_cm ? parseFloat(form.altura_cm) : null,
        objetivo_peso_kg: form.objetivo_peso_kg ? parseFloat(form.objetivo_peso_kg) : null,
        nivel_actividad_base: form.nivel_actividad_base as NivelActividad,
        deficit_objetivo_kcal: parseInt(form.deficit_objetivo_kcal) || 400,
        proteina_objetivo_g: form.proteina_objetivo_g ? parseInt(form.proteina_objetivo_g) : null,
      })
      .eq('user_id', profile.user_id)
    if (error) setError(error.message)
    else setOk(true)
    setGuardando(false)
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">Datos personales</h2>

      <Field label="Nombre">
        <input type="text" value={form.nombre} onChange={set('nombre')} className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sexo">
          <select value={form.sexo} onChange={set('sexo')} className={inputCls}>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>
        </Field>
        <Field label="Fecha nacimiento">
          <input type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Altura (cm)">
          <input type="number" value={form.altura_cm} onChange={set('altura_cm')} className={inputCls} min={100} max={250} />
        </Field>
        <Field label="Peso objetivo (kg)">
          <input type="number" value={form.objetivo_peso_kg} onChange={set('objetivo_peso_kg')} step="0.1" className={inputCls} />
        </Field>
      </div>

      <Field label="Nivel de actividad base">
        <select value={form.nivel_actividad_base} onChange={set('nivel_actividad_base')} className={inputCls}>
          <option value="sedentario">Sedentario (oficina, nada de ejercicio)</option>
          <option value="ligero">Ligero (caminar, actividad diaria normal)</option>
          <option value="moderado">Moderado (ejercicio 3-5 días/semana)</option>
        </select>
      </Field>

      {calculados && (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-500 space-y-1">
          <p>BMR estimado: <strong>{calculados.bmr} kcal</strong></p>
          <p>TDEE base: <strong>{calculados.tdee} kcal</strong></p>
          <p>Objetivo kcal: <strong>{calculados.tdee - parseInt(form.deficit_objetivo_kcal || '400')} kcal</strong></p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Déficit objetivo (kcal)">
          <input type="number" value={form.deficit_objetivo_kcal} onChange={set('deficit_objetivo_kcal')} step={50} min={0} max={1000} className={inputCls} />
        </Field>
        <Field label="Proteína objetivo (g)">
          <input type="number" value={form.proteina_objetivo_g} onChange={set('proteina_objetivo_g')} className={inputCls} />
        </Field>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {ok && <p className="text-sm text-green-600">Guardado correctamente</p>}

      <button type="submit" disabled={guardando} className="w-full rounded-2xl bg-orange-500 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {guardando ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-gray-700 dark:bg-gray-900'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      {children}
    </div>
  )
}
