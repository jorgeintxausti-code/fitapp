import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { PEAT_RECOMMEND_SYSTEM_PROMPT } from '@/lib/prompts'

const RecommendSchema = z.object({
  sugerencias: z.array(z.object({
    nombre: z.string(),
    descripcion: z.string(),
    kcal_aprox: z.number(),
    proteina_aprox: z.number(),
    peat_razon: z.string(),
  })).length(3),
})

export type RecommendResult = z.infer<typeof RecommendSchema>

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

    const { kcalRestantes, proteinaRestante, tipoComida, comidaHoy } = await req.json() as {
      kcalRestantes: number
      proteinaRestante: number
      tipoComida: string
      comidaHoy: string[]
    }

    const prompt = [
      `Momento del día: ${tipoComida}`,
      `Calorías restantes del objetivo: ${Math.round(kcalRestantes)} kcal`,
      `Proteína restante del objetivo: ${Math.round(proteinaRestante)}g`,
      comidaHoy.length
        ? `Ya ha comido hoy: ${comidaHoy.slice(0, 5).join(' / ')}`
        : 'Aún no ha comido nada hoy',
    ].join('\n')

    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: PEAT_RECOMMEND_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON en la respuesta')

    const parsed = RecommendSchema.parse(JSON.parse(match[0]))
    return NextResponse.json(parsed)
  } catch (e) {
    console.error('[recommend]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
