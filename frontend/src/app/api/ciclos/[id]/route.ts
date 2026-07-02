import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    // Fotos = dias de jogo em que o jogador esteve no time campeao do dia
    // (time com mais partidas vencidas naquele dia; empate = todos os times
    // empatados contam como campeoes do dia).
    const rawFotos = await prisma.$queryRaw<RawGolStat[]>`
      WITH vitorias_por_time_dia AS (
        SELECT p.dia_de_jogo_id AS dia_id, t.id AS time_id, COUNT(*) AS vitorias
        FROM partidas p
        JOIN times t        ON t.id = p.vencedor_id
        JOIN dias_de_jogo d ON d.id = p.dia_de_jogo_id
        WHERE d.ciclo_id = ${cicloId}
        GROUP BY p.dia_de_jogo_id, t.id
      ),
      campeao_do_dia AS (
        SELECT dia_id, time_id
        FROM (
          SELECT dia_id, time_id,
                 RANK() OVER (PARTITION BY dia_id ORDER BY vitorias DESC) AS posicao
          FROM vitorias_por_time_dia
        ) ranked
        WHERE posicao = 1
      )
      SELECT j.id, j.nome, COUNT(DISTINCT cd.dia_id) AS valor
      FROM campeao_do_dia cd
      JOIN jogador_time jt ON jt.time_id = cd.time_id
      JOIN jogadores j     ON j.id = jt.jogador_id
      GROUP BY j.id, j.nome
      ORDER BY valor DESC
      LIMIT 10
    `

    const withVitorias = (rows: RawGolStat[]): StatJogador[] =>
      rows.map((r, i) => {
        const v = vMap.get(Number(r.id)) ?? 0
        return { posicao: i + 1, nome: r.nome, valor: Number(r.valor), vitorias: v, pontos: v * 3 }
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
      fotos: withVitorias(rawFotos),
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[GET /api/ciclos/:id]', error)
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
