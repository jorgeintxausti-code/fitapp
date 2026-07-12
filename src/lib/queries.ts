import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Meal, Activity, Profile, Weight, SavedMeal } from '@/types/database'

function getTodayUTCRange(timezone: string): { gte: string; lt: string } {
  const now = new Date()
  const dateStr = now.toLocaleDateString('sv', { timeZone: timezone })
  const localStr = now.toLocaleString('sv', { timeZone: timezone })
  const offsetMs = new Date(localStr.replace(' ', 'T') + 'Z').getTime() - now.getTime()
  const startUTC = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - offsetMs)
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000)
  return { gte: startUTC.toISOString(), lt: endUTC.toISOString() }
}

export function getTodayDateStr(timezone: string): string {
  return new Date().toLocaleDateString('sv', { timeZone: timezone })
}

export async function getProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data as Profile | null
}

export async function getLatestWeight(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Weight | null> {
  const { data } = await supabase
    .from('weights')
    .select('*')
    .eq('user_id', userId)
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Weight | null
}

export async function getTodayMeals(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone: string
): Promise<Meal[]> {
  const { gte, lt } = getTodayUTCRange(timezone)
  const { data } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .gte('eaten_at', gte)
    .lt('eaten_at', lt)
    .order('eaten_at', { ascending: true })
  return (data ?? []) as Meal[]
}

export async function getTodayActivities(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone: string
): Promise<Activity[]> {
  const today = getTodayDateStr(timezone)
  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .eq('fecha', today)
    .order('created_at', { ascending: true })
  return (data ?? []) as Activity[]
}

export async function getWeightHistory(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 90
): Promise<Weight[]> {
  const { data } = await supabase
    .from('weights')
    .select('*')
    .eq('user_id', userId)
    .order('fecha', { ascending: true })
    .limit(limit)
  return (data ?? []) as Weight[]
}

export async function getMealHistory(
  supabase: SupabaseClient<Database>,
  userId: string,
  days = 30
): Promise<Meal[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .gte('eaten_at', since.toISOString())
    .order('eaten_at', { ascending: true })
  return (data ?? []) as Meal[]
}

export async function getSavedMeals(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SavedMeal[]> {
  const { data } = await supabase
    .from('saved_meals')
    .select('*')
    .eq('user_id', userId)
    .order('veces_usada', { ascending: false })
    .limit(20)
  return (data ?? []) as SavedMeal[]
}
