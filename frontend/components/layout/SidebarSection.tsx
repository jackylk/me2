'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function SidebarSection({ title, children, defaultOpen = false }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{title}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>
      <div
        className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
