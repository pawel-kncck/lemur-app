# Implementation Plan: Mastering the Main Flow

## Phase 1: Immediate Next Steps (Week 1-2)

### 1.1 Data Profiler Implementation

#### Backend Changes

**New file: `backend/data_profiler.py`**

```python
from typing import Dict, Any, List
import pandas as pd
import numpy as np

class DataProfiler:
    """Generates comprehensive data profiles for uploaded files"""

    @staticmethod
    def profile_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Returns:
        {
            "basic_info": {...},
            "columns": {
                "column_name": {
                    "dtype": "string",
                    "null_count": 0,
                    "null_percentage": 0.0,
                    "unique_values": 100,
                    "unique_percentage": 10.0,
                    # For numeric:
                    "stats": {"mean": 0, "median": 0, ...},
                    # For categorical:
                    "top_values": {"value1": count, ...},
                    # For dates:
                    "date_range": {"min": "", "max": "", "days": 0}
                }
            },
            "potential_relationships": {
                "potential_ids": [],
                "potential_dates": [],
                "potential_categories": [],
                "highly_correlated": []
            }
        }
        """
```

**Modify: `backend/main.py`**

```python
# Add to file upload endpoint
@app.post("/api/projects/{project_id}/upload")
async def upload_file(project_id: str, file: UploadFile = File(...)):
    # ... existing code ...

    # Generate profile
    from data_profiler import DataProfiler
    profile = DataProfiler.profile_dataframe(df)

    # Store profile with file data
    STORAGE["files"][file_id] = {
        "content": content,
        "dataframe": df,
        "filename": file.filename,
        "rows": len(df),
        "columns": list(df.columns),
        "profile": profile  # NEW
    }

    # Return profile in response
    return {
        "file_id": file_id,
        "filename": file.filename,
        "rows": len(df),
        "columns": list(df.columns),
        "preview": df.head(5).to_dict(orient='records'),
        "profile": profile  # NEW
    }

# Add new endpoint for getting profile
@app.get("/api/files/{file_id}/profile")
async def get_file_profile(file_id: str):
    if file_id not in STORAGE["files"]:
        raise HTTPException(status_code=404, detail="File not found")
    return STORAGE["files"][file_id]["profile"]
```

#### Frontend Changes

**Modify: `frontend/src/components/DataStudioTab.tsx`**

```typescript
interface DataProfile {
  basic_info: {
    rows: number;
    columns: number;
    memory_usage: number;
    duplicates: number;
  };
  columns: Record<string, ColumnProfile>;
  potential_relationships: {
    potential_ids: string[];
    potential_dates: string[];
    potential_categories: string[];
    highly_correlated: Array<{
      col1: string;
      col2: string;
      correlation: number;
    }>;
  };
}

// Add profile view component
const DataProfileView = ({ profile }: { profile: DataProfile }) => (
  <div
    style={{ padding: '20px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}
  >
    <h3>Data Profile</h3>

    {/* Basic Info */}
    <div style={{ marginBottom: '20px' }}>
      <h4>Overview</h4>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
        }}
      >
        <div
          style={{
            padding: '10px',
            backgroundColor: '#2a2a2a',
            borderRadius: '4px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#999' }}>Rows</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            {profile.basic_info.rows}
          </div>
        </div>
        {/* Similar cards for columns, memory, duplicates */}
      </div>
    </div>

    {/* Data Quality Alerts */}
    {Object.entries(profile.columns).map(
      ([col, data]) =>
        data.null_percentage > 20 && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#4a3c28',
              borderRadius: '4px',
              marginBottom: '10px',
            }}
          >
            ⚠️ Column "{col}" has {data.null_percentage.toFixed(1)}% missing
            values
          </div>
        )
    )}

    {/* Detected Relationships */}
    {profile.potential_relationships.potential_ids.length > 0 && (
      <div style={{ marginTop: '20px' }}>
        <h4>Detected Patterns</h4>
        <ul>
          <li>
            Potential ID columns:{' '}
            {profile.potential_relationships.potential_ids.join(', ')}
          </li>
          <li>
            Date columns:{' '}
            {profile.potential_relationships.potential_dates.join(', ')}
          </li>
          <li>
            Categories:{' '}
            {profile.potential_relationships.potential_categories.join(', ')}
          </li>
        </ul>
      </div>
    )}
  </div>
);
```

