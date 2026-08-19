-- DropForeignKey
ALTER TABLE "Montagem" DROP CONSTRAINT "Montagem_paroquiaSementeiraId_fkey";

-- AlterTable
ALTER TABLE "Montagem"
  DROP COLUMN "ehSementeira",
  DROP COLUMN "paroquiaSementeiraId",
  DROP COLUMN "quantidadeFichasSementeira",
  ADD COLUMN "ehImplantacao" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "paroquiaAfilhadaNome" TEXT,
  ADD COLUMN "quantidadeJovensSementeira" INTEGER,
  ADD COLUMN "quantidadeCasaisAfilhada" INTEGER;
