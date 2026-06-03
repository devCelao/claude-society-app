import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const ConfigSchema = z.object({
  corteInicio: z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida').nullable().optional()
  ),
  corteFim: z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida').nullable().optional()
  ),
})

function serialize(c: { corteInicio: Date | null; corteFim: Date | null } | null) {
  if (!c) return { corteInicio: null, corteFim: null }
  return {
    corteInicio: c.corteInicio ? c.corteInicio.toISOString().split('T')[0] : null,
    corteFim: c.corteFim ? c.corteFim.toISOString().split('T')[0] : null,
  }
}

export async function GET() {
  try {
    const config = await prisma.configuracaoJogos.findUnique({ where: { id: 1 } })
    return NextResponse.json(serialize(config))
  } catch (error) {
    console.error('[GET /api/configuracao]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const result = ConfigSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const { corteInicio, corteFim } = result.data
    const config = await prisma.configuracaoJogos.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        corteInicio: corteInicio ? new Date(corteInicio + 'T12:00:00') : null,
        corteFim: corteFim ? new Date(corteFim + 'T12:00:00') : null,
      },
      update: {
        corteInicio: corteInicio !== undefined ? (corteInicio ? new Date(corteInicio + 'T12:00:00') : null) : undefined,
        corteFim: corteFim !== undefined ? (corteFim ? new Date(corteFim + 'T12:00:00') : null) : undefined,
      },
    })

    return NextResponse.json(serialize(config))
  } catch (error) {
    console.error('[PATCH /api/configuracao]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
