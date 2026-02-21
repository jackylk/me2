'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trash2, Network } from 'lucide-react';
import MemoryGraph from '@/components/MemoryGraph';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('me2_access_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// NeuroMemory NodeType color map
const NODE_TYPE_COLORS: Record<string, string> = {
  person: '#EC4899',       // pink
  organization: '#3B82F6', // blue
  location: '#10B981',     // green
  event: '#F59E0B',        // yellow
  skill: '#8B5CF6',        // purple
  concept: '#06B6D4',      // cyan
  entity: '#6B7280',       // gray
  user: '#F97316',         // orange
  memory: '#64748B',       // slate
};

const NODE_TYPE_LABELS: Record<string, string> = {
  person: '人物',
  organization: '组织',
  location: '地点',
  event: '事件',
  skill: '技能',
  concept: '概念',
  entity: '实体',
  user: '用户',
  memory: '记忆',
};

interface GraphElements {
  nodes: Array<{ data: any }>;
  edges: Array<{ data: any }>;
}

export default function KnowledgeGraph() {
  const [elements, setElements] = useState<GraphElements>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [totalNodes, setTotalNodes] = useState(0);
  const [totalEdges, setTotalEdges] = useState(0);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/memories/graph?limit=200`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const elems = data.elements || { nodes: [], edges: [] };

        // Apply NeuroMemory NodeType colors
        elems.nodes = elems.nodes.map((n: any) => ({
          ...n,
          data: {
            ...n.data,
            // Override `type` to normalized lowercase for color mapping in MemoryGraph
            type: (n.data.node_type || n.data.type || 'entity').toLowerCase(),
          },
        }));

        setElements(elems);
        setTotalNodes(data.total_nodes || elems.nodes.length);
        setTotalEdges(data.total_edges || elems.edges.length);
      }
    } catch (error) {
      console.error('加载图谱失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (nodeData: any) => {
    setSelectedNode(nodeData);
  };

  const handleDeleteNode = async (nodeData: any) => {
    const nodeType = nodeData.node_type || nodeData.type;
    const nodeId = nodeData.node_id || nodeData.id;
    if (!confirm(`确定删除节点「${nodeData.label}」及其关联边？`)) return;
    try {
      const response = await fetch(
        `${API_BASE}/memories/graph/nodes/${encodeURIComponent(nodeType)}/${encodeURIComponent(nodeId)}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      );
      if (response.ok) {
        setSelectedNode(null);
        loadGraph();
      }
    } catch (error) {
      console.error('删除节点失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (elements.nodes.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
        <Network className="w-12 h-12 mb-3 opacity-50" />
        <p>暂无知识图谱数据</p>
        <p className="text-sm mt-1">通过对话产生的实体关系会自动出现在这里</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex gap-4" style={{ height: '600px' }}>
        {/* 图谱可视化 */}
        <div className="flex-1 relative">
          <MemoryGraph
            elements={elements}
            onNodeClick={handleNodeClick}
            nodeColors={NODE_TYPE_COLORS}
          />
        </div>

        {/* 节点列表面板 */}
        <div className="w-64 border-l border-gray-200 dark:border-gray-700 pl-4 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            节点列表 ({totalNodes})
          </h4>

          {/* 图例 */}
          <div className="mb-4 space-y-1">
            {Object.entries(NODE_TYPE_COLORS)
              .filter(([type]) => elements.nodes.some((n) => n.data.type === type))
              .map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {NODE_TYPE_LABELS[type] || type}
                  </span>
                </div>
              ))}
          </div>

          {/* 节点 */}
          <div className="space-y-1">
            {elements.nodes.map((node) => {
              const d = node.data;
              const isSelected = selectedNode?.id === d.id;
              const color = NODE_TYPE_COLORS[d.type] || NODE_TYPE_COLORS.entity;

              return (
                <div
                  key={d.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedNode(d)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-gray-800 dark:text-gray-200">
                      {d.label}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNode(d);
                    }}
                    className="p-0.5 text-gray-300 hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* 选中节点详情 */}
          {selectedNode && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                节点详情
              </h5>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-gray-500">名称: </span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {selectedNode.label}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">类型: </span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {NODE_TYPE_LABELS[selectedNode.type] || selectedNode.type}
                  </span>
                </div>
                {selectedNode.properties &&
                  Object.keys(selectedNode.properties).length > 0 && (
                    <div className="mt-2">
                      <span className="text-gray-500">属性:</span>
                      <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedNode.properties, null, 2)}
                      </pre>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
