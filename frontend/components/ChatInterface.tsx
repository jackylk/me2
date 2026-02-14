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

      console.log('[ChatInterface] 开始流式对话', { messageToSend, sessionId, debugMode });

      // 使用流式API
      for await (const chunk of apiClient.chatStream(messageToSend, sessionId, debugMode)) {
        console.log('[ChatInterface] 收到chunk:', chunk);

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
          console.log('[ChatInterface] 收到done信号', chunk);
          // 保存session_id
          if (chunk.session_id) {
            setSessionId(chunk.session_id);
          }
          // 保存debug_info
          if (chunk.debug_info) {
            debugInfo = chunk.debug_info;
            console.log('[ChatInterface] 保存debug_info:', debugInfo);
          }
        } else if (chunk.type === 'error') {
          console.error('[ChatInterface] 收到error chunk:', chunk);
          throw new Error(chunk.error || '未知错误');
        }
      }

      console.log('[ChatInterface] 流式对话完成', { fullResponse, debugInfo });

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/30 bg-gradient-to-b from-background to-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-foreground/90">对话</h1>
          {sessionId && (
            <span className="text-xs text-muted-foreground/70 font-mono bg-secondary/30 px-2 py-0.5 rounded">
              {sessionId.slice(0, 8)}
            </span>
          )}
        </div>
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
            debugMode
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Bug className="w-4 h-4" />
          调试
        </button>
      </div>

      {/* Main content - 左右布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Area */}
        <div className={`flex flex-col transition-all duration-300 ${debugMode ? 'w-2/3' : 'w-full'}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-xl font-medium text-foreground/80 mb-2">开始和 Me2 聊天吧！</p>
            <p className="text-sm text-muted-foreground/60">我会记住你说的每一句话</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-4 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } animate-in fade-in slide-in-from-bottom-2 duration-500`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3a3d42] to-[#2a2d32] flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5 text-blue-400/80" />
                </div>
              </div>
            )}
            <div
              className={`flex flex-col ${
                message.role === 'user' ? 'items-end' : 'items-start'
              } max-w-[70%]`}
            >
              <div
                className={`rounded-2xl px-4 py-2.5 backdrop-blur-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-[#5B7FEB] to-[#4E6FDB] text-white shadow-lg shadow-blue-500/20'
                    : 'bg-gradient-to-br from-[#2f3136] to-[#292b30] text-[#dcddde] shadow-lg shadow-black/10 border border-white/5'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-[15px] font-normal">{message.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-p:text-[15px] [&>*]:text-[#dcddde] prose-headings:text-[#e8e9ea] prose-strong:text-[#e8e9ea] prose-code:text-blue-300 prose-code:bg-black/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {message.timestamp && (
                <p className="text-[11px] text-muted-foreground/50 mt-2 px-2 font-mono">
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
          <div className="flex justify-start gap-4 animate-in fade-in duration-300">
            <div className="flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3a3d42] to-[#2a2d32] flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-blue-400/80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2f3136] to-[#292b30] rounded-3xl px-6 py-4 shadow-xl shadow-black/10 border border-white/5">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400/60" />
            </div>
          </div>
        )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/20 px-6 py-4 bg-gradient-to-t from-background via-background to-background/50 backdrop-blur-sm">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            className="flex-1 resize-none bg-gradient-to-br from-[#2f3136] to-[#292b30] text-[#dcddde] rounded-3xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#5B7FEB]/40 focus:shadow-lg focus:shadow-blue-500/10 placeholder:text-gray-500/60 text-[15px] min-h-[56px] border border-white/5 transition-all"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-br from-[#5B7FEB] to-[#4E6FDB] text-white rounded-3xl px-7 py-4 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100 transition-all duration-200 flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
            </div>
          </div>
        </div>

        {/* Right: Debug Panel */}
        {debugMode && (
          <div className="w-1/3 border-l border-border/30 bg-gradient-to-b from-background/50 to-background flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Debug Header */}
            <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
              <div className="flex items-center gap-2 text-orange-400">
                <Bug className="w-4 h-4" />
                <span className="font-semibold text-sm">调试面板</span>
              </div>
            </div>

            {/* Debug Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages
                .filter((msg) => msg.role === 'assistant' && msg.debug_info)
                .map((msg, idx) => (
                  <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <span className="font-mono">#{messages.indexOf(msg) + 1}</span>
                      <span>·</span>
                      <span>
                        {new Date(msg.timestamp!).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {msg.debug_info && <DebugPanel debugInfo={msg.debug_info} />}
                  </div>
                ))}
              {messages.filter((msg) => msg.role === 'assistant' && msg.debug_info).length === 0 && (
                <div className="text-center text-muted-foreground/50 mt-12">
                  <Bug className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">开始对话后将显示调试信息</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
