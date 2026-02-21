'use client';

import { MessageCircle, Database } from 'lucide-react';
import SidebarItem from './SidebarItem';
import UserMenu from './UserMenu';

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-60 bg-[hsl(var(--sidebar))] border-r border-border h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Me2</h1>
        <p className="text-xs text-muted-foreground mt-0.5">AI 陪伴</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Primary */}
        <SidebarItem href="/" icon={MessageCircle} label="聊天" />
        <SidebarItem href="/memories" icon={Database} label="记忆" />
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-border">
        <UserMenu />
      </div>
    </aside>
  );
}
