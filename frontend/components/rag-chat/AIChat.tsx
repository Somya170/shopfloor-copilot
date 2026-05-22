'use client';
import { useState, useRef, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui';

const STORAGE_KEY = 'nexfloor_chat_history';

const SUGGESTIONS = [
  'What is the status of all machines?',
  'Give me weekly report of Machine 1',
  'Give me monthly report of Machine 2',
  'Machine 3 maintenance schedule?',
  'Which machines have anomalies?',
  'Machine 4 cavitation symptoms?',
];

// ── Message type ──────────────────────────────────────────────
interface MessageBubble {
  role: 'user' | 'assistant';
  text: string;
  ts: Date;
  reportInfo?: { machine_id: number; report_type: string } | null;
}

// ── Default welcome message ───────────────────────────────────
const defaultMsg: MessageBubble = {
  role: 'assistant',
  text: "Hello! I'm your EDGEAI AI assistant.\n\nI can answer questions about machine status, telemetry, alerts, and maintenance.\n\nYou can also ask me to generate reports — e.g.:\n• \"Give me weekly report of Machine 1\"\n• \"Generate monthly report of Machine 3\"",
  ts: new Date(),
  reportInfo: null,
};

// ── Load messages from localStorage ──────────────────────────
function loadMessages(): MessageBubble[] {
  if (typeof window === 'undefined') return [defaultMsg];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((m: any) => ({ ...m, ts: new Date(m.ts) }));
      }
    }
  } catch {}
  return [defaultMsg];
}

// ── detect report request ─────────────────────────────────────
function detectReportRequest(text: string): { machine_id: number | null; report_type: string } | null {
  const lower = text.toLowerCase();
  if (!lower.includes('report')) return null;
  let machine_id: number | null = null;
  for (let i = 1; i <= 6; i++) {
    if (lower.includes(`machine ${i}`) || lower.includes(`machine_${i}`)) {
      machine_id = i;
      break;
    }
  }
  let report_type = 'weekly';
  if (lower.includes('monthly') || lower.includes('month')) report_type = 'monthly';
  return { machine_id, report_type };
}

// ── Report Download Buttons ───────────────────────────────────
function ReportDownloadButtons({ machine_id, report_type }: { machine_id: number; report_type: string }) {
  const [loadingPdf,   setLoadingPdf]   = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  const download = async (format: 'pdf' | 'excel') => {
    if (format === 'pdf') setLoadingPdf(true);
    else setLoadingExcel(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ machine_id, report_type, format }),
      });
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Machine_${machine_id}_${report_type}_report.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Download failed: ' + err.message);
    } finally {
      setLoadingPdf(false);
      setLoadingExcel(false);
    }
  };

  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 11, color: '#64748B', width: '100%', marginBottom: 4, fontWeight: 600 }}>
        📥 Download Report — Machine {machine_id} ({report_type}):
      </div>
      <button onClick={() => download('pdf')} disabled={loadingPdf} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 6, border: 'none',
        background: '#E31837', color: '#fff',
        cursor: loadingPdf ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 700, opacity: loadingPdf ? 0.7 : 1,
      }}>
        {loadingPdf ? <LoadingSpinner size={12} /> : (
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        )}
        {loadingPdf ? 'Generating…' : '📄 Download PDF'}
      </button>
      <button onClick={() => download('excel')} disabled={loadingExcel} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 6, border: 'none',
        background: '#059669', color: '#fff',
        cursor: loadingExcel ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 700, opacity: loadingExcel ? 0.7 : 1,
      }}>
        {loadingExcel ? <LoadingSpinner size={12} /> : (
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        )}
        {loadingExcel ? 'Generating…' : '📊 Download Excel'}
      </button>
    </div>
  );
}

