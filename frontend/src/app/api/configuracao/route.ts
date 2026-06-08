import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const ConfigSchema = z.object({
  diaDeCorte: z
    .number()
    .int()
    .min(1)
    .max(31)
    .nullable()
    .optional(),
})

function serialize(c: { diaDeCorte: number | null } | null) {
  return { diaDeCorte: c?.diaDeCorte ?? null }
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

    const { diaDeCorte } = result.data
    const config = await prisma.configuracaoJogos.upsert({
      where: { id: 1 },
      create: { id: 1, diaDeCorte: diaDeCorte ?? null },
      update: { diaDeCorte: diaDeCorte !== undefined ? (diaDeCorte ?? null) : undefined },
    })

    return NextResponse.json(serialize(config))
  } catch (error) {
    console.error('[PATCH /api/configuracao]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
