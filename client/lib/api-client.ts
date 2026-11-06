// Ponto de entrada único da API pro resto do app — junta os módulos de domínio de lib/api/.
// Quem importa `apiClient` daqui (e os testes que fazem vi.mock deste caminho) não precisa saber
// em qual arquivo cada método mora.
import { API_URL } from './api/request';
import { authApi } from './api/auth';
import { fichasApi } from './api/fichas';
import { fichasCasaisApi } from './api/fichas-casais';
import { montagensApi } from './api/montagens';
import { conselhoApi } from './api/conselho';
import { telaoApi } from './api/telao';

export { ApiError, avisosDoErro } from './api/request';
export type { Role, SessaoAtual } from './api/auth';
export type { ListFichasParams } from './api/fichas';
export type { ListFichasCasaisParams } from './api/fichas-casais';
export type { ListMontagensParams } from './api/montagens';
export type { ParoquiaComConta } from './api/conselho';

export const apiClient = {
  baseUrl: API_URL,
  ...authApi,
  ...fichasApi,
  ...fichasCasaisApi,
  ...montagensApi,
  ...conselhoApi,
  ...telaoApi,
};
