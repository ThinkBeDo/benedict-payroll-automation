import React, { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUpload = ({ onFileUpload, disabled }) => {
  const fileInputRef = useRef(null);
  
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      onFileUpload(file);
    } else {
      alert('Please upload a PDF file');
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled,
    noClick: false
  });

  const getDropzoneClassName = () => {
    let baseClass = 'dropzone';
    if (disabled) baseClass += ' disabled';
    if (isDragActive) baseClass += ' drag-active';
    if (isDragAccept) baseClass += ' drag-accept';
    if (isDragReject) baseClass += ' drag-reject';
    return baseClass;
  };

  return (
    <div className="file-upload-container">
      <div className="upload-header">
        <h3>Upload Payroll Report</h3>
        <p>Upload your original payroll PDF to automatically apply correction rules</p>
      </div>

      <div {...getRootProps()} className={getDropzoneClassName()}>
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <div className="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          
          {isDragActive ? (
            <div className="dropzone-text">
              <p className="primary">Drop PDF here...</p>
            </div>
          ) : (
            <div className="dropzone-text">
              <p className="primary">Drag & drop PDF here, or click to select</p>
              <p className="secondary">Only PDF files are accepted</p>
            </div>
          )}
          
          <div className="upload-button-container">
            <button 
              type="button" 
              className="btn btn-upload"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              disabled={disabled}
            >
              File Upload
            </button>
            <p className="upload-button-text">Upload Payroll PDF Here</p>
          </div>
        </div>
      </div>

      <div className="upload-info">
        <h4>What this tool does:</h4>
        <div className="rules-list">
          <div className="rule-item">
            <span className="rule-number">1</span>
            <span>TechUnapplied cost category → Unapplied pay type</span>
          </div>
          <div className="rule-item">
            <span className="rule-number">2</span>
            <span>Service/Install work → Validated labor rates</span>
          </div>
          <div className="rule-item">
            <span className="rule-number">3</span>
            <span>PM/PMF/FTPM work → PM-specific labor rates</span>
          </div>
          <div className="rule-item">
            <span className="rule-number">4</span>
            <span>Sunday work → Double Time pay + PREM rate</span>
          </div>
          <div className="rule-item">
            <span className="rule-number">5</span>
            <span>Call work → TechOT labor rate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
