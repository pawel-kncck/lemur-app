import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function ContextTab({ projectId }: { projectId: string }) {
  const [context, setContext] = useState('');
  const [savedContext, setSavedContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  useEffect(() => {
    loadContext();
  }, [projectId]);

  const loadContext = async () => {
    try {
      const result = await api.getContext(projectId);
      setContext(result.context || '');
      setSavedContext(result.context || '');
    } catch (error) {
      console.error('Failed to load context:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveContext(projectId, context);
      setSavedContext(context);
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 3000);
    } catch (error) {
      console.error('Failed to save context:', error);
      alert('Failed to save context. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = context !== savedContext;

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Business Context</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {showSaveConfirmation && (
            <span style={{ color: '#4ade80', fontSize: '14px' }}>✓ Saved successfully</span>
          )}
          {hasChanges && (
            <span style={{ color: '#fbbf24', fontSize: '14px' }}>• Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            style={{
              padding: '8px 16px',
              backgroundColor: hasChanges ? '#4a9eff' : 'transparent',
              border: hasChanges ? 'none' : '1px solid #666',
              borderRadius: '6px',
              color: 'white',
              cursor: saving || !hasChanges ? 'not-allowed' : 'pointer',
              opacity: saving || !hasChanges ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Context'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px', border: '1px solid #444' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#4a9eff' }}>
          💡 Tips for Better Results
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#ccc', lineHeight: '1.8' }}>
          <li>Describe what your data represents and its business purpose</li>
          <li>Explain any important columns, metrics, or KPIs</li>
          <li>Include relevant business rules or calculations</li>
          <li>Mention any data quality issues or limitations</li>
          <li>Add context about time periods, regions, or segments</li>
        </ul>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <label style={{ fontSize: '14px', color: '#999', marginBottom: '10px' }}>
          Describe your data and business context:
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={`Example:\nThis dataset contains our Q4 2023 sales data for the North American region. Each row represents a transaction with the following key columns:\n\n- revenue: Total sale amount in USD\n- quantity: Number of units sold\n- product_category: Main product classification\n- customer_segment: Enterprise, SMB, or Consumer\n- date: Transaction date\n\nOur fiscal year runs from February to January. Enterprise customers typically have 30-day payment terms while others pay immediately.`}
          style={{
            flex: 1,
            padding: '15px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            lineHeight: '1.6',
            resize: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
          <strong>Note:</strong> The more context you provide, the better the AI can understand and analyze your data. 
          This context will be included with every question you ask about your data.
        </p>
      </div>
    </div>
  );
}