/*
  Warnings:

  - Added the required column `sexo` to the `Ficha` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('RAPAZ', 'MOCA');

-- AlterTable
-- Dados existentes são só o seed fake (docs/CLAUDE.md) — backfill com um valor
-- provisório e o seed re-roda depois pra popular de verdade.
ALTER TABLE "Ficha" ADD COLUMN     "sexo" "Sexo" NOT NULL DEFAULT 'RAPAZ';
ALTER TABLE "Ficha" ALTER COLUMN "sexo" DROP DEFAULT;
