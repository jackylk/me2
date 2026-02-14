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
): 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'gray' | 'red' | 'indigo' {
  const colors: Record<
    string,
    'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'gray' | 'red' | 'indigo'
  > = {
    fact: 'blue',
    event: 'green',
    preference: 'purple',
    relationship: 'pink',
    knowledge: 'orange',
    insight: 'purple',
    episodic: 'green',
    relation: 'pink',
    general: 'gray',
    correction: 'red',
    image: 'indigo',
  };
  return colors[type] || 'gray';
}

/**
 * 获取记忆类型的中文名称
 */
export function getMemoryTypeName(type: string): string {
  const names: Record<string, string> = {
    fact: '事实',
    event: '事件',
    preference: '偏好',
    relationship: '关系',
    knowledge: '知识',
    insight: '洞察',
    episodic: '情节',
    relation: '关系',
    general: '通用',
    correction: '纠正',
    image: '图片',
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
