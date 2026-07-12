'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { peatScoreBg } from '@/lib/utils'
import type { SavedMeal, TipoComida } from '@/types/database'
import { Pencil, Trash2, X, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react'

const TIPOS: TipoComida[] = ['desayuno', 'comida', 'cena', 'snack']
const TIPO_LABEL: Record<string, string> = {
  desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', snack: 'Snack',
}
const TIPO_COLOR: Record<string, string> = {
  desayuno: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  comida:   'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cena:     'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  snack:    'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

interface FoodItem {
  _id: string
  alimento: string
  cantidad: string
  kcal: number
  proteina_g: number
  carbohidratos_g: number
  grasa_g: number
  pufa_g: number
}

interface EditState {
  nombre: string
  tipo: TipoComida
  items: FoodItem[]
}

function parseItems(desglose: unknown): FoodItem[] {
  if (!Array.isArray(desglose)) return []
  return desglose
    .filter((d): d is Record<string, unknown> =>
      typeof d === 'object' && d !== null && 'alimento' in d && 'kcal' in d)
    .map((d, i) => ({
      _id: String(i),
      alimento: String(d.alimento ?? ''),
      cantidad: String(d.cantidad ?? ''),
      kcal: Number(d.kcal ?? 0),
      proteina_g: Number(d.proteina_g ?? 0),
      carbohidratos_g: Number(d.carbohidratos_g ?? 0),
      grasa_g: Number(d.grasa_g ?? 0),
      pufa_g: Number(d.pufa_g ?? 0),
    }))
}

function uid() { return Math.random().toString(36).slice(2) }

export default function HabitualesClient({ savedMeals: initial }: { savedMeals: SavedMeal[] }) {
  const [meals, setMeals] = useState(initial)
  const [editId, setEditId] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // New item form
  const [newItem, setNewItem] = useState({ alimento: '', cantidad: '', kcal: '', proteina_g: '', carbohidratos_g: '', grasa_g: '', pufa_g: '' })
  const [showAddForm, setShowAddForm] = useState(false)

  function startEdit(meal: SavedMeal) {
    setEditId(meal.id)
    setConfirmId(null)
    setExpandedId(null)
    setShowAddForm(false)
    setNewItem({ alimento: '', cantidad: '', kcal: '', proteina_g: '', carbohidratos_g: '', grasa_g: '', pufa_g: '' })
    setEdit({
      nombre: meal.nombre,
      tipo: (meal.tipo as TipoComida) ?? 'comida',
      items: parseItems(meal.desglose),
    })
  }

  function cancelEdit() { setEditId(null); setEdit(null); setShowAddForm(false) }

  function removeItem(id: string) {
    setEdit(e => e ? { ...e, items: e.items.filter(i => i._id !== id) } : e)
  }

  function addItem() {
    if (!newItem.alimento.trim()) return
    setEdit(e => e ? {
      ...e,
      items: [...e.items, {
        _id: uid(),
        alimento: newItem.alimento,
        cantidad: newItem.cantidad,
        kcal: parseFloat(newItem.kcal) || 0,
        proteina_g: parseFloat(newItem.proteina_g) || 0,
        carbohidratos_g: parseFloat(newItem.carbohidratos_g) || 0,
        grasa_g: parseFloat(newItem.grasa_g) || 0,
        pufa_g: parseFloat(newItem.pufa_g) || 0,
      }],
    } : e)
    setNewItem({ alimento: '', cantidad: '', kcal: '', proteina_g: '', carbohidratos_g: '', grasa_g: '', pufa_g: '' })
    setShowAddForm(false)
  }

  function updateItem(id: string, field: keyof Omit<FoodItem, '_id'>, val: string) {
    setEdit(e => e ? {
      ...e,
      items: e.items.map(i => i._id === id ? { ...i, [field]: ['kcal', 'proteina_g'].includes(field) ? parseFloat(val) || 0 : val } : i),
    } : e)
  }

  async function handleSave(mealId: string) {
    if (!edit) return
    setSaving(true)
    type NK = 'kcal' | 'proteina_g' | 'carbohidratos_g' | 'grasa_g' | 'pufa_g'
    const sum = (key: NK) => edit.items.reduce((s, i) => s + i[key], 0)
    const kcal = Math.round(sum('kcal'))
    const proteina_g = Math.round(sum('proteina_g') * 10) / 10
    const carbohidratos_g = Math.round(sum('carbohidratos_g') * 10) / 10
    const grasa_g = Math.round(sum('grasa_g') * 10) / 10
    const pufa_g = Math.round(sum('pufa_g') * 10) / 10
    const desgloseClean = edit.items.map(({ _id: _ignored, ...rest }) => rest)
    const supabase = createClient()
    const { error } = await supabase.from('saved_meals').update({
      nombre: edit.nombre, tipo: edit.tipo,
      kcal, proteina_g, carbohidratos_g, grasa_g, pufa_g,
      desglose: desgloseClean as unknown as import('@/types/database').Json,
    }).eq('id', mealId)
    if (!error) {
      setMeals(prev => prev.map(m => m.id === mealId ? {
        ...m, nombre: edit.nombre, tipo: edit.tipo,
        kcal, proteina_g, carbohidratos_g, grasa_g, pufa_g,
        desglose: desgloseClean as unknown as import('@/types/database').Json,
      } : m))
      cancelEdit()
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

  type NumKey = 'kcal' | 'proteina_g' | 'carbohidratos_g' | 'grasa_g' | 'pufa_g'
  const editSum = (key: NumKey) =>
    edit ? Math.round(edit.items.reduce((s, i) => s + i[key], 0) * 10) / 10 : 0
  const editKcal = edit ? Math.round(edit.items.reduce((s, i) => s + i.kcal, 0)) : 0

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-3">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Habituales</h1>
        <p className="text-sm text-gray-400">{meals.length} comidas guardadas</p>
      </div>

      {meals.length === 0 && (
        <div className="text-center py-16 text-gray-400 space-y-2">
          <p className="text-4xl">🍽️</p>
          <p className="text-sm">Aún no tienes comidas habituales.</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">Registra una ingesta y guárdala como habitual para acceder rápido.</p>
        </div>
      )}

      {meals.map((meal) => {
        const isEditing = editId === meal.id
        const isConfirming = confirmId === meal.id
        const isExpanded = expandedId === meal.id
        const items = parseItems(meal.desglose)

        return (
          <div
            key={meal.id}
            className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
          >
            {isEditing && edit ? (
              /* ─── MODO EDICIÓN ─────────────────────────────────── */
              <div className="p-4 space-y-4">
                {/* Nombre */}
                <input
                  value={edit.nombre}
                  onChange={e => setEdit(s => s ? { ...s, nombre: e.target.value } : s)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-500"
                  placeholder="Nombre de la comida"
                />

                {/* Tipo */}
                <div className="flex gap-2">
                  {TIPOS.map(t => (
                    <button
                      key={t}
                      onClick={() => setEdit(s => s ? { ...s, tipo: t } : s)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        edit.tipo === t ? TIPO_COLOR[t] : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}
                    >
                      {TIPO_LABEL[t]}
                    </button>
                  ))}
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Alimentos</p>
                  <div className="space-y-1.5">
                    {edit.items.length === 0 && (
                      <p className="text-xs text-gray-400 py-2 text-center">Sin items — añade alimentos abajo</p>
                    )}
                    {edit.items.map(item => (
                      <div key={item._id} className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            value={item.alimento}
                            onChange={e => updateItem(item._id, 'alimento', e.target.value)}
                            className="flex-1 bg-transparent text-sm font-medium text-gray-800 dark:text-gray-200 outline-none"
                            placeholder="Alimento"
                          />
                          <button onClick={() => removeItem(item._id)} className="text-gray-300 dark:text-gray-600 active:text-red-400 shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <input
                            value={item.cantidad}
                            onChange={e => updateItem(item._id, 'cantidad', e.target.value)}
                            placeholder="cantidad"
                            className="w-24 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs text-gray-500 outline-none"
                          />
                          {(['kcal','proteina_g','carbohidratos_g','grasa_g','pufa_g'] as const).map((key) => { const label = {kcal:'kcal',proteina_g:'prot',carbohidratos_g:'carbs',grasa_g:'grasa',pufa_g:'pufa'}[key]; return (
                            <div key={key} className="flex items-center gap-0.5">
                              <input
                                type="number"
                                value={item[key] as number}
                                onChange={e => updateItem(item._id, key, e.target.value)}
                                step="0.1"
                                className="w-14 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-1.5 py-1 text-xs text-right outline-none"
                              />
                              <span className="text-[9px] text-gray-400">{label}</span>
                            </div>
                          )})}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Añadir item */}
                  {showAddForm ? (
                    <div className="mt-2 rounded-xl border border-dashed border-orange-300 dark:border-orange-700 p-3 space-y-2">
                      <input
                        value={newItem.alimento}
                        onChange={e => setNewItem(n => ({ ...n, alimento: e.target.value }))}
                        placeholder="Nombre del alimento"
                        className="w-full bg-transparent text-sm outline-none text-gray-800 dark:text-gray-200"
                        autoFocus
                      />
                      <input
                        value={newItem.cantidad}
                        onChange={e => setNewItem(n => ({ ...n, cantidad: e.target.value }))}
                        placeholder="Cantidad (ej: 100g, 2 uds)"
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 px-2 py-1.5 text-xs outline-none"
                      />
                      <div className="grid grid-cols-5 gap-1.5">
                        {([['kcal','kcal'],['prot','proteina_g'],['carbs','carbohidratos_g'],['grasa','grasa_g'],['pufa','pufa_g']] as [string,string][]).map(([label, key]) => (
                          <div key={key}>
                            <p className="text-[9px] text-gray-400 text-center mb-0.5">{label}</p>
                            <input
                              type="number"
                              step="0.1"
                              value={newItem[key as keyof typeof newItem]}
                              onChange={e => setNewItem(n => ({ ...n, [key]: e.target.value }))}
                              placeholder="0"
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 px-1.5 py-1.5 text-xs text-right outline-none"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowAddForm(false)} className="flex-1 py-1.5 text-xs text-gray-400 rounded-xl border border-gray-200 dark:border-gray-700">
                          Cancelar
                        </button>
                        <button onClick={addItem} className="flex-1 py-1.5 text-xs font-semibold text-white bg-orange-500 rounded-xl">
                          Añadir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-1.5 text-sm text-orange-500 font-medium mt-2 py-1"
                    >
                      <Plus size={14} /> Añadir alimento
                    </button>
                  )}
                </div>

                {/* Totales calculados desde items */}
                <div className="rounded-xl bg-orange-50 dark:bg-orange-950 px-3 py-2.5 space-y-1">
                  <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wide">Total calculado</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{editKcal} kcal</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{editSum('proteina_g')}g prot</span>
                    <span className="text-sm text-gray-500">{editSum('carbohidratos_g')}g carbs</span>
                    <span className="text-sm text-gray-500">{editSum('grasa_g')}g grasa</span>
                    <span className="text-sm text-gray-500">{editSum('pufa_g')}g PUFA</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <button onClick={cancelEdit} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500">
                    <X size={14} /> Cancelar
                  </button>
                  <button
                    onClick={() => handleSave(meal.id)}
                    disabled={saving || !edit.nombre.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    <Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              /* ─── VISTA NORMAL ─────────────────────────────────── */
              <div>
                {/* Cabecera */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIPO_COLOR[meal.tipo] ?? 'bg-gray-100 text-gray-500'}`}>
                          {TIPO_LABEL[meal.tipo] ?? meal.tipo}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${peatScoreBg(meal.peat_score)}`}>
                          P{meal.peat_score}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{meal.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Math.round(meal.kcal)} kcal · {Math.round(meal.proteina_g)}g prot · usada {meal.veces_usada}×
                      </p>
                    </div>
                    {isConfirming ? (
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => setConfirmId(null)} className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500">
                          No
                        </button>
                        <button onClick={() => handleDelete(meal.id)} disabled={deleting} className="text-xs px-2.5 py-1.5 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50">
                          Borrar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => startEdit(meal)} className="p-2 rounded-xl text-gray-400 active:text-orange-500 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => { setConfirmId(meal.id); setEditId(null) }} className="p-2 rounded-xl text-gray-300 dark:text-gray-600 active:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items del desglose */}
                {items.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : meal.id)}
                      className="flex w-full items-center justify-between px-4 py-2.5"
                    >
                      <span className="text-xs text-gray-400">{items.length} alimento{items.length !== 1 ? 's' : ''}</span>
                      {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-1.5">
                        {items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300 truncate">{item.alimento}</span>
                              {item.cantidad && <span className="text-gray-400 shrink-0">· {item.cantidad}</span>}
                            </div>
                            <span className="text-gray-500 shrink-0 ml-2">{Math.round(item.kcal)}k · {Math.round(item.proteina_g)}g</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
