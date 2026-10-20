'use client';

import { AlertTriangle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AvisoRegra } from '@/lib/types';

const TITULO_REGRA: Record<AvisoRegra['regra'], string> = {
  R1: 'Recusa neste encontro',
  R2: 'Repetição de equipe',
  R3: 'Coordenação',
  R4: 'Círculos primeiro',
};

// Confirmação consciente dos avisos de R1–R4 (docs/regras-imutaveis.md): desde 14/10/2026 as
// regras não bloqueiam — informam, e quem decide é a equipe dirigente. Alert Dialog é o padrão
// reservado a essas regras (docs/design-system.md, seção 3).
export function AvisosRegrasDialog({
  avisos,
  acao = 'Continuar mesmo assim',
  onConfirmar,
  onCancelar,
}: {
  avisos: AvisoRegra[] | null;
  acao?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const grave = avisos?.some((a) => a.nivel === 'grave');

  return (
    <AlertDialog open={!!avisos?.length} onOpenChange={(aberto) => !aberto && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {grave ? 'Isso foge das regras do Segue-me' : 'Confira antes de continuar'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            O sistema não impede — a decisão é da equipe dirigente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="space-y-2">
          {avisos?.map((aviso) => (
            <li
              key={aviso.regra}
              className={
                aviso.nivel === 'grave'
                  ? 'flex gap-2 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400'
                  : 'flex gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200'
              }
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium">{TITULO_REGRA[aviso.regra]}:</span> {aviso.mensagem}
              </span>
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>{acao}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
