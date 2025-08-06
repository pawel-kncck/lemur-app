"""
SQLAlchemy models for database entities.
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import os
from database import Base

# Use String for SQLite, UUID for PostgreSQL
def get_uuid_column(primary_key=False):
    """Get UUID column that works with both SQLite and PostgreSQL"""
    if os.getenv("DATABASE_URL", "").startswith("postgresql"):
        from sqlalchemy.dialects.postgresql import UUID
        return Column(UUID(as_uuid=True), primary_key=primary_key, default=uuid.uuid4)
    else:
        # For SQLite, use String
        return Column(String(36), primary_key=primary_key, default=lambda: str(uuid.uuid4()))


class User(Base):
    __tablename__ = "users"
    
    id = get_uuid_column(primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"
    
    id = get_uuid_column(primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="projects")
    files = relationship("File", back_populates="project", cascade="all, delete-orphan")
    contexts = relationship("Context", back_populates="project", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="project", cascade="all, delete-orphan")


class File(Base):
    __tablename__ = "files"
    
    id = get_uuid_column(primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500))
    rows = Column(Integer)
    columns = Column(JSON)  # Store column info as JSON
    profile = Column(JSON)  # Store data profile as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="files")


class Context(Base):
    __tablename__ = "contexts"
    
    id = get_uuid_column(primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="contexts")


class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = get_uuid_column(primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_message = Column(Text)
    assistant_response = Column(Text)
    extra_metadata = Column(JSON)  # Store additional metadata (renamed to avoid conflict)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="chat_history")