#### User Flow

1. User uploads CSV file
2. System shows upload success with preview
3. **NEW**: Data Profile panel appears showing:
   - Data overview cards
   - Quality warnings (missing data, duplicates)
   - Detected column types and patterns
   - Suggested relationships
4. Profile data is included in AI context for better answers

---

### 1.2 Query Suggestions Implementation

#### Backend Changes

**New file: `backend/query_suggester.py`**

```python
from typing import List, Dict, Any
import pandas as pd

class QuerySuggester:
    @staticmethod
    def generate_suggestions(
        df: pd.DataFrame,
        profile: Dict[str, Any],
        conversation_history: List[Dict] = None
    ) -> List[Dict[str, str]]:
        """
        Returns list of suggestion objects:
        [
            {"text": "What are the main trends?", "category": "overview"},
            {"text": "Show me top 10 products by revenue", "category": "ranking"},
            ...
        ]
        """
        suggestions = []

        # Context-aware suggestions based on:
        # 1. Data profile (column types, distributions)
        # 2. Conversation history (what was discussed)
        # 3. Common analysis patterns

        return suggestions

# Add to main.py
@app.get("/api/projects/{project_id}/suggestions")
async def get_suggestions(project_id: str):
    # Get current context
    project = STORAGE["projects"][project_id]

    suggestions = []
    if project["file_id"]:
        file_data = STORAGE["files"][project["file_id"]]
        df = file_data["dataframe"]
        profile = file_data["profile"]

        # Get conversation history if exists
        history = STORAGE.get("conversations", {}).get(project_id, [])

        from query_suggester import QuerySuggester
        suggestions = QuerySuggester.generate_suggestions(df, profile, history)

    return {"suggestions": suggestions}
```

#### Frontend Changes

**Modify: `frontend/src/components/ChatTab.tsx`**

```typescript
interface QuerySuggestion {
  text: string;
  category: string;
}

// Add suggestions component
const QuerySuggestions = ({
  suggestions,
  onSelect,
}: {
  suggestions: QuerySuggestion[];
  onSelect: (text: string) => void;
}) => (
  <div style={{ padding: '10px 0' }}>
    <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
      Suggested questions:
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(suggestion.text)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '16px',
            color: '#4a9eff',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3a3a3a';
            e.currentTarget.style.borderColor = '#4a9eff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2a2a2a';
            e.currentTarget.style.borderColor = '#444';
          }}
        >
          {suggestion.text}
        </button>
      ))}
    </div>
  </div>
);

// In ChatTab component
const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);

// Load suggestions on mount and after each message
useEffect(() => {
  loadSuggestions();
}, [messages]);

const loadSuggestions = async () => {
  try {
    const response = await api.getSuggestions(projectId);
    setSuggestions(response.suggestions);
  } catch (error) {
    console.error('Failed to load suggestions:', error);
  }
};
```

#### User Flow

1. User sees initial suggestions after uploading data
2. Suggestions appear as clickable chips below the chat input
3. Clicking a suggestion populates the input field
4. After each Q&A, suggestions update based on conversation context
5. Categories: Overview → Specific Analysis → Deep Dive → Validation

---

### 1.3 Basic Code Execution with LangChain

#### Backend Changes

**Update: `backend/requirements.txt`**

```txt
langchain==0.1.0
langchain-openai==0.0.2
langchain-experimental==0.0.47
tabulate==0.9.0  # For nice table formatting
```

**New file: `backend/analysis_engine.py`**

