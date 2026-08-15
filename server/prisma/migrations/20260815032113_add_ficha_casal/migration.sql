-- CreateTable
CREATE TABLE "FichaCasal" (
    "id" TEXT NOT NULL,
    "paroquiaId" TEXT NOT NULL,
    "nomeEle" TEXT NOT NULL,
    "nomeEla" TEXT NOT NULL,
    "dataNascimentoEle" TIMESTAMP(3),
    "dataNascimentoEla" TIMESTAMP(3),
    "telefoneEle" TEXT NOT NULL,
    "telefoneEla" TEXT NOT NULL,
    "emailEle" TEXT,
    "emailEla" TEXT,
    "fotoUrl" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "temFilhosNoSegueMe" BOOLEAN NOT NULL DEFAULT false,
    "observacoesFilhos" TEXT,
    "observacoes" TEXT,
    "situacao" "SituacaoFicha" NOT NULL DEFAULT 'ATIVA',
    "motivoDesativacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FichaCasal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FichaCasal_paroquiaId_idx" ON "FichaCasal"("paroquiaId");

-- AddForeignKey
ALTER TABLE "FichaCasal" ADD CONSTRAINT "FichaCasal_paroquiaId_fkey" FOREIGN KEY ("paroquiaId") REFERENCES "Paroquia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
