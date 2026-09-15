'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/lib/auth-context';

export function LogoutButton() {
  const logout = useLogout();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      title="Sair"
      aria-label="Sair"
    >
      <LogOut className="h-[1.1rem] w-[1.1rem]" />
    </Button>
  );
}