```python
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_openai import ChatOpenAI
from langchain.agents.agent_types import AgentType
import pandas as pd
import json
import re

class AnalysisEngine:
    def __init__(self, api_key: str):
        self.llm = ChatOpenAI(
            temperature=0,
            model="gpt-4",
            api_key=api_key
        )

    def execute_analysis(
        self,
        df: pd.DataFrame,
        query: str,
        context: str = None
    ) -> Dict[str, Any]:
        """
        Execute analysis and return structured result
        """
        # Create agent with pandas tools
        agent = create_pandas_dataframe_agent(
            self.llm,
            df,
            verbose=True,
            agent_type=AgentType.OPENAI_FUNCTIONS,
            max_iterations=3,
            early_stopping_method="generate"
        )

        # Build enhanced prompt with context
        enhanced_query = self._build_enhanced_query(query, context)

        try:
            # Execute analysis
            result = agent.run(enhanced_query)

            # Extract code from agent's thoughts
            code = self._extract_code(agent)

            return {
                "success": True,
                "result": result,
                "code": code,
                "type": "analysis"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "type": "error"
            }

    def _extract_code(self, agent) -> str:
        """Extract generated pandas code from agent execution"""
        # Parse agent's intermediate steps for code
        # This is simplified - actual implementation needs to parse agent's thoughts
        return "# Code generation coming soon"
```

**Modify: `backend/main.py`**

```python
# Update chat endpoint
@app.post("/api/projects/{project_id}/chat")
async def chat_with_data(project_id: str, message: ChatMessage):
    # ... existing setup ...

    # Determine if this needs code execution
    needs_execution = any(keyword in message.message.lower()
                          for keyword in ['calculate', 'show me', 'how many',
                                        'average', 'sum', 'count', 'group by'])

    if needs_execution and project["file_id"]:
        from analysis_engine import AnalysisEngine
        engine = AnalysisEngine(OPENAI_API_KEY)

        file_data = STORAGE["files"][project["file_id"]]
        df = file_data["dataframe"]

        # Execute analysis
        analysis_result = engine.execute_analysis(
            df=df,
            query=message.message,
            context=STORAGE["contexts"].get(project_id, "")
        )

        # Store in conversation history
        if project_id not in STORAGE.get("conversations", {}):
            STORAGE.setdefault("conversations", {})[project_id] = []

        STORAGE["conversations"][project_id].append({
            "user": message.message,
            "assistant": analysis_result
        })

        return {
            "response": analysis_result.get("result", "Analysis failed"),
            "code": analysis_result.get("code"),
            "type": "analysis",
            "timestamp": datetime.now().isoformat()
        }

    # ... fallback to regular chat ...
```

#### Frontend Changes

**Modify: `frontend/src/components/ChatTab.tsx`**

```typescript
// Enhanced message type
interface AnalysisMessage extends Message {
  code?: string;
  type?: 'chat' | 'analysis' | 'error';
}

// Code display component
const CodeBlock = ({ code }: { code: string }) => (
  <details style={{ marginTop: '10px' }}>
    <summary
      style={{
        cursor: 'pointer',
        fontSize: '12px',
        color: '#999',
        userSelect: 'none',
      }}
    >
      View generated code
    </summary>
    <pre
      style={{
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#1e1e1e',
        borderRadius: '4px',
        fontSize: '12px',
        overflow: 'auto',
      }}
    >
      <code>{code}</code>
    </pre>
  </details>
);

// In message rendering
{
  message.type === 'analysis' && message.code && (
    <CodeBlock code={message.code} />
  );
}
```

#### User Flow

1. User asks analytical question: "What's the average order value by region?"
2. System detects this needs execution (keywords: "average", "by")
3. LangChain agent generates and executes pandas code
4. Response shows:
   - Natural language answer: "The average order value by region is..."
   - Collapsible code section showing: `df.groupby('region')['order_value'].mean()`
5. User builds trust seeing the actual computation

---

## Phase 2: Multi-File Foundation (Week 3-4)

### 2.1 Multi-File Upload & Management

#### Backend Changes

**Modify: `backend/main.py`**

