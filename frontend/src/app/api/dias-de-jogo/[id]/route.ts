import { NextResponse } from 'next/server'

export type CorTime = 'vermelho' | 'azul' | 'verde' | 'laranja'

export type JogadorLista = {
  id: number
  nome: string
  apelido: string | null
  convidado: boolean
}

export type TimeFormado = {
  id: number
  nome: string
  cor: CorTime
  jogadores: JogadorLista[]
}

export type DiaDeJogoDetalhe = {
  id: number
  data: string
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'FINALIZADO'
  passo: 'lista' | 'times' | 'principal'
  jogadoresSelecionados: JogadorLista[]
  times: TimeFormado[]
  cicloNome: string
}

// TODO: substituir por prisma
const TODOS_JOGADORES: JogadorLista[] = [
  { id: 1,  nome: 'Jonathan',          apelido: 'Jon',       convidado: false },
  { id: 2,  nome: 'João Pedro',        apelido: null,        convidado: false },
  { id: 3,  nome: 'Guilherme Bragança',apelido: 'Gui',       convidado: false },
  { id: 4,  nome: 'Maicon',            apelido: null,        convidado: false },
  { id: 5,  nome: 'João Victor',       apelido: 'JV',        convidado: false },
  { id: 6,  nome: 'Bernardo',          apelido: null,        convidado: false },
  { id: 7,  nome: 'Ricardo',           apelido: null,        convidado: false },
  { id: 8,  nome: 'Vitinho',           apelido: null,        convidado: false },
  { id: 9,  nome: 'Marcelo',           apelido: null,        convidado: false },
  { id: 10, nome: 'Arthur',            apelido: null,        convidado: false },
  { id: 11, nome: 'Pedro Pires',       apelido: 'PP',        convidado: false },
  { id: 12, nome: 'Theo',              apelido: null,        convidado: false },
  { id: 13, nome: 'Gustavo Borcard',   apelido: 'Borcard',   convidado: false },
  { id: 14, nome: 'Matheus Raposo',    apelido: 'Raposo',    convidado: false },
  { id: 15, nome: 'Deyvison',          apelido: null,        convidado: false },
  { id: 16, nome: 'Lucas Fonseca',     apelido: 'Lucas',     convidado: false },
  { id: 17, nome: 'Pedro Braz',        apelido: 'Braz',      convidado: false },
  { id: 18, nome: 'Miguel',            apelido: null,        convidado: false },
]

const MOCK_DETALHES: Record<number, DiaDeJogoDetalhe> = {
  3: {
    id: 3, data: '2026-05-31', status: 'PENDENTE', passo: 'lista',
    jogadoresSelecionados: [], times: [], cicloNome: 'Maio 2026',
  },
  2: {
    id: 2, data: '2026-05-17', status: 'FINALIZADO', passo: 'principal',
    jogadoresSelecionados: TODOS_JOGADORES,
    times: [
      { id: 1, nome: 'Time A', cor: 'vermelho', jogadores: TODOS_JOGADORES.slice(0, 6) },
      { id: 2, nome: 'Time B', cor: 'azul',     jogadores: TODOS_JOGADORES.slice(6, 12) },
      { id: 3, nome: 'Time C', cor: 'verde',    jogadores: TODOS_JOGADORES.slice(12, 18) },
    ],
    cicloNome: 'Maio 2026',
  },
  1: {
    id: 1, data: '2026-05-03', status: 'FINALIZADO', passo: 'principal',
    jogadoresSelecionados: TODOS_JOGADORES.slice(0, 16),
    times: [
      { id: 4, nome: 'Time A', cor: 'laranja', jogadores: TODOS_JOGADORES.slice(0, 6) },
      { id: 5, nome: 'Time B', cor: 'azul',    jogadores: TODOS_JOGADORES.slice(6, 11) },
      { id: 6, nome: 'Time C', cor: 'verde',   jogadores: TODOS_JOGADORES.slice(11, 16) },
    ],
    cicloNome: 'Maio 2026',
  },
}

export const TODOS_JOGADORES_API = TODOS_JOGADORES

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const dia = MOCK_DETALHES[parseInt(id, 10)]
  if (!dia) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 })
  return NextResponse.json({ ...dia, todosJogadores: TODOS_JOGADORES })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    // TODO: persistir via prisma (fechar lista, montar times, atualizar status)
    return NextResponse.json({ id: parseInt(id, 10), ...body })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
