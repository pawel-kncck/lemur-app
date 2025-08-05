import { useState, useRef } from 'react';
import { api } from '../lib/api';
import { UploadedFile } from '../types/index';

export function DataStudioTab({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    setUploadError(null);
    setUploading(true);

    try {
      const result = await api.uploadFile(projectId, file);

      const newFile: UploadedFile = {
        id: result.file_id,
        name: result.filename,
        size: `${result.rows} rows`,
        type: 'CSV',
        uploadedAt: new Date(),
        status: 'success',
        preview: result.preview,
      };

      setFiles([newFile]);
    } catch (error) {
      setUploadError('Failed to upload file. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (fileId: string) => {
    try {
      const preview = await api.previewFile(fileId);
      setPreviewData(preview);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to load preview:', error);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
      <h2 style={{ marginBottom: '20px' }}>Data Studio</h2>

      {/* Upload Area */}
      {files.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #666',
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: '#1a1a1a',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#4a9eff';
            e.currentTarget.style.backgroundColor = '#222';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#666';
            e.currentTarget.style.backgroundColor = '#1a1a1a';
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
          <h3 style={{ marginBottom: '10px' }}>Drop your CSV file here</h3>
          <p style={{ color: '#999', marginBottom: '20px' }}>
            or click to browse files
          </p>
          {uploading && <p>Uploading...</p>}
          {uploadError && <p style={{ color: '#ff6b6b' }}>{uploadError}</p>}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={(e) => handleFileUpload(e.target.files)}
        style={{ display: 'none' }}
      />

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Uploaded File</h3>
            <button
              onClick={() => {
                setFiles([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #666',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Upload New File
            </button>
          </div>

          {files.map((file) => (
            <div
              key={file.id}
              style={{
                backgroundColor: '#2a2a2a',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '10px',
                border: '1px solid #444',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{file.name}</h4>
                  <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>
                    {file.size} • {file.type} • Uploaded {file.uploadedAt.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => handlePreview(file.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4a9eff',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{
              backgroundColor: '#2a2a2a',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '1200px',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '1px solid #444',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Data Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#999' }}>
                Showing {previewData.data.length} of {previewData.rows} rows
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {previewData.columns.map((col: string) => (
                      <th
                        key={col}
                        style={{
                          padding: '10px',
                          borderBottom: '2px solid #444',
                          textAlign: 'left',
                          backgroundColor: '#1a1a1a',
                          position: 'sticky',
                          top: 0,
                        }}
                      >
                        {col}
                        <br />
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {previewData.dtypes[col]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.data.map((row: any, idx: number) => (
                    <tr key={idx}>
                      {previewData.columns.map((col: string) => (
                        <td
                          key={col}
                          style={{
                            padding: '10px',
                            borderBottom: '1px solid #333',
                          }}
                        >
                          {row[col] !== null && row[col] !== undefined
                            ? String(row[col])
                            : <span style={{ color: '#666' }}>null</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}