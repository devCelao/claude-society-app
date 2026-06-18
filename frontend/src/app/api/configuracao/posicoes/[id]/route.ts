import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PosicaoUpdateSchema } from '@/lib/validations/posicao'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await req.json()
    const parsed = PosicaoUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', detalhes: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const posicao = await prisma.posicao.findUnique({ where: { id } })
    if (!posicao) {
      return NextResponse.json({ error: 'Posicao nao encontrada' }, { status: 404 })
    }

    // Nome unico: bloquear colisao com outra posicao
    if (parsed.data.nome && parsed.data.nome !== posicao.nome) {
      const colisao = await prisma.posicao.findUnique({ where: { nome: parsed.data.nome } })
      if (colisao) {
        return NextResponse.json({ error: 'Ja existe uma posicao com esse nome' }, { status: 400 })
      }
    }

    const atualizada = await prisma.posicao.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(atualizada)
  } catch (error) {
    console.error('[PATCH /api/configuracao/posicoes/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Soft delete: desativa a posicao (preserva jogadores que ja a utilizam).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const posicao = await prisma.posicao.findUnique({ where: { id } })
    if (!posicao) {
      return NextResponse.json({ error: 'Posicao nao encontrada' }, { status: 404 })
    }

    await prisma.posicao.update({ where: { id }, data: { ativo: false } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[DELETE /api/configuracao/posicoes/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
