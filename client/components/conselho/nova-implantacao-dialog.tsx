'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api-client';
import { useParoquias } from '@/lib/hooks/use-conselho';
import { useCriarImplantacao } from '@/lib/hooks/use-implantacoes';

const schema = z.object({
  afilhadaNome: z.string().trim().min(1, 'Informe o nome da paróquia afilhada'),
  madrinhaId: z.string().min(1, 'Escolha a paróquia madrinha'),
});

// Começo do vínculo (fase Sementeira, norma Art. 13): a afilhada é cadastrada aqui, ainda sem
// conta de acesso — ela só ganha login para o II encontro.
export function NovaImplantacaoDialog() {
  const [open, setOpen] = useState(false);
  const { data: paroquias } = useParoquias();
  const criar = useCriarImplantacao();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await criar.mutateAsync(values);
      toast.success(`Implantação de ${values.afilhadaNome} criada, na fase de sementeira.`);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 409
          ? err.message
          : 'Não foi possível criar a implantação.',
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nova implantação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Nova implantação</DialogTitle>
            <DialogDescription>
              Começa na sementeira: a madrinha passa a marcar as fichas dos jovens da afilhada que
              vivenciarem com ela. A afilhada é cadastrada agora, sem conta de acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="afilhadaNome">Paróquia afilhada</Label>
              <Input id="afilhadaNome" {...register('afilhadaNome')} />
              {errors.afilhadaNome && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.afilhadaNome.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="madrinhaId">Paróquia madrinha</Label>
              <Controller
                control={control}
                name="madrinhaId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="madrinhaId">
                      <SelectValue placeholder="Escolha…" />
                    </SelectTrigger>
                    <SelectContent>
                      {paroquias?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.madrinhaId && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.madrinhaId.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Criar implantação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
