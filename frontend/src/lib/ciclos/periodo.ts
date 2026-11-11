import type { Prisma } from '@/generated/prisma/client'

// Periodo do ciclo e derivado dos confrontos vinculados a ele:
//   inicio = data do primeiro confronto; fim = data do ultimo.
// O ciclo atual (fimEm = null) continua em aberto. Ciclo sem confrontos mantem as datas que tinha.
export async function recalcularPeriodo(tx: Prisma.TransactionClient, cicloId: number) {
  const ciclo = await tx.ciclo.findUnique({ where: { id: cicloId }, select: { fimEm: true } })
  if (!ciclo) return

  const { _min, _max } = await tx.diaDeJogo.aggregate({
    where: { cicloId, data: { not: null } },
    _min: { data: true },
    _max: { data: true },
  })
  if (!_min.data || !_max.data) return

  await tx.ciclo.update({
    where: { id: cicloId },
    data: { inicioEm: _min.data, fimEm: ciclo.fimEm === null ? null : _max.data },
  })
}

// Encerra o ciclo: fim = data do ultimo confronto (ou o proprio inicio, se nao houver confrontos)
export async function encerrarCiclo(tx: Prisma.TransactionClient, cicloId: number) {
  const ciclo = await tx.ciclo.findUnique({ where: { id: cicloId }, select: { inicioEm: true } })
  if (!ciclo) return
  await tx.ciclo.update({ where: { id: cicloId }, data: { fimEm: ciclo.inicioEm } })
  await recalcularPeriodo(tx, cicloId)
}
