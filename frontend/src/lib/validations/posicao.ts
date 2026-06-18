import { z } from 'zod'

export const PosicaoSchema = z.object({
  nome: z
    .string({ error: 'Nome e obrigatorio' })
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(50, 'Nome deve ter no maximo 50 caracteres'),
  sigla: z
    .string({ error: 'Sigla e obrigatoria' })
    .min(1, 'Sigla e obrigatoria')
    .max(3, 'Sigla deve ter no maximo 3 caracteres'),
  cor: z
    .string({ error: 'Cor e obrigatoria' })
    .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Cor deve ser um hex valido (ex: #f5c400)'),
  ativo: z.boolean().optional(),
  ordem: z.number().int().min(0).optional(),
})

export const PosicaoUpdateSchema = PosicaoSchema.partial()

export type PosicaoInput = z.infer<typeof PosicaoSchema>
export type PosicaoUpdateInput = z.infer<typeof PosicaoUpdateSchema>
