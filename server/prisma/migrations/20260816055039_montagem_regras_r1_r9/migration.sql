-- AlterTable
ALTER TABLE "Equipe" ADD COLUMN     "bloqueiaConvitePosCirculos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "repeticaoLimiteFlexivel" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ficha" ADD COLUMN     "jaFoiEquipeDirigente" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FichaCasal" ADD COLUMN     "jaFoiEquipeDirigente" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LogAtividade" (
    "id" TEXT NOT NULL,
    "montagemId" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogAtividade_montagemId_idx" ON "LogAtividade"("montagemId");

-- AddForeignKey
ALTER TABLE "LogAtividade" ADD CONSTRAINT "LogAtividade_montagemId_fkey" FOREIGN KEY ("montagemId") REFERENCES "Montagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
