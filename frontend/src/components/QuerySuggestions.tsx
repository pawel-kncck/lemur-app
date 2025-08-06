import { useState, useEffect } from 'react';

interface QuerySuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
  suggestions: string[];
  disabled?: boolean;
}

export function QuerySuggestions({ 
  onSuggestionClick, 
  suggestions,
  disabled = false 
}: QuerySuggestionsProps) {
  const [visibleSuggestions, setVisibleSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setVisibleSuggestions(suggestions);
  }, [suggestions]);

  if (visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
        Suggested questions:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {visibleSuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => {
              if (!disabled) {
                onSuggestionClick(suggestion);
                // Optionally hide this suggestion after clicking
                setVisibleSuggestions(prev => prev.filter((_, i) => i !== index));
              }
            }}
            disabled={disabled}
            style={{
              padding: '8px 16px',
              backgroundColor: disabled ? '#2a2a2a' : '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '20px',
              color: disabled ? '#666' : '#fff',
              fontSize: '13px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: disabled ? 0.5 : 1,
              whiteSpace: 'nowrap',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = '#2a2a2a';
                e.currentTarget.style.borderColor = '#4a9eff';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = '#1a1a1a';
                e.currentTarget.style.borderColor = '#444';
              }
            }}
            title={suggestion}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}