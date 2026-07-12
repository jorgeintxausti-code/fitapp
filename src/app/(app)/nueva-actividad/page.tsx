import { createClient } from '@/lib/supabase/server'
import { getProfile, getLatestWeight } from '@/lib/queries'
import { redirect } from 'next/navigation'
import NuevaActividadClient from './NuevaActividadClient'

export default async function NuevaActividadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, latestWeight] = await Promise.all([
    getProfile(supabase, user.id),
    getLatestWeight(supabase, user.id),
  ])

  if (!profile) redirect('/onboarding')

  const pesoKg = latestWeight?.peso_kg ?? profile.peso_inicial_kg ?? 80

  return <NuevaActividadClient pesoKg={Number(pesoKg)} />
}
