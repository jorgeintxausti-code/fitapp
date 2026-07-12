import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { PEAT_MEAL_SYSTEM_PROMPT } from '@/lib/prompts'

const MealSchema = z.object({
  kcal: z.number(),
  proteina_g: z.number(),
  carbohidratos_g: z.number(),
  grasa_g: z.number(),
  pufa_g: z.number(),
  calcio_mg: z.number(),
  fosforo_mg: z.number(),
  peat_score: z.number().int().min(0).max(10),
  peat_comentario: z.string(),
  desglose: z.array(z.object({
    alimento: z.string(),
    cantidad: z.string(),
    kcal: z.number(),
    proteina_g: z.number(),
  })),
})

export type MealAnalysis = z.infer<typeof MealSchema>

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in response')
  return match[0]
}

async function callClaude(
  anthropic: Anthropic,
  messages: Anthropic.MessageParam[]
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: PEAT_MEAL_SYSTEM_PROMPT,
    messages,
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key de IA no configurada en el servidor' }, { status: 500 })
    }

    const { texto, fotoBase64, fotoMimeType } = await req.json() as {
      texto?: string
      fotoBase64?: string
      fotoMimeType?: string
    }

    if (!texto && !fotoBase64) {
      return NextResponse.json({ error: 'Falta texto o foto' }, { status: 400 })
    }

    const content: Anthropic.MessageParam['content'] = []

    if (fotoBase64) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: (fotoMimeType ?? 'image/jpeg') as Anthropic.Base64ImageSource['media_type'],
          data: fotoBase64,
        },
      })
    }

    content.push({
      type: 'text',
      text: texto || 'Analiza los alimentos de la imagen',
    })

    const anthropic = new Anthropic({ apiKey })
    const userMessage: Anthropic.MessageParam = { role: 'user', content }

    let rawText = await callClaude(anthropic, [userMessage])

    try {
      const parsed = MealSchema.parse(JSON.parse(extractJSON(rawText)))
      return NextResponse.json(parsed)
    } catch {
      rawText = await callClaude(anthropic, [
        userMessage,
        { role: 'assistant', content: rawText },
        { role: 'user', content: 'Responde ÚNICAMENTE con el JSON válido, sin texto adicional.' },
      ])
      try {
        const parsed = MealSchema.parse(JSON.parse(extractJSON(rawText)))
        return NextResponse.json(parsed)
      } catch (e) {
        return NextResponse.json(
          { error: 'No se pudo analizar la respuesta', detail: String(e) },
          { status: 502 }
        )
      }
    }
  } catch (e) {
    console.error('[analyze-meal]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
