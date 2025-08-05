# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT** Remember to follow Git Commit Guidelines **IMPORTANT**

## Project Overview

Lemur is a data analysis chatbot application with a React frontend and FastAPI backend. It allows users to upload CSV files, provide business context, and chat with an AI assistant about their data.

## Architecture

- **Frontend**: React + TypeScript + Vite

  - Located in `/frontend`
  - Uses Vite dev server on port 5173 (default)
  - No component library or API integration yet (plain React)

- **Backend**: FastAPI + Python
  - Located in `/backend`
  - Single file API in `main.py`
  - Uses in-memory storage (resets on restart)
  - Integrates with OpenAI API for chat functionality

## Common Commands

### Frontend Development

```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend Development

```bash
cd backend
pip install -r requirements.txt    # Install dependencies
python main.py                     # Run development server
# or
uvicorn main:app --reload         # Run with auto-reload
```

### Docker Development

```bash
# Backend
cd backend
docker build -t lemur-backend .
docker run -p 8000:8000 -e OPENAI_API_KEY=your-key lemur-backend
```

## API Endpoints

The backend provides these REST endpoints:

- `GET /` - Health check
- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects
- `GET /api/projects/{project_id}` - Get project details
- `POST /api/projects/{project_id}/upload` - Upload CSV file
- `GET /api/files/{file_id}/preview` - Preview uploaded file
- `PUT /api/projects/{project_id}/context` - Save business context
- `GET /api/projects/{project_id}/context` - Get business context
- `POST /api/projects/{project_id}/chat` - Chat with AI about data

## Environment Variables

### Backend

- `OPENAI_API_KEY` - Required for AI chat functionality

### Frontend

- `VITE_API_URL` - Backend API URL (defaults to http://localhost:8000)

## Current Implementation Status

Based on the implementation plan, the project is in early stages:

- Backend API is implemented with core endpoints
- Frontend has basic React setup but no UI components yet
- No authentication system
- Uses in-memory storage (not persistent)
- No tests implemented

## Key Implementation Details

1. **CORS**: Backend allows all origins (`*`) for development
2. **File Handling**: Only CSV files are supported
3. **AI Integration**: Uses OpenAI's GPT-4 model with context from uploaded data
4. **Data Processing**: Uses pandas for CSV parsing and analysis
5. **API Framework**: FastAPI with Pydantic models for validation

## Next Steps (from implementation plan)

The implementation plan suggests these components need to be built:

- Frontend UI components (Sidebar, DataStudioTab, ContextTab, ChatTab)
- API integration layer in frontend
- Docker Compose setup for easier development
- Sample datasets for testing
- Deployment configuration (Railway or Render)

## Development Tips

1. The backend expects an OpenAI API key - set it as an environment variable
2. Frontend and backend run on different ports - ensure CORS is properly configured
3. All data is stored in memory - will be lost on server restart
4. The project follows a monorepo structure with separate frontend/backend directories

## Git Commit Guidelines

IMPORTANT: Always commit changes to git after completing each task. The commit granularity should align with your todo items:

1. After completing each todo item, create a git commit
2. Use descriptive commit messages that explain what was changed
3. Commit format: `git commit -m "feat/fix/docs: Brief description of change"`
4. Examples:
   - `git commit -m "feat: Add user authentication endpoints"`
   - `git commit -m "fix: Correct CSV parsing error for large files"`
   - `git commit -m "docs: Update API documentation for chat endpoint"`

This ensures a clean commit history that tracks the development progress and makes it easy to review or rollback changes.
