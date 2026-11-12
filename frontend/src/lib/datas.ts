// Fuso oficial do grupo. O servidor (container) roda em UTC, entao "hoje" NUNCA deve
// vir de new Date() + setHours: um confronto iniciado apos 21h de quinta (Brasilia)
// ja e sexta em UTC.
export const FUSO_GRUPO = 'America/Sao_Paulo'

// Data de hoje no fuso do grupo, como Date ao meio-dia UTC.
// Meio-dia UTC garante que @db.Date e toISOString().slice(0, 10) gravem/leiam o dia certo.
export function hojeNoFuso(agora: Date = new Date()): Date {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_GRUPO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora)
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value)
  return new Date(Date.UTC(valor('year'), valor('month') - 1, valor('day'), 12, 0, 0, 0))
}
