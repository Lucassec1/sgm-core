-- CreateTable
CREATE TABLE "QuadranteArquivo" (
    "id" TEXT NOT NULL,
    "montagemId" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "armazenadoComo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "usuario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuadranteArquivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuadranteArquivo_montagemId_idx" ON "QuadranteArquivo"("montagemId");

-- AddForeignKey
ALTER TABLE "QuadranteArquivo" ADD CONSTRAINT "QuadranteArquivo_montagemId_fkey" FOREIGN KEY ("montagemId") REFERENCES "Montagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
