/**
 * Me2 API 客户端
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
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
   * 发送聊天消息
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