```python
# Update storage structure
STORAGE = {
    "projects": {},
    "files": {},      # Now stores multiple files per project
    "contexts": {},
    "relationships": {}  # NEW: Store file relationships
}

# Modify project structure
class Project(BaseModel):
    id: str
    name: str
    created_at: str
    context: Optional[str] = None
    files: List[Dict] = []  # Changed from single file_id
    relationships: List[Dict] = []  # NEW

# Update upload endpoint to handle multiple files
@app.post("/api/projects/{project_id}/upload")
async def upload_file(project_id: str, file: UploadFile = File(...)):
    # ... validation ...

    # Store file
    file_id = str(uuid.uuid4())
    STORAGE["files"][file_id] = {
        "project_id": project_id,  # Link to project
        "content": content,
        "dataframe": df,
        "filename": file.filename,
        "profile": profile
    }

    # Add to project's file list
    if "files" not in STORAGE["projects"][project_id]:
        STORAGE["projects"][project_id]["files"] = []

    STORAGE["projects"][project_id]["files"].append({
        "file_id": file_id,
        "filename": file.filename,
        "rows": len(df),
        "columns": list(df.columns)
    })

    # Auto-detect potential relationships with existing files
    relationships = detect_relationships(project_id, file_id)

    return {
        "file_id": file_id,
        "filename": file.filename,
        "profile": profile,
        "potential_relationships": relationships
    }

def detect_relationships(project_id: str, new_file_id: str) -> List[Dict]:
    """Auto-detect potential join keys between files"""
    relationships = []
    new_file = STORAGE["files"][new_file_id]
    new_df = new_file["dataframe"]

    for file_info in STORAGE["projects"][project_id]["files"]:
        if file_info["file_id"] == new_file_id:
            continue

        other_file = STORAGE["files"][file_info["file_id"]]
        other_df = other_file["dataframe"]

        # Find common column names
        common_cols = set(new_df.columns) & set(other_df.columns)

        for col in common_cols:
            # Check if it could be a key (unique or mostly unique)
            if new_df[col].nunique() > len(new_df) * 0.5:
                relationships.append({
                    "source_file": new_file["filename"],
                    "source_column": col,
                    "target_file": other_file["filename"],
                    "target_column": col,
                    "confidence": "high" if col in ['id', 'ID', '_id'] else "medium"
                })

    return relationships
```

#### Frontend Changes

**New Component: `frontend/src/components/MultiFileManager.tsx`**

```typescript
interface FileInfo {
  file_id: string;
  filename: string;
  rows: number;
  columns: string[];
}

const MultiFileManager = ({
  projectId,
  files,
  onFilesChange,
}: {
  projectId: string;
  files: FileInfo[];
  onFilesChange: (files: FileInfo[]) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  return (
    <div style={{ padding: '20px' }}>
      <h3>Data Files ({files.length})</h3>

      {/* File List */}
      <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
        {files.map((file) => (
          <div
            key={file.file_id}
            style={{
              padding: '15px',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 'bold' }}>{file.filename}</div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                {file.rows} rows × {file.columns.length} columns
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => previewFile(file.file_id)}>Preview</button>
              <button onClick={() => removeFile(file.file_id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add File Button */}
      <button
        onClick={() => document.getElementById('file-input')?.click()}
        style={{
          width: '100%',
          padding: '20px',
          border: '2px dashed #666',
          backgroundColor: 'transparent',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        + Add Another File
      </button>

      {/* Relationship Diagram */}
      {files.length > 1 && (
        <RelationshipDiagram files={files} relationships={relationships} />
      )}
    </div>
  );
};
```

#### User Flow

1. User uploads first CSV (e.g., sales.csv)
2. System shows file card with preview option
3. User clicks "Add Another File" and uploads customers.csv
4. System auto-detects "customer_id" exists in both files
5. UI shows both files and potential relationship
6. User can upload up to 5 files total
7. Each file gets profiled independently

---

### 2.2 Relationship Definition

#### Backend Changes

**New endpoint: `backend/main.py`**

