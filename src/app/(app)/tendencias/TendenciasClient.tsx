'use client'

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import type { Weight, Meal } from '@/types/database'

interface Props {
  weightHistory: Weight[]
  mealHistory: Meal[]
  kcalObjetivo: number
  proteinaObjetivo: number
}

const PERIODS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
]

function getCutoff(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('sv')
}

function fmtDate(s: string) {
  const [, m, d] = s.split('-')
  return `${parseInt(d)}/${parseInt(m)}`
}

function fmtDateLong(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function aggregateMeals(meals: Meal[]) {
  const map: Record<string, { kcal: number; proteina: number; peatSum: number; cnt: number }> = {}
  for (const m of meals) {
    const date = new Date(m.eaten_at).toLocaleDateString('sv', { timeZone: 'Europe/Madrid' })
    if (!map[date]) map[date] = { kcal: 0, proteina: 0, peatSum: 0, cnt: 0 }
    map[date].kcal += Number(m.kcal)
    map[date].proteina += Number(m.proteina_g)
    map[date].peatSum += Number(m.peat_score)
    map[date].cnt += 1
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      kcal: Math.round(d.kcal),
      proteina: Math.round(d.proteina),
      peat: Math.round((d.peatSum / d.cnt) * 10) / 10,
    }))
}

function avg(arr: number[]) {
  if (!arr.length) return null
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 10) / 10
}

export default function TendenciasClient({ weightHistory, mealHistory, kcalObjetivo, proteinaObjetivo }: Props) {
  const [period, setPeriod] = useState(14)

  const cutoff = useMemo(() => getCutoff(period), [period])

  const weightData = useMemo(() =>
    weightHistory
      .filter(w => w.fecha >= cutoff)
      .map(w => ({ date: w.fecha, peso: Number(w.peso_kg) })),
    [weightHistory, cutoff])

  const allDailyMeals = useMemo(() => aggregateMeals(mealHistory), [mealHistory])

  const mealData = useMemo(() =>
    allDailyMeals.filter(d => d.date >= cutoff),
    [allDailyMeals, cutoff])

  // Summary stats
  const pesoActual = weightData.at(-1)?.peso ?? null
  const pesoCambio = weightData.length >= 2 ? Number((weightData.at(-1)!.peso - weightData[0].peso).toFixed(1)) : null
  const avgKcal = avg(mealData.map(d => d.kcal))
  const avgProt = avg(mealData.map(d => d.proteina))
  const avgPeat = avg(mealData.map(d => d.peat))

  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '12px',
    color: '#f9fafb',
    fontSize: 12,
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tendencias</h1>

      {/* Period tabs */}
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button
            key={p.days}
            onClick={() => setPeriod(p.days)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              period === p.days
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Peso ─────────────────────────────────────────────────────── */}
      <ChartCard
        title="Peso"
        stat={pesoActual ? `${pesoActual} kg` : '—'}
        sub={pesoCambio !== null
          ? `${pesoCambio >= 0 ? '+' : ''}${pesoCambio} kg en ${period}d`
          : 'Sin datos de peso'}
        subColor={pesoCambio !== null ? (pesoCambio <= 0 ? 'green' : 'red') : 'gray'}
        empty={weightData.length === 0}
      >
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={weightData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.25} />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${v} kg`, 'Peso']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(s: any) => fmtDateLong(String(s))}
            />
            <Line
              type="monotone"
              dataKey="peso"
              stroke="#a855f7"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Calorías ─────────────────────────────────────────────────── */}
      <ChartCard
        title="Calorías diarias"
        stat={avgKcal ? `${avgKcal} kcal` : '—'}
        sub={avgKcal ? `Obj: ${kcalObjetivo} kcal · Media ${period}d` : 'Sin datos'}
        subColor={avgKcal && avgKcal <= kcalObjetivo ? 'green' : 'red'}
        empty={mealData.length === 0}
      >
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={mealData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.25} />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${v} kcal`, 'Calorías']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(s: any) => fmtDateLong(String(s))}
            />
            <ReferenceLine y={kcalObjetivo} stroke="#f97316" strokeDasharray="5 3" strokeWidth={1.5} opacity={0.7} />
            <Bar dataKey="kcal" fill="#f97316" radius={[4, 4, 0, 0]} opacity={0.85} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Proteína ─────────────────────────────────────────────────── */}
      <ChartCard
        title="Proteína diaria"
        stat={avgProt ? `${avgProt}g` : '—'}
        sub={avgProt ? `Obj: ${proteinaObjetivo}g · Media ${period}d` : 'Sin datos'}
        subColor={avgProt && avgProt >= proteinaObjetivo ? 'green' : 'red'}
        empty={mealData.length === 0}
      >
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={mealData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.25} />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${v}g`, 'Proteína']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(s: any) => fmtDateLong(String(s))}
            />
            <ReferenceLine y={proteinaObjetivo} stroke="#3b82f6" strokeDasharray="5 3" strokeWidth={1.5} opacity={0.7} />
            <Bar dataKey="proteina" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.85} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Peat Score ───────────────────────────────────────────────── */}
      <ChartCard
        title="Peat Score medio"
        stat={avgPeat ? `${avgPeat}/10` : '—'}
        sub={avgPeat ? `Media ${period}d · ${avgPeat >= 7 ? '✓ Buena calidad' : avgPeat >= 4 ? 'Mejorable' : 'Baja calidad'}` : 'Sin datos'}
        subColor={avgPeat ? (avgPeat >= 7 ? 'green' : avgPeat >= 4 ? 'orange' : 'red') : 'gray'}
        empty={mealData.length === 0}
      >
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={mealData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.25} />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
            <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`${v}/10`, 'Peat Score']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(s: any) => fmtDateLong(String(s))}
            />
            <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="5 3" strokeWidth={1.5} opacity={0.5} />
            <Bar dataKey="peat" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.85} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

type SubColor = 'green' | 'red' | 'orange' | 'gray'

function ChartCard({
  title, stat, sub, subColor, children, empty,
}: {
  title: string
  stat: string
  sub: string
  subColor: SubColor
  children: React.ReactNode
  empty: boolean
}) {
  const subCls: Record<SubColor, string> = {
    green: 'text-green-500',
    red: 'text-red-400',
    orange: 'text-orange-400',
    gray: 'text-gray-400',
  }
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{stat}</p>
        </div>
        <p className={`text-xs font-medium mt-1 text-right max-w-[140px] leading-tight ${subCls[subColor]}`}>{sub}</p>
      </div>
      {empty ? (
        <div className="h-[170px] flex items-center justify-center">
          <p className="text-sm text-gray-400">Sin datos para este período</p>
        </div>
      ) : children}
    </div>
  )
}
