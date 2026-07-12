import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getLatestWeight, getWeightHistory, getMealHistory } from '@/lib/queries'
import { calcularBMR, calcularTDEE } from '@/lib/bmr'
import TendenciasClient from './TendenciasClient'

export default async function TendenciasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, latestWeight, weightHistory, mealHistory] = await Promise.all([
    getProfile(supabase, user.id),
    getLatestWeight(supabase, user.id),
    getWeightHistory(supabase, user.id, 90),
    getMealHistory(supabase, user.id, 30),
  ])

  if (!profile) redirect('/onboarding')

  const pesoActual = latestWeight?.peso_kg ?? profile.peso_inicial_kg ?? 80
  const bmr = (profile.sexo && profile.fecha_nacimiento && profile.altura_cm)
    ? calcularBMR(profile.sexo, Number(pesoActual), Number(profile.altura_cm), profile.fecha_nacimiento)
    : 1800
  const tdee = calcularTDEE(bmr, profile.nivel_actividad_base ?? 'ligero')
  const kcalObjetivo = Math.round(tdee - (profile.deficit_objetivo_kcal ?? 400))
  const proteinaObjetivo = profile.proteina_objetivo_g
    ?? Math.round(Number(profile.objetivo_peso_kg ?? pesoActual) * 1.8)

  return (
    <TendenciasClient
      weightHistory={weightHistory}
      mealHistory={mealHistory}
      kcalObjetivo={kcalObjetivo}
      proteinaObjetivo={proteinaObjetivo}
    />
  )
}