// ── Main AIChat Component ─────────────────────────────────────
export default function AIChat() {
  const [messages, setMessages] = useState<MessageBubble[]>(loadMessages);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [llmMode,  setLlmMode]  = useState<'groq' | 'ollama' | 'fallback' | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Auto-scroll ───────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Persist to localStorage ───────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Save last 100 messages only
      const toSave = messages.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [messages]);

  // ── Send message ──────────────────────────────────────────
  const send = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: MessageBubble = {
      role: 'user', text: question.trim(), ts: new Date(), reportInfo: null,
    };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.ai.ask(question.trim());
      if (res.llm_used) setLlmMode(res.llm_used);

      const reportInfo = res.report_info?.has_report
        ? { machine_id: res.report_info.machine_id, report_type: res.report_info.report_type }
        : null;

      setMessages(p => [...p, {
        role: 'assistant', text: res.answer, ts: new Date(), reportInfo,
      }]);
    } catch (err: any) {
      setMessages(p => [...p, {
        role: 'assistant',
        text: `⚠ Error: ${err.message}. Please try again.`,
        ts: new Date(), reportInfo: null,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // ── Clear chat ────────────────────────────────────────────
  const clearChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([{ ...defaultMsg, ts: new Date() }]);
    setLlmMode(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 520 }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="card-header" style={{
        background: 'linear-gradient(135deg, #060C1A 0%, #0d1f3c 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(0,87,168,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" fill="none" stroke="#60A5FA" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Nexfloor Agent Assistant</div>
            <div style={{ color: '#60A5FA', fontSize: 10 }}>
              Groq LLM · Qdrant Vector DB · Real-time data · Report Generation
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* LLM Mode badge */}
          {llmMode && (
            <div style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
              background: llmMode === 'groq' ? 'rgba(16,185,129,.1)'
                        : llmMode === 'ollama' ? 'rgba(245,158,11,.1)'
                        : 'rgba(239,68,68,.1)',
              color: llmMode === 'groq' ? '#10B981'
                   : llmMode === 'ollama' ? '#F59E0B'
                   : '#EF4444',
              border: `1px solid ${llmMode === 'groq' ? 'rgba(16,185,129,.3)'
                     : llmMode === 'ollama' ? 'rgba(245,158,11,.3)'
                     : 'rgba(239,68,68,.3)'}`,
            }}>
              {llmMode === 'groq' ? '☁ Groq Cloud'
               : llmMode === 'ollama' ? '💻 Local SLM'
               : '⚡ Fallback'}
            </div>
          )}

          {/* Online indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#34D399', fontSize: 10, fontWeight: 600 }}>
            <span className="dot dot-green" style={{ width: 6, height: 6 }} />
            Online
          </div>

          {/* Clear chat button */}
          <button
            onClick={clearChat}
            title="Clear chat history"
            style={{
              background: 'rgba(255,255,255,.08)',
              border: '1px solid rgba(255,255,255,.15)',
              borderRadius: 6, padding: '3px 10px',
              color: '#94A3B8', cursor: 'pointer', fontSize: 11,
              transition: 'all .12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.08)')}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 14,
        background: 'var(--g50)',
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
            gap: 8, alignItems: 'flex-start',
          }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: m.role === 'user' ? '#0057A8' : '#060C1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#fff', fontWeight: 700, marginTop: 2,
            }}>
              {m.role === 'user' ? 'U' : 'AI'}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '78%',
              background: m.role === 'user' ? '#0057A8' : '#fff',
              color:      m.role === 'user' ? '#fff' : '#0F172A',
              padding: '10px 14px',
              borderRadius: m.role === 'user' ? '10px 4px 10px 10px' : '4px 10px 10px 10px',
              fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              border: m.role === 'assistant' ? '1px solid #E2E8F0' : 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            }}>
              {m.text}

              {/* Report download buttons */}
              {m.role === 'assistant' && m.reportInfo?.machine_id && (
                <ReportDownloadButtons
                  machine_id={m.reportInfo.machine_id}
                  report_type={m.reportInfo.report_type}
                />
              )}

              <div style={{
                fontSize: 9.5, marginTop: 6, opacity: .5,
                textAlign: m.role === 'user' ? 'right' : 'left',
              }}>
                {m.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#060C1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#fff', fontWeight: 700,
            }}>AI</div>
            <div style={{
              background: '#fff', border: '1px solid #E2E8F0',
              borderRadius: '4px 10px 10px 10px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <LoadingSpinner size={14} />
              <span style={{ color: '#94A3B8', fontSize: 12 }}>Querying factory data…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions (only on first load) ──────────────── */}
      {messages.length <= 1 && (
        <div style={{
          padding: '8px 18px', display: 'flex', flexWrap: 'wrap', gap: 6,
          background: '#fff', borderTop: '1px solid #F1F5F9',
        }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} style={{
              background: '#EFF6FF', border: '1px solid #BFDBFE',
              borderRadius: 99, padding: '4px 12px',
              fontSize: 11, color: '#0057A8', cursor: 'pointer', fontWeight: 500,
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={{
        padding: '12px 18px', borderTop: '1px solid #E2E8F0',
        display: 'flex', gap: 8, background: '#fff',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about machines or request a report… e.g. 'Give me weekly report of Machine 1'"
          disabled={loading}
          style={{
            flex: 1, padding: '9px 14px',
            border: '1px solid #E2E8F0', borderRadius: 6,
            fontSize: 13, outline: 'none', color: '#0F172A',
            background: loading ? '#F8FAFC' : '#fff',
          }}
          onFocus={e  => e.target.style.borderColor = '#0057A8'}
          onBlur={e   => e.target.style.borderColor = '#E2E8F0'}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '9px 18px', borderRadius: 6, border: 'none',
            background: loading || !input.trim() ? '#E2E8F0' : '#0057A8',
            color:      loading || !input.trim() ? '#94A3B8' : '#fff',
            cursor:     loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: 13,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}