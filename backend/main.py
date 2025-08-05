from fastapi import FastAPI, UploadFile, HTTPException, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import pandas as pd
from openai import OpenAI
import json
import uuid
import io
import os
from datetime import datetime
import asyncio
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY or OPENAI_API_KEY == "sk-your-openai-api-key-here":
    logger.warning("⚠️  OpenAI API key not configured properly! Chat features will not work.")
    logger.warning("Please set OPENAI_API_KEY environment variable with a valid key.")
    client = None
else:
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        logger.info("✅ OpenAI client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize OpenAI client: {e}")
        client = None

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

    # Check for mock mode
    if os.getenv("MOCK_OPENAI", "false").lower() == "true":
        logger.info("📝 Using mock mode for testing")
        mock_response = f"""I'm analyzing your data in mock mode. Here's what I can tell you:

Based on your question: "{message.message}"

{f"Your data file '{project['file_name']}' contains {STORAGE['files'][project['file_id']]['rows']} rows and {len(project['file_columns'])} columns." if project.get('file_id') else "No data file has been uploaded yet."}

{f"Columns in your data: {', '.join(project['file_columns'])}" if project.get('file_columns') else ""}

{f"Context provided: {STORAGE['contexts'].get(project_id, 'No context provided')[:100]}..." if project_id in STORAGE['contexts'] else "No business context has been provided."}

This is a mock response for testing purposes. To get real AI analysis, please configure a valid OpenAI API key."""
        
        return {
            "response": mock_response,
            "timestamp": datetime.now().isoformat()
        }
    
    # Check if OpenAI client is available
    if not client:
        logger.error("OpenAI client not initialized - API key missing or invalid")
        return {
            "response": "I'm sorry, but I can't process your request right now. The AI service is not properly configured. Please ensure the OpenAI API key is set correctly.",
            "timestamp": datetime.now().isoformat()
        }

    try:
        logger.info(f"Sending chat request for project {project_id}")
        logger.debug(f"Message: {message.message[:100]}...")
        
        # Call OpenAI API with new syntax
        # Try GPT-4 first, fall back to GPT-3.5-turbo if needed
        model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")  # Default to gpt-3.5-turbo
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_context},
                {"role": "user", "content": message.message}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        ai_response = response.choices[0].message.content
        logger.info("✅ Successfully received response from OpenAI")

        return {
            "response": ai_response,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"❌ Error calling OpenAI API: {type(e).__name__}: {str(e)}")
        logger.exception("Full error details:")
        
        # Provide more helpful error messages
        error_str = str(e).lower()
        if "billing_not_active" in error_str:
            error_msg = "OpenAI account is not active. Please add billing details at https://platform.openai.com/account/billing"
        elif "api_key" in error_str:
            error_msg = "API key error. Please check that your OpenAI API key is valid."
        elif "rate_limit" in error_str:
            error_msg = "Rate limit exceeded. Please wait a moment and try again."
        elif "model" in error_str:
            error_msg = "Model access error. You may not have access to GPT-4. Try updating the model to 'gpt-3.5-turbo'."
        else:
            error_msg = f"Error: {str(e)}"
            
        raise HTTPException(status_code=500, detail=f"Error calling AI: {error_msg}")

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)