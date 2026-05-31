import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { JogadorUpdateSchema } from '@/lib/validations/jogador'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const jogador = await prisma.jogador.findUnique({ where: { id } })
    if (!jogador) {
      return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 })
    }
    return NextResponse.json(jogador)
  } catch (error) {
    console.error('[GET /api/jogadores/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await req.json()

    // Caso de reativacao: corpo contem deletedAt: null
    if ('deletedAt' in body && body.deletedAt === null) {
      const jogador = await prisma.jogador.findUnique({ where: { id } })
      if (!jogador) {
        return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 })
      }
      if (jogador.deletedAt === null) {
        return NextResponse.json({ error: 'Jogador ja esta ativo' }, { status: 400 })
      }
      const reativado = await prisma.jogador.update({
        where: { id },
        data: { deletedAt: null },
      })
      return NextResponse.json(reativado)
    }

    // Caso de edicao de dados
    const parsed = JogadorUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', detalhes: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const jogador = await prisma.jogador.findUnique({ where: { id } })
    if (!jogador) {
      return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 })
    }

    const atualizado = await prisma.jogador.update({
      where: { id },
      data: parsed.data,
    })
    return NextResponse.json(atualizado)
  } catch (error) {
    console.error('[PATCH /api/jogadores/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const jogador = await prisma.jogador.findUnique({ where: { id } })
    if (!jogador) {
      return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 })
    }
    await prisma.jogador.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[DELETE /api/jogadores/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
