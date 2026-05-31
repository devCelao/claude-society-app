import { notFound } from 'next/navigation'
import { DiaDeJogoFlow, type Jogador, type TimeFormado, type Partida } from '@/components/game-day/DiaDeJogoFlow'

// TODO: substituir por prisma
const TODOS_JOGADORES: Jogador[] = [
  { id: 1,  nome: 'Jonathan',           apelido: 'Jon',     convidado: false },
  { id: 2,  nome: 'João Pedro',         apelido: null,      convidado: false },
  { id: 3,  nome: 'Guilherme Bragança', apelido: 'Gui',     convidado: false },
  { id: 4,  nome: 'Maicon',             apelido: null,      convidado: false },
  { id: 5,  nome: 'João Victor',        apelido: 'JV',      convidado: false },
  { id: 6,  nome: 'Bernardo',           apelido: null,      convidado: false },
  { id: 7,  nome: 'Ricardo',            apelido: null,      convidado: false },
  { id: 8,  nome: 'Vitinho',            apelido: null,      convidado: false },
  { id: 9,  nome: 'Marcelo',            apelido: null,      convidado: false },
  { id: 10, nome: 'Arthur',             apelido: null,      convidado: false },
  { id: 11, nome: 'Pedro Pires',        apelido: 'PP',      convidado: false },
  { id: 12, nome: 'Theo',               apelido: null,      convidado: false },
  { id: 13, nome: 'Gustavo Borcard',    apelido: 'Borcard', convidado: false },
  { id: 14, nome: 'Matheus Raposo',     apelido: 'Raposo',  convidado: false },
  { id: 15, nome: 'Deyvison',           apelido: null,      convidado: false },
  { id: 16, nome: 'Lucas Fonseca',      apelido: 'Lucas',   convidado: false },
  { id: 17, nome: 'Pedro Braz',         apelido: 'Braz',    convidado: false },
  { id: 18, nome: 'Miguel',             apelido: null,      convidado: false },
]

type MockDia = {
  id: number
  data: string
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  passo: 'lista' | 'times' | 'principal'
  jogadoresSelecionados: Jogador[]
  times: TimeFormado[]
  partidas: Partida[]
}

const MOCK: Record<number, MockDia> = {
  3: {
    id: 3, data: '2026-05-31', status: 'PENDENTE', passo: 'lista',
    jogadoresSelecionados: [], times: [], partidas: [],
  },
  2: {
    id: 2, data: '2026-05-17', status: 'FINALIZADO', passo: 'principal',
    jogadoresSelecionados: TODOS_JOGADORES,
    times: [
      { nome: 'Time A', cor: 'vermelho', jogadores: TODOS_JOGADORES.slice(0, 6) },
      { nome: 'Time B', cor: 'azul',     jogadores: TODOS_JOGADORES.slice(6, 12) },
      { nome: 'Time C', cor: 'verde',    jogadores: TODOS_JOGADORES.slice(12, 18) },
    ],
    partidas: [
      { id: 1, timeAId: 1, timeBId: 2, status: 'FINALIZADA' },
      { id: 2, timeAId: 2, timeBId: 3, status: 'FINALIZADA' },
      { id: 3, timeAId: 1, timeBId: 3, status: 'FINALIZADA' },
    ],
  },
  1: {
    id: 1, data: '2026-05-03', status: 'FINALIZADO', passo: 'principal',
    jogadoresSelecionados: TODOS_JOGADORES.slice(0, 16),
    times: [
      { nome: 'Time A', cor: 'laranja', jogadores: TODOS_JOGADORES.slice(0, 6) },
      { nome: 'Time B', cor: 'azul',    jogadores: TODOS_JOGADORES.slice(6, 11) },
      { nome: 'Time C', cor: 'verde',   jogadores: TODOS_JOGADORES.slice(11, 16) },
    ],
    partidas: [
      { id: 4, timeAId: 4, timeBId: 5, status: 'FINALIZADA' },
      { id: 5, timeAId: 5, timeBId: 6, status: 'FINALIZADA' },
      { id: 6, timeAId: 4, timeBId: 6, status: 'FINALIZADA' },
    ],
  },
}

export default async function DiaDeJogoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const dia = MOCK[parseInt(id, 10)]
  if (!dia) notFound()

  return (
    <main className="p-6">
      <DiaDeJogoFlow
        diaId={dia.id}
        data={dia.data}
        status={dia.status}
        passoinicial={dia.passo}
        jogadoresSelecionadosInicial={dia.jogadoresSelecionados}
        timesIniciais={dia.times}
        todosJogadores={TODOS_JOGADORES}
        partidasIniciais={dia.partidas}
      />
    </main>
  )
}
