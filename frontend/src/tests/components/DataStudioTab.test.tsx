import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { DataStudioTab } from '../../components/DataStudioTab';
import { mockApi, mockFileUploadResponse } from '../mocks/api';

describe('DataStudioTab', () => {
  const projectId = 'test-project-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area when no files', () => {
    render(<DataStudioTab projectId={projectId} />);
    
    expect(screen.getByText('Data Studio')).toBeInTheDocument();
    expect(screen.getByText('Drop your CSV file here')).toBeInTheDocument();
    expect(screen.getByText('or click to browse files')).toBeInTheDocument();
  });

  it('handles file upload via click', async () => {
    render(<DataStudioTab projectId={projectId} />);
    
    const file = new File(['col1,col2\nval1,val2'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/drop your csv file/i).parentElement?.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(mockApi.uploadFile).toHaveBeenCalledWith(projectId, file);
      });
    }
  });

  it('shows uploaded file info', async () => {
    render(<DataStudioTab projectId={projectId} />);
    
    // Simulate file upload
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/drop your csv file/i).parentElement?.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
        expect(screen.getByText('100 rows')).toBeInTheDocument();
        expect(screen.getByText(/CSV.*Uploaded/)).toBeInTheDocument();
      });
    }
  });

  it('handles drag and drop', async () => {
    render(<DataStudioTab projectId={projectId} />);
    
    const dropZone = screen.getByText('Drop your CSV file here').parentElement;
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    
    if (dropZone) {
      fireEvent.dragOver(dropZone);
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
      
      await waitFor(() => {
        expect(mockApi.uploadFile).toHaveBeenCalledWith(projectId, file);
      });
    }
  });

  it('shows preview button for uploaded files', async () => {
    render(<DataStudioTab projectId={projectId} />);
    
    // Upload file first
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/drop your csv file/i).parentElement?.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText('Preview')).toBeInTheDocument();
      });
    }
  });

  it('opens preview modal', async () => {
    render(<DataStudioTab projectId={projectId} />);
    
    // Upload file first
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/drop your csv file/i).parentElement?.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        const previewButton = screen.getByText('Preview');
        fireEvent.click(previewButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Data Preview')).toBeInTheDocument();
        expect(mockApi.previewFile).toHaveBeenCalled();
      });
    }
  });

  it('closes preview modal', async () => {
    render(<DataStudioTab projectId={projectId} />);
    
    // Upload and open preview
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/drop your csv file/i).parentElement?.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Preview'));
      });

      await waitFor(() => {
        const closeButton = screen.getByText('×');
        fireEvent.click(closeButton);
      });

      expect(screen.queryByText('Data Preview')).not.toBeInTheDocument();
    }
  });

  it('shows upload error', async () => {
    mockApi.uploadFile.mockRejectedValueOnce(new Error('Upload failed'));
    render(<DataStudioTab projectId={projectId} />);
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/drop your csv file/i).parentElement?.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to upload file. Please try again.')).toBeInTheDocument();
      });
    }
  });

  it('allows uploading new file', async () => {
    render(<DataStudioTab projectId={projectId} />);
    
    // Upload first file
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/drop your csv file/i).parentElement?.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        const uploadNewButton = screen.getByText('Upload New File');
        fireEvent.click(uploadNewButton);
      });

      expect(screen.getByText('Drop your CSV file here')).toBeInTheDocument();
    }
  });
});