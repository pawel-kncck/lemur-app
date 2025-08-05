import pytest
from fastapi.testclient import TestClient

def test_update_context_project_not_found(client):
    """Test updating context for non-existent project."""
    context_data = {"content": "This is some context"}
    response = client.put("/api/projects/non-existent/context", json=context_data)
    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"

def test_update_context_success(client):
    """Test successfully updating project context."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Update context
    context_content = "This is sales data from Q4 2023 with revenue in USD"
    response = client.put(
        f"/api/projects/{project_id}/context",
        json={"content": context_content}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "saved"
    assert data["context"] == context_content

def test_update_context_empty(client):
    """Test updating with empty context."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Update with empty context
    response = client.put(
        f"/api/projects/{project_id}/context",
        json={"content": ""}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "saved"
    assert data["context"] == ""

def test_get_context_project_not_found(client):
    """Test getting context for non-existent project."""
    response = client.get("/api/projects/non-existent/context")
    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"

def test_get_context_no_context(client):
    """Test getting context when none has been set."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Get context (should be empty)
    response = client.get(f"/api/projects/{project_id}/context")
    assert response.status_code == 200
    assert response.json()["context"] == ""

def test_get_context_with_data(client):
    """Test getting context after it has been set."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Set context
    context_content = "Important business context here"
    client.put(
        f"/api/projects/{project_id}/context",
        json={"content": context_content}
    )
    
    # Get context
    response = client.get(f"/api/projects/{project_id}/context")
    assert response.status_code == 200
    assert response.json()["context"] == context_content

def test_context_persistence(client):
    """Test that context persists and is reflected in project data."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Update context
    context_content = "This data contains customer segments"
    client.put(
        f"/api/projects/{project_id}/context",
        json={"content": context_content}
    )
    
    # Verify context is in project data
    project = client.get(f"/api/projects/{project_id}").json()
    assert project["context"] == context_content

def test_context_update_overwrites(client):
    """Test that updating context overwrites previous context."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Set initial context
    client.put(
        f"/api/projects/{project_id}/context",
        json={"content": "Initial context"}
    )
    
    # Update context
    new_context = "Updated context"
    client.put(
        f"/api/projects/{project_id}/context",
        json={"content": new_context}
    )
    
    # Verify context was updated
    response = client.get(f"/api/projects/{project_id}/context")
    assert response.json()["context"] == new_context