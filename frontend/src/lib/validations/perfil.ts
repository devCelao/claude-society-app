import { z } from 'zod'

export const PerfilSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
    senhaAtual: z.string().min(1, 'Informe a senha atual'),
    novaSenha: z.string().max(100).optional(),
    confirmarSenha: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.novaSenha && data.novaSenha.length < 6) return false
      return true
    },
    { message: 'Nova senha deve ter ao menos 6 caracteres', path: ['novaSenha'] }
  )
  .refine(
    (data) => {
      if (data.novaSenha && data.novaSenha !== data.confirmarSenha) return false
      return true
    },
    { message: 'As senhas não conferem', path: ['confirmarSenha'] }
  )

export type PerfilData = z.infer<typeof PerfilSchema>
