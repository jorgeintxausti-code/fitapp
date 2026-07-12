'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { peatScoreBg, peatScoreColor } from '@/lib/utils'
import type { SavedMeal } from '@/types/database'
import { ArrowLeft, Trash2 } from 'lucide-react'

interface Props {
  savedMeals: SavedMeal[]
}

export default function HabitualesClient({ savedMeals: initial }: Props) {
  const router = useRouter()
  const [meals, setMeals] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('saved_meals').delete().eq('id', id)
    setMeals((prev) => prev.filter((m) => m.id !== id))
    setConfirmId(null)
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/ajustes" className="p-2 -ml-2 rounded-xl text-gray-500">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Comidas habituales</h1>
          <p className="text-xs text-gray-400">{meals.length} guardadas</p>
        </div>
      </div>

      {meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-gray-400">Aún no tienes comidas habituales.</p>
          <p className="text-sm text-gray-400">Al registrar una ingesta puedes guardarla como habitual para usarla rápido la próxima vez.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{meal.nombre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${peatScoreBg(meal.peat_score)}`}>
                      P{meal.peat_score}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(meal.kcal)} kcal · {Math.round(meal.proteina_g)}g prot
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Usada {meal.veces_usada}× · {meal.tipo}
                  </p>
                </div>

                {confirmId === meal.id ? (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleDelete(meal.id)}
                      disabled={deleting === meal.id}
                      className="text-xs px-3 py-1.5 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(meal.id)}
                    className="p-2 rounded-xl text-gray-300 dark:text-gray-600 active:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* Peat comentario */}
              {meal.peat_comentario && (
                <p className={`text-xs mt-2 ${peatScoreColor(meal.peat_score)} opacity-80`}>
                  {meal.peat_comentario}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
