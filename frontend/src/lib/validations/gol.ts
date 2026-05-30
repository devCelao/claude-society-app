import { z } from 'zod'

export const GolSchema = z.object({
  // TODO: implementar campos conforme arquitetura
})

export type GolInput = z.infer<typeof GolSchema>
