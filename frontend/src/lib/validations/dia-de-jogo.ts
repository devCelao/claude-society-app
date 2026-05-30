import { z } from 'zod'

export const DiaDeJogoSchema = z.object({
  // TODO: implementar campos conforme arquitetura
})

export type DiaDeJogoInput = z.infer<typeof DiaDeJogoSchema>
