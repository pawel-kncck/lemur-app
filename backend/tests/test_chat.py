import pytest
from fastapi.testclient import TestClient

def test_chat_project_not_found(client, mock_openai):
    """Test chatting with non-existent project."""
    chat_data = {"message": "Tell me about my data"}
    response = client.post("/api/projects/non-existent/chat", json=chat_data)
    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"

def test_chat_without_data(client, mock_openai):
    """Test chatting without uploaded data."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Send chat message
    response = client.post(
        f"/api/projects/{project_id}/chat",
        json={"message": "What columns are in my data?"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "timestamp" in data
    # Verify OpenAI was called
    mock_openai.assert_called_once()

def test_chat_with_context_only(client, mock_openai):
    """Test chatting with context but no data."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Add context
    context = "This is sales data from our e-commerce platform"
    client.put(
        f"/api/projects/{project_id}/context",
        json={"content": context}
    )
    
    # Send chat message
    response = client.post(
        f"/api/projects/{project_id}/chat",
        json={"message": "What kind of data is this?"}
    )
    
    assert response.status_code == 200
    # Verify context was included in the system message
    call_args = mock_openai.call_args[1]
    system_message = call_args["messages"][0]["content"]
    assert context in system_message

def test_chat_with_data_and_context(client, sample_csv_file, mock_openai):
    """Test chatting with both data and context."""
    # Create project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Upload file
    files = {"file": (sample_csv_file["filename"], sample_csv_file["content"], sample_csv_file["content_type"])}
    client.post(f"/api/projects/{project_id}/upload", files=files)
    
    # Add context
    context = "This data contains customer information"
    client.put(
        f"/api/projects/{project_id}/context",
        json={"content": context}
    )
    
    # Send chat message
    response = client.post(
        f"/api/projects/{project_id}/chat",
        json={"message": "How many rows are in my data?"}
    )
    
    assert response.status_code == 200
    # Verify both context and data info were included
    call_args = mock_openai.call_args[1]
    system_message = call_args["messages"][0]["content"]
    assert context in system_message
    assert "Rows: 3" in system_message
    assert "name, age, city" in system_message

def test_chat_empty_message(client, mock_openai):
    """Test sending empty chat message."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Send empty message
    response = client.post(
        f"/api/projects/{project_id}/chat",
        json={"message": ""}
    )
    
    # Should still work
    assert response.status_code == 200

def test_chat_openai_error(client, sample_csv_file):
    """Test handling OpenAI API errors."""
    # Create project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Mock OpenAI to raise an error
    with pytest.mock.patch('main.openai.ChatCompletion.create') as mock_openai:
        mock_openai.side_effect = Exception("OpenAI API error")
        
        response = client.post(
            f"/api/projects/{project_id}/chat",
            json={"message": "Test message"}
        )
        
        assert response.status_code == 500
        assert "Error calling AI" in response.json()["detail"]

def test_chat_response_format(client, mock_openai):
    """Test chat response format."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Send chat message
    response = client.post(
        f"/api/projects/{project_id}/chat",
        json={"message": "Test question"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "timestamp" in data
    assert isinstance(data["response"], str)
    assert data["response"] == "This is a mock AI response about your data."
    
    # Verify timestamp format
    from datetime import datetime
    datetime.fromisoformat(data["timestamp"])  # Should not raise