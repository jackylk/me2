'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  User,
  Briefcase,
  Heart,
  Compass,
  Users,
  Sparkles,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('me2_access_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

const PROFILE_FIELDS = [
  { key: 'identity', label: '身份', icon: User, isArray: false },
  { key: 'occupation', label: '职业', icon: Briefcase, isArray: false },
  { key: 'interests', label: '兴趣', icon: Heart, isArray: true },
  { key: 'values', label: '价值观', icon: Compass, isArray: true },
  { key: 'relationships', label: '关系', icon: Users, isArray: true },
  { key: 'personality', label: '性格', icon: Sparkles, isArray: true },
];

interface Preference {
  key: string;
  value: any;
}

export default function ProfileSection() {
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Preference form
  const [newPrefKey, setNewPrefKey] = useState('');
  const [newPrefValue, setNewPrefValue] = useState('');
  const [showPrefForm, setShowPrefForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, prefRes] = await Promise.all([
        fetch(`${API_BASE}/memories/profile`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/memories/preferences`, { headers: getAuthHeaders() }),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile || {});
      }
      if (prefRes.ok) {
        const data = await prefRes.json();
        setPreferences(data.preferences || []);
      }
    } catch (error) {
      console.error('加载档案失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (key: string) => {
    const field = PROFILE_FIELDS.find((f) => f.key === key);
    const val = profile[key];
    if (field?.isArray) {
      setEditValue(Array.isArray(val) ? val.join(', ') : val || '');
    } else {
      setEditValue(typeof val === 'string' ? val : JSON.stringify(val || ''));
    }
    setEditingField(key);
  };

  const handleEditSave = async (key: string) => {
    const field = PROFILE_FIELDS.find((f) => f.key === key);
    let value: any = editValue;
    if (field?.isArray) {
      value = editValue
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    try {
      const response = await fetch(`${API_BASE}/memories/profile/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ value }),
      });
      if (response.ok) {
        setProfile((prev) => ({ ...prev, [key]: value }));
        setEditingField(null);
      }
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const handleAddPreference = async () => {
    if (!newPrefKey.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/memories/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ key: newPrefKey.trim(), value: newPrefValue.trim() }),
      });
      if (response.ok) {
        setNewPrefKey('');
        setNewPrefValue('');
        setShowPrefForm(false);
        loadData();
      }
    } catch (error) {
      console.error('添加偏好失败:', error);
    }
  };

  const handleDeletePreference = async (key: string) => {
    if (!confirm(`确定删除偏好「${key}」？`)) return;
    try {
      const response = await fetch(
        `${API_BASE}/memories/preferences/${encodeURIComponent(key)}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      );
      if (response.ok) {
        setPreferences((prev) => prev.filter((p) => p.key !== key));
      }
    } catch (error) {
      console.error('删除偏好失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* 用户档案 */}
      <div>
        <h3 className="text-lg font-semibold dark:text-white mb-4">用户档案</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROFILE_FIELDS.map(({ key, label, icon: Icon, isArray }) => {
            const val = profile[key];
            const isEditing = editingField === key;
            const isEmpty = !val || (Array.isArray(val) && val.length === 0);

            return (
              <div
                key={key}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Icon className="w-4 h-4" />
                    {label}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => handleEditStart(key)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSave(key)}
                      placeholder={isArray ? '逗号分隔多个值' : `输入${label}`}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEditSave(key)}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      className="p-1.5 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : isEmpty ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    尚未设置
                  </p>
                ) : isArray && Array.isArray(val) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {val.map((item: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {typeof val === 'string' ? val : JSON.stringify(val)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 偏好设置 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold dark:text-white">偏好设置</h3>
          <button
            onClick={() => setShowPrefForm(!showPrefForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-3.5 h-3.5" />
            添加
          </button>
        </div>

        {showPrefForm && (
          <div className="flex gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <input
              type="text"
              value={newPrefKey}
              onChange={(e) => setNewPrefKey(e.target.value)}
              placeholder="键（如：编程语言偏好）"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <input
              type="text"
              value={newPrefValue}
              onChange={(e) => setNewPrefValue(e.target.value)}
              placeholder="值（如：TypeScript）"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleAddPreference}
              disabled={!newPrefKey.trim()}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              保存
            </button>
            <button
              onClick={() => setShowPrefForm(false)}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          </div>
        )}

        {preferences.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            暂无偏好设置，系统会在对话中自动学习你的偏好
          </div>
        ) : (
          <div className="space-y-2">
            {preferences.map((pref) => (
              <div
                key={pref.key}
                className="flex items-center justify-between px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {pref.key}
                  </span>
                  <span className="mx-2 text-gray-300 dark:text-gray-600">=</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {typeof pref.value === 'object'
                      ? JSON.stringify(pref.value)
                      : String(pref.value)}
                  </span>
                </div>
                <button
                  onClick={() => handleDeletePreference(pref.key)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
