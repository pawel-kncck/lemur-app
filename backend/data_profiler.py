"""
Data Profiler for Lemur
Generates comprehensive data profiles for uploaded CSV files
"""

from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime
import re
import json


def convert_numpy_types(obj):
    """Convert numpy types to Python native types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj


class DataProfiler:
    """Generates comprehensive data profiles for uploaded files"""
    
    @staticmethod
    def profile_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate a comprehensive profile of a pandas DataFrame
        
        Args:
            df: The DataFrame to profile
            
        Returns:
            Dictionary containing complete profile information
        """
        profile = {
            "basic_info": DataProfiler._get_basic_info(df),
            "columns": DataProfiler._profile_columns(df),
            "data_quality": DataProfiler._assess_data_quality(df),
            "potential_relationships": DataProfiler._detect_relationships(df),
            "suggested_analyses": DataProfiler._suggest_analyses(df)
        }
        
        # Convert all numpy types to Python native types
        return convert_numpy_types(profile)
    
    @staticmethod
    def _get_basic_info(df: pd.DataFrame) -> Dict[str, Any]:
        """Get basic information about the DataFrame"""
        memory_usage = df.memory_usage(deep=True).sum() / 1024 / 1024  # Convert to MB
        
        return {
            "rows": len(df),
            "columns": len(df.columns),
            "memory_usage_mb": round(memory_usage, 2),
            "duplicates": df.duplicated().sum(),
            "duplicate_percentage": round(df.duplicated().sum() / len(df) * 100, 2) if len(df) > 0 else 0,
            "complete_rows": len(df.dropna()),
            "complete_rows_percentage": round(len(df.dropna()) / len(df) * 100, 2) if len(df) > 0 else 0
        }
    
    @staticmethod
    def _profile_columns(df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        """Profile each column in the DataFrame"""
        columns_profile = {}
        
        for col in df.columns:
            col_data = df[col]
            profile = {
                "dtype": str(col_data.dtype),
                "null_count": col_data.isnull().sum(),
                "null_percentage": round(col_data.isnull().sum() / len(df) * 100, 2) if len(df) > 0 else 0,
                "unique_values": col_data.nunique(),
                "unique_percentage": round(col_data.nunique() / len(df) * 100, 2) if len(df) > 0 else 0,
            }
            
            # Infer column type
            inferred_type = DataProfiler._infer_column_type(col_data)
            profile["inferred_type"] = inferred_type
            
            # Add type-specific information
            if inferred_type == "numeric":
                profile.update(DataProfiler._profile_numeric_column(col_data))
            elif inferred_type == "categorical":
                profile.update(DataProfiler._profile_categorical_column(col_data))
            elif inferred_type == "datetime":
                profile.update(DataProfiler._profile_datetime_column(col_data))
            elif inferred_type == "text":
                profile.update(DataProfiler._profile_text_column(col_data))
            elif inferred_type == "boolean":
                profile.update(DataProfiler._profile_boolean_column(col_data))
            elif inferred_type == "identifier":
                profile.update(DataProfiler._profile_identifier_column(col_data))
            
            columns_profile[col] = profile
            
        return columns_profile
    
    @staticmethod
    def _infer_column_type(series: pd.Series) -> str:
        """Infer the semantic type of a column"""
        # Remove null values for analysis
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return "empty"
        
        # Check if it's already a datetime
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"
        
        # Check if boolean
        if series.dtype == bool or (series.nunique() == 2 and set(non_null.unique()).issubset({0, 1, "0", "1", True, False, "true", "false", "True", "False"})):
            return "boolean"
        
        # Check if numeric
        if pd.api.types.is_numeric_dtype(series):
            # Check if it might be an ID (high cardinality, sequential)
            if series.nunique() / len(non_null) > 0.95:
                return "identifier"
            return "numeric"
        
        # For string columns
        if pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
            # Try to parse as datetime
            try:
                pd.to_datetime(non_null.head(100), errors='coerce')
                # Check if most values parsed successfully
                parsed = pd.to_datetime(non_null.head(100), errors='coerce')
                if parsed.notna().sum() > len(parsed) * 0.5:
                    return "datetime"
            except:
                pass
            
            # Check if it's an identifier (high cardinality)
            unique_ratio = series.nunique() / len(non_null)
            if unique_ratio > 0.95:
                return "identifier"
            
            # Check if categorical (low cardinality)
            if unique_ratio < 0.05 or series.nunique() < 20:
                return "categorical"
            
            # Check average length for text vs categorical
            avg_length = non_null.astype(str).str.len().mean()
            if avg_length > 50:
                return "text"
            
            return "categorical"
        
        return "unknown"
    
    @staticmethod
    def _profile_numeric_column(series: pd.Series) -> Dict[str, Any]:
        """Profile a numeric column"""
        non_null = series.dropna()
        
        stats = {
            "stats": {
                "mean": round(float(non_null.mean()), 4) if len(non_null) > 0 else None,
                "median": round(float(non_null.median()), 4) if len(non_null) > 0 else None,
                "std": round(float(non_null.std()), 4) if len(non_null) > 0 else None,
                "min": round(float(non_null.min()), 4) if len(non_null) > 0 else None,
                "max": round(float(non_null.max()), 4) if len(non_null) > 0 else None,
                "q25": round(float(non_null.quantile(0.25)), 4) if len(non_null) > 0 else None,
                "q75": round(float(non_null.quantile(0.75)), 4) if len(non_null) > 0 else None,
            },
            "distribution": {
                "skewness": round(float(non_null.skew()), 4) if len(non_null) > 2 else None,
                "kurtosis": round(float(non_null.kurtosis()), 4) if len(non_null) > 3 else None,
                "zeros": int((non_null == 0).sum()),
                "negatives": int((non_null < 0).sum()),
                "positives": int((non_null > 0).sum())
            }
        }
        
        # Check for outliers using IQR method
        if len(non_null) > 4:
            q1 = non_null.quantile(0.25)
            q3 = non_null.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers = non_null[(non_null < lower_bound) | (non_null > upper_bound)]
            stats["outliers"] = {
                "count": len(outliers),
                "percentage": round(len(outliers) / len(non_null) * 100, 2)
            }
        
        return stats
    
    @staticmethod
    def _profile_categorical_column(series: pd.Series) -> Dict[str, Any]:
        """Profile a categorical column"""
        value_counts = series.value_counts()
        
        profile = {
            "top_values": {}
        }
        
        # Get top 10 most frequent values
        for value, count in value_counts.head(10).items():
            profile["top_values"][str(value)] = {
                "count": int(count),
                "percentage": round(count / len(series) * 100, 2)
            }
        
        # Add cardinality information
        profile["cardinality"] = {
            "unique": int(series.nunique()),
            "unique_percentage": round(series.nunique() / len(series) * 100, 2) if len(series) > 0 else 0
        }
        
        return profile
    
    @staticmethod
    def _profile_datetime_column(series: pd.Series) -> Dict[str, Any]:
        """Profile a datetime column"""
        # Try to convert to datetime if not already
        try:
            if not pd.api.types.is_datetime64_any_dtype(series):
                datetime_series = pd.to_datetime(series, errors='coerce')
            else:
                datetime_series = series
            
            non_null = datetime_series.dropna()
            
            if len(non_null) > 0:
                return {
                    "date_range": {
                        "min": str(non_null.min()),
                        "max": str(non_null.max()),
                        "days": int((non_null.max() - non_null.min()).days) if len(non_null) > 1 else 0
                    },
                    "patterns": {
                        "has_time": any(non_null.dt.time != pd.Timestamp('00:00:00').time()),
                        "unique_dates": int(non_null.dt.date.nunique()),
                        "frequency": DataProfiler._detect_date_frequency(non_null)
                    }
                }
        except:
            pass
        
        return {"error": "Could not parse as datetime"}
    
    @staticmethod
    def _detect_date_frequency(dates: pd.Series) -> Optional[str]:
        """Detect the frequency of datetime data"""
        if len(dates) < 2:
            return None
        
        sorted_dates = dates.sort_values()
        diffs = sorted_dates.diff().dropna()
        
        if len(diffs) == 0:
            return None
        
        # Get the mode of differences
        mode_diff = diffs.mode()
        if len(mode_diff) == 0:
            return "irregular"
        
        mode_diff = mode_diff.iloc[0]
        
        # Classify the frequency
        if pd.Timedelta(days=0.9) <= mode_diff <= pd.Timedelta(days=1.1):
            return "daily"
        elif pd.Timedelta(days=6.5) <= mode_diff <= pd.Timedelta(days=7.5):
            return "weekly"
        elif pd.Timedelta(days=28) <= mode_diff <= pd.Timedelta(days=31):
            return "monthly"
        elif pd.Timedelta(days=365) <= mode_diff <= pd.Timedelta(days=366):
            return "yearly"
        else:
            return "irregular"
    
    @staticmethod
    def _profile_text_column(series: pd.Series) -> Dict[str, Any]:
        """Profile a text column"""
        non_null = series.dropna().astype(str)
        
        if len(non_null) == 0:
            return {}
        
        return {
            "text_stats": {
                "avg_length": round(non_null.str.len().mean(), 2),
                "min_length": int(non_null.str.len().min()),
                "max_length": int(non_null.str.len().max()),
                "avg_words": round(non_null.str.split().str.len().mean(), 2),
                "has_urls": bool(non_null.str.contains(r'https?://\S+', regex=True).any()),
                "has_emails": bool(non_null.str.contains(r'\S+@\S+', regex=True).any())
            }
        }
    
    @staticmethod
    def _profile_boolean_column(series: pd.Series) -> Dict[str, Any]:
        """Profile a boolean column"""
        # Convert to boolean if needed
        bool_map = {
            "true": True, "True": True, "TRUE": True, "1": True, 1: True,
            "false": False, "False": False, "FALSE": False, "0": False, 0: False
        }
        
        if series.dtype != bool:
            series = series.map(lambda x: bool_map.get(x, x))
        
        value_counts = series.value_counts()
        
        return {
            "boolean_distribution": {
                "true": int(value_counts.get(True, 0)),
                "false": int(value_counts.get(False, 0)),
                "true_percentage": round(value_counts.get(True, 0) / len(series) * 100, 2) if len(series) > 0 else 0
            }
        }
    
    @staticmethod
    def _profile_identifier_column(series: pd.Series) -> Dict[str, Any]:
        """Profile an identifier column"""
        return {
            "identifier_info": {
                "is_unique": series.nunique() == len(series),
                "has_pattern": DataProfiler._detect_id_pattern(series),
                "sample_values": list(series.dropna().head(5).astype(str))
            }
        }
    
    @staticmethod
    def _detect_id_pattern(series: pd.Series) -> bool:
        """Detect if identifier follows a pattern"""
        sample = series.dropna().head(100).astype(str)
        
        # Check for common patterns
        patterns = [
            r'^\d+$',  # Numeric only
            r'^[A-Z]{2,3}-\d+$',  # PREFIX-123
            r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',  # UUID
        ]
        
        for pattern in patterns:
            if all(re.match(pattern, str(val)) for val in sample):
                return True
        
        return False
    
    @staticmethod
    def _assess_data_quality(df: pd.DataFrame) -> Dict[str, Any]:
        """Assess overall data quality"""
        quality = {
            "issues": [],
            "warnings": [],
            "score": 100  # Start with perfect score
        }
        
        # Check for duplicate rows
        duplicate_pct = df.duplicated().sum() / len(df) * 100 if len(df) > 0 else 0
        if duplicate_pct > 10:
            quality["issues"].append(f"High duplicate rate: {duplicate_pct:.1f}% rows are duplicates")
            quality["score"] -= 20
        elif duplicate_pct > 5:
            quality["warnings"].append(f"Moderate duplicate rate: {duplicate_pct:.1f}% rows are duplicates")
            quality["score"] -= 10
        
        # Check for columns with high null rates
        for col in df.columns:
            null_pct = df[col].isnull().sum() / len(df) * 100 if len(df) > 0 else 0
            if null_pct > 50:
                quality["issues"].append(f"Column '{col}' has {null_pct:.1f}% missing values")
                quality["score"] -= 15
            elif null_pct > 20:
                quality["warnings"].append(f"Column '{col}' has {null_pct:.1f}% missing values")
                quality["score"] -= 5
        
        # Check for single-value columns
        for col in df.columns:
            if df[col].nunique() == 1:
                quality["warnings"].append(f"Column '{col}' has only one unique value")
                quality["score"] -= 5
        
        # Ensure score doesn't go below 0
        quality["score"] = max(0, quality["score"])
        
        # Add overall assessment
        if quality["score"] >= 80:
            quality["assessment"] = "Good"
        elif quality["score"] >= 60:
            quality["assessment"] = "Fair"
        else:
            quality["assessment"] = "Needs Attention"
        
        return quality
    
    @staticmethod
    def _detect_relationships(df: pd.DataFrame) -> Dict[str, List[str]]:
        """Detect potential relationships and patterns in the data"""
        relationships = {
            "potential_ids": [],
            "potential_foreign_keys": [],
            "potential_dates": [],
            "potential_categories": [],
            "highly_correlated": [],
            "potential_targets": []
        }
        
        for col in df.columns:
            col_data = df[col]
            inferred_type = DataProfiler._infer_column_type(col_data)
            
            # Detect potential ID columns
            if inferred_type == "identifier" or (
                col.lower().endswith('_id') or 
                col.lower().endswith('id') or 
                col.lower() in ['id', 'key', 'code', 'identifier']
            ):
                relationships["potential_ids"].append(col)
            
            # Detect potential foreign keys
            if (col.lower().endswith('_id') and not col.lower() == 'id') or col.lower() in ['customer_id', 'product_id', 'user_id', 'order_id']:
                relationships["potential_foreign_keys"].append(col)
            
            # Detect date columns
            if inferred_type == "datetime" or any(date_word in col.lower() for date_word in ['date', 'time', 'created', 'updated', 'modified']):
                relationships["potential_dates"].append(col)
            
            # Detect categorical columns
            if inferred_type == "categorical":
                relationships["potential_categories"].append(col)
            
            # Detect potential target variables (for ML)
            if col.lower() in ['target', 'label', 'class', 'category', 'result', 'outcome'] or (
                inferred_type == "boolean" or (inferred_type == "categorical" and col_data.nunique() <= 5)
            ):
                relationships["potential_targets"].append(col)
        
        # Detect highly correlated numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 1:
            corr_matrix = df[numeric_cols].corr()
            for i in range(len(numeric_cols)):
                for j in range(i + 1, len(numeric_cols)):
                    if abs(corr_matrix.iloc[i, j]) > 0.8:
                        relationships["highly_correlated"].append({
                            "col1": numeric_cols[i],
                            "col2": numeric_cols[j],
                            "correlation": round(corr_matrix.iloc[i, j], 3)
                        })
        
        return relationships
    
    @staticmethod
    def _suggest_analyses(df: pd.DataFrame) -> List[str]:
        """Suggest relevant analyses based on the data profile"""
        suggestions = []
        
        # Get column types
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = []
        date_cols = []
        
        for col in df.columns:
            inferred_type = DataProfiler._infer_column_type(df[col])
            if inferred_type == "categorical":
                categorical_cols.append(col)
            elif inferred_type == "datetime":
                date_cols.append(col)
        
        # Basic suggestions
        if len(df) > 0:
            suggestions.append("What is the overall summary of this data?")
        
        # Numeric column suggestions
        if numeric_cols:
            suggestions.append(f"What are the key statistics for {numeric_cols[0]}?")
            if len(numeric_cols) > 1:
                suggestions.append(f"How does {numeric_cols[0]} relate to {numeric_cols[1]}?")
                suggestions.append("Which numeric columns are most correlated?")
        
        # Categorical column suggestions
        if categorical_cols:
            suggestions.append(f"What is the distribution of {categorical_cols[0]}?")
            if numeric_cols and categorical_cols:
                suggestions.append(f"How does {numeric_cols[0]} vary by {categorical_cols[0]}?")
        
        # Time series suggestions
        if date_cols:
            suggestions.append(f"What are the trends over time?")
            if numeric_cols:
                suggestions.append(f"How has {numeric_cols[0]} changed over time?")
        
        # Ranking suggestions
        if numeric_cols and len(df) > 10:
            suggestions.append(f"What are the top 10 records by {numeric_cols[0]}?")
        
        # Missing data suggestions
        null_cols = [col for col in df.columns if df[col].isnull().sum() > 0]
        if null_cols:
            suggestions.append(f"How should we handle missing values in {null_cols[0]}?")
        
        return suggestions[:7]  # Return up to 7 suggestions