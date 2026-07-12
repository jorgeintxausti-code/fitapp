'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { peatScoreBg } from '@/lib/utils'
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react'
import type { Meal } from '@/types/database'

export default function MealRowClient({ meal }: { meal: Meal }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const hora = new Date(meal.eaten_at).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid',
  })
  const tipo = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena', snack: 'Snack' }[meal.tipo] ?? meal.tipo

  async function handleSaveHabitual() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('saved_meals').insert({
      user_id: meal.user_id,
      nombre: (meal.descripcion_original ?? 'Comida').slice(0, 50),
      tipo: meal.tipo,
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
      veces_usada: 1,
      ultima_vez: new Date().toISOString(),
    })
    setSaved(true)
    setSaving(false)
    setExpanded(false)
  }

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all`}
    >
      {/* Fila principal */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-gray-50 dark:active:bg-gray-800 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-gray-400">{tipo} · {hora}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${peatScoreBg(meal.peat_score)}`}>
              P{meal.peat_score}
            </span>
            {saved && (
              <span className="text-[10px] font-medium text-green-500 flex items-center gap-0.5">
                <BookmarkCheck size={10} /> Guardada
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {meal.descripcion_original ?? '—'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{Math.round(Number(meal.kcal))}</p>
          <p className="text-[11px] text-gray-400">{Math.round(Number(meal.proteina_g))}g prot</p>
        </div>
      </button>

      {/* Panel expandido */}
      {expanded && !saved && (
        <div className="px-4 pb-3 pt-0 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleSaveHabitual}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-medium text-orange-500 disabled:opacity-50 py-2"
          >
            {saving
              ? <Loader2 size={15} className="animate-spin" />
              : <Bookmark size={15} />}
            Guardar como habitual
          </button>
        </div>
      )}
    </div>
  )
}
