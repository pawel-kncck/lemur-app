import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { ContextTab } from '../../components/ContextTab';
import { mockApi } from '../mocks/api';

describe('ContextTab', () => {
  const projectId = 'test-project-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders context tab with title', () => {
    render(<ContextTab projectId={projectId} />);
    
    expect(screen.getByText('Business Context')).toBeInTheDocument();
    expect(screen.getByText(/Tips for Better Results/)).toBeInTheDocument();
  });

  it('loads existing context on mount', async () => {
    mockApi.getContext.mockResolvedValueOnce({ context: 'Existing context data' });
    
    render(<ContextTab projectId={projectId} />);
    
    await waitFor(() => {
      expect(mockApi.getContext).toHaveBeenCalledWith(projectId);
      const textarea = screen.getByPlaceholderText(/Example:/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('Existing context data');
    });
  });

  it('shows save button as disabled when no changes', () => {
    render(<ContextTab projectId={projectId} />);
    
    const saveButton = screen.getByText('Save Context');
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when context changes', async () => {
    render(<ContextTab projectId={projectId} />);
    
    const textarea = screen.getByPlaceholderText(/Example:/i);
    fireEvent.change(textarea, { target: { value: 'New context' } });
    
    await waitFor(() => {
      const saveButton = screen.getByText('Save Context');
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('shows unsaved changes indicator', async () => {
    render(<ContextTab projectId={projectId} />);
    
    const textarea = screen.getByPlaceholderText(/Example:/i);
    fireEvent.change(textarea, { target: { value: 'Modified context' } });
    
    await waitFor(() => {
      expect(screen.getByText('• Unsaved changes')).toBeInTheDocument();
    });
  });

  it('saves context successfully', async () => {
    render(<ContextTab projectId={projectId} />);
    
    const textarea = screen.getByPlaceholderText(/Example:/i);
    fireEvent.change(textarea, { target: { value: 'New context to save' } });
    
    const saveButton = screen.getByText('Save Context');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockApi.saveContext).toHaveBeenCalledWith(projectId, 'New context to save');
      expect(screen.getByText('✓ Saved successfully')).toBeInTheDocument();
    });
  });

  it('shows saving state', async () => {
    // Make save take some time
    mockApi.saveContext.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<ContextTab projectId={projectId} />);
    
    const textarea = screen.getByPlaceholderText(/Example:/i);
    fireEvent.change(textarea, { target: { value: 'New context' } });
    
    const saveButton = screen.getByText('Save Context');
    fireEvent.click(saveButton);
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
  });

  it('handles save error', async () => {
    mockApi.saveContext.mockRejectedValueOnce(new Error('Save failed'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<ContextTab projectId={projectId} />);
    
    const textarea = screen.getByPlaceholderText(/Example:/i);
    fireEvent.change(textarea, { target: { value: 'New context' } });
    
    const saveButton = screen.getByText('Save Context');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to save context. Please try again.');
    });
    
    alertSpy.mockRestore();
  });

  it('displays helpful tips', () => {
    render(<ContextTab projectId={projectId} />);
    
    expect(screen.getByText(/Describe what your data represents/)).toBeInTheDocument();
    expect(screen.getByText(/Explain any important columns/)).toBeInTheDocument();
    expect(screen.getByText(/Include relevant business rules/)).toBeInTheDocument();
  });

  it('shows note about context usage', () => {
    render(<ContextTab projectId={projectId} />);
    
    expect(screen.getByText(/The more context you provide/)).toBeInTheDocument();
  });

  it('preserves textarea content during component lifecycle', async () => {
    const { rerender } = render(<ContextTab projectId={projectId} />);
    
    const textarea = screen.getByPlaceholderText(/Example:/i);
    fireEvent.change(textarea, { target: { value: 'My important context' } });
    
    // Rerender component
    rerender(<ContextTab projectId={projectId} />);
    
    expect((textarea as HTMLTextAreaElement).value).toBe('My important context');
  });
});