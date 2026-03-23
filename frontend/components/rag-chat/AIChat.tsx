'use client';
// components/rag-chat/AIChat.tsx
import { useState, useRef, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui';
import type { ChatMessage } from '@/types';

const SUGGESTIONS = [
  'What is the status of all machines?',
  'Which machines have anomalies?',
  'Explain the latest critical alert',
  'Generate a weekly report for Machine 1',
  'What are the normal operating ranges for the CNC mill?',
];

interface MessageBubble { role: 'user' | 'assistant'; text: string; ts: Date }

export default function AIChat() {
  const [messages, setMessages] = useState<MessageBubble[]>([
    { role: 'assistant', text: 'Hello! I\'m your Factory AI assistant. I can answer questions about machine status, telemetry, alerts, and maintenance. What would you like to know?', ts: new Date() },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: MessageBubble = { role: 'user', text: question.trim(), ts: new Date() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.ai.ask(question.trim());
      setMessages(p => [...p, { role: 'assistant', text: res.answer, ts: new Date() }]);
    } catch (err: any) {
      setMessages(p => [...p, {
        role: 'assistant',
        text: `⚠ Error: ${err.message}. Please try again.`,
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500 }}>
      {/* Header */}
      <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--yash-navy) 0%, #0c1a2e 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(0,87,168,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" fill="none" stroke="#60A5FA" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Factory AI Assistant</div>
            <div style={{ color: '#60A5FA', fontSize: 10 }}>RAG-powered · Groq LLM · Real-time data</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#34D399', fontSize: 10, fontWeight: 600 }}>
          <span className="dot dot-green" style={{ width: 6, height: 6 }} />
          Online
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--g50)' }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
            gap: 8, alignItems: 'flex-start',
          }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: m.role === 'user' ? 'var(--yash-blue)' : 'var(--yash-navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#fff', fontWeight: 700, marginTop: 2,
            }}>
              {m.role === 'user' ? 'U' : 'AI'}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '75%',
              background: m.role === 'user' ? 'var(--yash-blue)' : '#fff',
              color:      m.role === 'user' ? '#fff' : 'var(--g800)',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '10px 4px 10px 10px' : '4px 10px 10px 10px',
              fontSize: 13,
              border: m.role === 'assistant' ? '1px solid var(--g200)' : 'none',
              whiteSpace: 'pre-wrap', lineHeight: 1.6,
              boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            }}>
              {m.text}
              <div style={{
                fontSize: 9.5, marginTop: 4, opacity: .5,
                textAlign: m.role === 'user' ? 'right' : 'left',
              }}>
                {m.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'var(--yash-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#fff', fontWeight: 700,
            }}>AI</div>
            <div style={{
              background: '#fff', border: '1px solid var(--g200)',
              borderRadius: '4px 10px 10px 10px',
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <LoadingSpinner size={14} />
              <span style={{ color: 'var(--g400)', fontSize: 12 }}>Querying factory data…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: '8px 18px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              style={{
                background: 'var(--acc-lt)', border: '1px solid #BFDBFE',
                borderRadius: 99, padding: '4px 11px',
                fontSize: 11, color: 'var(--yash-blue)', cursor: 'pointer', fontWeight: 500,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        padding: '12px 18px', borderTop: '1px solid var(--g200)',
        display: 'flex', gap: 8, background: '#fff',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about machines, alerts, or maintenance…"
          disabled={loading}
          style={{
            flex: 1, padding: '9px 14px',
            border: '1px solid var(--g200)', borderRadius: 6,
            fontSize: 13, outline: 'none', color: 'var(--g800)',
            background: loading ? 'var(--g50)' : '#fff',
          }}
          onFocus={e  => e.target.style.borderColor = 'var(--yash-blue)'}
          onBlur={e   => e.target.style.borderColor = 'var(--g200)'}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '9px 16px', borderRadius: 6, border: 'none',
            background: (loading || !input.trim()) ? 'var(--g200)' : 'var(--yash-blue)',
            color: (loading || !input.trim()) ? 'var(--g400)' : '#fff',
            cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: 13,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}