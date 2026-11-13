// Implantação (R7, exceção): ficha de outra paróquia só circula na montagem com os dados de prévia
// da spec — nome, foto, encontro, círculo, sexo. Nunca telefone, endereço, filiação, religião ou
// observações (dado de menor e dado sensível, LGPD). Vale também depois do vínculo encerrado:
// a alocação continua na montagem, os dados completos não.
const CAMPOS_FICHA = [
  'id',
  'paroquiaId',
  'nomeCompleto',
  'sexo',
  'fotoUrl',
  'numeroEncontro',
  'corCirculo',
  'situacao',
  'jaFoiEquipeDirigente',
  'sementeiraDeId',
] as const;
const CAMPOS_CASAL = [
  'id',
  'paroquiaId',
  'nomeEle',
  'nomeEla',
  'fotoUrl',
  'situacao',
  'jaFoiEquipeDirigente',
] as const;

function recortar<T extends object>(obj: T, campos: readonly string[]): T {
  const recorte = Object.fromEntries(
    Object.entries(obj).filter(([chave]) => campos.includes(chave)),
  );
  // O tipo continua o da ficha pra não espalhar uniões pelo código; os campos fora da prévia
  // simplesmente não vêm.
  return recorte as T;
}

type ComParoquia = { paroquiaId?: string | null };

function deOutraParoquia(pessoa: ComParoquia | null | undefined, paroquiaId?: string | null) {
  return !!pessoa?.paroquiaId && !!paroquiaId && pessoa.paroquiaId !== paroquiaId;
}

export function previaFicha<T extends ComParoquia>(ficha: T, paroquiaId?: string | null): T {
  return deOutraParoquia(ficha, paroquiaId) ? recortar(ficha, CAMPOS_FICHA) : ficha;
}

export function previaCasal<T extends ComParoquia>(casal: T, paroquiaId?: string | null): T {
  return deOutraParoquia(casal, paroquiaId) ? recortar(casal, CAMPOS_CASAL) : casal;
}

// Alocação / item da lista de substituição: recorta `ficha` e `fichaCasal` quando são de outra
// paróquia que não a da montagem.
export function comPessoasEmPrevia<
  T extends { ficha?: ComParoquia | null; fichaCasal?: ComParoquia | null },
>(item: T, paroquiaId?: string | null): T {
  return {
    ...item,
    ...(item.ficha && { ficha: previaFicha(item.ficha, paroquiaId) }),
    ...(item.fichaCasal && { fichaCasal: previaCasal(item.fichaCasal, paroquiaId) }),
  };
}
