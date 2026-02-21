/**
 * 格式化日期为相对时间
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return '刚刚';
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} 分钟前`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} 小时前`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} 天前`;

  return formatDate(d);
}

/**
 * 格式化完整日期
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 获取记忆类型的颜色
 */
export function getMemoryTypeColor(
  type: string
): 'blue' | 'green' | 'orange' | 'gray' {
  const colors: Record<string, 'blue' | 'green' | 'orange' | 'gray'> = {
    fact: 'blue',
    episodic: 'green',
    insight: 'orange',
    general: 'gray',
  };
  return colors[type] || 'gray';
}

/**
 * 获取记忆类型的中文名称
 */
export function getMemoryTypeName(type: string): string {
  const names: Record<string, string> = {
    fact: '事实',
    episodic: '情节',
    insight: '洞察',
    general: '通用',
  };
  return names[type] || type;
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * 合并 CSS 类名
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
