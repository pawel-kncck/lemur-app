import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { Sidebar } from '../../components/Sidebar';
import { mockApi, mockProject } from '../mocks/api';

describe('Sidebar', () => {
  const mockProps = {
    collapsed: false,
    onToggle: vi.fn(),
    currentProject: null,
    onProjectSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sidebar with title', () => {
    render(<Sidebar {...mockProps} />);
    expect(screen.getByText('Lemur')).toBeInTheDocument();
  });

  it('loads and displays projects on mount', async () => {
    render(<Sidebar {...mockProps} />);
    
    await waitFor(() => {
      expect(mockApi.listProjects).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('selects first project if none selected', async () => {
    render(<Sidebar {...mockProps} />);
    
    await waitFor(() => {
      expect(mockProps.onProjectSelect).toHaveBeenCalledWith(mockProject);
    });
  });

  it('toggles collapse state', () => {
    render(<Sidebar {...mockProps} />);
    
    const toggleButton = screen.getByText('←');
    fireEvent.click(toggleButton);
    
    expect(mockProps.onToggle).toHaveBeenCalled();
  });

  it('shows collapsed state correctly', () => {
    render(<Sidebar {...{ ...mockProps, collapsed: true }} />);
    
    expect(screen.queryByText('Lemur')).not.toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('opens new project dialog', async () => {
    render(<Sidebar {...mockProps} />);
    
    await waitFor(() => {
      const newButton = screen.getByText('+ New');
      fireEvent.click(newButton);
    });

    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Project name')).toBeInTheDocument();
  });

  it('creates new project', async () => {
    render(<Sidebar {...mockProps} />);
    
    // Open dialog
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ New'));
    });

    // Enter project name
    const input = screen.getByPlaceholderText('Project name');
    fireEvent.change(input, { target: { value: 'My New Project' } });

    // Create project
    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockApi.createProject).toHaveBeenCalledWith('My New Project');
      expect(mockProps.onProjectSelect).toHaveBeenCalled();
    });
  });

  it('cancels new project dialog', async () => {
    render(<Sidebar {...mockProps} />);
    
    // Open dialog
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ New'));
    });

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('New Project')).not.toBeInTheDocument();
  });

  it('disables create button with empty name', async () => {
    render(<Sidebar {...mockProps} />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ New'));
    });

    const createButton = screen.getByText('Create');
    expect(createButton).toBeDisabled();
  });

  it('highlights current project', async () => {
    render(<Sidebar {...{ ...mockProps, currentProject: mockProject }} />);
    
    await waitFor(() => {
      const projectElement = screen.getByText('Test Project').closest('div');
      expect(projectElement).toHaveStyle({ backgroundColor: '#333' });
    });
  });

  it('handles project selection', async () => {
    render(<Sidebar {...mockProps} />);
    
    await waitFor(() => {
      const projectElement = screen.getByText('Test Project');
      fireEvent.click(projectElement);
    });

    expect(mockProps.onProjectSelect).toHaveBeenCalledWith(mockProject);
  });

  it('handles API errors gracefully', async () => {
    mockApi.listProjects.mockRejectedValueOnce(new Error('API Error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<Sidebar {...mockProps} />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load projects:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});