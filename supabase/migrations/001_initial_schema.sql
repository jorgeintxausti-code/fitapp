-- ============================================================
-- App Fit – Esquema inicial
-- ============================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  nombre          text,
  sexo            text check (sexo in ('masculino', 'femenino')),
  fecha_nacimiento date,
  altura_cm       numeric(5,1),
  peso_inicial_kg numeric(5,2),
  objetivo_peso_kg numeric(5,2),
  nivel_actividad_base text check (nivel_actividad_base in ('sedentario', 'ligero', 'moderado')) default 'ligero',
  deficit_objetivo_kcal integer not null default 400,
  proteina_objetivo_g  integer,
  timezone        text not null default 'Europe/Madrid',
  created_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

-- ============================================================
-- SAVED_MEALS (antes que meals por FK)
-- ============================================================
create table if not exists public.saved_meals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  nombre          text not null,
  tipo            text check (tipo in ('desayuno','comida','cena','snack')) default 'comida',
  kcal            numeric(7,1) not null default 0,
  proteina_g      numeric(6,1) not null default 0,
  carbohidratos_g numeric(6,1) not null default 0,
  grasa_g         numeric(6,1) not null default 0,
  pufa_g          numeric(6,1) not null default 0,
  calcio_mg       numeric(7,1) not null default 0,
  fosforo_mg      numeric(7,1) not null default 0,
  peat_score      integer not null default 5 check (peat_score between 0 and 10),
  peat_comentario text,
  desglose        jsonb,
  veces_usada     integer not null default 0,
  ultima_vez      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists saved_meals_user_freq
  on public.saved_meals (user_id, veces_usada desc);

alter table public.saved_meals enable row level security;

create policy "saved_meals_select_own" on public.saved_meals
  for select using (auth.uid() = user_id);

create policy "saved_meals_insert_own" on public.saved_meals
  for insert with check (auth.uid() = user_id);

create policy "saved_meals_update_own" on public.saved_meals
  for update using (auth.uid() = user_id);

create policy "saved_meals_delete_own" on public.saved_meals
  for delete using (auth.uid() = user_id);

-- ============================================================
-- MEALS
-- ============================================================
create table if not exists public.meals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  eaten_at        timestamptz not null default now(),
  tipo            text check (tipo in ('desayuno','comida','cena','snack')) default 'comida',
  descripcion_original text,
  foto_url        text,
  kcal            numeric(7,1) not null default 0,
  proteina_g      numeric(6,1) not null default 0,
  carbohidratos_g numeric(6,1) not null default 0,
  grasa_g         numeric(6,1) not null default 0,
  pufa_g          numeric(6,1) not null default 0,
  calcio_mg       numeric(7,1) not null default 0,
  fosforo_mg      numeric(7,1) not null default 0,
  peat_score      integer not null default 5 check (peat_score between 0 and 10),
  peat_comentario text,
  desglose        jsonb,
  saved_meal_id   uuid references public.saved_meals(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists meals_user_eaten
  on public.meals (user_id, eaten_at desc);

alter table public.meals enable row level security;

create policy "meals_select_own" on public.meals
  for select using (auth.uid() = user_id);

create policy "meals_insert_own" on public.meals
  for insert with check (auth.uid() = user_id);

create policy "meals_update_own" on public.meals
  for update using (auth.uid() = user_id);

create policy "meals_delete_own" on public.meals
  for delete using (auth.uid() = user_id);

-- ============================================================
-- ACTIVITIES
-- ============================================================
create table if not exists public.activities (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  fecha           date not null default current_date,
  descripcion     text not null,
  kcal_estimadas  numeric(7,1) not null default 0,
  desglose_claude jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists activities_user_fecha
  on public.activities (user_id, fecha desc);

alter table public.activities enable row level security;

create policy "activities_select_own" on public.activities
  for select using (auth.uid() = user_id);

create policy "activities_insert_own" on public.activities
  for insert with check (auth.uid() = user_id);

create policy "activities_update_own" on public.activities
  for update using (auth.uid() = user_id);

create policy "activities_delete_own" on public.activities
  for delete using (auth.uid() = user_id);

-- ============================================================
-- WEIGHTS
-- ============================================================
create table if not exists public.weights (
  id       uuid primary key default uuid_generate_v4(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  fecha    date not null default current_date,
  peso_kg  numeric(5,2) not null
);

create index if not exists weights_user_fecha
  on public.weights (user_id, fecha desc);

alter table public.weights enable row level security;

create policy "weights_select_own" on public.weights
  for select using (auth.uid() = user_id);

create policy "weights_insert_own" on public.weights
  for insert with check (auth.uid() = user_id);

create policy "weights_update_own" on public.weights
  for update using (auth.uid() = user_id);

create policy "weights_delete_own" on public.weights
  for delete using (auth.uid() = user_id);

-- ============================================================
-- STORAGE: bucket meal-photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

create policy "meal_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'meal-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "meal_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'meal-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "meal_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'meal-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- ALLOWLIST de emails (para restringir el acceso)
-- ============================================================
create table if not exists public.allowed_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Inserta tu email aquí:
-- insert into public.allowed_emails (email) values ('jorgeintxausti@gmail.com');

-- Hook de auth: bloquea signup si el email no está en la allowlist
-- (se configura en Supabase Dashboard > Auth > Hooks, o con un trigger)
create or replace function public.check_allowed_email()
returns trigger language plpgsql security definer as $$
begin
  if not exists (
    select 1 from public.allowed_emails where email = new.email
  ) then
    raise exception 'Email no autorizado';
  end if;
  return new;
end;
$$;
