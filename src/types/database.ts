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
  carbohidratos_g: number
  grasa_g: number
  pufa_g: number
}

// ─── Application types (used in components) ──────────────────────────────────

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
  desglose: Json | null
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
  desglose: Json | null
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

// ─── Supabase Database type (matches the format @supabase/supabase-js expects) ─

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          nombre: string | null
          sexo: string | null
          fecha_nacimiento: string | null
          altura_cm: number | null
          peso_inicial_kg: number | null
          objetivo_peso_kg: number | null
          nivel_actividad_base: string | null
          deficit_objetivo_kcal: number
          proteina_objetivo_g: number | null
          timezone: string
          created_at: string
        }
        Insert: {
          user_id: string
          nombre?: string | null
          sexo?: string | null
          fecha_nacimiento?: string | null
          altura_cm?: number | null
          peso_inicial_kg?: number | null
          objetivo_peso_kg?: number | null
          nivel_actividad_base?: string | null
          deficit_objetivo_kcal?: number
          proteina_objetivo_g?: number | null
          timezone?: string
          created_at?: string
        }
        Update: {
          nombre?: string | null
          sexo?: string | null
          fecha_nacimiento?: string | null
          altura_cm?: number | null
          peso_inicial_kg?: number | null
          objetivo_peso_kg?: number | null
          nivel_actividad_base?: string | null
          deficit_objetivo_kcal?: number
          proteina_objetivo_g?: number | null
          timezone?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          id: string
          user_id: string
          eaten_at: string
          tipo: string
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
          desglose: Json | null
          saved_meal_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          eaten_at?: string
          tipo?: string
          descripcion_original?: string | null
          foto_url?: string | null
          kcal?: number
          proteina_g?: number
          carbohidratos_g?: number
          grasa_g?: number
          pufa_g?: number
          calcio_mg?: number
          fosforo_mg?: number
          peat_score?: number
          peat_comentario?: string | null
          desglose?: Json | null
          saved_meal_id?: string | null
          created_at?: string
        }
        Update: {
          eaten_at?: string
          tipo?: string
          descripcion_original?: string | null
          foto_url?: string | null
          kcal?: number
          proteina_g?: number
          carbohidratos_g?: number
          grasa_g?: number
          pufa_g?: number
          calcio_mg?: number
          fosforo_mg?: number
          peat_score?: number
          peat_comentario?: string | null
          desglose?: Json | null
          saved_meal_id?: string | null
        }
        Relationships: []
      }
      saved_meals: {
        Row: {
          id: string
          user_id: string
          nombre: string
          tipo: string
          kcal: number
          proteina_g: number
          carbohidratos_g: number
          grasa_g: number
          pufa_g: number
          calcio_mg: number
          fosforo_mg: number
          peat_score: number
          peat_comentario: string | null
          desglose: Json | null
          veces_usada: number
          ultima_vez: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre: string
          tipo?: string
          kcal?: number
          proteina_g?: number
          carbohidratos_g?: number
          grasa_g?: number
          pufa_g?: number
          calcio_mg?: number
          fosforo_mg?: number
          peat_score?: number
          peat_comentario?: string | null
          desglose?: Json | null
          veces_usada?: number
          ultima_vez?: string | null
          created_at?: string
        }
        Update: {
          nombre?: string
          tipo?: string
          kcal?: number
          proteina_g?: number
          carbohidratos_g?: number
          grasa_g?: number
          pufa_g?: number
          calcio_mg?: number
          fosforo_mg?: number
          peat_score?: number
          peat_comentario?: string | null
          desglose?: Json | null
          veces_usada?: number
          ultima_vez?: string | null
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          user_id: string
          fecha: string
          descripcion: string
          kcal_estimadas: number
          desglose_claude: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fecha?: string
          descripcion: string
          kcal_estimadas?: number
          desglose_claude?: Json | null
          created_at?: string
        }
        Update: {
          fecha?: string
          descripcion?: string
          kcal_estimadas?: number
          desglose_claude?: Json | null
        }
        Relationships: []
      }
      weights: {
        Row: {
          id: string
          user_id: string
          fecha: string
          peso_kg: number
        }
        Insert: {
          id?: string
          user_id: string
          fecha?: string
          peso_kg: number
        }
        Update: {
          fecha?: string
          peso_kg?: number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
