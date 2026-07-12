import { createClient } from '@/lib/supabase/server'
import { getSavedMeals } from '@/lib/queries'
import { redirect } from 'next/navigation'
import HabitualesClient from './HabitualesClient'

export default async function HabitualesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const savedMeals = await getSavedMeals(supabase, user.id)

  return <HabitualesClient savedMeals={savedMeals} />
}
