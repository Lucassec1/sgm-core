-- CreateEnum
CREATE TYPE "CorCirculo" AS ENUM ('VERMELHO', 'AZUL', 'VERDE', 'AMARELO', 'ROSA', 'LARANJA');

-- CreateEnum
CREATE TYPE "SituacaoFicha" AS ENUM ('ATIVA', 'INATIVA');

-- CreateTable
CREATE TABLE "Paroquia" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paroquia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ficha" (
    "id" TEXT NOT NULL,
    "paroquiaId" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "naturalidade" TEXT,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "fotoUrl" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "nomePai" TEXT,
    "nomeMae" TEXT,
    "grauEscolaridade" TEXT,
    "curso" TEXT,
    "instituicao" TEXT,
    "situacaoEscolar" TEXT,
    "religiao" TEXT,
    "igrejaQueFrequenta" TEXT,
    "participaOutroMovimento" BOOLEAN NOT NULL DEFAULT false,
    "qualMovimento" TEXT,
    "sacramentoBatismo" BOOLEAN NOT NULL DEFAULT false,
    "sacramentoEucaristia" BOOLEAN NOT NULL DEFAULT false,
    "sacramentoCrisma" BOOLEAN NOT NULL DEFAULT false,
    "nomeConvidante" TEXT,
    "telefoneConvidante" TEXT,
    "enderecoConvidante" TEXT,
    "observacoes" TEXT,
    "numeroEncontro" INTEGER NOT NULL,
    "corCirculo" "CorCirculo" NOT NULL,
    "situacao" "SituacaoFicha" NOT NULL DEFAULT 'ATIVA',
    "motivoDesativacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ficha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ficha_paroquiaId_idx" ON "Ficha"("paroquiaId");

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
