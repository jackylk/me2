'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Code, Clock, Database } from 'lucide-react';

interface DebugInfo {
  prompt: string;
  performance: {
    total_time: number;
    recall_time?: number;
    llm_time?: number;
    token_count?: number;
  };
  memories_count?: number;
}

interface DebugPanelProps {
  debugInfo: DebugInfo;
}

export default function DebugPanel({ debugInfo }: DebugPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      {/* 调试信息摘要 */}
      <div className="flex items-center justify-between text-xs text-orange-400/80 mb-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 bg-orange-500/10 px-2 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            {(debugInfo.performance.total_time * 1000).toFixed(0)}ms
          </span>
          {debugInfo.memories_count !== undefined && (
            <span className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded-lg text-blue-400/80">
              <Database className="w-3.5 h-3.5" />
              {debugInfo.memories_count} 条
            </span>
          )}
          {debugInfo.performance.token_count && (
            <span className="flex items-center gap-1.5 bg-purple-500/10 px-2 py-1 rounded-lg text-purple-400/80">
              <Code className="w-3.5 h-3.5" />
              {debugInfo.performance.token_count} tokens
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 hover:text-orange-300 transition-colors px-2 py-1 rounded-lg hover:bg-orange-500/10"
        >
          {expanded ? '收起' : '详情'}
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* 展开的详细信息 */}
      {expanded && (
        <div className="mt-3 space-y-3 text-xs animate-in slide-in-from-top-2 duration-300">
          {/* 性能分解 */}
          <div className="bg-black/20 border border-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="font-semibold mb-2 text-orange-400/90 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              性能分解
            </div>
            <div className="space-y-1.5 text-gray-400">
              <div className="flex justify-between items-center">
                <span>总耗时</span>
                <span className="font-mono text-orange-400/80 bg-orange-500/10 px-2 py-0.5 rounded">
                  {(debugInfo.performance.total_time * 1000).toFixed(2)}ms
                </span>
              </div>
              {debugInfo.performance.recall_time !== undefined && (
                <div className="flex justify-between items-center">
                  <span>记忆召回</span>
                  <span className="font-mono text-blue-400/80 bg-blue-500/10 px-2 py-0.5 rounded">
                    {(debugInfo.performance.recall_time * 1000).toFixed(2)}ms
                  </span>
                </div>
              )}
              {debugInfo.performance.llm_time !== undefined && (
                <div className="flex justify-between items-center">
                  <span>LLM 生成</span>
                  <span className="font-mono text-purple-400/80 bg-purple-500/10 px-2 py-0.5 rounded">
                    {(debugInfo.performance.llm_time * 1000).toFixed(2)}ms
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div className="bg-black/20 border border-white/5 rounded-xl p-3 backdrop-blur-sm">
            <div className="font-semibold mb-2 text-orange-400/90 flex items-center gap-2">
              <Code className="w-4 h-4" />
              发送的 Prompt
            </div>
            <pre className="whitespace-pre-wrap text-gray-400 font-mono text-[11px] max-h-60 overflow-y-auto bg-black/30 rounded-lg p-3 border border-white/5 leading-relaxed">
              {debugInfo.prompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