```python
class RelationshipDefinition(BaseModel):
    source_file: str
    source_column: str
    target_file: str
    target_column: str
    relationship_type: str  # "one-to-one", "one-to-many", "many-to-many"

@app.post("/api/projects/{project_id}/relationships")
async def define_relationship(
    project_id: str,
    relationship: RelationshipDefinition
):
    """Define how files relate to each other"""

    # Validate files exist
    project = STORAGE["projects"][project_id]
    file_names = [f["filename"] for f in project["files"]]

    if relationship.source_file not in file_names:
        raise HTTPException(status_code=400, detail="Source file not found")
    if relationship.target_file not in file_names:
        raise HTTPException(status_code=400, detail="Target file not found")

    # Validate columns exist and test join
    source_df = get_dataframe_by_filename(project_id, relationship.source_file)
    target_df = get_dataframe_by_filename(project_id, relationship.target_file)

    # Test the join
    test_result = validate_join(
        source_df,
        target_df,
        relationship.source_column,
        relationship.target_column
    )

    # Store relationship
    if "relationships" not in STORAGE["projects"][project_id]:
        STORAGE["projects"][project_id]["relationships"] = []

    STORAGE["projects"][project_id]["relationships"].append({
        **relationship.dict(),
        "validation": test_result
    })

    return {"status": "success", "validation": test_result}

def validate_join(source_df, target_df, source_col, target_col):
    """Test if join would work and return statistics"""
    source_values = set(source_df[source_col].dropna())
    target_values = set(target_df[target_col].dropna())

    return {
        "source_unique": len(source_values),
        "target_unique": len(target_values),
        "matching": len(source_values & target_values),
        "source_unmatched": len(source_values - target_values),
        "target_unmatched": len(target_values - source_values),
        "join_quality": "good" if len(source_values & target_values) > 0 else "no matches"
    }
```

#### Frontend Changes

**New Section in Context Tab**

```typescript
const RelationshipBuilder = ({
  projectId,
  files,
}: {
  projectId: string;
  files: FileInfo[];
}) => {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <div
      style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
      }}
    >
      <h3>File Relationships</h3>

      {/* Natural Language Input */}
      <div style={{ marginBottom: '20px' }}>
        <label>Describe how your files connect (optional):</label>
        <textarea
          placeholder="Example: The customer_id in sales.csv matches the id column in customers.csv. Each sale belongs to one customer."
          style={{ width: '100%', minHeight: '60px' }}
          onChange={(e) => parseNaturalLanguageRelationships(e.target.value)}
        />
      </div>

      {/* Visual Relationship Builder */}
      <button onClick={() => setShowBuilder(!showBuilder)}>
        {showBuilder ? 'Hide' : 'Show'} Visual Builder
      </button>

      {showBuilder && (
        <div style={{ marginTop: '20px' }}>
          <RelationshipBuilderUI
            files={files}
            onAdd={(rel) => {
              api.defineRelationship(projectId, rel);
              setRelationships([...relationships, rel]);
            }}
          />
        </div>
      )}

      {/* Current Relationships */}
      <div style={{ marginTop: '20px' }}>
        <h4>Defined Relationships:</h4>
        {relationships.map((rel, idx) => (
          <div
            key={idx}
            style={{
              padding: '10px',
              backgroundColor: '#2a2a2a',
              borderRadius: '4px',
              marginBottom: '10px',
            }}
          >
            <code>
              {rel.source_file}.{rel.source_column} → {rel.target_file}.
              {rel.target_column}
            </code>
            {rel.validation && (
              <div
                style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}
              >
                {rel.validation.matching} matching values found
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### User Flow

1. After uploading multiple files, user goes to Context tab
2. New "File Relationships" section appears
3. User can either:
   - Type naturally: "customer_id in orders links to id in customers"
   - Use visual builder: dropdown menus for file → column → file → column
4. System validates the relationship immediately
5. Shows match statistics: "450 of 500 order records have matching customers"
6. Relationships are saved and used in chat context

---

### 2.3 Multi-File Chat Context

#### Backend Changes

**Modify: `backend/main.py`**

```python
def build_multi_file_context(project_id: str) -> str:
    """Build comprehensive context for multi-file analysis"""
    project = STORAGE["projects"][project_id]

    context_parts = []

    # Add file summaries
    context_parts.append("Available data files:")
    for file_info in project.get("files", []):
        file_data = STORAGE["files"][file_info["file_id"]]
        df = file_data["dataframe"]

        context_parts.append(f"""
File: {file_info['filename']}
- Rows: {len(df)}
- Columns: {', '.join(df.columns)}
- Column types: {df.dtypes.to_dict()}
""")

    # Add relationships
    if project.get("relationships"):
        context_parts.append("\nFile relationships:")
        for rel in project["relationships"]:
            context_parts.append(
                f"- {rel['source_file']}.{rel['source_column']} "
                f"joins with {rel['target_file']}.{rel['target_column']}"
            )

    # Add business context
    if project_id in STORAGE["contexts"]:
        context_parts.append(f"\nBusiness context:\n{STORAGE['contexts'][project_id]}")

    return "\n".join(context_parts)

