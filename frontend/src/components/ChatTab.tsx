import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { Message } from '../types/index';

export function ChatTab({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hello! Upload your data and add context, then ask me anything about your data.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.sendMessage(projectId, userMessage.content);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #333' }}>
        <h2 style={{ margin: 0 }}>Chat with Your Data</h2>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '20px',
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '15px 20px',
                borderRadius: '12px',
                backgroundColor: message.role === 'user' ? '#4a9eff' : '#2a2a2a',
                border: message.role === 'user' ? 'none' : '1px solid #444',
              }}
            >
              <div style={{ marginBottom: '5px', fontSize: '12px', opacity: 0.7 }}>
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {message.content}
              </div>
              <div style={{ marginTop: '5px', fontSize: '12px', opacity: 0.5 }}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
            <div
              style={{
                padding: '15px 20px',
                borderRadius: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ animation: 'pulse 1.5s infinite' }}>●</span>
                <span style={{ animation: 'pulse 1.5s infinite 0.2s' }}>●</span>
                <span style={{ animation: 'pulse 1.5s infinite 0.4s' }}>●</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your data..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              resize: 'none',
              fontFamily: 'inherit',
              minHeight: '50px',
              maxHeight: '150px',
            }}
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: loading || !input.trim() ? '#666' : '#4a9eff',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}