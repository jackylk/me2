'use client';

import { useEffect, useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import Navigation from '@/components/Navigation';
import ProactiveMessageBanner from '@/components/ProactiveMessage';

export default function Home() {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // 从 localStorage 获取或生成 userId
    let storedUserId = localStorage.getItem('me2_user_id');
    if (!storedUserId) {
      storedUserId = `user_${Date.now()}`;
      localStorage.setItem('me2_user_id', storedUserId);
    }
    setUserId(storedUserId);
  }, []);

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <ProactiveMessageBanner userId={userId} />
      <div className="flex-1 overflow-hidden">
        <ChatInterface userId={userId} />
      </div>
    </div>
  );
}
