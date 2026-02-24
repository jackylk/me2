import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { label: string; value: number | string }[];
}

export default function StatsCard({ title, value, subtitle, icon: Icon, trend }: StatsCardProps) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted-foreground text-sm">{title}</span>
        <Icon className="w-4 h-4 text-muted-foreground/50" />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground/60 mt-1">{subtitle}</div>}
      {trend && trend.length > 0 && (
        <div className="flex gap-3 mt-2">
          {trend.map((t, i) => (
            <span key={i} className="text-xs text-muted-foreground/50">
              {t.label}: <span className="text-foreground/70">{t.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
