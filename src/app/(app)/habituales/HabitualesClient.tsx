'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { peatScoreBg } from '@/lib/utils'
import type { SavedMeal, TipoComida } from '@/types/database'
import { ArrowLeft, Trash2, Pencil, Check, X } from 'lucide-react'

const TIPOS: TipoComida[] = ['desayuno', 'comida', 'cena', 'snack']
const TIPO_LABEL: Record<TipoComida, string> = {
  desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', snack: 'Snack',
}
const TIPO_COLOR: Record<TipoComida, string> = {
  desayuno: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  comida: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cena: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  snack: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

interface EditForm {
  nombre: string
  tipo: TipoComida
  kcal: number
  proteina_g: number
  carbohidratos_g: number
  grasa_g: number
  pufa_g: number
}

export default function HabitualesClient({ savedMeals: initial }: { savedMeals: SavedMeal[] }) {
  const [meals, setMeals] = useState(initial)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  function startEdit(meal: SavedMeal) {
    setEditId(meal.id)
    setConfirmId(null)
    setEditForm({
      nombre: meal.nombre,
      tipo: meal.tipo as TipoComida,
      kcal: meal.kcal,
      proteina_g: meal.proteina_g,
      carbohidratos_g: meal.carbohidratos_g,
      grasa_g: meal.grasa_g,
      pufa_g: meal.pufa_g,
    })
  }

  async function handleSaveEdit(id: string) {
    if (!editForm) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('saved_meals')
      .update({
        nombre: editForm.nombre,
        tipo: editForm.tipo,
        kcal: editForm.kcal,
        proteina_g: editForm.proteina_g,
        carbohidratos_g: editForm.carbohidratos_g,
        grasa_g: editForm.grasa_g,
        pufa_g: editForm.pufa_g,
      })
      .eq('id', id)
    if (!error) {
      setMeals(prev => prev.map(m => m.id === id ? { ...m, ...editForm } : m))
      setEditId(null)
      setEditForm(null)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('saved_meals').delete().eq('id', id)
    setMeals(prev => prev.filter(m => m.id !== id))
    setConfirmId(null)
    setDeleting(false)
  }

  const setField = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setEditForm(f => f ? { ...f, [k]: v } : f)

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/ajustes" className="p-2 -ml-2 rounded-xl text-gray-500">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Comidas habituales</h1>
          <p className="text-xs text-gray-400">{meals.length} guardadas · toca para editar</p>
        </div>
      </div>

      {meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-gray-400">Aún no tienes comidas habituales.</p>
          <p className="text-sm text-gray-400">Al registrar una ingesta, guárdala como habitual para acceder rápido.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map((meal) => {
            const isEditing = editId === meal.id
            const isConfirming = confirmId === meal.id

            return (
              <div
                key={meal.id}
                className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                {isEditing && editForm ? (
                  /* ── Modo edición ── */
                  <div className="px-4 py-3 space-y-3">
                    {/* Nombre */}
                    <input
                      value={editForm.nombre}
                      onChange={e => setField('nombre', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 px-3 py-2 text-sm font-semibold outline-none focus:border-orange-500"
                      placeholder="Nombre de la comida"
                    />

                    {/* Tipo */}
                    <div className="flex gap-2 flex-wrap">
                      {TIPOS.map(t => (
                        <button
                          key={t}
                          onClick={() => setField('tipo', t)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            editForm.tipo === t
                              ? TIPO_COLOR[t]
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          }`}
                        >
                          {TIPO_LABEL[t]}
                        </button>
                      ))}
                    </div>

                    {/* Macros */}
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ['Calorías', 'kcal', 'kcal'],
                        ['Proteína', 'proteina_g', 'g'],
                        ['Carbohidratos', 'carbohidratos_g', 'g'],
                        ['Grasa', 'grasa_g', 'g'],
                        ['PUFA', 'pufa_g', 'g'],
                      ] as [string, keyof EditForm, string][]).map(([label, key, unit]) => (
                        <div key={key} className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editForm[key] as number}
                              onChange={e => setField(key, parseFloat(e.target.value) || 0)}
                              step={key === 'kcal' ? 1 : 0.1}
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 px-2 py-1.5 text-sm text-right outline-none focus:border-orange-500"
                            />
                            <span className="text-xs text-gray-400 w-6 shrink-0">{unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { setEditId(null); setEditForm(null) }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500"
                      >
                        <X size={14} /> Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveEdit(meal.id)}
                        disabled={saving || !editForm.nombre.trim()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50"
                      >
                        <Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Vista normal ── */
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{meal.nombre}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TIPO_COLOR[meal.tipo as TipoComida] ?? 'bg-gray-100 text-gray-500'}`}>
                            {TIPO_LABEL[meal.tipo as TipoComida] ?? meal.tipo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${peatScoreBg(meal.peat_score)}`}>
                            P{meal.peat_score}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(meal.kcal)} kcal · {Math.round(meal.proteina_g)}g prot · usada {meal.veces_usada}×
                          </span>
                        </div>
                      </div>

                      {/* Botones acción */}
                      {isConfirming ? (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setConfirmId(null)} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500">
                            Cancelar
                          </button>
                          <button onClick={() => handleDelete(meal.id)} disabled={deleting} className="text-xs px-3 py-1.5 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50">
                            Eliminar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => startEdit(meal)} className="p-2 rounded-xl text-gray-400 hover:text-orange-500 transition-colors">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => { setConfirmId(meal.id); setEditId(null) }} className="p-2 rounded-xl text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
