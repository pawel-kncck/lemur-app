import pytest
from fastapi.testclient import TestClient

def test_health_check(client):
    """Test the health check endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "Lemur API is running"}

def test_create_project(client):
    """Test creating a new project."""
    project_data = {"name": "My Test Project"}
    response = client.post("/api/projects", json=project_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "My Test Project"
    assert "id" in data
    assert "created_at" in data
    assert data["context"] is None
    assert data["file_id"] is None

def test_create_project_empty_name(client):
    """Test creating a project with empty name."""
    project_data = {"name": ""}
    response = client.post("/api/projects", json=project_data)
    # Should still work but with empty name
    assert response.status_code == 200

def test_list_projects_empty(client):
    """Test listing projects when none exist."""
    response = client.get("/api/projects")
    assert response.status_code == 200
    assert response.json() == []

def test_list_projects_with_data(client):
    """Test listing projects with multiple projects."""
    # Create multiple projects
    for i in range(3):
        response = client.post("/api/projects", json={"name": f"Project {i+1}"})
        assert response.status_code == 200
    
    # List projects
    response = client.get("/api/projects")
    assert response.status_code == 200
    projects = response.json()
    assert len(projects) == 3
    assert all("id" in p for p in projects)
    assert all("name" in p for p in projects)

def test_get_project_success(client):
    """Test getting a specific project."""
    # Create a project
    create_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = create_response.json()["id"]
    
    # Get the project
    response = client.get(f"/api/projects/{project_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == project_id
    assert data["name"] == "Test Project"

def test_get_project_not_found(client):
    """Test getting a non-existent project."""
    response = client.get("/api/projects/non-existent-id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"

def test_project_persistence_in_memory(client):
    """Test that projects persist in memory during the session."""
    # Create a project
    create_response = client.post("/api/projects", json={"name": "Persistent Project"})
    project_id = create_response.json()["id"]
    
    # Verify it appears in list
    list_response = client.get("/api/projects")
    projects = list_response.json()
    assert any(p["id"] == project_id for p in projects)
    
    # Verify we can get it directly
    get_response = client.get(f"/api/projects/{project_id}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Persistent Project"