import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcularPeriodoCiclo(
  diaDeCorte: number,
  mes: number,
  ano: number
): { inicioEm: Date; fimEm: Date } {
  const ultimoDiaMes = new Date(ano, mes, 0).getDate()
  const diaInicio = Math.min(diaDeCorte, ultimoDiaMes)
  const inicioEm = new Date(ano, mes - 1, diaInicio, 12, 0, 0)

  const proxAno = mes === 12 ? ano + 1 : ano
  const proxMes = mes === 12 ? 1 : mes + 1
  const ultimoDiaProxMes = new Date(proxAno, proxMes, 0).getDate()
  const diaProxInicio = Math.min(diaDeCorte, ultimoDiaProxMes)

  // day=0 retorna o último dia do mês anterior — cobre diaDeCorte=1 naturalmente
  const fimEm = new Date(proxAno, proxMes - 1, diaProxInicio - 1, 12, 0, 0)
  // Se diaProxInicio=1: new Date(proxAno, proxMes-1, 0) = último dia de mes ✓

  return { inicioEm, fimEm }
}

export function formatarTempo(ms: number): string {
  const totalSegundos = Math.floor(ms / 1000)
  const minutos = Math.floor(totalSegundos / 60)
  const segundos = totalSegundos % 60
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
}
