import { z } from 'zod'

export const PartidaSchema = z.object({
  // TODO: implementar campos conforme arquitetura
})

export type PartidaInput = z.infer<typeof PartidaSchema>
