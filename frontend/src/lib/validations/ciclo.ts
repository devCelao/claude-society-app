import { z } from 'zod'

export const CicloSchema = z.object({
  inicioEm: z
    .string({ error: 'Data de inicio e obrigatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida'),
  fimEm: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida')
    .nullable()
    .optional(),
})

export const CicloUpdateSchema = CicloSchema.partial()

export type CicloInput = z.infer<typeof CicloSchema>
export type CicloUpdateInput = z.infer<typeof CicloUpdateSchema>

export function nomeDoCiclo(inicioEm: string | Date): string {
  const data = typeof inicioEm === 'string' ? new Date(inicioEm + 'T12:00:00') : inicioEm
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
