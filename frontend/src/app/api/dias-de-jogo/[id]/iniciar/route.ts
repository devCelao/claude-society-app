import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
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

    // Verifica se usuario confirmou iniciar sem configuração
    let body: { confirmar?: boolean } = {}
    try { body = await request.json() } catch { /* body vazio OK */ }

    const hoje = new Date()
    hoje.setHours(12, 0, 0, 0)

    // Busca configuração
    const config = await prisma.configuracaoJogos.findUnique({ where: { id: 1 } })
    const temConfig = config?.corteInicio != null

    // Se não tem config e usuario não confirmou → pede confirmação
    if (!temConfig && !body.confirmar) {
      return NextResponse.json(
        {
          precisaConfirmar: true,
          dataInicio: hoje.toISOString().split('T')[0],
          mensagem: 'Nenhuma data de corte configurada. O ciclo será criado com início hoje e sem data de encerramento.',
        },
        { status: 200 }
      )
    }

    const corteInicio = temConfig ? config!.corteInicio! : hoje
    const corteFim = temConfig ? config!.corteFim : null

    // Busca ou cria ciclo para o período
    const ciclo = await prisma.$transaction(async (tx) => {
      const existente = await tx.ciclo.findFirst({
        where: {
          inicioEm: corteInicio,
          fimEm: corteFim ?? undefined,
        },
      })
      if (existente) return existente

      // Fecha ciclo anterior aberto (se houver)
      const aberto = await tx.ciclo.findFirst({
        where: { fimEm: null },
        orderBy: { inicioEm: 'desc' },
      })
      if (aberto && corteFim) {
        // Fecha o anterior na data de corte do período atual - 1 dia
        const fimAnterior = new Date(corteInicio)
        fimAnterior.setDate(fimAnterior.getDate() - 1)
        await tx.ciclo.update({ where: { id: aberto.id }, data: { fimEm: fimAnterior } })
      }

      return tx.ciclo.create({
        data: {
          nome: nomeDoCiclo(corteInicio),
          inicioEm: corteInicio,
          fimEm: corteFim,
        },
      })
    })

    // Atualiza dia: seta data, ciclo, status
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
