import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getLatestWeight } from '@/lib/queries'
import { calcularBMR, calcularTDEE } from '@/lib/bmr'
import LogoutButton from './LogoutButton'
import EditProfileForm from './EditProfileForm'

export default async function AjustesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profile, latestWeight] = await Promise.all([
    getProfile(supabase, user.id),
    getLatestWeight(supabase, user.id),
  ])

  if (!profile) redirect('/onboarding')

  const pesoActual = latestWeight?.peso_kg ?? profile.peso_inicial_kg ?? 80
  const bmr = (profile.sexo && profile.fecha_nacimiento && profile.altura_cm)
    ? calcularBMR(profile.sexo, Number(pesoActual), Number(profile.altura_cm), profile.fecha_nacimiento)
    : null
  const tdee = bmr ? calcularTDEE(bmr, profile.nivel_actividad_base ?? 'ligero') : null

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ajustes</h1>
        <p className="text-sm text-gray-400">{user.email}</p>
      </div>

      {bmr && tdee && (
        <div className="rounded-2xl bg-orange-50 dark:bg-orange-950 p-4 grid grid-cols-2 gap-3">
          <StatCard label="BMR" value={`${Math.round(bmr)} kcal`} />
          <StatCard label="TDEE base" value={`${tdee} kcal`} />
          <StatCard label="Obj. calorías" value={`${tdee - (profile.deficit_objetivo_kcal ?? 400)} kcal`} />
          <StatCard label="Obj. proteína" value={`${profile.proteina_objetivo_g ?? '—'}g`} />
        </div>
      )}

      <EditProfileForm profile={profile} />

      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <LogoutButton />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">{label}</p>
      <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
