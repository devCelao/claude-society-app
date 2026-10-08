// Fonte unica das cores de time. O banco guarda apenas o `valor` (times.cor, VARCHAR).
// Para adicionar uma cor nova, basta incluir uma entrada em CORES_TIME.

export type CorTime =
  | 'vermelho'
  | 'azul'
  | 'verde'
  | 'laranja'
  | 'amarelo'
  | 'roxo'
  | 'rosa'
  | 'branco'
  | 'preto'

export type CorTimeInfo = {
  valor: CorTime
  label: string
  /** Cor de destaque sobre o fundo escuro do app */
  hex: string
  /** Fundo translucido (chips, cards) */
  bg: string
  /** Texto legivel sobre fundo solido `hex` */
  texto: string
  /** false = cor reservada: continua exibida em times antigos, mas nao pode ser escolhida */
  selecionavel?: boolean
}

// Branco e reservado como cor neutra (ex.: nome de time sem vitoria/empate)
export const COR_NEUTRA = '#f0ede0'

export const CORES_TIME: CorTimeInfo[] = [
  { valor: 'vermelho', label: 'Vermelho', hex: '#ef4444', bg: 'rgba(239,68,68,0.12)',   texto: '#fff' },
  { valor: 'azul',     label: 'Azul',     hex: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  texto: '#fff' },
  { valor: 'verde',    label: 'Verde',    hex: '#22c55e', bg: 'rgba(34,197,94,0.12)',   texto: '#fff' },
  { valor: 'laranja',  label: 'Laranja',  hex: '#f97316', bg: 'rgba(249,115,22,0.12)',  texto: '#fff' },
  { valor: 'amarelo',  label: 'Amarelo',  hex: '#eab308', bg: 'rgba(234,179,8,0.12)',   texto: '#000' },
  { valor: 'roxo',     label: 'Roxo',     hex: '#a855f7', bg: 'rgba(168,85,247,0.12)',  texto: '#fff' },
  { valor: 'rosa',     label: 'Rosa',     hex: '#ec4899', bg: 'rgba(236,72,153,0.12)',  texto: '#fff' },
  { valor: 'branco',   label: 'Branco',   hex: '#e5e5e5', bg: 'rgba(229,229,229,0.10)', texto: '#000', selecionavel: false },
  // Preto puro some no fundo escuro: exibido como grafite
  { valor: 'preto',    label: 'Preto',    hex: '#6b7280', bg: 'rgba(107,114,128,0.15)', texto: '#fff' },
]

const FALLBACK: CorTimeInfo = {
  valor: 'preto', label: '—', hex: '#888888', bg: 'rgba(136,136,136,0.12)', texto: '#fff',
}

/** Resolve a cor salva no banco; valores desconhecidos caem em cinza neutro. */
export function getCorTime(valor: string | null | undefined): CorTimeInfo {
  return CORES_TIME.find((c) => c.valor === valor) ?? FALLBACK
}
