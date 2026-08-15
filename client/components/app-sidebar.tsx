'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileDown, LayoutGrid, UserRound, Users } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const fichasItems = [
  { title: 'Jovens', url: '/fichas', icon: UserRound },
  { title: 'Casais', url: '/fichas/casais', icon: Users },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            SM
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">SGM Core</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Fichas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {fichasItems.map((item) => {
                const isCasais = item.url === '/fichas/casais';
                const isActive = isCasais
                  ? pathname.startsWith('/fichas/casais')
                  : pathname === '/fichas' || (pathname.startsWith('/fichas/') && !pathname.startsWith('/fichas/casais'));
                return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled tooltip="Montagem — em breve">
                  <LayoutGrid />
                  <span>Montagem</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>em breve</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton disabled tooltip="Exportação — em breve">
                  <FileDown />
                  <span>Exportação</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>em breve</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
