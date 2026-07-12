# App Fit

App web personal, mobile-first, para seguimiento de calorías y proteínas con criterio Ray Peat.

## Stack

- **Frontend:** Next.js 16 (App Router, TypeScript, Tailwind v4)
- **Backend:** Supabase (Postgres + Auth + Storage)
- **IA:** Claude API (`claude-sonnet-4-6` para análisis de ingestas y recomendaciones)
- **Deploy:** Vercel

## Setup inicial

### 1. Variables de entorno

```bash
cp .env.example .env.local
```

Rellena los valores en `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Panel de Supabase → Settings → API
- `ANTHROPIC_API_KEY`: console.anthropic.com → Settings → API Keys
- `NEXT_PUBLIC_SITE_URL`: URL de producción (en Vercel, añade también como env var)

### 2. Supabase: crear proyecto y aplicar migración

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/migrations/001_initial_schema.sql`
3. En el mismo SQL Editor, añade tu email a la allowlist:
   ```sql
   insert into public.allowed_emails (email) values ('tu@email.com');
   ```
4. Configura **Auth → URL Configuration**:
   - Site URL: `https://tu-dominio.vercel.app`
   - Redirect URLs: `https://tu-dominio.vercel.app/auth/callback`
   - Para desarrollo añade también: `http://localhost:3000/auth/callback`
5. En **Auth → Providers → Email**: activa "Magic Link" y desactiva "Confirm email" si quieres login inmediato.

### 3. Restricción de acceso (allowlist)

El esquema incluye la tabla `allowed_emails`. El mecanismo más sencillo para bloquear signups no autorizados en Supabase es:

- **Opción A (recomendada para uso personal):** En Supabase Dashboard → Authentication → Settings, deshabilita "Enable sign ups". Los usuarios ya registrados pueden seguir usando magic link; los nuevos solo si los invitas manualmente desde el panel.
- **Opción B:** Usar la función `check_allowed_email` del SQL como hook de auth en Supabase (Auth → Hooks). Requiere plan Pro.

Para este proyecto de uso personal, la Opción A es suficiente: desactiva signups tras registrarte por primera vez.

### 4. Instalación y desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura del proyecto

```
src/
  app/
    (auth)/login/          # Página de login con magic link
    (auth)/auth/callback/  # Callback de OAuth/magic link
    (app)/                 # Rutas protegidas (dashboard, tendencias, ajustes)
    api/
      analyze-meal/        # POST: analiza texto/foto con Claude
      analyze-activity/    # POST: estima kcal de actividad con Claude
      recommend/           # POST: sugerencias de comida Peat con Claude
  lib/
    supabase/              # Clientes browser/server/middleware
    bmr.ts                 # Cálculo Mifflin-St Jeor + TDEE
    utils.ts               # Helpers UI (colores Peat, fechas, cn)
  types/
    database.ts            # Tipos TypeScript del esquema Supabase
supabase/
  migrations/              # SQL migrations
```

## Decisiones técnicas

- **Gráficas:** Recharts. Alternativa considerada: Visx (más flexible pero más compleja). Recharts tiene mejor DX y soporte para responsive en móvil.
- **Iconos:** Lucide React. Conjunto completo, tree-shakeable, alineado con el estilo de la app.
- **Fechas:** date-fns. Ligero, modular, sin mutación.
- **PWA:** `next-pwa` v5 tiene problemas con Next.js 15+. Se configurará en Fase 9 usando `@ducanh2912/next-pwa` o mediante `next.config.ts` con service worker personalizado.
- **Multi-tenant:** Todas las tablas tienen `user_id` con RLS. Añadir un segundo usuario no requiere ninguna migración; basta añadir su email a `allowed_emails` y reactivar signups temporalmente.
- **PUFA tracking:** Campo `pufa_g` en meals estimado por Claude según la descripción del alimento. Es una estimación, no un valor exacto.

## Fases de desarrollo

- [x] Fase 1: Scaffold, estructura, Supabase client, variables de entorno
- [ ] Fase 2: Migraciones SQL, RLS, Storage, Auth magic link
- [ ] Fase 3: Onboarding y perfil con cálculo BMR/TDEE
- [ ] Fase 4: `analyze-meal` + flujo de registro por texto
- [ ] Fase 5: Foto, voz, comidas guardadas
- [ ] Fase 6: Actividades, peso, dashboard diario
- [ ] Fase 7: Tendencias con gráficas
- [ ] Fase 8: Recomendador Peat
- [ ] Fase 9: PWA, pulido móvil, deploy Vercel

## Deploy en Vercel

1. Conecta el repositorio GitHub en [vercel.com](https://vercel.com)
2. Añade las variables de entorno en el panel de Vercel
3. El deploy es automático en cada push a `main`
