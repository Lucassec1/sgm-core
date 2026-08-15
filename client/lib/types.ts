export type CorCirculo = 'VERMELHO' | 'AZUL' | 'VERDE' | 'AMARELO' | 'ROSA' | 'LARANJA';
export type SituacaoFicha = 'ATIVA' | 'INATIVA';

export interface Ficha {
  id: string;
  paroquiaId: string;
  nomeCompleto: string;
  dataNascimento: string;
  naturalidade?: string | null;
  telefone: string;
  email?: string | null;
  fotoUrl?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  nomePai?: string | null;
  nomeMae?: string | null;
  grauEscolaridade?: string | null;
  curso?: string | null;
  instituicao?: string | null;
  situacaoEscolar?: string | null;
  religiao?: string | null;
  igrejaQueFrequenta?: string | null;
  participaOutroMovimento: boolean;
  qualMovimento?: string | null;
  sacramentoBatismo: boolean;
  sacramentoEucaristia: boolean;
  sacramentoCrisma: boolean;
  nomeConvidante?: string | null;
  telefoneConvidante?: string | null;
  enderecoConvidante?: string | null;
  observacoes?: string | null;
  numeroEncontro: number;
  corCirculo: CorCirculo;
  situacao: SituacaoFicha;
  motivoDesativacao?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FichaListResponse {
  items: Ficha[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FichaCasal {
  id: string;
  paroquiaId: string;
  nomeEle: string;
  nomeEla: string;
  dataNascimentoEle?: string | null;
  dataNascimentoEla?: string | null;
  telefoneEle: string;
  telefoneEla: string;
  emailEle?: string | null;
  emailEla?: string | null;
  fotoUrl?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  temFilhosNoSegueMe: boolean;
  observacoesFilhos?: string | null;
  observacoes?: string | null;
  situacao: SituacaoFicha;
  motivoDesativacao?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FichaCasalListResponse {
  items: FichaCasal[];
  total: number;
  page: number;
  pageSize: number;
}

// Paleta fixa dos círculos — ver docs/design-system.md, seção 1.
export const CORES_CIRCULO: { value: CorCirculo; label: string; hex: string }[] = [
  { value: 'VERMELHO', label: 'Vermelho', hex: '#f40606' },
  { value: 'AZUL', label: 'Azul', hex: '#036cf6' },
  { value: 'VERDE', label: 'Verde', hex: '#2ea633' },
  { value: 'AMARELO', label: 'Amarelo', hex: '#ffde05' },
  { value: 'ROSA', label: 'Rosa', hex: '#ff1fa9' },
  { value: 'LARANJA', label: 'Laranja', hex: '#ff5502' },
];
