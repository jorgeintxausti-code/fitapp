import type { TipoComida } from '@/types/database'

export function tipoComidaPorHora(): TipoComida {
  const hora = new Date().getHours()
  if (hora >= 6 && hora < 11) return 'desayuno'
  if (hora >= 11 && hora < 16) return 'comida'
  if (hora >= 16 && hora < 21) return 'cena'
  return 'snack'
}

export function formatearFechaLocal(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

export function peatScoreColor(score: number): string {
  if (score >= 7) return 'text-green-600'
  if (score >= 4) return 'text-amber-500'
  return 'text-red-500'
}

export function peatScoreBg(score: number): string {
  if (score >= 7) return 'bg-green-100 text-green-800'
  if (score >= 4) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
