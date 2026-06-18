import { z } from 'zod'

export const JogadorSchema = z.object({
  nome: z
    .string({ error: 'Nome e obrigatorio' })
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  apelido: z
    .string()
    .max(50, 'Apelido deve ter no maximo 50 caracteres')
    .optional()
    .nullable(),
  posicaoPrimariaId: z.number().int().positive().optional().nullable(),
  posicaoSecundariaId: z.number().int().positive().optional().nullable(),
  convidado: z.boolean(),
})

export const JogadorUpdateSchema = JogadorSchema.partial()

export const JogadorReativarSchema = z.object({
  deletedAt: z.null(),
})

export type JogadorInput = z.infer<typeof JogadorSchema>
export type JogadorUpdateInput = z.infer<typeof JogadorUpdateSchema>
