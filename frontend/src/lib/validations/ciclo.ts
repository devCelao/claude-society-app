export function nomeDoCiclo(inicioEm: string | Date): string {
  const data = typeof inicioEm === 'string' ? new Date(inicioEm + 'T12:00:00') : inicioEm
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
