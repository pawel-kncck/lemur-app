from fastapi import FastAPI, UploadFile, HTTPException, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import pandas as pd
import json
import uuid
import io
import os
from datetime import datetime
import asyncio
import logging
from dotenv import load_dotenv
from data_profiler import DataProfiler
from query_suggester import QuerySuggester
from analysis_engine import AnalysisEngine

# Load environment variables from .env file
load_dotenv()

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
logger.info(f"API Key loaded: {'Yes' if OPENAI_API_KEY else 'No'}")
logger.info(f"API Key length: {len(OPENAI_API_KEY) if OPENAI_API_KEY else 0}")
logger.info(f"API Key prefix: {OPENAI_API_KEY[:20]}..." if OPENAI_API_KEY and len(OPENAI_API_KEY) > 20 else "N/A")

if not OPENAI_API_KEY or OPENAI_API_KEY == "sk-your-openai-api-key-here":
    logger.warning("⚠️  OpenAI API key not configured properly! Chat features will not work.")
    logger.warning("Please set OPENAI_API_KEY environment variable with a valid key.")
    client = None
else:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        logger.info("✅ OpenAI client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize OpenAI client: {type(e).__name__}: {e}")
        client = None

# In-memory storage (will reset on server restart)
# In production, this would be a database
STORAGE = {
    "projects": {},  # project_id -> project_data
    "files": {},     # file_id -> file_content
    "contexts": {},  # project_id -> context
    "code_history": {},  # project_id -> list of executed code blocks
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

        # Generate comprehensive profile
        profile = DataProfiler.profile_dataframe(df)

        # Store file data with profile
        file_id = str(uuid.uuid4())
        STORAGE["files"][file_id] = {
            "content": content,
            "dataframe": df,
            "filename": file.filename,
            "rows": len(df),
            "columns": list(df.columns),
            "profile": profile  # NEW: Store the profile
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
            "preview": df.head(5).to_dict(orient='records'),
            "profile": profile  # NEW: Return profile in response
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

# File profile endpoint
@app.get("/api/files/{file_id}/profile")
async def get_file_profile(file_id: str):
    """Get the comprehensive profile of an uploaded file"""
    if file_id not in STORAGE["files"]:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Return stored profile or generate if not exists
    if "profile" in STORAGE["files"][file_id]:
        return STORAGE["files"][file_id]["profile"]
    else:
        # Generate profile if it doesn't exist (for backward compatibility)
        df = STORAGE["files"][file_id]["dataframe"]
        profile = DataProfiler.profile_dataframe(df)
        STORAGE["files"][file_id]["profile"] = profile
        return profile

# Query suggestions endpoint
@app.get("/api/projects/{project_id}/suggestions")
async def get_suggestions(project_id: str):
    """Get query suggestions based on current data and context"""
    if project_id not in STORAGE["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = STORAGE["projects"][project_id]
    suggestions = []
    
    if project.get("file_id"):
        file_data = STORAGE["files"][project["file_id"]]
        df = file_data["dataframe"]
        profile = file_data.get("profile", {})
        context = STORAGE["contexts"].get(project_id)
        
        # Get chat history if available (for now, empty as we don't store it yet)
        chat_history = []
        
        # Generate intelligent suggestions using QuerySuggester
        suggestions = QuerySuggester.generate_suggestions(
            df=df,
            profile=profile,
            context=context,
            chat_history=chat_history,
            max_suggestions=7
        )
    else:
        # Default suggestions when no data is uploaded
        suggestions = [
            "Upload a CSV file to get started",
            "What kind of data analysis do you need?",
            "Tell me about your business context"
        ]
    
    return {"suggestions": suggestions}

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
    if project.get("file_id"):
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
        
        # Add profile insights if available
        if "profile" in file_info:
            profile = file_info["profile"]
            
            # Add data quality information
            if "data_quality" in profile:
                quality = profile["data_quality"]
                data_info += f"\n\nData Quality Assessment: {quality.get('assessment', 'Unknown')}"
                if quality.get("issues"):
                    data_info += f"\nIssues: {', '.join(quality['issues'][:3])}"
                if quality.get("warnings"):
                    data_info += f"\nWarnings: {', '.join(quality['warnings'][:3])}"
            
            # Add relationship information
            if "potential_relationships" in profile:
                rels = profile["potential_relationships"]
                if rels.get("potential_ids"):
                    data_info += f"\n\nPotential ID columns: {', '.join(rels['potential_ids'])}"
                if rels.get("potential_dates"):
                    data_info += f"\nDate columns: {', '.join(rels['potential_dates'])}"
                if rels.get("potential_categories"):
                    data_info += f"\nCategorical columns: {', '.join(rels['potential_categories'][:5])}"
        
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
        
        # Check if this is an analytical query that requires code execution
        if project.get("file_id") and AnalysisEngine.is_analytical_query(message.message):
            logger.info("📊 Detected analytical query - using Analysis Engine")
            
            # Get the DataFrame
            file_info = STORAGE["files"][project["file_id"]]
            df = file_info["dataframe"]
            
            # Initialize the analysis engine
            analysis_engine = AnalysisEngine(
                api_key=OPENAI_API_KEY,
                model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
            )
            
            # Execute the analysis
            analysis_result = analysis_engine.execute_analysis(
                df=df,
                query=message.message,
                context=STORAGE["contexts"].get(project_id)
            )
            
            # Store the executed code in history
            if project_id not in STORAGE["code_history"]:
                STORAGE["code_history"][project_id] = []
            
            if analysis_result.get("code"):
                STORAGE["code_history"][project_id].append({
                    "timestamp": datetime.now().isoformat(),
                    "query": message.message,
                    "code": analysis_result["code"],
                    "success": analysis_result.get("success", False)
                })
            
            # Format the response
            response_parts = []
            
            # Add the main result
            response_parts.append(analysis_result["result"])
            
            # Add the explanation if available
            if analysis_result.get("explanation"):
                response_parts.append(f"\n{analysis_result['explanation']}")
            
            # Add the code if execution was successful
            if analysis_result.get("success") and analysis_result.get("code"):
                formatted_code = AnalysisEngine.format_code_for_display(analysis_result["code"])
                if formatted_code:
                    response_parts.append("\n\n**Executed Code:**")
                    response_parts.append(f"```python\n{formatted_code}\n```")
            
            # Add error message if there was one
            if not analysis_result.get("success") and analysis_result.get("error"):
                response_parts.append(f"\n⚠️ Note: {analysis_result['error']}")
            
            ai_response = "\n".join(response_parts)
            
            return {
                "response": ai_response,
                "timestamp": datetime.now().isoformat(),
                "code_executed": True,
                "code": analysis_result.get("code")
            }
        
        # Regular chat without code execution
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
            "timestamp": datetime.now().isoformat(),
            "code_executed": False
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

# Code history endpoint
@app.get("/api/projects/{project_id}/code-history")
async def get_code_history(project_id: str):
    """Get code execution history for a project"""
    if project_id not in STORAGE["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    
    history = STORAGE["code_history"].get(project_id, [])
    return {"history": history}

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)