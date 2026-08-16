-- CreateEnum
CREATE TYPE "StatusMontagem" AS ENUM ('EM_ANDAMENTO', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('JOVEM', 'CASAL');

-- CreateEnum
CREATE TYPE "StatusConvite" AS ENUM ('RASCUNHO', 'CONVIDADO', 'ACEITO', 'RECUSADO', 'DESISTIU', 'SUBSTITUIDO');

-- CreateTable
CREATE TABLE "Equipe" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "ehCirculos" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL,
    "equipeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "quantidadeCasais" INTEGER NOT NULL DEFAULT 0,
    "quantidadeRapazes" INTEGER NOT NULL DEFAULT 0,
    "quantidadeMocas" INTEGER NOT NULL DEFAULT 0,
    "quantidadeDinamica" BOOLEAN NOT NULL DEFAULT false,
    "ehCoordenacao" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Montagem" (
    "id" TEXT NOT NULL,
    "paroquiaId" TEXT NOT NULL,
    "numeroEncontro" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "padroeiro" TEXT,
    "diretorEspiritual" TEXT,
    "ehSementeira" BOOLEAN NOT NULL DEFAULT false,
    "paroquiaSementeiraId" TEXT,
    "quantidadeFichasSementeira" INTEGER,
    "numeroJovensVivenciando" INTEGER NOT NULL,
    "status" "StatusMontagem" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Montagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VagaMontagem" (
    "id" TEXT NOT NULL,
    "montagemId" TEXT NOT NULL,
    "equipeId" TEXT NOT NULL,
    "cargoId" TEXT NOT NULL,
    "quantidadeCasais" INTEGER NOT NULL,
    "quantidadeRapazes" INTEGER NOT NULL,
    "quantidadeMocas" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VagaMontagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alocacao" (
    "id" TEXT NOT NULL,
    "vagaMontagemId" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL,
    "fichaId" TEXT,
    "fichaCasalId" TEXT,
    "status" "StatusConvite" NOT NULL DEFAULT 'RASCUNHO',
    "dataConvite" TIMESTAMP(3),
    "dataResposta" TIMESTAMP(3),
    "motivoRecusa" TEXT,
    "podeCoordenar" BOOLEAN,
    "podePalestrar" BOOLEAN,
    "observacoesAvaliacao" TEXT,
    "substituidaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alocacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipe_nome_key" ON "Equipe"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Equipe_slug_key" ON "Equipe"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_equipeId_nome_key" ON "Cargo"("equipeId", "nome");

-- CreateIndex
CREATE INDEX "Montagem_paroquiaId_idx" ON "Montagem"("paroquiaId");

-- CreateIndex
CREATE UNIQUE INDEX "Montagem_paroquiaId_numeroEncontro_key" ON "Montagem"("paroquiaId", "numeroEncontro");

-- CreateIndex
CREATE INDEX "VagaMontagem_montagemId_idx" ON "VagaMontagem"("montagemId");

-- CreateIndex
CREATE INDEX "VagaMontagem_equipeId_idx" ON "VagaMontagem"("equipeId");

-- CreateIndex
CREATE UNIQUE INDEX "Alocacao_substituidaPorId_key" ON "Alocacao"("substituidaPorId");

-- CreateIndex
CREATE INDEX "Alocacao_vagaMontagemId_idx" ON "Alocacao"("vagaMontagemId");

-- CreateIndex
CREATE INDEX "Alocacao_fichaId_idx" ON "Alocacao"("fichaId");

-- CreateIndex
CREATE INDEX "Alocacao_fichaCasalId_idx" ON "Alocacao"("fichaCasalId");

-- AddForeignKey
ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Montagem" ADD CONSTRAINT "Montagem_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Montagem" ADD CONSTRAINT "Montagem_paroquiaSementeiraId_fkey" FOREIGN KEY ("paroquiaSementeiraId") REFERENCES "Paroquia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VagaMontagem" ADD CONSTRAINT "VagaMontagem_montagemId_fkey" FOREIGN KEY ("montagemId") REFERENCES "Montagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VagaMontagem" ADD CONSTRAINT "VagaMontagem_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VagaMontagem" ADD CONSTRAINT "VagaMontagem_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alocacao" ADD CONSTRAINT "Alocacao_vagaMontagemId_fkey" FOREIGN KEY ("vagaMontagemId") REFERENCES "VagaMontagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alocacao" ADD CONSTRAINT "Alocacao_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "Ficha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alocacao" ADD CONSTRAINT "Alocacao_fichaCasalId_fkey" FOREIGN KEY ("fichaCasalId") REFERENCES "FichaCasal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alocacao" ADD CONSTRAINT "Alocacao_substituidaPorId_fkey" FOREIGN KEY ("substituidaPorId") REFERENCES "Alocacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