# Update chat endpoint
@app.post("/api/projects/{project_id}/chat")
async def chat_with_data(project_id: str, message: ChatMessage):
    # Build multi-file context
    system_context = """You are a data analysis assistant with access to multiple data files.
    You can analyze individual files or combine them using the defined relationships.
    Always specify which file(s) you're analyzing."""

    system_context += "\n\n" + build_multi_file_context(project_id)

    # Determine which files are needed for the query
    files_to_use = determine_relevant_files(project_id, message.message)

    # ... rest of chat logic ...
```

#### User Flow

1. User asks: "What's the average order value by customer segment?"
2. System recognizes this needs both orders.csv and customers.csv
3. AI receives context about both files and their relationship
4. Response specifies: "Analyzing orders.csv joined with customers.csv on customer_id..."
5. Answer includes which files were used

---

### 2.4 Cross-File Analysis Execution

#### Backend Changes

**New file: `backend/multi_file_analyzer.py`**

```python
class MultiFileAnalyzer:
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.project = STORAGE["projects"][project_id]
        self.relationships = self.project.get("relationships", [])

    def prepare_joined_dataframe(self, required_files: List[str]) -> pd.DataFrame:
        """Join multiple dataframes based on defined relationships"""

        if len(required_files) == 1:
            # Single file, no join needed
            return self.get_dataframe(required_files[0])

        # Start with first file
        result_df = self.get_dataframe(required_files[0])
        joined_files = {required_files[0]}

        # Iteratively join other files
        while len(joined_files) < len(required_files):
            for file in required_files:
                if file in joined_files:
                    continue

                # Find relationship
                rel = self.find_relationship(joined_files, file)
                if rel:
                    # Perform join
                    other_df = self.get_dataframe(file)
                    result_df = pd.merge(
                        result_df,
                        other_df,
                        left_on=rel['source_column'],
                        right_on=rel['target_column'],
                        how='left',
                        suffixes=('', f'_{file}')
                    )
                    joined_files.add(file)

        return result_df

    def analyze_with_files(self, query: str, required_files: List[str]):
        """Execute analysis on joined data"""

        # Prepare joined dataframe
        df = self.prepare_joined_dataframe(required_files)

        # Use LangChain agent on joined data
        from analysis_engine import AnalysisEngine
        engine = AnalysisEngine(OPENAI_API_KEY)

        result = engine.execute_analysis(
            df=df,
            query=query,
            context=f"This data is from joining: {', '.join(required_files)}"
        )

        result["files_used"] = required_files
        result["rows_analyzed"] = len(df)

        return result
```

#### Frontend Display

```typescript
// Show which files were used in analysis
const AnalysisResult = ({ result }: { result: any }) => (
  <div>
    {/* Main result */}
    <div>{result.response}</div>

    {/* Metadata */}
    {result.files_used && (
      <div
        style={{
          marginTop: '10px',
          padding: '8px',
          backgroundColor: '#1a1a1a',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#999',
        }}
      >
        <div>📁 Files used: {result.files_used.join(', ')}</div>
        <div>📊 Rows analyzed: {result.rows_analyzed}</div>
      </div>
    )}

    {/* Code if available */}
    {result.code && <CodeBlock code={result.code} />}
  </div>
);
```

#### User Flow

1. User uploads: sales.csv, customers.csv, products.csv
2. Defines relationships between them
3. Asks: "What product category generates most revenue from enterprise customers?"
4. System:
   - Identifies need for all 3 files
   - Joins them based on relationships
   - Executes analysis on joined data
   - Shows: "Analysis performed on 3 files (10,000 rows after joining)"
5. Result includes the answer plus transparency about data used

---

## Phase 3: Core Conversation Intelligence (Week 5-6)

### 3.1 Context Preservation & Memory

#### Backend Implementation

```python
# Add conversation memory storage
class ConversationMemory:
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.history = []
        self.entities = {}  # Track mentioned entities
        self.active_filters = []
        self.working_dataset = None

    def add_exchange(self, user_msg: str, assistant_response: Dict):
        """Store Q&A pair with metadata"""
        exchange = {
            "timestamp": datetime.now().isoformat(),
            "user": user_msg,
            "assistant": assistant_response,
            "entities_mentioned": self.extract_entities(user_msg, assistant_response),
            "filters_applied": self.active_filters.copy()
        }
        self.history.append(exchange)

    def extract_entities(self, user_msg: str, response: Dict):
        """Extract and track specific values mentioned"""
        entities = {}

        # Extract from response (e.g., "top product is Widget A")
        if "Widget A" in str(response):
            entities["top_product"] = "Widget A"

        # Track for future reference
        self.entities.update(entities)
        return entities

    def resolve_reference(self, message: str) -> str:
        """Resolve references like 'it', 'that', 'the first one'"""
        enhanced_message = message

        # Replace pronouns with tracked entities
        if "it" in message.lower() and "top_product" in self.entities:
            enhanced_message = message.replace("it", f"'{self.entities['top_product']}'")

        return enhanced_message

