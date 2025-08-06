import os
import boto3
from botocore.exceptions import NoCredentialsError, ClientError
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class StorageService:
    """
    Service for managing file storage with S3/MinIO.
    Supports file uploads, downloads, versioning, and presigned URLs.
    """
    
    def __init__(
        self,
        bucket_name: str = None,
        endpoint_url: str = None,
        access_key_id: str = None,
        secret_access_key: str = None,
        region_name: str = "us-east-1",
        use_ssl: bool = True
    ):
        """
        Initialize the storage service with S3/MinIO configuration.
        
        Args:
            bucket_name: Name of the S3 bucket
            endpoint_url: Custom endpoint URL (for MinIO)
            access_key_id: AWS access key ID
            secret_access_key: AWS secret access key
            region_name: AWS region (default: us-east-1)
            use_ssl: Whether to use SSL for connections
        """
        self.bucket_name = bucket_name or os.getenv("S3_BUCKET_NAME", "lemur-data")
        self.endpoint_url = endpoint_url or os.getenv("S3_ENDPOINT_URL")
        self.access_key_id = access_key_id or os.getenv("AWS_ACCESS_KEY_ID", "minioadmin")
        self.secret_access_key = secret_access_key or os.getenv("AWS_SECRET_ACCESS_KEY", "minioadmin")
        self.region_name = region_name or os.getenv("AWS_REGION", "us-east-1")
        self.use_ssl = use_ssl
        
        # Initialize S3 client
        self.s3_client = self._create_s3_client()
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
        
        # Enable versioning on the bucket
        self._enable_versioning()
    
    def _create_s3_client(self):
        """Create and return an S3 client with the configured settings."""
        client_config = {
            "aws_access_key_id": self.access_key_id,
            "aws_secret_access_key": self.secret_access_key,
            "region_name": self.region_name,
        }
        
        # Add endpoint URL if using MinIO or custom S3 endpoint
        if self.endpoint_url:
            client_config["endpoint_url"] = self.endpoint_url
            client_config["use_ssl"] = self.use_ssl
            client_config["verify"] = self.use_ssl
        
        try:
            return boto3.client("s3", **client_config)
        except Exception as e:
            logger.error(f"Failed to create S3 client: {e}")
            raise
    
    def _ensure_bucket_exists(self):
        """Create the bucket if it doesn't exist."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"Bucket '{self.bucket_name}' exists")
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "404":
                try:
                    if self.endpoint_url:
                        # For MinIO, create bucket without location constraint
                        self.s3_client.create_bucket(Bucket=self.bucket_name)
                    else:
                        # For AWS S3, include location constraint for non-us-east-1 regions
                        if self.region_name != "us-east-1":
                            self.s3_client.create_bucket(
                                Bucket=self.bucket_name,
                                CreateBucketConfiguration={"LocationConstraint": self.region_name}
                            )
                        else:
                            self.s3_client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f"Created bucket '{self.bucket_name}'")
                except Exception as create_error:
                    logger.error(f"Failed to create bucket: {create_error}")
                    raise
            else:
                logger.error(f"Error checking bucket: {e}")
                raise
    
    def _enable_versioning(self):
        """Enable versioning on the bucket for file history."""
        try:
            self.s3_client.put_bucket_versioning(
                Bucket=self.bucket_name,
                VersioningConfiguration={"Status": "Enabled"}
            )
            logger.info(f"Versioning enabled for bucket '{self.bucket_name}'")
        except Exception as e:
            logger.warning(f"Could not enable versioning: {e}")
    
    def upload_file(
        self,
        file_content: bytes,
        file_name: str,
        project_id: str,
        file_id: Optional[str] = None,
        content_type: str = "text/csv",
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Upload a file to S3/MinIO with proper organization.
        
        Args:
            file_content: File content as bytes
            file_name: Original file name
            project_id: Project ID for organization
            file_id: Optional file ID (generated if not provided)
            content_type: MIME type of the file
            metadata: Additional metadata to store with the file
        
        Returns:
            Dictionary with upload details including key, version_id, and URL
        """
        try:
            # Generate file ID if not provided
            if not file_id:
                file_id = str(uuid.uuid4())
            
            # Create S3 key with project organization
            # Format: projects/{project_id}/files/{file_id}/{filename}
            s3_key = f"projects/{project_id}/files/{file_id}/{file_name}"
            
            # Prepare metadata
            upload_metadata = {
                "project_id": project_id,
                "file_id": file_id,
                "original_name": file_name,
                "upload_timestamp": datetime.utcnow().isoformat()
            }
            if metadata:
                upload_metadata.update(metadata)
            
            # Upload file to S3
            response = self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                Metadata=upload_metadata
            )
            
            # Get version ID if versioning is enabled
            version_id = response.get("VersionId")
            
            logger.info(f"Successfully uploaded file: {s3_key}")
            
            return {
                "file_id": file_id,
                "s3_key": s3_key,
                "bucket": self.bucket_name,
                "version_id": version_id,
                "size": len(file_content),
                "content_type": content_type,
                "metadata": upload_metadata
            }
            
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise ValueError("Storage service credentials not configured")
        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            raise
    
    def download_file(
        self,
        s3_key: str,
        version_id: Optional[str] = None
    ) -> bytes:
        """
        Download a file from S3/MinIO.
        
        Args:
            s3_key: S3 object key
            version_id: Optional version ID for versioned retrieval
        
        Returns:
            File content as bytes
        """
        try:
            params = {"Bucket": self.bucket_name, "Key": s3_key}
            if version_id:
                params["VersionId"] = version_id
            
            response = self.s3_client.get_object(**params)
            content = response["Body"].read()
            
            logger.info(f"Successfully downloaded file: {s3_key}")
            return content
            
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                raise FileNotFoundError(f"File not found: {s3_key}")
            logger.error(f"Failed to download file: {e}")
            raise
    
    def generate_presigned_url(
        self,
        s3_key: str,
        expiration: int = 3600,
        version_id: Optional[str] = None,
        download: bool = True
    ) -> str:
        """
        Generate a presigned URL for secure file access.
        
        Args:
            s3_key: S3 object key
            expiration: URL expiration time in seconds (default: 1 hour)
            version_id: Optional version ID for versioned access
            download: If True, force download; if False, allow inline viewing
        
        Returns:
            Presigned URL string
        """
        try:
            params = {
                "Bucket": self.bucket_name,
                "Key": s3_key,
            }
            
            if version_id:
                params["VersionId"] = version_id
            
            # Add response headers for download behavior
            if download:
                filename = Path(s3_key).name
                params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
            
            url = self.s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params=params,
                ExpiresIn=expiration
            )
            
            logger.info(f"Generated presigned URL for: {s3_key}")
            return url
            
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise
    
    def delete_file(
        self,
        s3_key: str,
        version_id: Optional[str] = None
    ) -> bool:
        """
        Delete a file from S3/MinIO.
        
        Args:
            s3_key: S3 object key
            version_id: Optional version ID for versioned deletion
        
        Returns:
            True if successful, False otherwise
        """
        try:
            params = {"Bucket": self.bucket_name, "Key": s3_key}
            if version_id:
                params["VersionId"] = version_id
            
            self.s3_client.delete_object(**params)
            logger.info(f"Successfully deleted file: {s3_key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            return False
    
    def list_file_versions(
        self,
        s3_key: str,
        max_versions: int = 10
    ) -> list:
        """
        List all versions of a file.
        
        Args:
            s3_key: S3 object key
            max_versions: Maximum number of versions to return
        
        Returns:
            List of version information dictionaries
        """
        try:
            response = self.s3_client.list_object_versions(
                Bucket=self.bucket_name,
                Prefix=s3_key,
                MaxKeys=max_versions
            )
            
            versions = []
            for version in response.get("Versions", []):
                if version["Key"] == s3_key:
                    versions.append({
                        "version_id": version["VersionId"],
                        "last_modified": version["LastModified"].isoformat(),
                        "size": version["Size"],
                        "is_latest": version.get("IsLatest", False)
                    })
            
            return versions
            
        except Exception as e:
            logger.error(f"Failed to list file versions: {e}")
            return []
    
    def list_project_files(
        self,
        project_id: str
    ) -> list:
        """
        List all files for a specific project.
        
        Args:
            project_id: Project ID
        
        Returns:
            List of file information dictionaries
        """
        try:
            prefix = f"projects/{project_id}/files/"
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            files = []
            for obj in response.get("Contents", []):
                # Parse the key to extract file information
                key_parts = obj["Key"].split("/")
                if len(key_parts) >= 5:  # projects/project_id/files/file_id/filename
                    file_id = key_parts[3]
                    filename = "/".join(key_parts[4:])
                    
                    files.append({
                        "file_id": file_id,
                        "filename": filename,
                        "s3_key": obj["Key"],
                        "size": obj["Size"],
                        "last_modified": obj["LastModified"].isoformat()
                    })
            
            return files
            
        except Exception as e:
            logger.error(f"Failed to list project files: {e}")
            return []
    
    def get_file_metadata(
        self,
        s3_key: str,
        version_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get metadata for a specific file.
        
        Args:
            s3_key: S3 object key
            version_id: Optional version ID
        
        Returns:
            Dictionary containing file metadata
        """
        try:
            params = {"Bucket": self.bucket_name, "Key": s3_key}
            if version_id:
                params["VersionId"] = version_id
            
            response = self.s3_client.head_object(**params)
            
            return {
                "content_type": response.get("ContentType"),
                "size": response.get("ContentLength"),
                "last_modified": response.get("LastModified").isoformat() if response.get("LastModified") else None,
                "version_id": response.get("VersionId"),
                "metadata": response.get("Metadata", {})
            }
            
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                raise FileNotFoundError(f"File not found: {s3_key}")
            logger.error(f"Failed to get file metadata: {e}")
            raise


# Singleton instance for easy import
storage_service = None

def get_storage_service() -> StorageService:
    """Get or create the storage service singleton."""
    global storage_service
    if storage_service is None:
        storage_service = StorageService()
    return storage_service