'use client';

import { useState, useEffect, useCallback } from 'react';
import ChatInterface from '@/components/ChatInterface';
import SessionSidebar from '@/components/chat/SessionSidebar';
import ProactiveMessageBanner from '@/components/ProactiveMessage';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

const STORAGE_KEY = 'me2_current_session';

export default function Home() {
  const { userId } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCurrentSessionId(saved);
    }
  }, []);

  const handleSessionChange = useCallback(async (sessionId: string, isNew: boolean) => {
    setCurrentSessionId(sessionId);
    localStorage.setItem(STORAGE_KEY, sessionId);

    if (isNew) {
      try {
        await apiClient.generateTitle(sessionId);
      } catch (err) {
        console.error('自动生成标题失败:', err);
      }
    }

    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    localStorage.setItem(STORAGE_KEY, sessionId);
    setMobileSidebarOpen(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(undefined);
    localStorage.removeItem(STORAGE_KEY);
    setMobileSidebarOpen(false);
  }, []);

  return (
    <ProtectedRoute>
      <div className="h-full flex flex-col">
        <ProactiveMessageBanner userId={userId || ''} />
        <div className="flex-1 flex overflow-hidden relative">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <SessionSidebar
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Mobile sidebar overlay */}
          {mobileSidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}
          <div
            className={`md:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <SessionSidebar
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              userId={userId || ''}
              sessionId={currentSessionId}
              onSessionChange={handleSessionChange}
              onOpenSidebar={() => setMobileSidebarOpen(true)}
              onNewChat={handleNewChat}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
