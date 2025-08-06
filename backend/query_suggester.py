"""
Query Suggester Module for Lemur
Generates contextual query suggestions based on data profile and conversation history
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class QuerySuggester:
    """Generate intelligent query suggestions based on data and context"""
    
    @staticmethod
    def generate_suggestions(
        df: pd.DataFrame,
        profile: Dict[str, Any],
        context: Optional[str] = None,
        chat_history: Optional[List[Dict]] = None,
        max_suggestions: int = 7
    ) -> List[str]:
        """
        Generate contextual query suggestions
        
        Args:
            df: The DataFrame to analyze
            profile: Data profile from DataProfiler
            context: Business context provided by user
            chat_history: Previous chat messages
            max_suggestions: Maximum number of suggestions to return
            
        Returns:
            List of suggested queries
        """
        suggestions = []
        
        # Category 1: Overview queries (for initial exploration)
        if not chat_history or len(chat_history) < 2:
            suggestions.extend(QuerySuggester._generate_overview_queries(df, profile))
        
        # Category 2: Data quality queries
        if profile and "data_quality" in profile:
            suggestions.extend(QuerySuggester._generate_quality_queries(profile))
        
        # Category 3: Ranking and top/bottom queries
        suggestions.extend(QuerySuggester._generate_ranking_queries(df, profile))
        
        # Category 4: Trend and pattern queries
        suggestions.extend(QuerySuggester._generate_trend_queries(df, profile))
        
        # Category 5: Context-specific queries
        if context:
            suggestions.extend(QuerySuggester._generate_context_queries(df, context))
        
        # Category 6: Follow-up queries based on chat history
        if chat_history and len(chat_history) > 0:
            suggestions.extend(QuerySuggester._generate_followup_queries(df, chat_history))
        
        # Remove duplicates and limit to max_suggestions
        seen = set()
        unique_suggestions = []
        for s in suggestions:
            if s not in seen:
                seen.add(s)
                unique_suggestions.append(s)
        
        return unique_suggestions[:max_suggestions]
    
    @staticmethod
    def _generate_overview_queries(df: pd.DataFrame, profile: Dict) -> List[str]:
        """Generate basic overview queries"""
        queries = []
        
        # Basic summary
        queries.append("What is the overall summary of this data?")
        
        # Row count and shape
        queries.append(f"Show me the distribution of data across {len(df.columns)} columns")
        
        # If there are numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        if numeric_cols:
            if len(numeric_cols) == 1:
                queries.append(f"What are the statistics for {numeric_cols[0]}?")
            else:
                queries.append(f"Compare the ranges of {numeric_cols[0]} and {numeric_cols[1] if len(numeric_cols) > 1 else 'other numeric columns'}")
        
        # If there are categorical columns
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        if categorical_cols:
            col = categorical_cols[0]
            queries.append(f"What are the unique values in {col}?")
        
        return queries
    
    @staticmethod
    def _generate_quality_queries(profile: Dict) -> List[str]:
        """Generate data quality related queries"""
        queries = []
        quality = profile.get("data_quality", {})
        
        # Missing values
        if quality.get("missing_values"):
            missing_cols = [col for col, pct in quality["missing_values"].items() if pct > 0]
            if missing_cols:
                queries.append(f"Why do columns {', '.join(missing_cols[:2])} have missing values?")
        
        # Data issues
        if quality.get("issues"):
            queries.append("What data quality issues should I be aware of?")
        
        # Outliers
        stats = profile.get("basic_stats", {})
        for col, col_stats in stats.items():
            if col_stats.get("outliers", 0) > 0:
                queries.append(f"Show me the outliers in {col}")
                break
        
        return queries
    
    @staticmethod
    def _generate_ranking_queries(df: pd.DataFrame, profile: Dict) -> List[str]:
        """Generate ranking and comparison queries"""
        queries = []
        
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        # Top/bottom queries for numeric columns
        if numeric_cols:
            col = numeric_cols[0]
            queries.append(f"What are the top 10 highest values for {col}?")
            
            if len(numeric_cols) > 1:
                queries.append(f"Which records have both high {numeric_cols[0]} and {numeric_cols[1]}?")
        
        # Group by queries
        if categorical_cols and numeric_cols:
            cat_col = categorical_cols[0]
            num_col = numeric_cols[0]
            queries.append(f"What is the average {num_col} by {cat_col}?")
            queries.append(f"Which {cat_col} has the highest total {num_col}?")
        
        return queries
    
    @staticmethod
    def _generate_trend_queries(df: pd.DataFrame, profile: Dict) -> List[str]:
        """Generate trend and pattern analysis queries"""
        queries = []
        
        # Date-based trends
        relationships = profile.get("potential_relationships", {})
        date_cols = relationships.get("potential_dates", [])
        
        if date_cols:
            date_col = date_cols[0]
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            
            if numeric_cols:
                queries.append(f"Show me the trend of {numeric_cols[0]} over {date_col}")
                queries.append(f"What patterns exist in the data by {date_col}?")
        
        # Correlation queries
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        if len(numeric_cols) >= 2:
            queries.append(f"Is there a correlation between {numeric_cols[0]} and {numeric_cols[1]}?")
        
        return queries
    
    @staticmethod
    def _generate_context_queries(df: pd.DataFrame, context: str) -> List[str]:
        """Generate queries based on business context"""
        queries = []
        
        # Extract potential keywords from context
        context_lower = context.lower()
        
        # Common business terms
        if "revenue" in context_lower or "sales" in context_lower:
            queries.append("What drives the highest revenue/sales?")
            queries.append("Show me revenue trends and patterns")
        
        if "customer" in context_lower:
            queries.append("What are the customer segments in this data?")
            queries.append("Which customers contribute most to the business?")
        
        if "product" in context_lower:
            queries.append("Which products perform best?")
            queries.append("What product patterns should I know about?")
        
        if "performance" in context_lower:
            queries.append("What are the key performance indicators?")
            queries.append("Where are the performance bottlenecks?")
        
        return queries
    
    @staticmethod
    def _generate_followup_queries(df: pd.DataFrame, chat_history: List[Dict]) -> List[str]:
        """Generate follow-up queries based on conversation history"""
        queries = []
        
        if not chat_history:
            return queries
        
        # Get the last user message
        last_message = ""
        for msg in reversed(chat_history):
            if msg.get("role") == "user":
                last_message = msg.get("content", "").lower()
                break
        
        # Generate follow-ups based on common patterns
        if "outlier" in last_message:
            queries.append("What might be causing these outliers?")
            queries.append("Should I exclude these outliers from analysis?")
        
        if "average" in last_message or "mean" in last_message:
            queries.append("How does this compare to the median?")
            queries.append("What about the standard deviation?")
        
        if "top" in last_message or "highest" in last_message:
            queries.append("What about the bottom/lowest values?")
            queries.append("How do these compare to the average?")
        
        if "trend" in last_message:
            queries.append("Is this trend statistically significant?")
            queries.append("What factors might influence this trend?")
        
        if "correlation" in last_message:
            queries.append("Could this be causation or just correlation?")
            queries.append("What other factors should I consider?")
        
        return queries
    
    @staticmethod
    def update_suggestions_after_chat(
        current_suggestions: List[str],
        user_message: str,
        ai_response: str
    ) -> List[str]:
        """
        Update suggestions after a Q&A exchange
        
        Args:
            current_suggestions: Current list of suggestions
            user_message: The user's last message
            ai_response: The AI's response
            
        Returns:
            Updated list of suggestions
        """
        # Remove the suggestion that was just asked (or similar)
        user_msg_lower = user_message.lower()
        filtered_suggestions = [
            s for s in current_suggestions 
            if not QuerySuggester._is_similar_query(s.lower(), user_msg_lower)
        ]
        
        # Add new contextual follow-ups based on the response
        new_suggestions = []
        
        # Analyze AI response for potential follow-ups
        response_lower = ai_response.lower()
        
        if "missing" in response_lower or "null" in response_lower:
            new_suggestions.append("How should I handle these missing values?")
        
        if "outlier" in response_lower:
            new_suggestions.append("Should I investigate these outliers further?")
        
        if "correlation" in response_lower or "relationship" in response_lower:
            new_suggestions.append("Can you visualize this relationship?")
        
        if "increase" in response_lower or "decrease" in response_lower:
            new_suggestions.append("What might be causing this change?")
        
        # Combine filtered existing and new suggestions
        return filtered_suggestions + new_suggestions
    
    @staticmethod
    def _is_similar_query(query1: str, query2: str) -> bool:
        """Check if two queries are similar"""
        # Simple similarity check - can be made more sophisticated
        common_words = set(query1.split()) & set(query2.split())
        
        # If more than 50% of words are common, consider similar
        min_len = min(len(query1.split()), len(query2.split()))
        if min_len > 0 and len(common_words) / min_len > 0.5:
            return True
        
        return False