'use client';

import { useEffect, useState } from 'react';
import { Users, MessageCircle, Database, Network, MessagesSquare, Loader2 } from 'lucide-react';
import StatsCard from '@/components/admin/StatsCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('me2_access_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard`, { headers: getAuthHeaders() });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return <div className="text-muted-foreground">Failed to load stats</div>;

  const { users, sessions, messages, memories } = stats;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Users"
          value={users.total}
          icon={Users}
          trend={[
            { label: '7d active', value: users.active_7d },
            { label: 'Admin', value: users.admin_count },
          ]}
        />
        <StatsCard
          title="Sessions"
          value={sessions.total}
          icon={MessagesSquare}
          trend={[
            { label: '7d active', value: sessions.active_7d },
          ]}
        />
        <StatsCard
          title="Messages"
          value={messages.total}
          icon={MessageCircle}
          trend={[{ label: '7d', value: messages.last_7d }]}
        />
        <StatsCard
          title="Memories"
          value={memories.total}
          icon={Database}
          trend={[
            { label: 'fact', value: memories.by_type?.fact || 0 },
            { label: 'episodic', value: memories.by_type?.episodic || 0 },
            { label: 'insight', value: memories.by_type?.insight || 0 },
          ]}
        />
      </div>

      {/* Graph stats */}
      {(memories.graph_nodes > 0 || memories.graph_edges > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard title="Graph Nodes" value={memories.graph_nodes} icon={Network} />
          <StatsCard title="Graph Edges" value={memories.graph_edges} icon={Network} />
        </div>
      )}
    </div>
  );
}
