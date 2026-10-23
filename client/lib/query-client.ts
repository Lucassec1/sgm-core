import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

// Erro 4xx (403, 404, 409...) é resposta definitiva do server — repetir só atrasa a mensagem
// de erro na tela (o padrão do React Query são 3 tentativas com espera crescente, vários
// segundos). Falha de rede ou 5xx pode ser passageira (Wi-Fi do encontro, cold start do
// Render), então ainda tenta de novo, mas no máximo 2 vezes.
export function deveRepetir(tentativasFeitas: number, erro: unknown): boolean {
  if (erro instanceof ApiError && erro.status < 500) return false;
  return tentativasFeitas < 2;
}

export function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: deveRepetir,
        // 30s sem refazer a mesma leitura ao trocar de tela e voltar — as mutações já
        // invalidam o que mudaram, então não fica dado velho depois de salvar.
        staleTime: 30_000,
      },
    },
  });
}
