export type CorCirculo = 'VERMELHO' | 'AZUL' | 'VERDE' | 'AMARELO' | 'ROSA' | 'LARANJA';
export type SituacaoFicha = 'ATIVA' | 'INATIVA';
export type Sexo = 'RAPAZ' | 'MOCA';

export interface Ficha {
  id: string;
  paroquiaId: string;
  nomeCompleto: string;
  sexo: Sexo;
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

// --- Módulo Montagem ---------------------------------------------------

export type StatusMontagem = 'EM_ANDAMENTO' | 'FINALIZADA';
export type TipoPessoa = 'JOVEM' | 'CASAL';
export type StatusConvite = 'RASCUNHO' | 'CONVIDADO' | 'ACEITO' | 'RECUSADO' | 'DESISTIU' | 'SUBSTITUIDO';

export interface Equipe {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  ehCirculos: boolean;
  repeticaoLimiteFlexivel: boolean;
  bloqueiaConvitePosCirculos: boolean;
}

export interface Cargo {
  id: string;
  equipeId: string;
  nome: string;
  ordem: number;
  quantidadeCasais: number;
  quantidadeRapazes: number;
  quantidadeMocas: number;
  quantidadeDinamica: boolean;
  ehCoordenacao: boolean;
}

export interface VagaMontagem {
  id: string;
  montagemId: string;
  equipeId: string;
  equipe: Equipe;
  cargoId: string;
  cargo: Cargo;
  quantidadeCasais: number;
  quantidadeRapazes: number;
  quantidadeMocas: number;
}

export interface Montagem {
  id: string;
  paroquiaId: string;
  numeroEncontro: number;
  data: string;
  padroeiro?: string | null;
  diretorEspiritual?: string | null;
  ehSementeira: boolean;
  paroquiaSementeiraId?: string | null;
  quantidadeFichasSementeira?: number | null;
  numeroJovensVivenciando: number;
  status: StatusMontagem;
  vagas: VagaMontagem[];
  createdAt: string;
  updatedAt: string;
}

export interface MontagemListResponse {
  items: Omit<Montagem, 'vagas'>[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Alocacao {
  id: string;
  vagaMontagemId: string;
  vagaMontagem: VagaMontagem;
  tipoPessoa: TipoPessoa;
  fichaId?: string | null;
  ficha?: Ficha | null;
  fichaCasalId?: string | null;
  fichaCasal?: FichaCasal | null;
  status: StatusConvite;
  dataConvite?: string | null;
  dataResposta?: string | null;
  motivoRecusa?: string | null;
  podeCoordenar?: boolean | null;
  podePalestrar?: boolean | null;
  observacoesAvaliacao?: string | null;
  substituidaPorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoricoEquipeItem {
  id: string;
  status: StatusConvite;
  motivoRecusa?: string | null;
  podeCoordenar?: boolean | null;
  podePalestrar?: boolean | null;
  observacoesAvaliacao?: string | null;
  createdAt: string;
  vagaMontagem: {
    equipe: Equipe;
    cargo: Cargo;
    montagem: { numeroEncontro: number; data: string; status: StatusMontagem };
  };
}

export interface CoordenadoresSugeridos {
  grupoA: { fichas: Ficha[]; fichasCasais: FichaCasal[] };
  grupoB: { fichas: Ficha[]; fichasCasais: FichaCasal[] };
}

export interface ListaSubstituicaoItem {
  id: string;
  montagemId: string;
  tipoPessoa: TipoPessoa;
  fichaId?: string | null;
  ficha?: Ficha | null;
  fichaCasalId?: string | null;
  fichaCasal?: FichaCasal | null;
  nota?: string | null;
  createdAt: string;
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
