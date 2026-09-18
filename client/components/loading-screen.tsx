import Image from 'next/image';

// Tela de carregamento entre o login e a área logada (checagem de sessão via useSessao()) —
// logo com uma "respiração" suave (escala + opacidade, ver .animate-breathe em globals.css),
// em vez de só texto. Usada em (app)/layout.tsx e (conselho)/layout.tsx enquanto a sessão
// ainda não resolveu. Segue o tema normal do app (claro/escuro), diferente da tela de login
// (que é sempre escura) — aqui já estamos "dentro" do app.
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <Image
        src="/logo-segue-me.png"
        alt="Segue-me"
        width={64}
        height={64}
        className="h-16 w-16 animate-breathe object-contain"
      />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  );
}
