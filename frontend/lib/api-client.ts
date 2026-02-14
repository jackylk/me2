/**
 * Me2 API 客户端
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  debug_info?: {
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
  };
}

export interface ChatRequest {
  user_id: string;
  message: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  intent: string;
  memories_used: number;
}

export interface StreamChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  response?: string;
  session_id?: string;
  memories_recalled?: number;
  insights_used?: number;
  history_messages_count?: number;
  debug_info?: {
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
  };
  error?: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  created_at: string;
}

export interface UserCreate {
  username: string;
  email?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 发送聊天消息（流式）
   */
  async *chatStream(
    message: string,
    sessionId?: string,
    debugMode: boolean = false
  ): AsyncGenerator<StreamChunk> {
    const token = localStorage.getItem('me2_access_token');
    if (!token) {
      throw new Error('未登录');
    }

    console.log('[ApiClient] 发起流式请求', { message, sessionId, debugMode });

    const response = await fetch(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        debug_mode: debugMode,
      }),
    });

    console.log('[ApiClient] 收到响应', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ApiClient] 请求失败', { status: response.status, errorText });
      throw new Error(`Chat failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[ApiClient] SSE流结束');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const chunk: StreamChunk = JSON.parse(data);
                console.log('[ApiClient] 解析chunk成功:', chunk);
                yield chunk;
              } catch (e) {
                console.error('[ApiClient] 解析SSE数据失败:', { data, error: e });
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
      console.log('[ApiClient] SSE reader已释放');
    }
  }

  /**
   * 发送聊天消息（非流式，保留向后兼容）
   */
  async chat(userId: string, message: string): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 结束对话
   */
  async endConversation(userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/chat/end?user_id=${userId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`End conversation failed: ${response.statusText}`);
    }
  }

  /**
   * 创建用户
   */
  async createUser(data: UserCreate): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Create user failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 获取用户信息
   */
  async getUser(userId: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`);

    if (!response.ok) {
      throw new Error(`Get user failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
