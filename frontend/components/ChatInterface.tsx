'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Heart, Bug } from 'lucide-react';
import { apiClient, ChatMessage } from '@/lib/api-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DebugPanel from './DebugPanel';

interface ChatInterfaceProps {
  userId: string;
}

export default function ChatInterface({ userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [debugMode, setDebugMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const messageToSend = input;
    setInput('');
    setIsLoading(true);

    // 一次性添加用户消息和空的助手消息
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        role: 'assistant' as const,
        content: '',
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      let fullResponse = '';
      let debugInfo: any = null;

      // 使用流式API
      for await (const chunk of apiClient.chatStream(messageToSend, sessionId, debugMode)) {
        if (chunk.type === 'token') {
          // 累积响应内容
          fullResponse += chunk.content || '';

          // 更新最后一条消息（助手消息）
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: fullResponse,
            };
            return newMessages;
          });
        } else if (chunk.type === 'done') {
          // 保存session_id
          if (chunk.session_id) {
            setSessionId(chunk.session_id);
          }
          // 保存debug_info
          if (chunk.debug_info) {
            debugInfo = chunk.debug_info;
          }
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error || '未知错误');
        }
      }

      // 如果有debug信息，更新消息
      if (debugInfo) {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            debug_info: debugInfo,
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('发送消息失败:', error);

      // 更新最后一条消息为错误消息
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          content: '抱歉，我遇到了一些问题，请稍后再试。',
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Debug Toggle */}
      <div className="flex justify-end p-2 border-b border-border bg-card">
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            debugMode
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          <Bug className="w-4 h-4" />
          {debugMode ? '调试已开启' : '开启调试'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-10">
            <p className="text-lg">开始和 Me2 聊天吧！</p>
            <p className="text-sm mt-2">我会记住你说的每一句话</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 mr-2">
                <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-pink-500" />
                </div>
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-secondary text-foreground'
              }`}
            >
              {message.role === 'user' ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  {message.debug_info && (
                    <DebugPanel debugInfo={message.debug_info} />
                  )}
                </>
              )}
              {message.timestamp && (
                <p
                  className={`text-xs mt-1 ${
                    message.role === 'user'
                      ? 'text-blue-100'
                      : 'text-muted-foreground'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex-shrink-0 mr-2">
              <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
            </div>
            <div className="bg-secondary rounded-lg px-4 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            className="flex-1 resize-none border border-input bg-background text-foreground rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-primary text-primary-foreground rounded-lg px-6 py-2 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
