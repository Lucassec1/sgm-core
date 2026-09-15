-- AlterTable
ALTER TABLE "Ficha" ADD COLUMN     "termoAssinado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termoAssinadoEm" TIMESTAMP(3);
