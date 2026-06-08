import { z } from 'zod'

export const CicloSchema = z.object({
  diaDeCorte: z
    .number({ error: 'Dia de corte e obrigatorio' })
    .int()
    .min(1)
    .max(31),
  mesReferencia: z
    .string({ error: 'Mes de referencia e obrigatorio' })
    .regex(/^\d{4}-\d{2}$/, 'Formato invalido (AAAA-MM)'),
})

export const CicloUpdateSchema = CicloSchema.partial()

export type CicloInput = z.infer<typeof CicloSchema>
export type CicloUpdateInput = z.infer<typeof CicloUpdateSchema>

export function nomeDoCiclo(inicioEm: string | Date): string {
  const data = typeof inicioEm === 'string' ? new Date(inicioEm + 'T12:00:00') : inicioEm
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
