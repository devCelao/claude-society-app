import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calcularPeriodoCiclo } from '@/lib/utils'
import { nomeDoCiclo } from '@/lib/validations/ciclo'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const diaId = parseInt(id, 10)

    const dia = await prisma.diaDeJogo.findUnique({
      where: { id: diaId },
      include: {
        times: { orderBy: { id: 'asc' }, take: 2 },
        _count: { select: { times: true } },
      },
    })

    if (!dia) return NextResponse.json({ error: 'Dia de jogo nao encontrado' }, { status: 404 })
    if (dia.status !== 'PENDENTE') return NextResponse.json({ error: 'Confronto ja iniciado' }, { status: 400 })
    if (dia._count.times < 3) return NextResponse.json({ error: 'Times ainda nao formados' }, { status: 400 })

    let body: { confirmar?: boolean } = {}
    try { body = await request.json() } catch { /* body vazio OK */ }

    const hoje = new Date()
    hoje.setHours(12, 0, 0, 0)

    const config = await prisma.configuracaoJogos.findUnique({ where: { id: 1 } })
    const temConfig = config?.diaDeCorte != null

    if (!temConfig && !body.confirmar) {
      return NextResponse.json(
        {
          precisaConfirmar: true,
          dataInicio: hoje.toISOString().split('T')[0],
          mensagem: 'Nenhum dia de corte configurado. O ciclo sera criado com inicio hoje e sem data de encerramento.',
        },
        { status: 200 }
      )
    }

    let cicloInicio: Date
    let cicloFim: Date | null
    let diaDeCorteUsado: number | null = null

    if (temConfig) {
      const diaDeCorte = config!.diaDeCorte!
      diaDeCorteUsado = diaDeCorte

      // Determina em qual ciclo hoje se encaixa
      const diaHoje = hoje.getDate()
      const mesHoje = hoje.getMonth() + 1
      const anoHoje = hoje.getFullYear()

      // Se ainda não chegou ao dia de corte deste mês, estamos no ciclo do mês anterior
      const mes = diaHoje >= diaDeCorte ? mesHoje : (mesHoje === 1 ? 12 : mesHoje - 1)
      const ano = diaHoje >= diaDeCorte ? anoHoje : (mesHoje === 1 ? anoHoje - 1 : anoHoje)

      const { inicioEm, fimEm } = calcularPeriodoCiclo(diaDeCorte, mes, ano)
      cicloInicio = inicioEm
      cicloFim = fimEm
    } else {
      cicloInicio = hoje
      cicloFim = null
    }

    const ciclo = await prisma.$transaction(async (tx) => {
      // Busca ciclo existente com mesmo início
      const existente = await tx.ciclo.findFirst({
        where: { inicioEm: cicloInicio },
        orderBy: { id: 'desc' },
      })
      if (existente) return existente

      // Fecha ciclo aberto anterior se existir e o novo tiver fim definido
      const aberto = await tx.ciclo.findFirst({
        where: { fimEm: null },
        orderBy: { inicioEm: 'desc' },
      })
      if (aberto && cicloFim) {
        const fimAnterior = new Date(cicloInicio)
        fimAnterior.setDate(fimAnterior.getDate() - 1)
        await tx.ciclo.update({ where: { id: aberto.id }, data: { fimEm: fimAnterior } })
      }

      return tx.ciclo.create({
        data: {
          nome: nomeDoCiclo(cicloInicio),
          diaDeCorte: diaDeCorteUsado,
          inicioEm: cicloInicio,
          fimEm: cicloFim,
        },
      })
    })

    await prisma.diaDeJogo.update({
      where: { id: diaId },
      data: {
        data: hoje,
        cicloId: ciclo.id,
        status: 'EM_ANDAMENTO',
        passo: 'principal',
      },
    })

    return NextResponse.json({
      diaId,
      data: hoje.toISOString().split('T')[0],
      cicloNome: ciclo.nome,
    })
  } catch (error) {
    console.error('[POST /api/dias-de-jogo/:id/iniciar]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
