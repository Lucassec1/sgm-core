'use client';

import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Ficha } from '@/lib/types';
import { useCreateFicha, useUpdateFicha } from '@/lib/hooks/use-fichas';
import { nullsToUndefined, iniciais } from '@/lib/utils';
import { fichaSchema, type FichaFormValues } from './ficha-form/ficha-schema';
import { IdentificacaoSection } from './ficha-form/identificacao-section';
import { EnderecoSection } from './ficha-form/endereco-section';
import { FiliacaoSection } from './ficha-form/filiacao-section';
import { EscolaridadeSection } from './ficha-form/escolaridade-section';
import { ReligiaoSection } from './ficha-form/religiao-section';
import { ConviteSection } from './ficha-form/convite-section';
import { SituacaoSection } from './ficha-form/situacao-section';
import { UserRound } from 'lucide-react';

// Campos seguem docs/requisitos.md (2.1) e docs/ux-e-fluxos.md (2). As seções (Identificação,
// Endereço, Filiação, Escolaridade, Religião, Convite) ficam empilhadas uma abaixo da outra,
// separadas por divider — não em abas: a equipe dirigente escaneia a ficha inteira de uma vez
// e volta pra atualizar seções pontuais, alternar aba só atrapalhava. Histórico de equipes
// fica fora do formulário — é gerado pelo módulo Montagem e mostrado como seção separada na
// página de detalhe (HistoricoEquipesSection). Cada seção mora em ficha-form/ e lê o formulário
// via useFormContext — este componente só cuida de carregar, salvar e da situação da ficha.
export function FichaForm({ ficha }: { ficha?: Ficha }) {
  const router = useRouter();
  const isEdit = !!ficha;

  const methods = useForm<FichaFormValues>({
    resolver: zodResolver(fichaSchema),
    mode: 'onBlur',
    defaultValues: ficha
      ? { ...nullsToUndefined(ficha), dataNascimento: ficha.dataNascimento.slice(0, 10) }
      : {
          participaOutroMovimento: false,
          sacramentoBatismo: false,
          sacramentoEucaristia: false,
          sacramentoCrisma: false,
          situacao: 'ATIVA',
        },
  });
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (ficha)
      reset({ ...nullsToUndefined(ficha), dataNascimento: ficha.dataNascimento.slice(0, 10) });
  }, [ficha, reset]);

  const createFicha = useCreateFicha();
  const updateFicha = useUpdateFicha(ficha?.id ?? '');

  const onSubmit = async (values: FichaFormValues) => {
    try {
      if (isEdit) {
        await updateFicha.mutateAsync(values);
        toast.success('Ficha atualizada.');
      } else {
        const created = await createFicha.mutateAsync({ ...values });
        toast.success('Ficha criada.');
        router.push(`/fichas/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar a ficha.');
    }
  };

  const nomeCompleto = watch('nomeCompleto');

  // Depois de criada, só o que muda com frequência continua editável: endereço, telefone,
  // email, observações (nota prática — alergia, sem transporte, etc. — que pode mudar ou
  // deixar de valer com o tempo) e situação/motivo de desativação. O resto é dado de
  // identificação (nome, sexo, data de nasc., encontro, círculo, filiação, escolaridade,
  // religião, convite) e vira somente leitura pra evitar edição por engano. O nome não
  // aparece no formulário na edição — fica no header da página de detalhe.
  const bloqueado = isEdit;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Upload de foto real (proposta #4) só é possível depois que a Ficha existe — o
          arquivo em disco usa o id dela como nome. No cadastro novo, só um preview com as
          iniciais; a foto é adicionada depois, no header da página de detalhe. */}
        {!isEdit && (
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback>
                {nomeCompleto ? (
                  iniciais(nomeCompleto)
                ) : (
                  <UserRound className="h-6 w-6" aria-hidden />
                )}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">
              A foto pode ser adicionada depois de salvar, na página da ficha. Campos com * são
              obrigatórios.
            </p>
          </div>
        )}

        {isEdit && <SituacaoSection />}

        <IdentificacaoSection bloqueado={bloqueado} isEdit={isEdit} />

        <Separator />

        <EnderecoSection />

        <Separator />

        <FiliacaoSection bloqueado={bloqueado} />

        <Separator />

        <EscolaridadeSection bloqueado={bloqueado} />

        <Separator />

        <ReligiaoSection bloqueado={bloqueado} />

        <Separator />

        <ConviteSection bloqueado={bloqueado} />

        <Separator />

        <div>
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            placeholder="Ex.: alergia a amendoim, não possui transporte próprio…"
            {...register('observacoes')}
          />
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isEdit ? 'Salvar alterações' : 'Criar ficha'}
        </Button>
      </form>
    </FormProvider>
  );
}
