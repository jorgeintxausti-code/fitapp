import type { Profile } from '@/types/database'

const ACTIVITY_MULTIPLIERS = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
} as const

export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
  return edad
}

export function calcularBMR(
  sexo: 'masculino' | 'femenino',
  pesoKg: number,
  alturaCm: number,
  fechaNacimiento: string
): number {
  const edad = calcularEdad(fechaNacimiento)
  if (sexo === 'masculino') {
    return 10 * pesoKg + 6.25 * alturaCm - 5 * edad + 5
  }
  return 10 * pesoKg + 6.25 * alturaCm - 5 * edad - 161
}

export function calcularTDEE(bmr: number, nivelActividad: keyof typeof ACTIVITY_MULTIPLIERS): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[nivelActividad])
}

export function calcularObjetivosIniciales(profile: Partial<Profile>, pesoActualKg: number) {
  if (
    !profile.sexo ||
    !profile.altura_cm ||
    !profile.fecha_nacimiento ||
    !profile.nivel_actividad_base
  ) {
    return null
  }

  const bmr = calcularBMR(profile.sexo, pesoActualKg, profile.altura_cm, profile.fecha_nacimiento)
  const tdee = calcularTDEE(bmr, profile.nivel_actividad_base)

  const deficitObjetivo = 400
  const kcalObjetivo = tdee - deficitObjetivo

  const pesoObjetivo = profile.objetivo_peso_kg ?? pesoActualKg
  const proteinaObjetivo = Math.round(pesoObjetivo * 1.8)

  return {
    bmr: Math.round(bmr),
    tdee,
    deficitObjetivo,
    kcalObjetivo,
    proteinaObjetivo,
  }
}
