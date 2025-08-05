import pytest
from fastapi.testclient import TestClient
import io

def test_upload_file_project_not_found(client):
    """Test uploading file to non-existent project."""
    files = {"file": ("test.csv", b"col1,col2\n1,2", "text/csv")}
    response = client.post("/api/projects/non-existent/upload", files=files)
    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"

def test_upload_csv_success(client, sample_csv_file):
    """Test successful CSV file upload."""
    # Create a project first
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Upload file
    files = {"file": (sample_csv_file["filename"], sample_csv_file["content"], sample_csv_file["content_type"])}
    response = client.post(f"/api/projects/{project_id}/upload", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert "file_id" in data
    assert data["filename"] == "test.csv"
    assert data["rows"] == 3
    assert data["columns"] == ["name", "age", "city"]
    assert "preview" in data
    assert len(data["preview"]) == 3

def test_upload_non_csv_file(client):
    """Test uploading non-CSV file."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Try to upload a non-CSV file
    files = {"file": ("test.txt", b"This is not a CSV", "text/plain")}
    response = client.post(f"/api/projects/{project_id}/upload", files=files)
    
    assert response.status_code == 400
    assert "Only CSV files are supported" in response.json()["detail"]

def test_upload_invalid_csv(client):
    """Test uploading invalid CSV file."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Upload invalid CSV
    files = {"file": ("test.csv", b"this is not valid csv data\n with random content", "text/csv")}
    response = client.post(f"/api/projects/{project_id}/upload", files=files)
    
    # Should handle gracefully
    assert response.status_code == 400
    assert "Error processing file" in response.json()["detail"]

def test_upload_updates_project(client, sample_csv_file):
    """Test that uploading a file updates the project data."""
    # Create a project
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    # Upload file
    files = {"file": (sample_csv_file["filename"], sample_csv_file["content"], sample_csv_file["content_type"])}
    upload_response = client.post(f"/api/projects/{project_id}/upload", files=files)
    file_id = upload_response.json()["file_id"]
    
    # Check project was updated
    project = client.get(f"/api/projects/{project_id}").json()
    assert project["file_id"] == file_id
    assert project["file_name"] == "test.csv"
    assert project["file_columns"] == ["name", "age", "city"]

def test_file_preview(client, sample_csv_file):
    """Test file preview endpoint."""
    # Create project and upload file
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    files = {"file": (sample_csv_file["filename"], sample_csv_file["content"], sample_csv_file["content_type"])}
    upload_response = client.post(f"/api/projects/{project_id}/upload", files=files)
    file_id = upload_response.json()["file_id"]
    
    # Get preview
    response = client.get(f"/api/files/{file_id}/preview")
    assert response.status_code == 200
    data = response.json()
    assert data["rows"] == 3
    assert data["columns"] == ["name", "age", "city"]
    assert len(data["data"]) == 3
    assert "dtypes" in data

def test_file_preview_with_limit(client, sample_csv_file):
    """Test file preview with row limit."""
    # Create project and upload file
    project_response = client.post("/api/projects", json={"name": "Test Project"})
    project_id = project_response.json()["id"]
    
    files = {"file": (sample_csv_file["filename"], sample_csv_file["content"], sample_csv_file["content_type"])}
    upload_response = client.post(f"/api/projects/{project_id}/upload", files=files)
    file_id = upload_response.json()["file_id"]
    
    # Get preview with limit
    response = client.get(f"/api/files/{file_id}/preview?rows=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 2  # Limited to 2 rows

def test_file_preview_not_found(client):
    """Test preview of non-existent file."""
    response = client.get("/api/files/non-existent-file/preview")
    assert response.status_code == 404
    assert response.json()["detail"] == "File not found"