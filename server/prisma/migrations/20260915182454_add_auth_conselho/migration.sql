-- CreateEnum
CREATE TYPE "RoleUsuario" AS ENUM ('PAROQUIA', 'CONSELHO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" "RoleUsuario" NOT NULL,
    "nome" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "paroquiaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObservacaoMontagem" (
    "id" TEXT NOT NULL,
    "montagemId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObservacaoMontagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_login_key" ON "Usuario"("login");

-- CreateIndex
CREATE INDEX "Usuario_paroquiaId_idx" ON "Usuario"("paroquiaId");

-- CreateIndex
CREATE INDEX "ObservacaoMontagem_montagemId_idx" ON "ObservacaoMontagem"("montagemId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacaoMontagem" ADD CONSTRAINT "ObservacaoMontagem_montagemId_fkey" FOREIGN KEY ("montagemId") REFERENCES "Montagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacaoMontagem" ADD CONSTRAINT "ObservacaoMontagem_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
