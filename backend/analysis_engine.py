"""
Analysis Engine Module for Lemur
Executes data analysis code using LangChain and returns both results and generated code
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List, Tuple
import logging
import sys
import io
import traceback
import re
from contextlib import redirect_stdout, redirect_stderr
from langchain_openai import ChatOpenAI
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain.agents import AgentType
from langchain.schema import HumanMessage, AIMessage
from langchain_core.callbacks import BaseCallbackHandler

logger = logging.getLogger(__name__)

class CodeCaptureCallback(BaseCallbackHandler):
    """Callback handler to capture executed code from the agent"""
    
    def __init__(self):
        self.executed_code = []
        self.current_code = None
        
    def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs):
        """Capture code when a tool is about to be executed"""
        # Extract Python code from the input
        if "python_repl_ast" in str(serialized):
            self.current_code = input_str
            
    def on_tool_end(self, output: str, **kwargs):
        """Store the code after successful execution"""
        if self.current_code:
            self.executed_code.append(self.current_code)
            self.current_code = None

class AnalysisEngine:
    """Execute data analysis with transparency and code capture"""
    
    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo"):
        """
        Initialize the analysis engine
        
        Args:
            api_key: OpenAI API key
            model: Model to use for analysis
        """
        self.api_key = api_key
        self.model = model
        self.llm = ChatOpenAI(
            api_key=api_key,
            model=model,
            temperature=0,
            max_tokens=1000
        )
        
    def execute_analysis(
        self, 
        df: pd.DataFrame, 
        query: str,
        context: Optional[str] = None,
        max_iterations: int = 5
    ) -> Dict[str, Any]:
        """
        Execute analysis on a DataFrame based on user query
        
        Args:
            df: The DataFrame to analyze
            query: User's analysis query
            context: Optional business context
            max_iterations: Maximum number of agent iterations
            
        Returns:
            Dictionary containing:
                - result: The analysis result
                - code: The executed Python code
                - explanation: Natural language explanation
                - success: Whether execution was successful
                - error: Error message if any
        """
        try:
            # Create callback to capture code
            code_callback = CodeCaptureCallback()
            
            # Create the pandas DataFrame agent
            agent = create_pandas_dataframe_agent(
                self.llm,
                df,
                verbose=True,
                agent_type=AgentType.OPENAI_FUNCTIONS,
                callbacks=[code_callback],
                max_iterations=max_iterations,
                handle_parsing_errors=True,
                allow_dangerous_code=True  # Required for code execution
            )
            
            # Prepare the full query with context
            full_query = query
            if context:
                full_query = f"Context: {context}\n\nQuery: {query}"
            
            # Add instruction to show the code
            full_query += "\n\nPlease show the Python code you use for this analysis."
            
            # Execute the analysis
            result = agent.run(full_query)
            
            # Extract code from the verbose output or callback
            executed_code = self._extract_code(code_callback.executed_code, result)
            
            return {
                "success": True,
                "result": result,
                "code": executed_code,
                "explanation": self._generate_explanation(query, result, executed_code),
                "error": None
            }
            
        except Exception as e:
            logger.error(f"Analysis execution failed: {str(e)}")
            logger.exception("Full error details:")
            
            # Try to provide a helpful fallback analysis
            fallback_result = self._fallback_analysis(df, query)
            
            return {
                "success": False,
                "result": fallback_result.get("result", "Analysis failed"),
                "code": fallback_result.get("code", "# Error occurred during analysis"),
                "explanation": fallback_result.get("explanation", str(e)),
                "error": str(e)
            }
    
    def _extract_code(self, callback_code: List[str], result: str) -> str:
        """
        Extract executed Python code from various sources
        
        Args:
            callback_code: Code captured by callback
            result: The agent's result string
            
        Returns:
            Formatted Python code string
        """
        # First try to use callback-captured code
        if callback_code:
            return "\n\n".join(callback_code)
        
        # Try to extract code blocks from the result
        code_blocks = re.findall(r'```python\n(.*?)\n```', result, re.DOTALL)
        if code_blocks:
            return "\n\n".join(code_blocks)
        
        # Try to extract code-like lines
        lines = result.split('\n')
        code_lines = []
        for line in lines:
            # Look for lines that look like Python code
            if any([
                line.strip().startswith(('df.', 'pd.', 'np.', 'import ', 'from ', 'print(')),
                '=' in line and not line.strip().startswith('#'),
                line.strip().startswith(('for ', 'if ', 'while ', 'def ', 'class '))
            ]):
                code_lines.append(line)
        
        if code_lines:
            return "\n".join(code_lines)
        
        # Default message if no code found
        return "# Code execution details not available"
    
    def _generate_explanation(self, query: str, result: str, code: str) -> str:
        """
        Generate a natural language explanation of the analysis
        
        Args:
            query: Original query
            result: Analysis result
            code: Executed code
            
        Returns:
            Natural language explanation
        """
        # Simple explanation based on the query and result
        explanation_parts = []
        
        # Detect the type of analysis
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['average', 'mean', 'avg']):
            explanation_parts.append("Calculated the average values")
        elif any(word in query_lower for word in ['sum', 'total']):
            explanation_parts.append("Calculated the sum/total")
        elif any(word in query_lower for word in ['count', 'how many']):
            explanation_parts.append("Counted the occurrences")
        elif any(word in query_lower for word in ['group', 'by']):
            explanation_parts.append("Grouped the data for analysis")
        elif any(word in query_lower for word in ['correlation', 'correlate']):
            explanation_parts.append("Analyzed correlations in the data")
        elif any(word in query_lower for word in ['trend', 'pattern']):
            explanation_parts.append("Identified trends and patterns")
        else:
            explanation_parts.append("Performed the requested analysis")
        
        # Add note about the code
        if code and code != "# Code execution details not available":
            explanation_parts.append("using pandas operations")
        
        return ". ".join(explanation_parts) + "."
    
    def _fallback_analysis(self, df: pd.DataFrame, query: str) -> Dict[str, Any]:
        """
        Provide a basic fallback analysis when the agent fails
        
        Args:
            df: The DataFrame
            query: User query
            
        Returns:
            Basic analysis result
        """
        query_lower = query.lower()
        
        try:
            # Try to provide basic statistics
            if 'summary' in query_lower or 'describe' in query_lower:
                result = df.describe().to_string()
                code = "df.describe()"
                explanation = "Generated basic statistical summary"
                
            elif 'count' in query_lower:
                result = f"Total rows: {len(df)}"
                code = "len(df)"
                explanation = "Counted the total number of rows"
                
            elif 'columns' in query_lower:
                result = f"Columns: {', '.join(df.columns.tolist())}"
                code = "df.columns.tolist()"
                explanation = "Listed all column names"
                
            elif 'head' in query_lower or 'first' in query_lower:
                result = df.head().to_string()
                code = "df.head()"
                explanation = "Showed the first 5 rows"
                
            elif 'tail' in query_lower or 'last' in query_lower:
                result = df.tail().to_string()
                code = "df.tail()"
                explanation = "Showed the last 5 rows"
                
            else:
                # Generic info
                result = f"DataFrame with {len(df)} rows and {len(df.columns)} columns"
                code = "df.shape"
                explanation = "Provided basic DataFrame information"
                
            return {
                "result": result,
                "code": code,
                "explanation": explanation
            }
            
        except Exception as e:
            return {
                "result": "Unable to perform analysis",
                "code": "# Analysis failed",
                "explanation": f"Error: {str(e)}"
            }
    
    @staticmethod
    def is_analytical_query(query: str) -> bool:
        """
        Determine if a query requires data analysis/code execution
        
        Args:
            query: User query
            
        Returns:
            True if the query requires analysis
        """
        query_lower = query.lower()
        
        # Keywords that indicate analytical queries
        analytical_keywords = [
            'calculate', 'compute', 'sum', 'average', 'mean', 'median', 'mode',
            'count', 'total', 'how many', 'how much', 'group by', 'aggregate',
            'correlation', 'regression', 'trend', 'pattern', 'distribution',
            'variance', 'std', 'standard deviation', 'percentile', 'quartile',
            'max', 'min', 'maximum', 'minimum', 'range', 'top', 'bottom',
            'filter', 'where', 'sort', 'order by', 'rank', 'compare',
            'plot', 'graph', 'chart', 'visualize', 'show me the data',
            'analyze', 'analysis', 'statistics', 'stats', 'metrics'
        ]
        
        # Check for analytical keywords
        for keyword in analytical_keywords:
            if keyword in query_lower:
                return True
        
        # Check for DataFrame operation patterns
        df_patterns = [
            r'df\.',  # Direct DataFrame operations
            r'\.groupby',  # Group by operations
            r'\.agg',  # Aggregation
            r'\.merge',  # Merge operations
            r'\.pivot',  # Pivot operations
        ]
        
        for pattern in df_patterns:
            if re.search(pattern, query_lower):
                return True
        
        return False
    
    @staticmethod
    def format_code_for_display(code: str) -> str:
        """
        Format code for display in the UI
        
        Args:
            code: Raw Python code
            
        Returns:
            Formatted code string
        """
        if not code or code == "# Code execution details not available":
            return ""
        
        # Clean up the code
        lines = code.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Remove excessive whitespace
            line = line.rstrip()
            
            # Skip empty lines at the beginning/end
            if line or cleaned_lines:
                cleaned_lines.append(line)
        
        # Remove trailing empty lines
        while cleaned_lines and not cleaned_lines[-1]:
            cleaned_lines.pop()
        
        return '\n'.join(cleaned_lines)