import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getLatestWeight, getTodayMeals, getTodayActivities } from '@/lib/queries'
import { calcularBMR, calcularTDEE } from '@/lib/bmr'
import { Plus, Flame, Beef, Activity, Scale } from 'lucide-react'
import MealRowClient from './MealRowClient'

export default async function HoyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, latestWeight, meals, activities] = await Promise.all([
    getProfile(supabase, user.id),
    getLatestWeight(supabase, user.id),
    getTodayMeals(supabase, user.id, 'Europe/Madrid'),
    getTodayActivities(supabase, user.id, 'Europe/Madrid'),
  ])

  if (!profile) redirect('/onboarding')

  // Peso actual
  const pesoActual = latestWeight?.peso_kg ?? profile.peso_inicial_kg ?? 80

  // Cálculo energético
  const bmr = (profile.sexo && profile.fecha_nacimiento && profile.altura_cm)
    ? calcularBMR(profile.sexo, Number(pesoActual), Number(profile.altura_cm), profile.fecha_nacimiento)
    : 1800
  const tdeeBase = calcularTDEE(bmr, profile.nivel_actividad_base ?? 'ligero')
  const kcalActividades = activities.reduce((s, a) => s + Number(a.kcal_estimadas), 0)
  const gastoEstimado = tdeeBase + kcalActividades
  const kcalObjetivo = gastoEstimado - (profile.deficit_objetivo_kcal ?? 400)
  const proteinaObjetivo = profile.proteina_objetivo_g ?? Math.round(Number(profile.objetivo_peso_kg ?? pesoActual) * 1.8)

  // Totales del día
  const kcalConsumidas = meals.reduce((s, m) => s + Number(m.kcal), 0)
  const proteinaConsumida = meals.reduce((s, m) => s + Number(m.proteina_g), 0)
  const kcalRestantes = kcalObjetivo - kcalConsumidas
  const balance = kcalConsumidas - gastoEstimado

  // Fecha en español
  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: profile.timezone,
  })

  const pctKcal = Math.min(kcalConsumidas / kcalObjetivo, 1)
  const pctProt = Math.min(proteinaConsumida / proteinaObjetivo, 1)

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto">
      {/* Cabecera */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide capitalize">{hoy}</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resumen del día</h1>
      </div>

      {/* Anillo de calorías + barra de proteína */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-6">
          {/* Anillo */}
          <div className="relative shrink-0">
            <CalorieRing pct={pctKcal} over={kcalConsumidas > kcalObjetivo} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {Math.round(kcalConsumidas)}
              </span>
              <span className="text-[10px] text-gray-400">kcal</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-3">
            <StatRow
              label="Objetivo"
              value={`${Math.round(kcalObjetivo)} kcal`}
              icon={<Flame size={14} className="text-orange-500" />}
            />
            <StatRow
              label="Restantes"
              value={`${Math.round(Math.abs(kcalRestantes))} kcal`}
              highlight={kcalRestantes < 0 ? 'red' : 'green'}
              icon={<Flame size={14} className="text-gray-400" />}
            />
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="flex items-center gap-1 text-gray-500">
                  <Beef size={12} /> Proteína
                </span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {Math.round(proteinaConsumida)}/{proteinaObjetivo}g
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pctProt >= 1 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${pctProt * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className={`mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between`}>
          <span className="text-sm text-gray-500">Balance del día</span>
          <span className={`text-sm font-bold ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
            {balance > 0 ? '+' : ''}{Math.round(balance)} kcal
          </span>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-3 gap-2">
        <QuickAction href="/nueva-ingesta" icon={<Plus size={18} />} label="Añadir ingesta" color="orange" />
        <QuickAction href="/nueva-actividad" icon={<Activity size={18} />} label="Actividad" color="blue" />
        <QuickAction href="/nuevo-peso" icon={<Scale size={18} />} label="Registrar peso" color="purple" />
      </div>

      {/* Ingestas del día */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Ingestas de hoy
        </h2>

        {meals.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Flame size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nada registrado todavía</p>
            <Link
              href="/nueva-ingesta"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-500"
            >
              <Plus size={14} /> Añadir primera ingesta
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {meals.map((meal) => (
              <MealRowClient key={meal.id} meal={meal} />
            ))}
          </div>
        )}
      </div>

      {/* Actividades del día */}
      {activities.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Actividad extra
          </h2>
          <div className="space-y-2">
            {activities.map((act) => (
              <div key={act.id} className="flex items-center justify-between rounded-2xl bg-blue-50 dark:bg-blue-950 px-4 py-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate pr-4">{act.descripcion}</span>
                <span className="text-sm font-semibold text-blue-600 shrink-0">+{Math.round(Number(act.kcal_estimadas))} kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CalorieRing({ pct, over }: { pct: number; over: boolean }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  return (
    <svg width="110" height="110" className="-rotate-90">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#f3f4f6" strokeWidth="9" />
      <circle
        cx="55" cy="55" r={r} fill="none"
        stroke={over ? '#ef4444' : '#f97316'}
        strokeWidth="9"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  )
}

function StatRow({
  label, value, icon, highlight,
}: {
  label: string
  value: string
  icon: React.ReactNode
  highlight?: 'red' | 'green'
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1 text-xs text-gray-500">{icon}{label}</span>
      <span className={`text-sm font-semibold ${highlight === 'red' ? 'text-red-500' : highlight === 'green' ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
        {value}
      </span>
    </div>
  )
}

function QuickAction({ href, icon, label, color }: {
  href: string
  icon: React.ReactNode
  label: string
  color: 'orange' | 'blue' | 'purple'
}) {
  const colors = {
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950',
  }
  return (
    <Link href={href} className={`flex flex-col items-center gap-1.5 rounded-2xl px-3 py-3 text-center ${colors[color]} active:scale-95 transition-transform`}>
      {icon}
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </Link>
  )
}

