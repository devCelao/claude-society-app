import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PosicaoSchema } from '@/lib/validations/posicao'

export async function GET(req: NextRequest) {
  try {
    const apenasAtivas = req.nextUrl.searchParams.get('apenasAtivas') === 'true'

    const posicoes = await prisma.posicao.findMany({
      where: apenasAtivas ? { ativo: true } : {},
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    })

    return NextResponse.json(posicoes)
  } catch (error) {
    console.error('[GET /api/configuracao/posicoes]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = PosicaoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', detalhes: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { nome, sigla, cor, ativo, ordem } = parsed.data

    const jaExiste = await prisma.posicao.findUnique({ where: { nome } })
    if (jaExiste) {
      return NextResponse.json({ error: 'Ja existe uma posicao com esse nome' }, { status: 400 })
    }

    // ordem: se nao informada, vai para o fim da lista
    let ordemFinal = ordem
    if (ordemFinal == null) {
      const ultima = await prisma.posicao.findFirst({ orderBy: { ordem: 'desc' } })
      ordemFinal = (ultima?.ordem ?? 0) + 1
    }

    const posicao = await prisma.posicao.create({
      data: { nome, sigla, cor, ativo: ativo ?? true, ordem: ordemFinal },
    })

    return NextResponse.json(posicao, { status: 201 })
  } catch (error) {
    console.error('[POST /api/configuracao/posicoes]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
