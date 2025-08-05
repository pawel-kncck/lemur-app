import pytest
from fastapi.testclient import TestClient
import sys
import os
from unittest.mock import patch, MagicMock
import pandas as pd

# Add the parent directory to the path so we can import main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, STORAGE

@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)

@pytest.fixture(autouse=True)
def reset_storage():
    """Reset the in-memory storage before each test."""
    STORAGE["projects"].clear()
    STORAGE["files"].clear()
    STORAGE["contexts"].clear()
    yield
    # Clean up after test
    STORAGE["projects"].clear()
    STORAGE["files"].clear()
    STORAGE["contexts"].clear()

@pytest.fixture
def sample_project():
    """Create a sample project for testing."""
    return {
        "id": "test-project-123",
        "name": "Test Project",
        "created_at": "2024-01-01T00:00:00",
        "context": None,
        "file_id": None,
        "file_name": None,
        "file_columns": None
    }

@pytest.fixture
def sample_csv_file():
    """Create a sample CSV file for testing."""
    csv_content = b"name,age,city\nJohn,30,New York\nJane,25,Los Angeles\nBob,35,Chicago"
    return {
        "filename": "test.csv",
        "content": csv_content,
        "content_type": "text/csv"
    }

@pytest.fixture
def mock_openai():
    """Mock OpenAI API calls."""
    with patch('main.openai.ChatCompletion.create') as mock:
        mock.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content="This is a mock AI response about your data."
                    )
                )
            ]
        )
        yield mock