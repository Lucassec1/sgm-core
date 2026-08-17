'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CORES_CIRCULO } from '@/lib/types';
import type { Ficha } from '@/lib/types';
import { PAROQUIA_ID_PROVISORIA } from '@/lib/constants';
import { useCreateFicha, useUpdateFicha } from '@/lib/hooks/use-fichas';
import { nullsToUndefined } from '@/lib/utils';

// Campos e ordem das abas seguem docs/requisitos.md (2.1) e docs/ux-e-fluxos.md (2). Histórico
// de equipes fica fora das abas — é gerado pelo módulo Montagem e mostrado como seção separada
// na página de detalhe (HistoricoEquipesSection), não faz parte do formulário editável.
const fichaSchema = z.object({
  nomeCompleto: z.string().min(3, 'Informe o nome completo'),
  sexo: z.enum(['RAPAZ', 'MOCA'], { required_error: 'Selecione o sexo' }),
  dataNascimento: z.string().min(1, 'Informe a data de nascimento'),
  naturalidade: z.string().optional(),
  telefone: z.string().min(1, 'Informe o telefone'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  numeroEncontro: z.coerce.number().int().min(1, 'Informe o número do encontro'),
  corCirculo: z.enum(['VERMELHO', 'AZUL', 'VERDE', 'AMARELO', 'ROSA', 'LARANJA'], {
    required_error: 'Selecione a cor do círculo',
  }),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  nomePai: z.string().optional(),
  nomeMae: z.string().optional(),
  grauEscolaridade: z.string().optional(),
  curso: z.string().optional(),
  instituicao: z.string().optional(),
  situacaoEscolar: z.string().optional(),
  religiao: z.string().optional(),
  igrejaQueFrequenta: z.string().optional(),
  participaOutroMovimento: z.boolean().optional(),
  qualMovimento: z.string().optional(),
  sacramentoBatismo: z.boolean().optional(),
  sacramentoEucaristia: z.boolean().optional(),
  sacramentoCrisma: z.boolean().optional(),
  nomeConvidante: z.string().optional(),
  telefoneConvidante: z.string().optional(),
  enderecoConvidante: z.string().optional(),
  observacoes: z.string().optional(),
  fotoUrl: z.string().optional(),
  situacao: z.enum(['ATIVA', 'INATIVA']).optional(),
  motivoDesativacao: z.string().optional(),
});

type FichaFormValues = z.infer<typeof fichaSchema>;

export function FichaForm({ ficha }: { ficha?: Ficha }) {
  const router = useRouter();
  const isEdit = !!ficha;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FichaFormValues>({
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

  useEffect(() => {
    if (ficha) reset({ ...nullsToUndefined(ficha), dataNascimento: ficha.dataNascimento.slice(0, 10) });
  }, [ficha, reset]);

  const createFicha = useCreateFicha();
  const updateFicha = useUpdateFicha(ficha?.id ?? '');

  const onSubmit = async (values: FichaFormValues) => {
    if (isEdit) {
      await updateFicha.mutateAsync(values);
    } else {
      const created = await createFicha.mutateAsync({ ...values, paroquiaId: PAROQUIA_ID_PROVISORIA });
      router.push(`/fichas/${created.id}`);
    }
  };

  const fotoUrl = watch('fotoUrl');
  const nomeCompleto = watch('nomeCompleto');

  // Depois de criada, só endereço/telefone/email mudam com frequência — o resto é dado de
  // identificação (nome, sexo, data de nasc., encontro, círculo, filiação, escolaridade,
  // religião, convite, foto) e vira somente leitura pra evitar edição por engano. Situação/
  // motivo de desativação continuam editáveis: é a única forma de desativar uma ficha.
  const bloqueado = isEdit;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={fotoUrl || undefined} alt={nomeCompleto} />
          <AvatarFallback>{(nomeCompleto || '??').slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Label htmlFor="fotoUrl">Foto (URL)</Label>
          <Input id="fotoUrl" placeholder="https://..." disabled={bloqueado} {...register('fotoUrl')} />
        </div>
      </div>

      {isEdit && (
        <div className="grid grid-cols-2 gap-4 rounded-md border p-4">
          <div>
            <Label>Situação</Label>
            <Select value={watch('situacao')} onValueChange={(v) => setValue('situacao', v as 'ATIVA' | 'INATIVA')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATIVA">Ativa</SelectItem>
                <SelectItem value="INATIVA">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {watch('situacao') === 'INATIVA' && (
            <div>
              <Label htmlFor="motivoDesativacao">Motivo da desativação</Label>
              <Input id="motivoDesativacao" {...register('motivoDesativacao')} />
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="identificacao">
        <TabsList>
          <TabsTrigger value="identificacao">Identificação</TabsTrigger>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="filiacao">Filiação</TabsTrigger>
          <TabsTrigger value="escolaridade">Escolaridade</TabsTrigger>
          <TabsTrigger value="religiao">Religião</TabsTrigger>
          <TabsTrigger value="convite">Convite</TabsTrigger>
        </TabsList>

        <TabsContent value="identificacao" className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="nomeCompleto">Nome completo</Label>
            <Input id="nomeCompleto" disabled={bloqueado} {...register('nomeCompleto')} />
            {errors.nomeCompleto && <p className="text-xs text-red-600 mt-1">{errors.nomeCompleto.message}</p>}
          </div>
          <div>
            <Label>Sexo</Label>
            <Select value={watch('sexo')} onValueChange={(v) => setValue('sexo', v as FichaFormValues['sexo'])} disabled={bloqueado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RAPAZ">Rapaz</SelectItem>
                <SelectItem value="MOCA">Moça</SelectItem>
              </SelectContent>
            </Select>
            {errors.sexo && <p className="text-xs text-red-600 mt-1">{errors.sexo.message}</p>}
          </div>
          <div>
            <Label htmlFor="dataNascimento">Data de nascimento</Label>
            <Input id="dataNascimento" type="date" disabled={bloqueado} {...register('dataNascimento')} />
            {errors.dataNascimento && <p className="text-xs text-red-600 mt-1">{errors.dataNascimento.message}</p>}
          </div>
          <div>
            <Label htmlFor="naturalidade">Naturalidade</Label>
            <Input id="naturalidade" disabled={bloqueado} {...register('naturalidade')} />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" {...register('telefone')} />
            {errors.telefone && <p className="text-xs text-red-600 mt-1">{errors.telefone.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="numeroEncontro">Nº do encontro</Label>
            <Input id="numeroEncontro" type="number" disabled={bloqueado} {...register('numeroEncontro')} />
            {errors.numeroEncontro && <p className="text-xs text-red-600 mt-1">{errors.numeroEncontro.message}</p>}
          </div>
          <div>
            <Label>Cor do círculo</Label>
            <Select
              value={watch('corCirculo')}
              onValueChange={(v) => setValue('corCirculo', v as FichaFormValues['corCirculo'])}
              disabled={bloqueado}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {CORES_CIRCULO.map((cor) => (
                  <SelectItem key={cor.value} value={cor.value}>
                    {cor.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.corCirculo && <p className="text-xs text-red-600 mt-1">{errors.corCirculo.message}</p>}
          </div>
        </TabsContent>

        <TabsContent value="endereco" className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input id="logradouro" {...register('logradouro')} />
          </div>
          <div>
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" {...register('numero')} />
          </div>
          <div>
            <Label htmlFor="complemento">Complemento</Label>
            <Input id="complemento" {...register('complemento')} />
          </div>
          <div>
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" {...register('bairro')} />
          </div>
          <div>
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" {...register('cidade')} />
          </div>
          <div>
            <Label htmlFor="estado">Estado</Label>
            <Input id="estado" {...register('estado')} />
          </div>
          <div>
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" {...register('cep')} />
          </div>
        </TabsContent>

        <TabsContent value="filiacao" className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nomePai">Nome do pai</Label>
            <Input id="nomePai" disabled={bloqueado} {...register('nomePai')} />
          </div>
          <div>
            <Label htmlFor="nomeMae">Nome da mãe</Label>
            <Input id="nomeMae" disabled={bloqueado} {...register('nomeMae')} />
          </div>
        </TabsContent>

        <TabsContent value="escolaridade" className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="grauEscolaridade">Grau de escolaridade</Label>
            <Input id="grauEscolaridade" disabled={bloqueado} {...register('grauEscolaridade')} />
          </div>
          <div>
            <Label htmlFor="situacaoEscolar">Situação</Label>
            <Input id="situacaoEscolar" disabled={bloqueado} {...register('situacaoEscolar')} placeholder="Cursando, formado..." />
          </div>
          <div>
            <Label htmlFor="curso">Curso</Label>
            <Input id="curso" disabled={bloqueado} {...register('curso')} />
          </div>
          <div>
            <Label htmlFor="instituicao">Instituição</Label>
            <Input id="instituicao" disabled={bloqueado} {...register('instituicao')} />
          </div>
        </TabsContent>

        <TabsContent value="religiao" className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="religiao">Religião</Label>
            <Input id="religiao" disabled={bloqueado} {...register('religiao')} />
          </div>
          <div>
            <Label htmlFor="igrejaQueFrequenta">Igreja que frequenta</Label>
            <Input id="igrejaQueFrequenta" disabled={bloqueado} {...register('igrejaQueFrequenta')} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Checkbox
              id="participaOutroMovimento"
              checked={watch('participaOutroMovimento')}
              onCheckedChange={(v) => setValue('participaOutroMovimento', !!v)}
              disabled={bloqueado}
            />
            <Label htmlFor="participaOutroMovimento">Participa de outro movimento da Igreja</Label>
          </div>
          {watch('participaOutroMovimento') && (
            <div className="col-span-2">
              <Label htmlFor="qualMovimento">Qual movimento</Label>
              <Input id="qualMovimento" disabled={bloqueado} {...register('qualMovimento')} />
            </div>
          )}
          <div className="col-span-2 space-y-2">
            <Label>Sacramentos recebidos</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sacramentoBatismo"
                checked={watch('sacramentoBatismo')}
                onCheckedChange={(v) => setValue('sacramentoBatismo', !!v)}
                disabled={bloqueado}
              />
              <Label htmlFor="sacramentoBatismo" className="font-normal">Batismo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sacramentoEucaristia"
                checked={watch('sacramentoEucaristia')}
                onCheckedChange={(v) => setValue('sacramentoEucaristia', !!v)}
                disabled={bloqueado}
              />
              <Label htmlFor="sacramentoEucaristia" className="font-normal">Eucaristia</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sacramentoCrisma"
                checked={watch('sacramentoCrisma')}
                onCheckedChange={(v) => setValue('sacramentoCrisma', !!v)}
                disabled={bloqueado}
              />
              <Label htmlFor="sacramentoCrisma" className="font-normal">Crisma</Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="convite" className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nomeConvidante">Nome de quem convidou</Label>
            <Input id="nomeConvidante" disabled={bloqueado} {...register('nomeConvidante')} />
          </div>
          <div>
            <Label htmlFor="telefoneConvidante">Telefone do convidante</Label>
            <Input id="telefoneConvidante" disabled={bloqueado} {...register('telefoneConvidante')} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="enderecoConvidante">Endereço do convidante</Label>
            <Input id="enderecoConvidante" disabled={bloqueado} {...register('enderecoConvidante')} />
          </div>
        </TabsContent>
      </Tabs>

      <div>
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" disabled={bloqueado} {...register('observacoes')} />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isEdit ? 'Salvar alterações' : 'Criar ficha'}
      </Button>
    </form>
  );
}
