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
    <div className="mt-2 border-t border-border pt-2">
      {/* 调试信息摘要 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {(debugInfo.performance.total_time * 1000).toFixed(0)}ms
          </span>
          {debugInfo.memories_count !== undefined && (
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {debugInfo.memories_count} 条记忆
            </span>
          )}
          {debugInfo.performance.token_count && (
            <span className="flex items-center gap-1">
              <Code className="w-3 h-3" />
              {debugInfo.performance.token_count} tokens
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {expanded ? '收起' : '详情'}
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* 展开的详细信息 */}
      {expanded && (
        <div className="mt-2 space-y-2 text-xs">
          {/* 性能分解 */}
          <div className="bg-muted/50 rounded p-2">
            <div className="font-semibold mb-1 text-foreground">性能分解</div>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>总耗时:</span>
                <span className="font-mono">
                  {(debugInfo.performance.total_time * 1000).toFixed(2)}ms
                </span>
              </div>
              {debugInfo.performance.recall_time !== undefined && (
                <div className="flex justify-between">
                  <span>记忆召回:</span>
                  <span className="font-mono">
                    {(debugInfo.performance.recall_time * 1000).toFixed(2)}ms
                  </span>
                </div>
              )}
              {debugInfo.performance.llm_time !== undefined && (
                <div className="flex justify-between">
                  <span>LLM 生成:</span>
                  <span className="font-mono">
                    {(debugInfo.performance.llm_time * 1000).toFixed(2)}ms
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div className="bg-muted/50 rounded p-2">
            <div className="font-semibold mb-1 text-foreground">发送的 Prompt</div>
            <pre className="whitespace-pre-wrap text-muted-foreground font-mono text-[10px] max-h-40 overflow-y-auto">
              {debugInfo.prompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
