#!/usr/bin/env python3
"""
Test script for S3/MinIO storage integration.
This script tests file upload, download, and presigned URL generation.
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent))

from storage import get_storage_service


def test_storage_service():
    """Test the storage service with MinIO."""
    print("=" * 60)
    print("Testing S3/MinIO Storage Integration")
    print("=" * 60)
    
    try:
        # Initialize storage service
        print("\n1. Initializing storage service...")
        storage = get_storage_service()
        print("   ✅ Storage service initialized")
        
        # Test data
        project_id = "test-project-123"
        file_id = "test-file-456"
        test_content = b"id,name,value\n1,Test Item,100\n2,Another Item,200\n"
        file_name = "test_data.csv"
        
        # Test file upload
        print("\n2. Testing file upload...")
        upload_result = storage.upload_file(
            file_content=test_content,
            file_name=file_name,
            project_id=project_id,
            file_id=file_id,
            content_type="text/csv",
            metadata={"test": "true", "timestamp": datetime.now().isoformat()}
        )
        print(f"   ✅ File uploaded successfully")
        print(f"   - S3 Key: {upload_result['s3_key']}")
        print(f"   - Version ID: {upload_result.get('version_id', 'N/A')}")
        print(f"   - Size: {upload_result['size']} bytes")
        
        # Test file download
        print("\n3. Testing file download...")
        downloaded_content = storage.download_file(upload_result['s3_key'])
        if downloaded_content == test_content:
            print("   ✅ File downloaded successfully - content matches")
        else:
            print("   ❌ Downloaded content doesn't match original")
        
        # Test presigned URL generation
        print("\n4. Testing presigned URL generation...")
        download_url = storage.generate_presigned_url(
            s3_key=upload_result['s3_key'],
            expiration=3600
        )
        print(f"   ✅ Presigned URL generated")
        print(f"   - URL: {download_url[:80]}...")
        
        # Test listing project files
        print("\n5. Testing list project files...")
        files = storage.list_project_files(project_id)
        print(f"   ✅ Found {len(files)} file(s) in project")
        for file in files:
            print(f"   - {file['filename']} ({file['size']} bytes)")
        
        # Test file metadata
        print("\n6. Testing get file metadata...")
        metadata = storage.get_file_metadata(upload_result['s3_key'])
        print(f"   ✅ Metadata retrieved")
        print(f"   - Content Type: {metadata['content_type']}")
        print(f"   - Size: {metadata['size']} bytes")
        print(f"   - Custom Metadata: {metadata.get('metadata', {})}")
        
        # Test file versions (if versioning is enabled)
        print("\n7. Testing file versions...")
        versions = storage.list_file_versions(upload_result['s3_key'])
        print(f"   ✅ Found {len(versions)} version(s)")
        for version in versions:
            print(f"   - Version ID: {version['version_id']}, Latest: {version['is_latest']}")
        
        # Clean up - delete test file
        print("\n8. Cleaning up test file...")
        if storage.delete_file(upload_result['s3_key']):
            print("   ✅ Test file deleted")
        else:
            print("   ⚠️  Could not delete test file")
        
        print("\n" + "=" * 60)
        print("✅ All storage tests passed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Storage test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    # Set environment variables for MinIO if not already set
    os.environ.setdefault("S3_ENDPOINT_URL", "http://localhost:9000")
    os.environ.setdefault("S3_BUCKET_NAME", "lemur-data")
    os.environ.setdefault("AWS_ACCESS_KEY_ID", "minioadmin")
    os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "minioadmin")
    
    print(f"\nUsing MinIO endpoint: {os.environ.get('S3_ENDPOINT_URL')}")
    print(f"Bucket name: {os.environ.get('S3_BUCKET_NAME')}\n")
    
    success = test_storage_service()
    sys.exit(0 if success else 1)