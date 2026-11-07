'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  NovaParoquiaDialog,
  RedefinirAcessoButton,
  TrocarEmailParoquiaDialog,
} from '@/components/conselho/paroquia-conta';
import { useParoquias } from '@/lib/hooks/use-conselho';
import { PageHeader } from '@/components/page-header';

// Ponto de entrada do Conselho (R8): escolhe uma paróquia pra ver as montagens dela e gerencia
// a conta de acesso de cada uma (e-mail da paróquia + primeiro acesso). Sem paginação/busca
// sofisticada: uso interno de 12 pessoas, poucas paróquias (estimativa de 13, R7).
export default function ConselhoPage() {
  const { data: paroquias, isLoading, isError } = useParoquias();

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Paróquias" actions={<NovaParoquiaDialog />} />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Não foi possível carregar as paróquias. Confira a conexão e recarregue a página.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paroquias?.map((paroquia) => {
          const conta = paroquia.usuarios[0];
          return (
            <Card
              key={paroquia.id}
              role="group"
              aria-label={paroquia.nome}
              className="flex flex-col"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  <Link href={`/conselho/paroquias/${paroquia.id}`} className="hover:underline">
                    {paroquia.nome}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-xs text-muted-foreground">
                {conta ? (
                  <>
                    <p className="break-all">{conta.login}</p>
                    {conta.aguardandoPrimeiroAcesso ? (
                      <Badge variant="atencao">Aguardando primeiro acesso</Badge>
                    ) : (
                      <Badge variant="sucesso">✓ Acesso ativo</Badge>
                    )}
                    {!conta.login.includes('@') && (
                      <p className="text-amber-600 dark:text-amber-400">
                        Login antigo, sem e-mail — troque pelo e-mail da paróquia para ela poder
                        recuperar a senha sozinha.
                      </p>
                    )}
                  </>
                ) : (
                  <p>Sem conta cadastrada</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Link
                  href={`/conselho/paroquias/${paroquia.id}`}
                  className="text-xs font-medium hover:underline"
                >
                  Ver montagens
                </Link>
                {conta && (
                  <div className="ml-auto flex gap-2">
                    <TrocarEmailParoquiaDialog
                      paroquiaId={paroquia.id}
                      paroquiaNome={paroquia.nome}
                      emailAtual={conta.login}
                    />
                    {!conta.aguardandoPrimeiroAcesso && (
                      <RedefinirAcessoButton
                        paroquiaId={paroquia.id}
                        paroquiaNome={paroquia.nome}
                      />
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          );
        })}
        {paroquias?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma paróquia cadastrada. Use “Nova paróquia” pra cadastrar a primeira.
          </p>
        )}
      </div>
    </div>
  );
}
