'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// Moldura das telas fora da sessão (login, esqueci a senha, redefinir senha) — painel de
// identidade à esquerda + coluna do formulário. Extraída do login pra as três ficarem iguais.
export function AuthLayout({ children }: { children: React.ReactNode }) {
  // Anima via transição real de estado (opacity/transform mudando depois do mount), não via
  // classe `animate-in` já presente na primeira renderização — a página é pré-renderizada como
  // estática, então uma classe de "entrada" já no HTML inicial não tem nenhuma mudança de
  // estado pra disparar a animação de verdade.
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisivel(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    // `dark` forçado — a tela de login é sempre escura, independente do tema (claro/escuro/
    // sistema) escolhido no resto do app. Sem isso, o painel de identidade (fixo em zinc-950)
    // e o formulário (que segue os tokens de tema normais) ficavam com metade clara/metade
    // escura quando o usuário estivesse no tema claro.
    <div className="dark flex min-h-screen bg-background text-foreground">
      {/* Painel de identidade — escondido em telas pequenas (o formulário sozinho já basta lá,
          com um logo pequeno no topo). Tom neutro escuro (zinc), não uma cor "de marca" — o
          design system do projeto evita cor institucional de propósito (é um sistema
          operacional, ver docs/design-system.md). */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-zinc-950 p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08), transparent 60%)',
          }}
        />
        <Image
          src="/logo-segue-me.png"
          alt="Segue-me"
          width={160}
          height={160}
          priority
          className="relative h-40 w-40 object-contain"
        />
        <h1 className="relative mt-6 text-xl font-semibold text-white">SGM Core</h1>
        <p className="relative mt-1 text-sm text-zinc-400">Segue-me — Diocese de Crato</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div
          className={`w-full max-w-sm transition-all duration-500 ease-out ${
            visivel ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/logo-segue-me.png"
              alt="Segue-me"
              width={80}
              height={80}
              priority
              className="h-20 w-20 object-contain"
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
