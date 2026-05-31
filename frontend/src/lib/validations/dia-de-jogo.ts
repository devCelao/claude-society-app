import { z } from 'zod'

export const DiaDeJogoSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida'),
  cicloId: z.number().int().positive('Ciclo obrigatorio'),
})

export const FecharListaSchema = z.object({
  jogadorIds: z
    .array(z.number().int().positive())
    .min(1, 'Selecione ao menos 1 jogador')
    .max(18, 'Maximo de 18 jogadores'),
})

export const MontarTimesSchema = z.object({
  times: z
    .array(
      z.object({
        nome: z.string(),
        cor: z.string(),
        jogadorIds: z.array(z.number().int().positive()),
      })
    )
    .length(3, 'Sao necessarios exatamente 3 times'),
})

export type DiaDeJogoInput = z.infer<typeof DiaDeJogoSchema>
export type FecharListaInput = z.infer<typeof FecharListaSchema>
export type MontarTimesInput = z.infer<typeof MontarTimesSchema>
