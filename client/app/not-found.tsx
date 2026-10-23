import Link from 'next/link';
import { Button } from '@/components/ui/button';

// URL inexistente (link antigo, digitação errada). Vive fora dos grupos, sem sidebar — o
// botão leva pro início, e o layout de cada grupo redireciona o Conselho pra área dele.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          O endereço pode estar errado ou a página não existe mais.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
