'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, Bug } from 'lucide-react';
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
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-medium text-foreground">对话</h1>
          {sessionId && (
            <span className="text-sm text-muted-foreground">
              会话ID: {sessionId.slice(0, 8)}...
            </span>
          )}
        </div>
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            debugMode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Bug className="w-4 h-4" />
          调试模式
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-10">
            <p className="text-lg">开始和 Me2 聊天吧！</p>
            <p className="text-sm mt-2">我会记住你说的每一句话</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-md bg-[#2f3136] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            )}
            <div
              className={`flex flex-col ${
                message.role === 'user' ? 'items-end' : 'items-start'
              } max-w-[65%]`}
            >
              <div
                className={`rounded-3xl px-5 py-3.5 ${
                  message.role === 'user'
                    ? 'bg-[#5B7FEB] text-white'
                    : 'bg-[#2f3136] text-[#dcddde]'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</p>
                ) : (
                  <>
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-p:leading-relaxed prose-p:text-[15px] [&>*]:text-[#dcddde]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {message.debug_info && (
                      <DebugPanel debugInfo={message.debug_info} />
                    )}
                  </>
                )}
              </div>
              {message.timestamp && (
                <p className="text-[11px] text-muted-foreground/60 mt-1.5 px-2">
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
          <div className="flex justify-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-md bg-[#2f3136] flex items-center justify-center">
                <Bot className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="bg-[#2f3136] rounded-3xl px-5 py-3.5">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 px-6 py-4 bg-background">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            className="flex-1 resize-none bg-[#2f3136] text-[#dcddde] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5B7FEB]/50 placeholder:text-gray-500 text-[15px] min-h-[52px]"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-[#5B7FEB] text-white rounded-2xl px-6 py-3 hover:bg-[#4E6ED9] disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
