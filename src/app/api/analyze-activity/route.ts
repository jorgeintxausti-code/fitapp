import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { PEAT_ACTIVITY_SYSTEM_PROMPT } from '@/lib/prompts'

const ActivitySchema = z.object({
  kcal_estimadas: z.number(),
  desglose: z.object({
    actividad: z.string(),
    duracion_min: z.number(),
    met: z.number(),
    notas: z.string().optional(),
  }),
})

export type ActivityAnalysis = z.infer<typeof ActivitySchema>

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

    const { texto, peso_kg } = await req.json() as { texto: string; peso_kg: number }
    if (!texto) return NextResponse.json({ error: 'Falta descripción' }, { status: 400 })

    const anthropic = new Anthropic({ apiKey })
    const prompt = `Peso del usuario: ${peso_kg} kg\n\nActividad: ${texto}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: PEAT_ACTIVITY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON en la respuesta')

    const parsed = ActivitySchema.parse(JSON.parse(match[0]))
    return NextResponse.json(parsed)
  } catch (e) {
    console.error('[analyze-activity]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
