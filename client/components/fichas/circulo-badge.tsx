import { CORES_CIRCULO, type CorCirculo } from '@/lib/types';

// Badge de círculo: pílula sólida com o hex exato + nome por extenso, sempre —
// mesma badge reaproveitada em qualquer lugar do sistema (ver docs/design-system.md, seção 1 e 3).
function getTextColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#18181b' : '#ffffff';
}

export function CirculoBadge({ cor }: { cor: CorCirculo }) {
  const info = CORES_CIRCULO.find((c) => c.value === cor);
  if (!info) return null;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: info.hex, color: getTextColor(info.hex) }}
    >
      {info.label}
    </span>
  );
}
