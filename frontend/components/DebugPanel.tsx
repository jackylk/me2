'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Code, Clock, Database, Zap, MessageSquare, Activity } from 'lucide-react';

interface DebugInfo {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  messages?: Array<{ role: string; content: string }>;
  message_count?: number;
  system_prompt?: string;
  history_count?: number;
  timings?: {
    fetch_history?: number;
    save_user_message?: number;
    recall_memories?: number;
    fetch_insights?: number;
    build_prompt?: number;
    llm_generate?: number;
    save_to_db?: number;
    sync_neuromemory?: number;
    total?: number;
  };
  background_tasks?: string[];
}

interface DebugPanelProps {
  debugInfo: DebugInfo;
}

export default function DebugPanel({ debugInfo }: DebugPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const timings = debugInfo.timings || {};
  const totalTime = (timings.total || 0) * 1000;

  // 计算各步骤百分比
  const getPercentage = (time?: number) => {
    if (!time || !timings.total) return 0;
    return (time / timings.total) * 100;
  };

  // 性能步骤配置
  const performanceSteps = [
    { key: 'fetch_history', label: '获取历史', icon: Database, color: 'blue' },
    { key: 'recall_memories', label: '记忆召回', icon: Database, color: 'purple' },
    { key: 'fetch_insights', label: '获取洞察', icon: Zap, color: 'yellow' },
    { key: 'build_prompt', label: '构建Prompt', icon: Code, color: 'green' },
    { key: 'llm_generate', label: 'LLM生成', icon: MessageSquare, color: 'orange' },
    { key: 'save_to_db', label: '保存数据', icon: Database, color: 'cyan' },
    { key: 'sync_neuromemory', label: '同步记忆', icon: Activity, color: 'pink' },
  ];

  // 找出最慢的步骤
  const slowestStep = performanceSteps.reduce((max, step) => {
    const time = timings[step.key as keyof typeof timings] || 0;
    const maxTime = timings[max.key as keyof typeof timings] || 0;
    return time > maxTime ? step : max;
  }, performanceSteps[0]);

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      cyan: 'bg-cyan-500',
      pink: 'bg-pink-500',
    };
    return colors[color] || 'bg-gray-500';
  };

  return (
    <div className="mt-3 border-t border-white/10 pt-3 space-y-3">
      {/* 性能摘要 */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 bg-orange-500/10 px-2 py-1 rounded-lg text-orange-400/80">
            <Clock className="w-3.5 h-3.5" />
            {totalTime.toFixed(0)}ms
          </span>
          {debugInfo.history_count !== undefined && (
            <span className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded-lg text-blue-400/80">
              <MessageSquare className="w-3.5 h-3.5" />
              {debugInfo.history_count} 条历史
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 hover:text-orange-300 transition-colors px-2 py-1 rounded-lg hover:bg-orange-500/10 text-orange-400/80"
        >
          {expanded ? '收起' : '性能详情'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 展开的性能详情 */}
      {expanded && (
        <div className="space-y-3 text-xs animate-in slide-in-from-top-2 duration-300">
          {/* 性能分解 - 可视化时间线 */}
          <div className="bg-black/20 border border-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="font-semibold mb-3 text-orange-400/90 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              性能分解时间线
            </div>
            <div className="space-y-2">
              {performanceSteps.map((step) => {
                const time = timings[step.key as keyof typeof timings];
                if (!time) return null;

                const ms = time * 1000;
                const percentage = getPercentage(time);
                const isSlowest = step.key === slowestStep.key;

                return (
                  <div key={step.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`flex items-center gap-1.5 ${isSlowest ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                        <step.icon className="w-3 h-3" />
                        {step.label}
                        {isSlowest && <span className="text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded text-red-400">瓶颈</span>}
                      </span>
                      <span className={`font-mono ${isSlowest ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                        {ms.toFixed(1)}ms ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${getColorClass(step.color)} transition-all duration-500 ${isSlowest ? 'animate-pulse' : ''}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 总计 */}
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-orange-400">总耗时</span>
                <span className="text-orange-400 font-mono">{totalTime.toFixed(1)}ms</span>
              </div>
            </div>
          </div>

          {/* 完整Prompt */}
          <div className="bg-black/20 border border-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-orange-400/90 flex items-center gap-2">
                <Code className="w-4 h-4" />
                完整对话Prompt
                {debugInfo.message_count && (
                  <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-400">
                    {debugInfo.message_count} 条消息
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="text-orange-400/80 hover:text-orange-300 transition-colors px-2 py-1 rounded-lg hover:bg-orange-500/10 text-[11px]"
              >
                {showPrompt ? '隐藏' : '查看'}
              </button>
            </div>

            {showPrompt && debugInfo.messages && (
              <div className="mt-2 space-y-2 max-h-96 overflow-y-auto">
                {debugInfo.messages.map((msg, idx) => (
                  <div key={idx} className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        msg.role === 'system' ? 'bg-purple-500/20 text-purple-400' :
                        msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {msg.role.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-500">第 {idx + 1} 条</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-gray-300 font-mono text-[11px] leading-relaxed">
                      {msg.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 模型参数 */}
          {debugInfo.model && (
            <div className="bg-black/20 border border-white/5 rounded-xl p-3 backdrop-blur-sm">
              <div className="font-semibold mb-2 text-orange-400/90 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                模型参数
              </div>
              <div className="grid grid-cols-3 gap-2 text-gray-400">
                <div>
                  <div className="text-[10px] text-gray-500">模型</div>
                  <div className="font-mono text-[11px]">{debugInfo.model}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Temperature</div>
                  <div className="font-mono text-[11px]">{debugInfo.temperature}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Max Tokens</div>
                  <div className="font-mono text-[11px]">{debugInfo.max_tokens}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
