import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';

// Endpoint público e reduzido (sem login) — ver server/src/modules/telao.
export function useTelaoMontagem(id: string | undefined) {
  return useQuery({
    queryKey: ['telao', 'montagens', id],
    queryFn: () => apiClient.getTelaoMontagem(id as string),
    enabled: !!id,
  });
}