# Modify chat endpoint to use memory
@app.post("/api/projects/{project_id}/chat")
async def chat_with_data(project_id: str, message: ChatMessage):
    # Get or create memory
    if project_id not in STORAGE.get("conversation_memory", {}):
        STORAGE.setdefault("conversation_memory", {})[project_id] = ConversationMemory(project_id)

    memory = STORAGE["conversation_memory"][project_id]

    # Resolve references in the message
    resolved_message = memory.resolve_reference(message.message)

    # Include conversation history in context
    recent_history = memory.get_recent_exchanges(last_n=5)

    # ... perform analysis ...

    # Store the exchange
    memory.add_exchange(message.message, result)
```

#### User Flow

1. User: "What's the best selling product?"
2. AI: "Widget A with 500 units sold"
3. User: "Show me its sales trend" (no mention of Widget A)
4. System resolves "its" → "Widget A's"
5. AI: "Here's the sales trend for Widget A..."

---

### 3.2 Working Dataset State

#### Backend Implementation

```python
class WorkingDatasetManager:
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.base_data = {}  # Original dataframes
        self.working_data = {}  # Filtered versions
        self.active_filters = []

    def apply_filter(self, filter_description: str, filter_code: str):
        """Apply and maintain filter on working dataset"""
        self.active_filters.append({
            "description": filter_description,
            "code": filter_code,
            "timestamp": datetime.now().isoformat()
        })

        # Apply all filters in sequence
        for file_id, df in self.base_data.items():
            filtered_df = df.copy()
            for f in self.active_filters:
                filtered_df = eval(f['code'], {"df": filtered_df})
            self.working_data[file_id] = filtered_df

    def clear_filters(self):
        """Reset to original data"""
        self.active_filters = []
        self.working_data = self.base_data.copy()

    def get_filter_summary(self) -> str:
        """Get human-readable filter description"""
        if not self.active_filters:
            return "No filters applied - analyzing all data"

        return "Active filters:\n" + "\n".join(
            f"- {f['description']}" for f in self.active_filters
        )
