'use client';

import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';

// 使用动态导入来避免 SSR 问题
let cytoscape: any = null;
let cytoscapeFcose: any = null;

interface MemoryGraphProps {
  elements: {
    nodes: Array<{ data: any }>;
    edges: Array<{ data: any }>;
  };
  onNodeClick?: (nodeData: any) => void;
}

export default function MemoryGraph({
  elements,
  onNodeClick,
}: MemoryGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // 动态导入 Cytoscape
    const loadCytoscape = async () => {
      try {
        if (!cytoscape) {
          cytoscape = (await import('cytoscape')).default;
          cytoscapeFcose = (await import('cytoscape-fcose')).default;
          cytoscape.use(cytoscapeFcose);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load Cytoscape:', err);
        setError('加载图谱库失败');
        setIsLoading(false);
      }
    };

    loadCytoscape();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !cytoscape || isLoading) return;

    // 清理旧实例
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // 创建新实例
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => {
              const type = ele.data('type');
              const colors: Record<string, string> = {
                keyword: '#3B82F6',
                person: '#EC4899',
                place: '#10B981',
                event: '#F59E0B',
                unknown: '#6B7280',
              };
              return colors[type] || colors.unknown;
            },
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            color: '#fff',
            'font-size': '12px',
            'font-weight': 'bold',
            width: (ele: any) => {
              const count = ele.data('count') || 1;
              return Math.min(60, 30 + count * 2);
            },
            height: (ele: any) => {
              const count = ele.data('count') || 1;
              return Math.min(60, 30 + count * 2);
            },
            'text-wrap': 'wrap',
            'text-max-width': '80px',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#CBD5E1',
            'target-arrow-color': '#CBD5E1',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '10px',
            color: '#64748B',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#1E40AF',
          },
        },
      ],
      layout: {
        name: 'fcose',
        quality: 'proof',
        randomize: false,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 50,
        nodeSeparation: 100,
        idealEdgeLength: 150,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    // 节点点击事件
    if (onNodeClick) {
      cyRef.current.on('tap', 'node', (event: any) => {
        const nodeData = event.target.data();
        onNodeClick(nodeData);
      });
    }

    // 节点悬停效果
    cyRef.current.on('mouseover', 'node', (event: any) => {
      event.target.style({
        'background-color': '#1E40AF',
      });
    });

    cyRef.current.on('mouseout', 'node', (event: any) => {
      const type = event.target.data('type');
      const colors: Record<string, string> = {
        keyword: '#3B82F6',
        person: '#EC4899',
        place: '#10B981',
        event: '#F59E0B',
        unknown: '#6B7280',
      };
      event.target.style({
        'background-color': colors[type] || colors.unknown,
      });
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [elements, isLoading, onNodeClick]);

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
      cyRef.current.center();
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
      cyRef.current.center();
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  const handleReset = () => {
    if (cyRef.current) {
      cyRef.current.layout({
        name: 'fcose',
        quality: 'proof',
        randomize: true,
        animate: true,
        animationDuration: 1000,
        fit: true,
        padding: 50,
      } as any).run();
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-600 mb-2">{error}</div>
          <div className="text-sm text-gray-500">请刷新页面重试</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-500">加载图谱中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* 图谱容器 */}
      <div
        ref={containerRef}
        className="w-full h-full bg-gray-50 rounded-lg border border-gray-200"
      />

      {/* 控制按钮 */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="放大"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleFit}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="适应窗口"
        >
          <Maximize2 className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="重新布局"
        >
          <RefreshCw className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
        <div className="text-xs font-semibold text-gray-700 mb-2">节点类型</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-600">关键词</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
            <span className="text-xs text-gray-600">人物</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-600">地点</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-600">事件</span>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      {elements.nodes.length > 0 && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md px-3 py-2">
          <div className="text-xs text-gray-600">
            {elements.nodes.length} 个节点，{elements.edges.length} 条关系
          </div>
        </div>
      )}
    </div>
  );
}
