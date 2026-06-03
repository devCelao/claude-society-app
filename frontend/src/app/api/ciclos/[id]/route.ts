import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CicloUpdateSchema, nomeDoCiclo } from '@/lib/validations/ciclo'

export type StatJogador = {
  posicao: number
  nome: string
  valor: number
  vitorias: number
  pontos: number
}

export type CicloStats = {
  ciclo: { id: number; nome: string; inicioEm: string; fimEm: string | null }
  artilharia: StatJogador[]
  passes: StatJogador[]
  fotos: StatJogador[]
}

type RawGolStat = { id: bigint; nome: string; valor: bigint }

async function vitoriasPorJogador(cicloId: number): Promise<Map<number, number>> {
  const rows = await prisma.$queryRaw<{ jogador_id: bigint; v: bigint }[]>`
    SELECT jt.jogador_id, COUNT(DISTINCT p.id) AS v
    FROM jogador_time jt
    JOIN times t       ON jt.time_id         = t.id
    JOIN partidas p    ON p.vencedor_id       = t.id
    JOIN dias_de_jogo d ON p.dia_de_jogo_id  = d.id
    WHERE d.ciclo_id = ${cicloId}
    GROUP BY jt.jogador_id
  `
  const map = new Map<number, number>()
  for (const r of rows) map.set(Number(r.jogador_id), Number(r.v))
  return map
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cicloId = parseInt(id, 10)

    const ciclo = await prisma.ciclo.findUnique({
      where: { id: cicloId },
      select: { id: true, nome: true, inicioEm: true, fimEm: true },
    })
    if (!ciclo) return NextResponse.json({ error: 'Ciclo nao encontrado' }, { status: 404 })

    const vMap = await vitoriasPorJogador(cicloId)

    const rawArtilharia = await prisma.$queryRaw<RawGolStat[]>`
      SELECT j.id, j.nome, COUNT(g.id) AS valor
      FROM gols g
      JOIN partidas p     ON g.partida_id       = p.id
      JOIN dias_de_jogo d ON p.dia_de_jogo_id   = d.id
      JOIN jogadores j    ON g.jogador_id        = j.id
      WHERE d.ciclo_id = ${cicloId}
      GROUP BY j.id, j.nome
      ORDER BY valor DESC
      LIMIT 10
    `

    const rawPasses = await prisma.$queryRaw<RawGolStat[]>`
      SELECT j.id, j.nome, COUNT(a.id) AS valor
      FROM assistencias a
      JOIN gols g         ON a.gol_id            = g.id
      JOIN partidas p     ON g.partida_id         = p.id
      JOIN dias_de_jogo d ON p.dia_de_jogo_id     = d.id
      JOIN jogadores j    ON a.jogador_id          = j.id
      WHERE d.ciclo_id = ${cicloId}
      GROUP BY j.id, j.nome
      ORDER BY valor DESC
      LIMIT 10
    `

    const rawFotos = await prisma.$queryRaw<RawGolStat[]>`
      SELECT j.id, j.nome, COUNT(DISTINCT p.id) AS valor
      FROM jogador_time jt
      JOIN times t       ON jt.time_id          = t.id
      JOIN partidas p    ON p.vencedor_id        = t.id
      JOIN dias_de_jogo d ON p.dia_de_jogo_id   = d.id
      JOIN jogadores j   ON jt.jogador_id        = j.id
      WHERE d.ciclo_id = ${cicloId}
      GROUP BY j.id, j.nome
      ORDER BY valor DESC
      LIMIT 10
    `

    const withVitorias = (rows: RawGolStat[]): StatJogador[] =>
      rows.map((r, i) => {
        const v = vMap.get(Number(r.id)) ?? 0
        return { posicao: i + 1, nome: r.nome, valor: Number(r.valor), vitorias: v, pontos: v * 3 }
      })

    const fotos: StatJogador[] = rawFotos.map((r, i) => {
      const v = Number(r.valor)
      return { posicao: i + 1, nome: r.nome, valor: v, vitorias: v, pontos: v * 3 }
    })

    const data: CicloStats = {
      ciclo: {
        id: ciclo.id,
        nome: ciclo.nome,
        inicioEm: ciclo.inicioEm.toISOString().split('T')[0],
        fimEm: ciclo.fimEm ? ciclo.fimEm.toISOString().split('T')[0] : null,
      },
      artilharia: withVitorias(rawArtilharia),
      passes: withVitorias(rawPasses),
      fotos,
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[GET /api/ciclos/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cicloId = parseInt(id, 10)
    const body = await request.json()
    const result = CicloUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: result.error.flatten() }, { status: 422 })
    }

    const ciclo = await prisma.ciclo.findUnique({ where: { id: cicloId } })
    if (!ciclo) return NextResponse.json({ error: 'Ciclo nao encontrado' }, { status: 404 })

    const { inicioEm, fimEm } = result.data
    const atualizado = await prisma.ciclo.update({
      where: { id: cicloId },
      data: {
        ...(inicioEm && { nome: nomeDoCiclo(inicioEm), inicioEm: new Date(inicioEm + 'T12:00:00') }),
        ...(fimEm !== undefined && { fimEm: fimEm ? new Date(fimEm + 'T12:00:00') : null }),
      },
    })

    return NextResponse.json({
      id: atualizado.id,
      nome: atualizado.nome,
      inicioEm: atualizado.inicioEm.toISOString().split('T')[0],
      fimEm: atualizado.fimEm ? atualizado.fimEm.toISOString().split('T')[0] : null,
    })
  } catch (error) {
    console.error('[PATCH /api/ciclos/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cicloId = parseInt(id, 10)

    const ciclo = await prisma.ciclo.findUnique({
      where: { id: cicloId },
      include: { _count: { select: { diasDeJogo: true } } },
    })
    if (!ciclo) return NextResponse.json({ error: 'Ciclo nao encontrado' }, { status: 404 })

    const eAtivo = ciclo.fimEm === null
    const temJogos = ciclo._count.diasDeJogo > 0

    // Regra: só permite excluir ciclo ativo OU ciclo sem jogos
    if (!eAtivo && temJogos) {
      return NextResponse.json({ error: 'Ciclo encerrado com jogos nao pode ser excluido' }, { status: 400 })
    }

    // Ciclo com jogos precisa de destino para transferência
    let body: { destinoCicloId?: number } = {}
    try { body = await request.json() } catch { /* body vazio é válido para ciclos sem jogos */ }

    if (temJogos && !body.destinoCicloId) {
      return NextResponse.json(
        { error: 'ciclo_tem_jogos', count: ciclo._count.diasDeJogo },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Transferir dias de jogo para o destino
      if (temJogos && body.destinoCicloId) {
        const destino = await tx.ciclo.findUnique({ where: { id: body.destinoCicloId } })
        if (!destino) throw new Error('Ciclo destino nao encontrado')
        await tx.diaDeJogo.updateMany({
          where: { cicloId },
          data: { cicloId: body.destinoCicloId },
        })
      }

      // Se era o ciclo ativo, reabre o anterior (mais recente com fimEm preenchido)
      if (eAtivo) {
        const anterior = await tx.ciclo.findFirst({
          where: { id: { not: cicloId }, fimEm: { not: null } },
          orderBy: { inicioEm: 'desc' },
        })
        if (anterior) {
          await tx.ciclo.update({ where: { id: anterior.id }, data: { fimEm: null } })
        }
      }

      await tx.ciclo.delete({ where: { id: cicloId } })
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[DELETE /api/ciclos/:id]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
