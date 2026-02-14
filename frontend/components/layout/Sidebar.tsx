'use client';

import { MessageCircle, Database, User, Upload, Bell, Brain, Image } from 'lucide-react';
import SidebarItem from './SidebarItem';
import SidebarSection from './SidebarSection';
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

        {/* Tools section */}
        <div className="pt-3">
          <SidebarSection title="工具" defaultOpen={false}>
            <SidebarItem href="/profile" icon={User} label="画像" />
            <SidebarItem href="/import" icon={Upload} label="导入" />
            <SidebarItem href="/proactive" icon={Bell} label="关心" />
            <SidebarItem href="/analysis" icon={Brain} label="分析" />
            <SidebarItem href="/images" icon={Image} label="图片" />
          </SidebarSection>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-border">
        <UserMenu />
      </div>
    </aside>
  );
}
