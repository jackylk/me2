'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, User, Upload, Bell, Brain, Database, Image } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              Me2
            </Link>
            <div className="flex gap-4">
              <Link
                href="/"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  pathname === '/'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>聊天</span>
              </Link>
              <Link
                href="/profile"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  pathname === '/profile'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>画像</span>
              </Link>
              <Link
                href="/import"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  pathname === '/import'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>导入</span>
              </Link>
              <Link
                href="/proactive"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  pathname === '/proactive'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>关心</span>
              </Link>
              <Link
                href="/analysis"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  pathname === '/analysis'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>分析</span>
              </Link>
              <Link
                href="/memories"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  pathname === '/memories'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>记忆</span>
              </Link>
              <Link
                href="/images"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  pathname === '/images'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Image className="w-4 h-4" />
                <span>图片</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
