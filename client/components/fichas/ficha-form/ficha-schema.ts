import { z } from 'zod';

// Validação do formulário de Ficha do Jovem — mesmas regras que antes moravam em ficha-form.tsx.
export const fichaSchema = z.object({
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
  situacao: z.enum(['ATIVA', 'INATIVA']).optional(),
  motivoDesativacao: z.string().optional(),
  // Sementeira (implantação): marcado pela madrinha; null desmarca.
  sementeiraDeId: z.string().nullable().optional(),
});

export type FichaFormValues = z.infer<typeof fichaSchema>;
