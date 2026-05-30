import { z } from 'zod'

export const JogadorSchema = z.object({
  // TODO: implementar campos conforme arquitetura
})

export type JogadorInput = z.infer<typeof JogadorSchema>
