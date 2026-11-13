import type { SementeiraDaFicha } from './types';

// Marca de sementeira da ficha, conforme quem está olhando: na madrinha (antes da implantação
// começar) diz de qual afilhada é; na afilhada (depois da transferência) diz onde vivenciou.
export function marcaSementeira(ficha: {
  paroquiaId: string;
  sementeiraDe?: SementeiraDaFicha | null;
}): string | null {
  const s = ficha.sementeiraDe;
  if (!s) return null;
  if (ficha.paroquiaId === s.afilhada.id) return `Vivenciou como sementeira na ${s.madrinha.nome}`;
  return `Sementeira de ${s.afilhada.nome}`;
}
