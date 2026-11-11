import { z } from 'zod'

export function nomeDoCiclo(inicioEm: string | Date): string {
  const data = typeof inicioEm === 'string' ? new Date(inicioEm + 'T12:00:00') : inicioEm
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

const NomeCicloSchema = z
  .string()
  .trim()
  .min(2, 'Nome deve ter ao menos 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')

// Ajuste de ciclo: renomeia e move confrontos (para ciclo existente ou novo).
// O ciclo atual e definido em acao propria (POST /api/ciclos/[id]/atual).
// As datas dos ciclos nao sao informadas: sao calculadas pelos confrontos (lib/ciclos/periodo.ts).
export const AjusteCicloSchema = z.object({
    cicloId: z.number().int().positive(),
    nome: NomeCicloSchema,
    mover: z
      .object({
        diaIds: z.array(z.number().int().positive()).min(1, 'Selecione ao menos 1 confronto'),
        destinoCicloId: z.number().int().positive().optional(),
        novoCicloNome: NomeCicloSchema.optional(),
      })
      .refine((m) => (m.destinoCicloId === undefined) !== (m.novoCicloNome === undefined), {
        message: 'Escolha um ciclo de destino ou informe o nome do novo ciclo',
      })
      .nullable(),
    excluirVazio: z.boolean().default(false),
    confirmar: z.boolean().default(false), // false = so previa
  })

export type AjusteCicloData = z.infer<typeof AjusteCicloSchema>
