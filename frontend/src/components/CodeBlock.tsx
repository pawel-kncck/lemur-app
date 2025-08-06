import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'python' }: CodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Don't render if no code
  if (!code || code === '# Code execution details not available') {
    return null;
  }
  
  // Extract code from markdown code blocks if present
  const cleanCode = code.replace(/```python\n?/g, '').replace(/```\n?/g, '').trim();
  
  return (
    <div style={{
      marginTop: '15px',
      border: '1px solid #444',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#1a1a1a'
    }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '10px 15px',
          backgroundColor: '#2a2a2a',
          border: 'none',
          borderBottom: isExpanded ? '1px solid #444' : 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          fontFamily: 'inherit'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>💻</span>
          <span>Executed Code</span>
        </span>
        <span style={{
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </button>
      
      {isExpanded && (
        <div style={{
          padding: '15px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <pre style={{
            margin: 0,
            padding: '12px',
            backgroundColor: '#0d0d0d',
            borderRadius: '4px',
            overflowX: 'auto',
            fontSize: '13px',
            lineHeight: '1.5',
            fontFamily: 'Menlo, Monaco, "Courier New", monospace'
          }}>
            <code style={{ color: '#f8f8f2' }}>
              {cleanCode}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}