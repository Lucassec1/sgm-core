-- CreateEnum
CREATE TYPE "FaseImplantacao" AS ENUM ('SEMENTEIRA', 'IMPLANTACAO', 'ACOMPANHAMENTO', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "OrigemVaga" AS ENUM ('MADRINHA', 'AFILHADA');

-- AlterTable
ALTER TABLE "Ficha" ADD COLUMN     "sementeiraDeId" TEXT;

-- AlterTable
ALTER TABLE "Montagem" ADD COLUMN     "anexoImplantacao" INTEGER,
ADD COLUMN     "implantacaoId" TEXT,
ADD COLUMN     "sementeiraDeImplantacaoId" TEXT;

-- AlterTable
ALTER TABLE "VagaMontagem" ADD COLUMN     "origem" "OrigemVaga",
ADD COLUMN     "quantidadeJovens" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Implantacao" (
    "id" TEXT NOT NULL,
    "madrinhaId" TEXT NOT NULL,
    "afilhadaId" TEXT NOT NULL,
    "fase" "FaseImplantacao" NOT NULL DEFAULT 'SEMENTEIRA',
    "criadaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "implantacaoIniciadaEm" TIMESTAMP(3),
    "acompanhamentoIniciadoEm" TIMESTAMP(3),
    "encerradaEm" TIMESTAMP(3),

    CONSTRAINT "Implantacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiberacaoFicha" (
    "id" TEXT NOT NULL,
    "implantacaoId" TEXT NOT NULL,
    "fichaId" TEXT,
    "fichaCasalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiberacaoFicha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Implantacao_madrinhaId_idx" ON "Implantacao"("madrinhaId");

-- CreateIndex
CREATE INDEX "Implantacao_afilhadaId_idx" ON "Implantacao"("afilhadaId");

-- CreateIndex
CREATE UNIQUE INDEX "LiberacaoFicha_implantacaoId_fichaId_key" ON "LiberacaoFicha"("implantacaoId", "fichaId");

-- CreateIndex
CREATE UNIQUE INDEX "LiberacaoFicha_implantacaoId_fichaCasalId_key" ON "LiberacaoFicha"("implantacaoId", "fichaCasalId");

-- AddForeignKey
ALTER TABLE "Implantacao" ADD CONSTRAINT "Implantacao_madrinhaId_fkey" FOREIGN KEY ("madrinhaId") REFERENCES "Paroquia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Implantacao" ADD CONSTRAINT "Implantacao_afilhadaId_fkey" FOREIGN KEY ("afilhadaId") REFERENCES "Paroquia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Implantacao" ADD CONSTRAINT "Implantacao_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiberacaoFicha" ADD CONSTRAINT "LiberacaoFicha_implantacaoId_fkey" FOREIGN KEY ("implantacaoId") REFERENCES "Implantacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiberacaoFicha" ADD CONSTRAINT "LiberacaoFicha_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "Ficha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiberacaoFicha" ADD CONSTRAINT "LiberacaoFicha_fichaCasalId_fkey" FOREIGN KEY ("fichaCasalId") REFERENCES "FichaCasal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_sementeiraDeId_fkey" FOREIGN KEY ("sementeiraDeId") REFERENCES "Implantacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Montagem" ADD CONSTRAINT "Montagem_sementeiraDeImplantacaoId_fkey" FOREIGN KEY ("sementeiraDeImplantacaoId") REFERENCES "Implantacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Montagem" ADD CONSTRAINT "Montagem_implantacaoId_fkey" FOREIGN KEY ("implantacaoId") REFERENCES "Implantacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
