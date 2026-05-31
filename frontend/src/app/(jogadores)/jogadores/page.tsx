// import { prisma } from '@/lib/db'
import { JogadorListagem } from '@/components/jogadores/JogadorListagem'

export const metadata = { title: 'Jogadores' }

// TODO: remover mock e descomentar prisma quando banco estiver acessível localmente
const MOCK_JOGADORES = [
  { id: 1, nome: 'Carlos Silva', apelido: 'Carlão', posicao: 'Atacante', convidado: false, deletedAt: null, criadoEm: new Date(), atualizadoEm: new Date() },
  { id: 2, nome: 'João Pereira', apelido: 'Joãozinho', posicao: 'Goleiro', convidado: false, deletedAt: null, criadoEm: new Date(), atualizadoEm: new Date() },
  { id: 3, nome: 'Pedro Alves', apelido: null, posicao: 'Zagueiro', convidado: false, deletedAt: null, criadoEm: new Date(), atualizadoEm: new Date() },
  { id: 4, nome: 'Lucas Martins', apelido: 'Luca', posicao: 'Meio-campo', convidado: true, deletedAt: null, criadoEm: new Date(), atualizadoEm: new Date() },
  { id: 5, nome: 'Fernando Costa', apelido: 'Nando', posicao: 'Lateral', convidado: false, deletedAt: null, criadoEm: new Date(), atualizadoEm: new Date() },
]

export default async function JogadoresPage() {
  const jogadores = MOCK_JOGADORES
  // const jogadores = await prisma.jogador.findMany({
  //   where: { deletedAt: null },
  //   orderBy: { nome: 'asc' },
  // })
  return <JogadorListagem jogadoresIniciais={jogadores} />
}
