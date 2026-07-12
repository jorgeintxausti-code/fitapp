export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type NivelActividad = 'sedentario' | 'ligero' | 'moderado'
export type TipoComida = 'desayuno' | 'comida' | 'cena' | 'snack'
export type Sexo = 'masculino' | 'femenino'

export interface DesglosAlimento {
  alimento: string
  cantidad: string
  kcal: number
  proteina_g: number
}

export interface Profile {
  user_id: string
  nombre: string | null
  sexo: Sexo | null
  fecha_nacimiento: string | null
  altura_cm: number | null
  peso_inicial_kg: number | null
  objetivo_peso_kg: number | null
  nivel_actividad_base: NivelActividad | null
  deficit_objetivo_kcal: number
  proteina_objetivo_g: number | null
  timezone: string
  created_at: string
}

export interface Meal {
  id: string
  user_id: string
  eaten_at: string
  tipo: TipoComida
  descripcion_original: string | null
  foto_url: string | null
  kcal: number
  proteina_g: number
  carbohidratos_g: number
  grasa_g: number
  pufa_g: number
  calcio_mg: number
  fosforo_mg: number
  peat_score: number
  peat_comentario: string | null
  desglose: DesglosAlimento[] | null
  saved_meal_id: string | null
  created_at: string
}

export interface SavedMeal {
  id: string
  user_id: string
  nombre: string
  tipo: TipoComida
  kcal: number
  proteina_g: number
  carbohidratos_g: number
  grasa_g: number
  pufa_g: number
  calcio_mg: number
  fosforo_mg: number
  peat_score: number
  peat_comentario: string | null
  desglose: DesglosAlimento[] | null
  veces_usada: number
  ultima_vez: string | null
  created_at: string
}

export interface Activity {
  id: string
  user_id: string
  fecha: string
  descripcion: string
  kcal_estimadas: number
  desglose_claude: Json | null
  created_at: string
}

export interface Weight {
  id: string
  user_id: string
  fecha: string
  peso_kg: number
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'user_id' | 'created_at'>>
      }
      meals: {
        Row: Meal
        Insert: Omit<Meal, 'id' | 'created_at'>
        Update: Partial<Omit<Meal, 'id' | 'user_id' | 'created_at'>>
      }
      saved_meals: {
        Row: SavedMeal
        Insert: Omit<SavedMeal, 'id' | 'created_at'>
        Update: Partial<Omit<SavedMeal, 'id' | 'user_id' | 'created_at'>>
      }
      activities: {
        Row: Activity
        Insert: Omit<Activity, 'id' | 'created_at'>
        Update: Partial<Omit<Activity, 'id' | 'user_id' | 'created_at'>>
      }
      weights: {
        Row: Weight
        Insert: Omit<Weight, 'id'>
        Update: Partial<Omit<Weight, 'id' | 'user_id'>>
      }
    }
  }
}
