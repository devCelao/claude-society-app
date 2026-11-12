import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { Prisma } from '@/generated/prisma/client'
import { AjusteCicloSchema, type AjusteCicloData } from '@/lib/validations/ciclo'
import { recalcularPeriodo } from '@/lib/ciclos/periodo'
import { hojeNoFuso } from '@/lib/datas'

// Ajuste de ciclo (regras em docs/arquitetura/arquitetura-database.md — "Ajuste de ciclos"):
// renomeia, move confrontos escolhidos para outro ciclo (existente ou criado agora, que nasce
// encerrado) e, se pedido, exclui o ciclo que ficou sem confrontos.
// O ciclo atual e definido a parte: POST /api/ciclos/[id]/atual.
// Datas sempre recalculadas pelos confrontos. confirmar=false gera a previa
// executando a mesma transacao e desfazendo no final.

export type CicloAjustado = {
  id: number
  nome: string
  inicioEm: string
  fimEm: string | null
  confrontos: number
  situacao: 'novo' | 'alterado' | 'excluido'
}

export type ResultadoAjuste = {
  ciclos: CicloAjustado[]
  movidos: number
  cicloVazio: boolean // ciclo editado ficou sem confrontos
  cicloId: number // ciclo para exibir depois (o destino, se o editado foi excluido)
}

class RegraViolada extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

// Usado para desfazer a transacao da previa carregando o resultado
class Previa extends Error {
  constructor(public resultado: ResultadoAjuste) { super('previa') }
}

const texto = (d: Date) => d.toISOString().slice(0, 10)

async function ajustar(tx: Prisma.TransactionClient, d: AjusteCicloData): Promise<ResultadoAjuste> {
  const ciclo = await tx.ciclo.findUnique({ where: { id: d.cicloId } })
  if (!ciclo) throw new RegraViolada('Ciclo não encontrado', 404)

  const antes = new Map((await tx.ciclo.findMany()).map((c) => [c.id, c]))
  const afetados = new Set<number>([d.cicloId])
  let destinoId: number | null = null

  if (ciclo.nome !== d.nome) {
    await tx.ciclo.update({ where: { id: d.cicloId }, data: { nome: d.nome } })
  }

  if (d.mover) {
    const dias = await tx.diaDeJogo.findMany({
      where: { id: { in: d.mover.diaIds } },
      select: { id: true, cicloId: true, data: true },
    })
    if (dias.length !== d.mover.diaIds.length || dias.some((dia) => dia.cicloId !== d.cicloId)) {
      throw new RegraViolada('Só é possível mover confrontos do ciclo que está sendo editado')
    }

    if (d.mover.novoCicloNome) {
      const primeiraData = dias.map((dia) => dia.data).filter((x): x is Date => !!x).sort((a, b) => +a - +b)[0]
      const inicio = primeiraData ?? hojeNoFuso()
      const criado = await tx.ciclo.create({
        data: { nome: d.mover.novoCicloNome, inicioEm: inicio, fimEm: inicio },
      })
      destinoId = criado.id
    } else {
      destinoId = d.mover.destinoCicloId!
      if (destinoId === d.cicloId) throw new RegraViolada('O ciclo de destino deve ser diferente do ciclo editado')
      if (!antes.has(destinoId)) throw new RegraViolada('Ciclo de destino não encontrado', 404)
    }

    await tx.diaDeJogo.updateMany({ where: { id: { in: d.mover.diaIds } }, data: { cicloId: destinoId } })
    afetados.add(destinoId)
  }

  for (const id of Array.from(afetados)) await recalcularPeriodo(tx, id)

  const restantes = await tx.diaDeJogo.count({ where: { cicloId: d.cicloId } })
  const cicloVazio = restantes === 0
  let excluido = false
  if (d.excluirVazio) {
    if (!cicloVazio) throw new RegraViolada('O ciclo só pode ser excluído se ficar sem confrontos')
    if (ciclo.fimEm === null) throw new RegraViolada('O ciclo atual não pode ser excluído')
    await tx.ciclo.delete({ where: { id: d.cicloId } })
    excluido = true
  }

  const depois = await tx.ciclo.findMany({
    where: { id: { in: Array.from(afetados) } },
    include: { _count: { select: { diasDeJogo: true } } },
  })
  const ciclos: CicloAjustado[] = depois.map((c) => {
    const orig = antes.get(c.id)
    return {
      id: c.id,
      nome: c.nome,
      inicioEm: texto(c.inicioEm),
      fimEm: c.fimEm ? texto(c.fimEm) : null,
      confrontos: c._count.diasDeJogo,
      situacao: !orig ? 'novo' : 'alterado',
    }
  })
  if (excluido) {
    ciclos.push({
      id: ciclo.id,
      nome: d.nome,
      inicioEm: texto(ciclo.inicioEm),
      fimEm: ciclo.fimEm ? texto(ciclo.fimEm) : null,
      confrontos: 0,
      situacao: 'excluido',
    })
  }
  ciclos.sort((a, b) => a.inicioEm.localeCompare(b.inicioEm))

  return {
    ciclos,
    movidos: d.mover?.diaIds.length ?? 0,
    cicloVazio,
    cicloId: excluido ? (destinoId ?? d.cicloId) : d.cicloId,
  }
}

export async function POST(request: Request) {
  try {
    const parsed = AjusteCicloSchema.safeParse(await request.json())
    if (!parsed.success) {
      const { formErrors, fieldErrors } = parsed.error.flatten()
      const primeira = formErrors[0] ?? Object.values(fieldErrors).flat()[0] ?? 'Dados inválidos'
      return NextResponse.json({ error: primeira }, { status: 422 })
    }
    const dados = parsed.data

    if (!dados.confirmar) {
      try {
        await prisma.$transaction(async (tx) => {
          throw new Previa(await ajustar(tx, dados))
        })
      } catch (e) {
        if (e instanceof Previa) return NextResponse.json(e.resultado)
        throw e
      }
    }

    const resultado = await prisma.$transaction((tx) => ajustar(tx, dados))
    return NextResponse.json(resultado)
  } catch (error) {
    if (error instanceof RegraViolada) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[POST /api/ciclos/ajustar]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
