'use client';

import { useState } from 'react';
import { History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useLog } from '@/lib/hooks/use-montagens';

// R9 — trilha de auditoria da montagem: toda alteração registra quem, o quê e quando.
// O backend grava em cada mutação (log-atividade.service.ts); aqui é só a visualização.
const ACOES: Record<string, string> = {
  CRIOU_MONTAGEM: 'criou a montagem',
  ATUALIZOU_MONTAGEM: 'atualizou dados da montagem',
  MUDOU_STATUS: 'mudou o status',
  CRIOU_ALOCACAO: 'alocou alguém',
  ATUALIZOU_ALOCACAO: 'atualizou uma alocação',
  REMOVEU_ALOCACAO: 'removeu uma alocação',
  ADICIONOU_LISTA_SUBSTITUICAO: 'adicionou à lista de substituição',
  REMOVEU_LISTA_SUBSTITUICAO: 'removeu da lista de substituição',
};

export function LogAtividadeDrawer({ montagemId }: { montagemId: string }) {
  const [open, setOpen] = useState(false);
  const { data: log, isLoading } = useLog(open ? montagemId : undefined);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <History className="h-3.5 w-3.5" />
          Atividade
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Atividade da montagem</SheetTitle>
          <SheetDescription>Toda alteração fica registrada com quem fez e quando (R9).</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {log && log.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>}
          {log && log.length > 0 && (
            <ol className="space-y-3">
              {log.map((item) => (
                <li key={item.id} className="border-l-2 border-border pl-3 text-sm">
                  <p>
                    <span className="font-medium">{item.usuario}</span> {ACOES[item.acao] ?? item.acao.toLowerCase()}
                    {item.detalhes && <span className="text-muted-foreground"> — {item.detalhes}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
