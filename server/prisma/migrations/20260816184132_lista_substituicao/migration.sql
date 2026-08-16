-- CreateTable
CREATE TABLE "ListaSubstituicao" (
    "id" TEXT NOT NULL,
    "montagemId" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL,
    "fichaId" TEXT,
    "fichaCasalId" TEXT,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListaSubstituicao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListaSubstituicao_montagemId_idx" ON "ListaSubstituicao"("montagemId");

-- CreateIndex
CREATE UNIQUE INDEX "ListaSubstituicao_montagemId_fichaId_key" ON "ListaSubstituicao"("montagemId", "fichaId");

-- CreateIndex
CREATE UNIQUE INDEX "ListaSubstituicao_montagemId_fichaCasalId_key" ON "ListaSubstituicao"("montagemId", "fichaCasalId");

-- AddForeignKey
ALTER TABLE "ListaSubstituicao" ADD CONSTRAINT "ListaSubstituicao_montagemId_fkey" FOREIGN KEY ("montagemId") REFERENCES "Montagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaSubstituicao" ADD CONSTRAINT "ListaSubstituicao_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "Ficha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaSubstituicao" ADD CONSTRAINT "ListaSubstituicao_fichaCasalId_fkey" FOREIGN KEY ("fichaCasalId") REFERENCES "FichaCasal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
