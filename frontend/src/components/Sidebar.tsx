import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Project } from '../types/types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentProject: Project | null;
  onProjectSelect: (project: Project) => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  currentProject,
  onProjectSelect,
}: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectList = await api.listProjects();
      setProjects(projectList);

      // Select first project if none selected
      if (projectList.length > 0 && !currentProject) {
        onProjectSelect(projectList[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleNewProject = async () => {
    if (!newProjectName.trim()) return;

    setLoading(true);
    try {
      const newProject = await api.createProject(newProjectName.trim());
      setProjects([newProject, ...projects]);
      onProjectSelect(newProject);
      setNewProjectName('');
      setIsNewProjectDialogOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
        style={{
          width: collapsed ? '60px' : '250px',
          backgroundColor: '#1a1a1a',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          transition: 'width 0.3s ease',
          borderRight: '1px solid #333',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {!collapsed && <h2 style={{ margin: 0, fontSize: '20px' }}>Lemur</h2>}
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '5px',
              fontSize: '20px',
            }}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Projects Section */}
        {!collapsed && (
          <>
            <div
              style={{
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '14px', color: '#999' }}>Projects</span>
              <button
                onClick={() => setIsNewProjectDialogOpen(true)}
                style={{
                  background: 'none',
                  border: '1px solid #666',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                + New
              </button>
            </div>

            {/* Project List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onProjectSelect(project)}
                  style={{
                    padding: '10px',
                    margin: '5px 0',
                    backgroundColor:
                      currentProject?.id === project.id ? '#333' : 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (currentProject?.id !== project.id) {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentProject?.id !== project.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                    {project.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* New Project Dialog */}
      {isNewProjectDialogOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsNewProjectDialogOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#2a2a2a',
              padding: '30px',
              borderRadius: '12px',
              width: '400px',
              border: '1px solid #444',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>New Project</h3>
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNewProject();
              }}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: 'white',
                marginBottom: '20px',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsNewProjectDialogOpen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #666',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleNewProject}
                disabled={loading || !newProjectName.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4a9eff',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: loading || !newProjectName.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !newProjectName.trim() ? 0.5 : 1,
                }}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}