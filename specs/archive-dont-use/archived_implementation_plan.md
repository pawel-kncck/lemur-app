# Implementation Plan: Lemur MVP

## Overview

Build a functional data analysis chatbot with context awareness. No authentication, minimal complexity, but with a real backend to protect API keys.

## Current Implementation Status

### ✅ Stage 1: Backend Foundation (COMPLETED)

The backend has been successfully implemented with:

- **FastAPI server** with all core endpoints
- **OpenAI integration** using the new client library (>=1.0.0)
- **Error handling** for OpenAI billing issues and mock mode
- **CORS configuration** for frontend communication
- **In-memory storage** for projects, files, and contexts
- **CSV file handling** with pandas
- **Environment variables** configuration with dotenv

**Files implemented:**
- `backend/main.py` - Main API server
- `backend/requirements.txt` - Updated with openai>=1.0.0
- `backend/.env.example` - Environment variables template
- `backend/Dockerfile` - Docker configuration
- `backend/test_openai.py` - OpenAI integration testing script

**Original planned `backend/main.py`**

```python
from fastapi import FastAPI, UploadFile, HTTPException, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import pandas as pd
import openai
import json
import uuid
import io
import os
from datetime import datetime
import asyncio

# Initialize FastAPI
app = FastAPI()

# Configure CORS - allow all origins for testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

# In-memory storage (will reset on server restart)
# In production, this would be a database
STORAGE = {
    "projects": {},  # project_id -> project_data
    "files": {},     # file_id -> file_content
    "contexts": {},  # project_id -> context
}

# Pydantic models for request/response
class ProjectCreate(BaseModel):
    name: str

class ContextUpdate(BaseModel):
    content: str

class ChatMessage(BaseModel):
    message: str

class Project(BaseModel):
    id: str
    name: str
    created_at: str
    context: Optional[str] = None
    file_id: Optional[str] = None
    file_name: Optional[str] = None
    file_columns: Optional[List[str]] = None

# Health check endpoint
@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Lemur API is running"}

# Project endpoints
@app.post("/api/projects", response_model=Project)
async def create_project(project: ProjectCreate):
    """Create a new project"""
    project_id = str(uuid.uuid4())

    project_data = {
        "id": project_id,
        "name": project.name,
        "created_at": datetime.now().isoformat(),
        "context": None,
        "file_id": None,
        "file_name": None,
        "file_columns": None
    }

    STORAGE["projects"][project_id] = project_data
    return project_data

@app.get("/api/projects")
async def list_projects():
    """List all projects"""
    return list(STORAGE["projects"].values())

@app.get("/api/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a specific project"""
    if project_id not in STORAGE["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    return STORAGE["projects"][project_id]

# File upload endpoint
@app.post("/api/projects/{project_id}/upload")
async def upload_file(project_id: str, file: UploadFile = File(...)):
    """Upload a CSV file to a project"""
    if project_id not in STORAGE["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    if not file.filename.endswith(('.csv', '.CSV')):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    try:
        # Read file content
        content = await file.read()

        # Parse CSV to validate and get schema
        df = pd.read_csv(io.BytesIO(content))

        # Store file data
        file_id = str(uuid.uuid4())
        STORAGE["files"][file_id] = {
            "content": content,
            "dataframe": df,
            "filename": file.filename,
            "rows": len(df),
            "columns": list(df.columns)
        }

        # Update project with file info
        STORAGE["projects"][project_id].update({
            "file_id": file_id,
            "file_name": file.filename,
            "file_columns": list(df.columns)
        })

        return {
            "file_id": file_id,
            "filename": file.filename,
            "rows": len(df),
            "columns": list(df.columns),
            "preview": df.head(5).to_dict(orient='records')
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

# File preview endpoint
@app.get("/api/files/{file_id}/preview")
async def preview_file(file_id: str, rows: int = 100):
    """Get a preview of uploaded file"""
    if file_id not in STORAGE["files"]:
        raise HTTPException(status_code=404, detail="File not found")

    df = STORAGE["files"][file_id]["dataframe"]
    preview_df = df.head(rows)

    return {
        "rows": len(df),
        "columns": list(df.columns),
        "data": preview_df.to_dict(orient='records'),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()}
    }

# Context endpoints
@app.put("/api/projects/{project_id}/context")
async def update_context(project_id: str, context: ContextUpdate):
    """Save or update project context"""
    if project_id not in STORAGE["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")

    STORAGE["contexts"][project_id] = context.content
    STORAGE["projects"][project_id]["context"] = context.content

    return {"status": "saved", "context": context.content}

@app.get("/api/projects/{project_id}/context")
async def get_context(project_id: str):
    """Get project context"""
    if project_id not in STORAGE["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")

    context = STORAGE["contexts"].get(project_id, "")
    return {"context": context}

# Chat endpoint - the core feature
@app.post("/api/projects/{project_id}/chat")
async def chat_with_data(project_id: str, message: ChatMessage):
    """Chat with AI about your data"""
    if project_id not in STORAGE["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")

    project = STORAGE["projects"][project_id]

    # Build context for the AI
    system_context = "You are a helpful data analysis assistant."

    # Add user's business context if available
    if project_id in STORAGE["contexts"]:
        system_context += f"\n\nBusiness Context:\n{STORAGE['contexts'][project_id]}"

    # Add data schema information if file is uploaded
    if project["file_id"]:
        file_info = STORAGE["files"][project["file_id"]]
        df = file_info["dataframe"]

        # Get basic statistics and info about the data
        data_info = f"""

Data Information:
- File: {file_info['filename']}
- Rows: {len(df)}
- Columns: {', '.join(df.columns)}

Column Types:
{df.dtypes.to_string()}

Sample Data (first 3 rows):
{df.head(3).to_string()}

Basic Statistics:
{df.describe().to_string() if not df.empty else 'No numeric data'}
        """
        system_context += data_info

    try:
        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_context},
                {"role": "user", "content": message.message}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        ai_response = response.choices[0].message.content

        return {
            "response": ai_response,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling AI: {str(e)}")

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**✅ Actual `backend/requirements.txt`** (Updated from plan)

```txt
fastapi==0.104.1
uvicorn==0.24.0
pandas==2.1.3
openai>=1.0.0  # Updated to new client library
python-multipart==0.0.6
python-dotenv==1.0.0
```

**`backend/.env`**

```bash
OPENAI_API_KEY=sk-your-openai-key-here
```

### ✅ Stage 2: Frontend Foundation (COMPLETED)

The frontend has been successfully implemented with:

- **React + TypeScript + Vite** setup
- **Tailwind CSS** for styling  
- **Basic UI components** implemented
- **API integration layer** in `lib/api.ts`
- **Project management** functionality
- **File upload** with CSV preview
- **Context editor** for business logic
- **Chat interface** with AI assistant

**Files implemented:**
- `frontend/src/App.tsx` - Main application with tabs
- `frontend/src/components/` - All UI components (Sidebar, DataStudioTab, ContextTab, ChatTab)
- `frontend/src/lib/api.ts` - API integration layer
- `frontend/src/types/` - TypeScript type definitions

### 🔄 Stage 3: Frontend-Backend Integration (PARTIALLY COMPLETE)

Update the existing frontend to use the real backend:

**`frontend/lib/api.ts`**

```typescript
// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper function for API calls
async function apiCall(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

// API functions
export const api = {
  // Projects
  createProject: async (name: string) => {
    return apiCall('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  },

  listProjects: async () => {
    return apiCall('/api/projects');
  },

  getProject: async (projectId: string) => {
    return apiCall(`/api/projects/${projectId}`);
  },

  // Files
  uploadFile: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  },

  previewFile: async (fileId: string) => {
    return apiCall(`/api/files/${fileId}/preview`);
  },

  // Context
  saveContext: async (projectId: string, content: string) => {
    return apiCall(`/api/projects/${projectId}/context`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  },

  getContext: async (projectId: string) => {
    return apiCall(`/api/projects/${projectId}/context`);
  },

  // Chat
  sendMessage: async (projectId: string, message: string) => {
    return apiCall(`/api/projects/${projectId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  },
};
```

### Hours 7-9: Update React Components

**Updated `components/Sidebar.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
// ... other imports

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

  // ... rest of component
}
```

**Updated `components/DataStudioTab.tsx`**

```typescript
import { useState } from 'react';
import { api } from '../lib/api';
// ... other imports

export function DataStudioTab({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    setUploadError(null);
    setUploading(true);

    try {
      const result = await api.uploadFile(projectId, file);

      const newFile: UploadedFile = {
        id: result.file_id,
        name: result.filename,
        size: `${result.rows} rows`,
        type: 'CSV',
        uploadedAt: new Date(),
        status: 'success',
        preview: result.preview,
      };

      setFiles([newFile]);
    } catch (error) {
      setUploadError('Failed to upload file. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (fileId: string) => {
    try {
      const preview = await api.previewFile(fileId);
      // Show preview in modal
      showPreviewModal(preview);
    } catch (error) {
      console.error('Failed to load preview:', error);
    }
  };

  // ... rest of component
}
```

**Updated `components/ContextTab.tsx`**

```typescript
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

  // ... rest of component
}
```

**Updated `components/ChatTab.tsx`**

```typescript
import { useState } from 'react';
import { api } from '../lib/api';

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
    }
  };

  // ... rest of component
}
```

### ✅ Stage 4: Docker Setup (COMPLETED)

Docker configuration has been implemented for easy deployment:

**`docker-compose.yml`**

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - '8000:8000'
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./backend:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - '8080:8080'
    environment:
      - VITE_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
```

**`backend/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**`frontend/Dockerfile`**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "run", "dev"]
```

### 🔄 Stage 5: Testing & Bug Fixes (PARTIALLY COMPLETE)

Testing infrastructure has been set up:
- Backend tests in `backend/tests/` directory
- Frontend tests in `frontend/src/tests/` directory
- Test runner script `backend/run_tests.sh`
- OpenAI integration test script `backend/test_openai.py`

### ⏳ Stage 6: Sample Test Flow (PLANNED)

**`test_flow.py`** - Quick test script

```python
import requests
import json

BASE_URL = "http://localhost:8000"

def test_full_flow():
    # 1. Create project
    print("Creating project...")
    project_response = requests.post(
        f"{BASE_URL}/api/projects",
        json={"name": "Test Project"}
    )
    project = project_response.json()
    project_id = project["id"]
    print(f"Created project: {project_id}")

    # 2. Upload sample CSV
    print("Uploading CSV...")
    with open("sample_data.csv", "rb") as f:
        files = {"file": ("sample.csv", f, "text/csv")}
        upload_response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/upload",
            files=files
        )
    print(f"Upload result: {upload_response.json()}")

    # 3. Add context
    print("Adding context...")
    context_response = requests.put(
        f"{BASE_URL}/api/projects/{project_id}/context",
        json={"content": "This is sales data with revenue in USD"}
    )
    print(f"Context saved: {context_response.json()}")

    # 4. Test chat
    print("Testing chat...")
    chat_response = requests.post(
        f"{BASE_URL}/api/projects/{project_id}/chat",
        json={"message": "What columns are in my data?"}
    )
    print(f"AI Response: {chat_response.json()['response']}")

if __name__ == "__main__":
    test_full_flow()
```

### ⏳ Stage 7: Cloud Deployment (NOT STARTED)

**Option A: Deploy to Railway (Simplest)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy backend
cd backend
railway init
railway add
railway up

# Deploy frontend
cd ../frontend
railway init
railway add
railway up
```

**Option B: Deploy to Render**

**`render.yaml`**

```yaml
services:
  - type: web
    name: lemur-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: OPENAI_API_KEY
        sync: false

  - type: web
    name: lemur-frontend
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_URL
        value: https://lemur-backend.onrender.com
```

### ⏳ Stage 8: Sample Datasets (NOT STARTED)

**`sample_datasets/sales_data.csv`**

```csv
date,product,quantity,price,region,category
2024-01-01,Widget A,100,29.99,North,Electronics
2024-01-02,Widget B,150,39.99,South,Electronics
2024-01-03,Gadget X,75,49.99,East,Accessories
2024-01-04,Gadget Y,200,19.99,West,Accessories
2024-01-05,Widget A,125,29.99,North,Electronics
```

**`sample_datasets/customer_data.csv`**

```csv
customer_id,name,email,total_purchases,lifetime_value,segment
1001,John Doe,john@example.com,5,499.95,Gold
1002,Jane Smith,jane@example.com,12,1299.88,Platinum
1003,Bob Johnson,bob@example.com,3,149.97,Silver
1004,Alice Brown,alice@example.com,8,799.92,Gold
```

### ✅ Stage 9: Documentation (COMPLETED)

Documentation has been created and maintained:

**`README.md`**

````markdown
# Lemur MVP - 24 Hour Build

## Quick Start

### Local Development

```bash
# Clone the repo
git clone https://github.com/yourname/lemur-mvp.git
cd lemur-mvp

# Set up environment
echo "OPENAI_API_KEY=sk-your-key" > backend/.env

# Start with Docker
docker-compose up

# Or start manually
cd backend && pip install -r requirements.txt && python main.py
cd frontend && npm install && npm run dev
```
````

### Access the Application

- Frontend: http://localhost:8080
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Testing Guide

1. **Create a Project**

   - Click "New Project"
   - Name it (e.g., "Sales Analysis")

2. **Upload Data**

   - Go to Data Studio tab
   - Upload a CSV file
   - Click Preview to verify

3. **Add Context**

   - Go to Context tab
   - Describe your data and business logic
   - Example: "This is Q3 sales data. 'price' is in USD, 'quantity' is units sold"
   - Click Save

4. **Ask Questions**
   - Go to Chat tab
   - Try these queries:
     - "What columns are in my data?"
     - "What's the data type of each column?"
     - "How would I calculate total revenue?"
     - "What analysis would you recommend?"

## Current Limitations

- No authentication (anyone can access)
- Data resets on server restart
- No actual data analysis execution (only recommendations)
- Single file per project
- No export functionality

## Next Phase Features

- User authentication
- Persistent database (PostgreSQL)
- Multiple files per project
- Actual data analysis execution
- Data visualizations
- Export results

## Deployment

Currently deployed at:

- Frontend: https://lemur-app.vercel.app
- Backend: https://lemur-api.railway.app

## Support

For issues or questions, contact: your-email@example.com

```

## Implementation Progress Summary

### ✅ Completed
- [x] FastAPI backend with all core endpoints
- [x] OpenAI integration with new client library (>=1.0.0)
- [x] Error handling for OpenAI billing issues
- [x] Mock mode for testing without API calls
- [x] CORS configuration
- [x] React + TypeScript + Vite frontend
- [x] All UI components (Sidebar, DataStudioTab, ContextTab, ChatTab)
- [x] API integration layer
- [x] Docker configuration
- [x] Environment variables setup
- [x] Basic documentation (README.md, CLAUDE.md)

### 🔄 In Progress
- [ ] Full frontend-backend integration testing
- [ ] Component state management improvements
- [ ] Error handling refinements

### ⏳ Not Started (Stage 2)
- [ ] Cloud deployment (Railway/Render)
- [ ] Sample datasets creation
- [ ] Production environment configuration
- [ ] User authentication system
- [ ] Persistent database (PostgreSQL)
- [ ] Data visualization features
- [ ] Export functionality

## Current MVP Status

The application has:
1. **Working backend** with API protection for OpenAI keys
2. **Complete frontend UI** with all planned components
3. **Docker setup** for containerized deployment
4. **Basic integration** between frontend and backend
5. **Error handling** for common issues (billing, API failures)

## Next Steps for Stage 2

1. **Complete Integration Testing**: Ensure all frontend components properly communicate with backend
2. **Deploy to Cloud**: Set up Railway or Render deployment
3. **Add Sample Data**: Create example CSV files for testing
4. **Enhance Error Handling**: Improve user feedback for errors
5. **Add Authentication**: Implement basic user authentication
6. **Database Persistence**: Replace in-memory storage with PostgreSQL

The MVP foundation is complete and ready for Stage 2 enhancements.
```
