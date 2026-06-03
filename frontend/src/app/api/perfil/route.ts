import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PerfilSchema } from '@/lib/validations/perfil'

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = PerfilSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 })
    }

    const { name, senhaAtual, novaSenha } = parsed.data

    const usuario = await prisma.usuario.findUnique({
      where: { username: session.user.email! },
    })
    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.passwordHash)
    if (!senhaValida) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    }

    const dados: { name: string; passwordHash?: string } = { name }
    if (novaSenha) {
      dados.passwordHash = await bcrypt.hash(novaSenha, 10)
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: dados,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PATCH /api/perfil]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
