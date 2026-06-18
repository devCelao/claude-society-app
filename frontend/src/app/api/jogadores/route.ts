import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { JogadorSchema } from '@/lib/validations/jogador'

export async function GET(req: NextRequest) {
  try {
    const incluirSuspensos = req.nextUrl.searchParams.get('incluirSuspensos') === 'true'

    const jogadores = await prisma.jogador.findMany({
      where: incluirSuspensos ? {} : { deletedAt: null },
      orderBy: { nome: 'asc' },
      include: {
        posicaoPrimaria: { select: { id: true, nome: true, sigla: true, cor: true } },
        posicaoSecundaria: { select: { id: true, nome: true, sigla: true, cor: true } },
      },
    })

    return NextResponse.json(jogadores)
  } catch (error) {
    console.error('[GET /api/jogadores]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = JogadorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', detalhes: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const jogador = await prisma.jogador.create({ data: parsed.data })
    return NextResponse.json(jogador, { status: 201 })
  } catch (error) {
    console.error('[POST /api/jogadores]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
