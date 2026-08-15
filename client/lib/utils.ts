import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// A API devolve campos opcionais como `null`; react-hook-form espera `undefined` pra
// casar com o tipo inferido do schema zod (`string | undefined`, não `string | null`).
export function nullsToUndefined<T extends object>(obj: T): { [K in keyof T]: Exclude<T[K], null> | undefined } {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, value === null ? undefined : value]),
  ) as never;
}
