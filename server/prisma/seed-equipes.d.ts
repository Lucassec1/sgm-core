import { PrismaClient } from '@prisma/client';
type CargoSeed = {
  nome: string;
  ordem: number;
  quantidadeCasais?: number;
  quantidadeRapazes?: number;
  quantidadeMocas?: number;
  quantidadeDinamica?: boolean;
  ehCoordenacao?: boolean;
};
type EquipeSeed = {
  nome: string;
  slug: string;
  ordem: number;
  ehCirculos?: boolean;
  bloqueiaConvitePosCirculos?: boolean;
  repeticaoLimiteFlexivel?: boolean;
  coordenacaoCasalExigeHistorico?: boolean;
  cargos: CargoSeed[];
};
export declare const EQUIPES: EquipeSeed[];
export declare function seedEquipesECargos(prisma: PrismaClient): Promise<{
  totalEquipes: number;
  totalCargos: number;
}>;
export {};
