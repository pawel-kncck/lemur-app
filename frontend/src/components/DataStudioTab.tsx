import { useState, useRef } from 'react';
import { api } from '../lib/api';
import { UploadedFile } from '../types/types';

interface DataProfile {
  basic_info: {
    rows: number;
    columns: number;
    memory_usage_mb: number;
    duplicates: number;
    duplicate_percentage: number;
    complete_rows: number;
    complete_rows_percentage: number;
  };
  data_quality: {
    assessment: string;
    score: number;
    issues: string[];
    warnings: string[];
  };
  potential_relationships: {
    potential_ids: string[];
    potential_dates: string[];
    potential_categories: string[];
    potential_targets: string[];
    highly_correlated: Array<{
      col1: string;
      col2: string;
      correlation: number;
    }>;
  };
  suggested_analyses: string[];
  columns: Record<string, any>;
}

export function DataStudioTab({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dataProfile, setDataProfile] = useState<DataProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'profile'>('profile');
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
      
      // Set the profile if available
      if (result.profile) {
        setDataProfile(result.profile);
      }
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
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setShowPreview(true);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4a9eff',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      handlePreview(file.id);
                      setActiveTab('preview');
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'transparent',
                      border: '1px solid #4a9eff',
                      borderRadius: '6px',
                      color: '#4a9eff',
                      cursor: 'pointer',
                    }}
                  >
                    Preview Data
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Combined Modal for Profile and Preview */}
      {showPreview && (activeTab === 'preview' ? previewData : dataProfile) && (
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
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{activeTab === 'preview' ? 'Data Preview' : 'Data Profile'}</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setActiveTab('profile')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: activeTab === 'profile' ? '#4a9eff' : 'transparent',
                      border: activeTab === 'profile' ? 'none' : '1px solid #666',
                      borderRadius: '4px',
                      color: activeTab === 'profile' ? 'white' : '#999',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      if (!previewData && files[0]) {
                        handlePreview(files[0].id);
                      }
                      setActiveTab('preview');
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: activeTab === 'preview' ? '#4a9eff' : 'transparent',
                      border: activeTab === 'preview' ? 'none' : '1px solid #666',
                      borderRadius: '4px',
                      color: activeTab === 'preview' ? 'white' : '#999',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Preview
                  </button>
                </div>
              </div>
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

            {/* Profile View */}
            {activeTab === 'profile' && dataProfile && (
              <div>
                {/* Basic Info Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                  gap: '15px',
                  marginBottom: '30px' 
                }}>
                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#1a1a1a', 
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>Rows</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {dataProfile.basic_info.rows.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#1a1a1a', 
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>Columns</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {dataProfile.basic_info.columns}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#1a1a1a', 
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>Memory</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {dataProfile.basic_info.memory_usage_mb} MB
                    </div>
                  </div>
                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: '#1a1a1a', 
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>Duplicates</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {dataProfile.basic_info.duplicate_percentage}%
                    </div>
                  </div>
                </div>

                {/* Data Quality */}
                <div style={{ 
                  marginBottom: '30px',
                  padding: '20px',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '8px',
                  border: '1px solid #333'
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Data Quality</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: dataProfile.data_quality.score >= 80 ? '#4ade80' : 
                                       dataProfile.data_quality.score >= 60 ? '#fbbf24' : '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 'bold'
                    }}>
                      {dataProfile.data_quality.score}
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {dataProfile.data_quality.assessment}
                      </div>
                      <div style={{ fontSize: '14px', color: '#999' }}>
                        Quality Score
                      </div>
                    </div>
                  </div>
                  
                  {dataProfile.data_quality.issues.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', color: '#ef4444' }}>
                        Issues:
                      </div>
                      {dataProfile.data_quality.issues.map((issue, idx) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#ff9999', marginLeft: '10px' }}>
                          • {issue}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {dataProfile.data_quality.warnings.length > 0 && (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', color: '#fbbf24' }}>
                        Warnings:
                      </div>
                      {dataProfile.data_quality.warnings.map((warning, idx) => (
                        <div key={idx} style={{ fontSize: '13px', color: '#ffcc00', marginLeft: '10px' }}>
                          • {warning}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Detected Patterns */}
                <div style={{ 
                  marginBottom: '30px',
                  padding: '20px',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '8px',
                  border: '1px solid #333'
                }}>
                  <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Detected Patterns</h4>
                  
                  {dataProfile.potential_relationships.potential_ids.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#999' }}>ID Columns: </span>
                      <span style={{ fontSize: '13px' }}>
                        {dataProfile.potential_relationships.potential_ids.join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {dataProfile.potential_relationships.potential_dates.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#999' }}>Date Columns: </span>
                      <span style={{ fontSize: '13px' }}>
                        {dataProfile.potential_relationships.potential_dates.join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {dataProfile.potential_relationships.potential_categories.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#999' }}>Categories: </span>
                      <span style={{ fontSize: '13px' }}>
                        {dataProfile.potential_relationships.potential_categories.slice(0, 5).join(', ')}
                        {dataProfile.potential_relationships.potential_categories.length > 5 && '...'}
                      </span>
                    </div>
                  )}
                  
                  {dataProfile.potential_relationships.highly_correlated.length > 0 && (
                    <div>
                      <div style={{ fontSize: '13px', color: '#999', marginBottom: '5px' }}>
                        Highly Correlated Columns:
                      </div>
                      {dataProfile.potential_relationships.highly_correlated.map((corr, idx) => (
                        <div key={idx} style={{ fontSize: '13px', marginLeft: '10px' }}>
                          • {corr.col1} ↔ {corr.col2} ({corr.correlation})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suggested Analyses */}
                {dataProfile.suggested_analyses && dataProfile.suggested_analyses.length > 0 && (
                  <div style={{ 
                    padding: '20px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}>
                    <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Suggested Analyses</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {dataProfile.suggested_analyses.map((suggestion, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#2a2a2a',
                            borderRadius: '20px',
                            fontSize: '13px',
                            border: '1px solid #444',
                            cursor: 'pointer',
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview View */}
            {activeTab === 'preview' && previewData && (
              <div>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}