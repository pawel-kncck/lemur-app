import { useState } from 'react';
import './App.css';
import { Sidebar, DataStudioTab, ContextTab, ChatTab } from './components';
import { Project } from './types/types';

type TabType = 'data' | 'context' | 'chat';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('data');

  const mainContentStyle = {
    marginLeft: sidebarCollapsed ? '60px' : '250px',
    height: '100vh',
    backgroundColor: '#0a0a0a',
    color: 'white',
    transition: 'margin-left 0.3s ease',
    display: 'flex',
    flexDirection: 'column' as const,
  };

  const tabButtonStyle = (isActive: boolean) => ({
    padding: '10px 20px',
    backgroundColor: isActive ? '#4a9eff' : 'transparent',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? '500' : '400',
    borderRadius: '6px',
    transition: 'all 0.2s',
  });

  return (
    <div className="App">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentProject={currentProject}
        onProjectSelect={setCurrentProject}
      />

      <div style={mainContentStyle}>
        {currentProject ? (
          <>
            {/* Project Header */}
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #333',
                backgroundColor: '#1a1a1a',
              }}
            >
              <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>
                {currentProject.name}
              </h1>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  style={tabButtonStyle(activeTab === 'data')}
                  onClick={() => setActiveTab('data')}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'data') {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'data') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  📊 Data Studio
                </button>
                <button
                  style={tabButtonStyle(activeTab === 'context')}
                  onClick={() => setActiveTab('context')}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'context') {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'context') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  📝 Context
                </button>
                <button
                  style={tabButtonStyle(activeTab === 'chat')}
                  onClick={() => setActiveTab('chat')}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'chat') {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'chat') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  💬 Chat
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {activeTab === 'data' && <DataStudioTab projectId={currentProject.id} />}
              {activeTab === 'context' && <ContextTab projectId={currentProject.id} />}
              {activeTab === 'chat' && <ChatTab projectId={currentProject.id} />}
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ fontSize: '64px' }}>🦫</div>
            <h1 style={{ margin: 0, fontSize: '32px' }}>Welcome to Lemur</h1>
            <p style={{ margin: 0, color: '#999', fontSize: '18px' }}>
              Create or select a project to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;