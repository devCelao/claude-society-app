import { z } from 'zod'

export const CicloSchema = z.object({
  // TODO: implementar campos conforme arquitetura
})

export type CicloInput = z.infer<typeof CicloSchema>
