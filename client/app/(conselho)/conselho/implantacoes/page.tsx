'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MetaLista, PageHeader } from '@/components/page-header';
import { NovaImplantacaoDialog } from '@/components/conselho/nova-implantacao-dialog';
import { AvancarFaseButton, LiberarAcessoDialog } from '@/components/conselho/implantacao-acoes';
import type { FaseImplantacao, ImplantacaoConselho } from '@/lib/api/conselho';
import { useImplantacoes } from '@/lib/hooks/use-implantacoes';

const FASE: Record<
  FaseImplantacao,
  { rotulo: string; variante: 'neutro' | 'atencao' | 'ouro' | 'sucesso' }
> = {
  SEMENTEIRA: { rotulo: 'Sementeira', variante: 'neutro' },
  IMPLANTACAO: { rotulo: 'Implantação', variante: 'atencao' },
  ACOMPANHAMENTO: { rotulo: 'Acompanhamento', variante: 'ouro' },
  ENCERRADA: { rotulo: 'Encerrada', variante: 'sucesso' },
};

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : null);

// Vínculos de implantação (docs/implantacao.md) — o Conselho cria e conduz as fases (R8). Nada
// aqui mostra ficha: da sementeira, só a contagem.
export default function ImplantacoesPage() {
  const { data: implantacoes, isLoading, isError } = useImplantacoes();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader
        title="Implantações"
        description="Vínculos entre paróquia madrinha e afilhada, da sementeira ao encerramento."
        actions={<NovaImplantacaoDialog />}
      />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Não foi possível carregar as implantações. Confira a conexão e recarregue a página.
        </p>
      )}
      {implantacoes?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma implantação ainda. Use “Nova implantação” quando uma paróquia começar a
          sementeira.
        </p>
      )}

      <div className="space-y-3">
        {implantacoes?.map((i) => (
          <ImplantacaoCard key={i.id} implantacao={i} />
        ))}
      </div>
    </div>
  );
}

function ImplantacaoCard({ implantacao: i }: { implantacao: ImplantacaoConselho }) {
  const fase = FASE[i.fase];
  const podeLiberarAcesso = !i.afilhadaTemConta && i.fase !== 'SEMENTEIRA';
  return (
    <Card role="article" aria-label={i.afilhada.nome}>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1">
          <h2 className="flex flex-wrap items-center gap-2 text-base font-bold">
            {i.afilhada.nome}
            <Badge variant={fase.variante}>{fase.rotulo}</Badge>
          </h2>
          <MetaLista
            itens={[
              `Madrinha: ${i.madrinha.nome}`,
              i.fase === 'SEMENTEIRA' &&
                `${i.fichasSementeira} ${i.fichasSementeira === 1 ? 'ficha marcada' : 'fichas marcadas'}`,
              `Criada em ${data(i.createdAt)}`,
              i.implantacaoIniciadaEm && `Implantação desde ${data(i.implantacaoIniciadaEm)}`,
              i.acompanhamentoIniciadoEm &&
                `Acompanhamento desde ${data(i.acompanhamentoIniciadoEm)}`,
              i.encerradaEm && `Encerrada em ${data(i.encerradaEm)}`,
              i.fase !== 'SEMENTEIRA' &&
                (i.afilhadaTemConta ? 'Afilhada com acesso' : 'Afilhada sem acesso'),
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {podeLiberarAcesso && <LiberarAcessoDialog implantacao={i} />}
          <AvancarFaseButton implantacao={i} />
        </div>
      </CardContent>
    </Card>
  );
}
