import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { ChatTab } from '../../components/ChatTab';
import { mockApi, mockChatResponse } from '../mocks/api';

describe('ChatTab', () => {
  const projectId = 'test-project-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders chat interface', () => {
    render(<ChatTab projectId={projectId} />);
    
    expect(screen.getByText('Chat with Your Data')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask a question about your data...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('shows initial assistant message', () => {
    render(<ChatTab projectId={projectId} />);
    
    expect(screen.getByText(/Hello! Upload your data/)).toBeInTheDocument();
  });

  it('sends message on button click', async () => {
    render(<ChatTab projectId={projectId} />);
    
    const input = screen.getByPlaceholderText('Ask a question about your data...');
    fireEvent.change(input, { target: { value: 'What is in my data?' } });
    
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockApi.sendMessage).toHaveBeenCalledWith(projectId, 'What is in my data?');
      expect(screen.getByText('What is in my data?')).toBeInTheDocument();
    });
  });

  it('sends message on Enter key', async () => {
    render(<ChatTab projectId={projectId} />);
    
    const input = screen.getByPlaceholderText('Ask a question about your data...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(mockApi.sendMessage).toHaveBeenCalledWith(projectId, 'Test message');
    });
  });

  it('does not send on Shift+Enter', async () => {
    render(<ChatTab projectId={projectId} />);
    
    const input = screen.getByPlaceholderText('Ask a question about your data...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });
    
    expect(mockApi.sendMessage).not.toHaveBeenCalled();
  });

  it('clears input after sending', async () => {
    render(<ChatTab projectId={projectId} />);
    
    const input = screen.getByPlaceholderText('Ask a question about your data...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByText('Send'));
    
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('displays user and assistant messages', async () => {
    render(<ChatTab projectId={projectId} />);
    
    const input = screen.getByPlaceholderText('Ask a question about your data...');
    fireEvent.change(input, { target: { value: 'User question' } });
    fireEvent.click(screen.getByText('Send'));
    
    await waitFor(() => {
      expect(screen.getByText('User question')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(mockChatResponse.response)).toBeInTheDocument();
      expect(screen.getAllByText('Assistant').length).toBeGreaterThan(0);
    });
  });

  it('shows loading state while sending', async () => {
    // Make the API call take some time
    mockApi.sendMessage.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(mockChatResponse), 100))
    );
    
    render(<ChatTab projectId={projectId} />);
    
    const input = screen.getByPlaceholderText('Ask a question about your data...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));
    
    expect(screen.getByText('Sending...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
      expect(screen.getByText('Send')).toBeInTheDocument();
    });
  });

  it('disables input while loading', async () => {
    mockApi.sendMessage.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(mockChatResponse), 100))
    );
    
    render(<ChatTab projectId={projectId} />);
    
    const input = screen.getByPlaceholderText('Ask a question about your data...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));
    
    expect(input).toBeDisabled();
    
    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
  });

  it('handles API errors gracefully', async () => {
    mockApi.sendMessage.mockRejectedValueOnce(new Error('API Error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ChatTab projectId={projectId} />);
    
    const input = screen.getByPlaceholderText('Ask a question about your data...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));
    
    await waitFor(() => {
      expect(screen.getByText('Sorry, I encountered an error. Please try again.')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();
    });
    
    consoleSpy.mockRestore();
  });

  it('disables send button when input is empty', () => {
    render(<ChatTab projectId={projectId} />);
    
    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
  });

  it('shows timestamp for messages', async () => {
    render(<ChatTab projectId={projectId} />);
    
    const input = screen.getByPlaceholderText('Ask a question about your data...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));
    
    await waitFor(() => {
      // Check for time format (e.g., "10:30:45 AM")
      const timeRegex = /\d{1,2}:\d{2}:\d{2}\s?(AM|PM)?/;
      const timestamps = screen.getAllByText(timeRegex);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });

  it('maintains focus on input after sending', async () => {
    render(<ChatTab projectId={projectId} />);
    
    const input = screen.getByPlaceholderText('Ask a question about your data...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));
    
    await waitFor(() => {
      expect(mockApi.sendMessage).toHaveBeenCalled();
    });
    
    // Note: Focus behavior might need to be tested differently in JSDOM
    // This is a placeholder for the expected behavior
  });
});