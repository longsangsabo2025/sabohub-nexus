/**
 * AI Service - Real AI Integration
 * Elon Musk approach: Make it work, then make it better
 * 
 * Supports:
 * - OpenAI GPT-4 (cloud, best quality)
 * - Ollama (local, free, privacy)
 * - Gemini (Google, fast)
 */

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  confidence: number;
  tokens_used?: number;
}

interface CompanyContext {
  tasks: {
    total: number;
    overdue: number;
    completed: number;
    completion_rate: number;
  };
  team: {
    total: number;
    active: number;
  };
  recent_issues: string[];
}

class AIService {
  private provider: 'openai' | 'ollama' | 'gemini' | 'mock';
  private apiKey?: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    // Check environment for AI config
    this.provider = this.detectProvider();
    this.apiKey = this.getApiKey();
    this.baseUrl = this.getBaseUrl();
    this.model = this.getModel();
  }

  private detectProvider(): 'openai' | 'ollama' | 'gemini' | 'mock' {
    if (import.meta.env.VITE_OPENAI_API_KEY) return 'openai';
    if (import.meta.env.VITE_GEMINI_API_KEY) return 'gemini';
    if (import.meta.env.VITE_OLLAMA_URL) return 'ollama';
    return 'mock'; // Fallback to rule-based
  }

  private getApiKey(): string | undefined {
    switch (this.provider) {
      case 'openai':
        return import.meta.env.VITE_OPENAI_API_KEY;
      case 'gemini':
        return import.meta.env.VITE_GEMINI_API_KEY;
      default:
        return undefined;
    }
  }

  private getBaseUrl(): string {
    switch (this.provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'ollama':
        return import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com/v1'; // Stable v1 API
      default:
        return '';
    }
  }

  private getModel(): string {
    switch (this.provider) {
      case 'openai':
        return import.meta.env.VITE_OPENAI_MODEL || 'gpt-4-turbo-preview';
      case 'ollama':
        return import.meta.env.VITE_OLLAMA_MODEL || 'llama2';
      case 'gemini':
        return 'gemini-2.5-flash'; // Latest: Fast, intelligent, best price-performance
      default:
        return 'mock';
    }
  }

  /**
   * Generate AI insights from company data
   * Elon's principle: AI should predict problems BEFORE they escalate
   */
  async generateInsights(context: CompanyContext): Promise<AIResponse> {
    const systemPrompt = `You are an AI business analyst for a CEO. Analyze company metrics and provide actionable insights.

Current Context:
- Tasks: ${context.tasks.total} total, ${context.tasks.overdue} overdue, ${context.tasks.completed} completed (${context.tasks.completion_rate}% rate)
- Team: ${context.team.total} members, ${context.team.active} active
- Recent Issues: ${context.recent_issues.join(', ')}

Focus on:
1. Critical risks (overdue tasks, bottlenecks)
2. Opportunities (high completion rates, trends)
3. Anomalies (sudden changes)
4. Actionable recommendations

Be concise. Vietnamese language. CEO-level insights only.`;

    const userPrompt = `Phân tích tình hình hiện tại và đưa ra 3-5 insights quan trọng nhất.`;

    return this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
  }

  /**
   * Chat with AI - natural language queries
   */
  async chat(messages: AIMessage[]): Promise<AIResponse> {
    try {
      switch (this.provider) {
        case 'openai':
          return await this.chatOpenAI(messages);
        case 'ollama':
          return await this.chatOllama(messages);
        case 'gemini':
          return await this.chatGemini(messages);
        default:
          return this.mockChat(messages);
      }
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.mockChat(messages); // Fallback to mock
    }
  }

  private async chatOpenAI(messages: AIMessage[]): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      confidence: 0.95,
      tokens_used: data.usage?.total_tokens,
    };
  }

  private async chatOllama(messages: AIMessage[]): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.message.content,
      confidence: 0.85,
    };
  }

  private async chatGemini(messages: AIMessage[]): Promise<AIResponse> {
    // Convert messages to Gemini format
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Safety check
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid Gemini response:', data);
      throw new Error('Invalid response from Gemini API');
    }
    
    return {
      content: data.candidates[0].content.parts[0].text,
      confidence: 0.9,
    };
  }

  /**
   * Mock AI - Rule-based fallback (current implementation)
   * Fast, free, works offline
   */
  private mockChat(messages: AIMessage[]): AIResponse {
    const lastMessage = messages[messages.length - 1].content.toLowerCase();

    // Pattern matching for common queries
    if (lastMessage.includes('quá hạn') || lastMessage.includes('overdue')) {
      return {
        content: `🚨 **Cảnh báo: Có nhiệm vụ quá hạn!**

Hiện tại có nhiều tasks đã quá deadline cần xử lý ngay:
- Ưu tiên URGENT trước
- Review lại phân công công việc
- Cân nhắc redistribute workload

**Action cụ thể:**
1. Họp team ngay hôm nay
2. Re-prioritize tasks
3. Thêm resources nếu cần`,
        confidence: 0.8,
      };
    }

    if (lastMessage.includes('phân tích') || lastMessage.includes('tình hình')) {
      return {
        content: `📊 **Phân tích tổng quan:**

**Điểm mạnh:**
- Team đang có momentum tốt
- Nhiều tasks completed gần đây

**Điểm yếu:**
- Overdue tasks tăng → cần attention
- Completion rate có thể cải thiện

**Khuyến nghị:**
1. Focus vào tasks quá hạn trước
2. Optimize workflow để tránh bottleneck
3. Set up alerts tự động cho deadline`,
        confidence: 0.75,
      };
    }

    if (lastMessage.includes('doanh thu') || lastMessage.includes('revenue')) {
      return {
        content: `💰 **Phân tích tài chính:**

Hiện tại chưa có đủ dữ liệu financial để phân tích chi tiết.

**Cần làm:**
- Tích hợp financial_transactions table
- Track revenue theo thời gian thực
- Set up KPI tracking

Có muốn tôi setup financial tracking không?`,
        confidence: 0.6,
      };
    }

    // Default response
    return {
      content: `Tôi đã phân tích request của bạn. Hiện tại tôi có thể giúp:

1. **Phân tích tasks** - overdue, completion rates
2. **Team insights** - productivity, workload
3. **Alerts** - critical issues cần attention

Để phân tích sâu hơn, hãy cho tôi biết bạn muốn focus vào aspect nào?`,
      confidence: 0.7,
    };
  }

  /**
   * Get provider info for UI display
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      model: this.model,
      status:
        this.provider === 'mock'
          ? 'Rule-based (Free)'
          : this.provider === 'ollama'
            ? 'Local AI (Free)'
            : 'Cloud AI',
    };
  }
}

// Singleton instance
export const aiService = new AIService();
export type { AIMessage, AIResponse, CompanyContext };
