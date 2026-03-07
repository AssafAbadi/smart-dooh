import { Injectable, Logger } from '@nestjs/common';
import { ExternalApiConfigService } from '../../config/external-api-keys.config';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM abstraction: OpenAI GPT-4o or Google Gemini.
 * Uses OPENAI_API_KEY (GPT-4o) if set, else GEMINI_API_KEY (Gemini).
 */
@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(private readonly apiKeys: ExternalApiConfigService) {}

  private getProvider(): 'openai' | 'gemini' {
    if (this.apiKeys.getOpenAiApiKey()) return 'openai';
    if (this.apiKeys.getGeminiApiKey()) return 'gemini';
    return 'openai';
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    const provider = this.getProvider();
    this.logger.log({
      msg: provider === 'openai' ? '[OpenAI] request' : '[Gemini] request',
      provider,
      messageCount: messages.length,
    });
    const content =
      provider === 'openai' ? await this.chatOpenAI(messages) : await this.chatGemini(messages);
    this.logger.log({
      msg: provider === 'openai' ? '[OpenAI] response' : '[Gemini] response',
      provider,
      responseLength: content.length,
    });
    return content;
  }

  private async chatOpenAI(messages: LLMMessage[]): Promise<string> {
    const key = this.apiKeys.getOpenAiApiKey();
    if (!key) throw new Error('OPENAI_API_KEY not set');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: 500,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${err}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content ?? '';
  }

  private async chatGemini(messages: LLMMessage[]): Promise<string> {
    const key = this.apiKeys.getGeminiApiKey();
    if (!key) throw new Error('GEMINI_API_KEY not set');
    const lastUser = messages.filter((m) => m.role === 'user').pop()?.content ?? '';
    const system = messages.find((m) => m.role === 'system')?.content ?? '';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${system}\n\n${lastUser}` }] }],
          generationConfig: { maxOutputTokens: 500 },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${res.status} ${err}`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text ?? '';
  }
}
