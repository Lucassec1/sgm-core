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
export type StatusConvite =
  'RASCUNHO' | 'CONVIDADO' | 'ACEITO' | 'RECUSADO' | 'DESISTIU' | 'SUBSTITUIDO';

export interface Equipe {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  ehCirculos: boolean;
  repeticaoLimiteFlexivel: boolean;
  bloqueiaConvitePosCirculos: boolean;
  coordenacaoCasalExigeHistorico: boolean;
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
  ehImplantacao: boolean;
  paroquiaAfilhadaNome?: string | null;
  quantidadeJovensSementeira?: number | null;
  quantidadeCasaisAfilhada?: number | null;
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
  substituidaPorId?: string | null;
  /** Avisos de R1–R3 (badges) — calculados pelo server na listagem da montagem. */
  avisos?: AvisoRegra[];
  createdAt: string;
  updatedAt: string;
}

export interface HistoricoEquipeItem {
  id: string;
  status: StatusConvite;
  motivoRecusa?: string | null;
  podeCoordenar?: boolean | null;
  podePalestrar?: boolean | null;
  createdAt: string;
  vagaMontagem: {
    equipe: Equipe;
    cargo: Cargo;
    montagem: { numeroEncontro: number; data: string; status: StatusMontagem };
  };
}

// Painel "como foi esse encontro" (docs/historico/propostas.md, proposta #2) — agregado a partir do
// LogAtividade e das Alocacoes, sem schema novo.
export interface ResumoMontagem {
  montagemId: string;
  numeroEncontro: number;
  status: StatusMontagem;
  /** null se a montagem ainda não foi finalizada. */
  duracaoMs: number | null;
  /** Equipe com mais idas-e-vindas (criou/removeu alocação) — proxy de "mais difícil de fechar". */
  equipeMaisMovimentada: { nome: string; movimentacoes: number } | null;
  totalRecusasDesistencias: number;
  totalSubstituicoes: number;
  /** Até os 3 encontros finalizados anteriores da mesma paróquia, do mais antigo pro mais novo. */
  historico: Array<{ numeroEncontro: number; duracaoMs: number | null }>;
}

// R3 — desde 14/10/2026 a lista traz todo mundo: Grupo A (já serviu na equipe; avaliados
// "pode coordenar" primeiro), Grupo B (ED/Comando Geral) e os demais (escolher gera aviso).
type ComAvaliacao<T> = T & { avaliadoPodeCoordenar: boolean; vezesNaEquipe: number };
interface GrupoCoordenacao {
  fichas: ComAvaliacao<Ficha>[];
  fichasCasais: ComAvaliacao<FichaCasal>[];
}
export interface CoordenadoresSugeridos {
  grupoA: GrupoCoordenacao;
  grupoB: GrupoCoordenacao;
  outros: GrupoCoordenacao;
}

// Candidato a vaga — `recusouNesteEncontro` (R1) e `vezesNaEquipe` (R2, vezes que já serviu na
// equipe da vaga em outros encontros) viram badges na busca; nenhum dos dois bloqueia.
interface InfoCandidato {
  recusouNesteEncontro: boolean;
  vezesNaEquipe: number;
}
export type CandidatoJovem = Ficha & InfoCandidato;
export type CandidatoCasal = FichaCasal & InfoCandidato;

// Aviso de regra (R1–R4) — nunca bloqueia (docs/regras-imutaveis.md). R1–R3 viram badge
// (`Alocacao.avisos`); só o R4 (convidar antes dos Círculos) pede confirmação, via 409.
export interface AvisoRegra {
  regra: 'R1' | 'R2' | 'R3' | 'R4';
  nivel: 'grave' | 'atencao';
  /** Texto curto da badge ("4ª vez nesta equipe"). */
  rotulo: string;
  /** Explicação completa (tooltip / confirmação). */
  mensagem: string;
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

// R8 — observação do Conselho numa montagem; o nome vem sempre da conta de quem escreveu.
export interface ObservacaoConselho {
  id: string;
  texto: string;
  createdAt: string;
  usuario: { nome: string | null };
}

export interface LogAtividadeItem {
  id: string;
  montagemId: string;
  usuario: string;
  acao: string;
  detalhes?: string | null;
  createdAt: string;
}

export interface QuadranteArquivo {
  id: string;
  montagemId: string;
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  usuario?: string | null;
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