```

#### Frontend Display

```typescript
const ActiveFilters = ({
  filters,
  onClear,
}: {
  filters: Filter[];
  onClear: () => void;
}) => (
  <div
    style={{
      padding: '10px',
      backgroundColor: '#2a3f5f',
      borderRadius: '4px',
      marginBottom: '10px',
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <div
          style={{ fontSize: '12px', color: '#4a9eff', marginBottom: '5px' }}
        >
          🔍 Active Filters:
        </div>
        {filters.map((filter, idx) => (
          <div key={idx} style={{ fontSize: '13px', color: '#fff' }}>
            • {filter.description}
          </div>
        ))}
      </div>
      <button
        onClick={onClear}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          backgroundColor: 'transparent',
          border: '1px solid #4a9eff',
          borderRadius: '4px',
          color: '#4a9eff',
          cursor: 'pointer',
        }}
      >
        Clear All
      </button>
    </div>
  </div>
);
```

#### User Flow

1. User: "Focus on Q4 2023 data"
2. System applies filter, shows: "✓ Filter applied: Q4 2023 only"
3. User: "What's the total revenue?"
4. AI: "Total revenue for Q4 2023 is $1.2M"
5. User: "Now just electronics"
6. System stacks filter: "✓ Filters: Q4 2023 + Electronics category"
7. User can see and clear filters at any time

---

### 3.3 Multi-Step Reasoning

#### Backend Implementation

```python
class ReasoningChain:
    def __init__(self, query: str):
        self.query = query
        self.steps = []
        self.results = {}

    def plan_analysis(self, df_schemas: Dict) -> List[Dict]:
        """Break complex query into steps"""

        # Use LLM to decompose the query
        planner_prompt = f"""
        Query: {self.query}
        Available data: {df_schemas}

        Break this down into analytical steps. Return JSON:
        [
            {{"step": 1, "description": "...", "operation": "..."}},
            ...
        ]
        """

        # Get plan from LLM
        plan = self.llm.invoke(planner_prompt)
        return json.loads(plan)

    def execute_step(self, step: Dict, previous_results: Dict):
        """Execute single analysis step"""
        # Build context from previous steps
        context = self.build_step_context(previous_results)

        # Execute with pandas agent
        result = self.analyzer.execute(step['operation'], context)

        return {
            "step_number": step['step'],
            "description": step['description'],
            "result": result,
            "code": result.get('code')
        }
```

#### Frontend Display

```typescript
const ReasoningSteps = ({ steps }: { steps: AnalysisStep[] }) => (
  <div style={{ marginTop: '15px' }}>
    <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
      Analysis Steps:
    </div>
    {steps.map((step) => (
      <div
        key={step.step_number}
        style={{
          marginBottom: '10px',
          paddingLeft: '20px',
          borderLeft: '2px solid #4a9eff',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#4a9eff',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              marginRight: '10px',
            }}
          >
            {step.step_number}
          </div>
          <div style={{ fontSize: '13px' }}>{step.description}</div>
        </div>
        {step.result && (
          <div
            style={{
              marginLeft: '30px',
              fontSize: '12px',
              color: '#888',
              backgroundColor: '#1a1a1a',
              padding: '5px',
              borderRadius: '4px',
            }}
          >
            {step.result}
          </div>
        )}
      </div>
    ))}
  </div>
);
```

#### User Flow

1. User: "Which customer segment has the highest profit margin?"
2. System shows reasoning steps:
   - Step 1: Calculate revenue per segment
   - Step 2: Calculate costs per segment
   - Step 3: Compute profit (revenue - costs)
   - Step 4: Calculate margin (profit/revenue)
   - Step 5: Rank segments by margin
3. Each step shows intermediate results
4. Final answer with full transparency

---

## Testing & Validation Plan

### Phase 1 Testing

- Upload single CSV and verify profiling
- Test query suggestions update after questions
- Verify code execution for basic calculations
- Check error handling for malformed data

### Phase 2 Testing

- Upload multiple related files
- Define relationships and verify validation
- Test cross-file queries
- Verify join operations work correctly

### Phase 3 Testing

- Test conversation memory across 10+ exchanges
- Verify filter stacking and clearing
- Test complex multi-step reasoning
- Validate reference resolution

---

## Success Metrics

### Technical Metrics

- Query response time < 3 seconds for single file
- Query response time < 5 seconds for multi-file joins
- Code execution success rate > 95%
- Relationship validation accuracy > 90%

### User Experience Metrics

- Users can upload and analyze 3+ related files
- 80% of queries answered without clarification
- Conversation context maintained over 20+ exchanges
- Users trust results (can see code/steps)

---

## Risk Mitigation

### Memory Management

- Limit to 5 files per project
- Max 100MB per file
- Clear conversation history after 50 exchanges
- Implement dataframe sampling for large files

### Error Handling

- Graceful fallback when code execution fails
- Clear error messages with suggested fixes
- Validate all joins before execution
- Rollback filters if they produce empty datasets

### Security

- Sanitize all code execution
- Limit pandas operations to safe subset
- No file system access in executed code
- Rate limit analysis requests

This implementation plan provides the concrete technical details and user flows needed to build out each feature while maintaining focus on mastering the core analytical conversation flow.
