import React, { useState } from 'react';

const DownloadReport = ({ correctedData, changes, originalFileName, onStartOver }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch('/api/payroll/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correctedData,
          changes,
          originalFileName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Handle PDF download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateFileName('pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      setDownloadError(error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch('/api/payroll/generate-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correctedData,
          changes,
          originalFileName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate Excel file');
      }

      // Handle Excel download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateFileName('xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      setDownloadError(error.message);
    } finally {
      setDownloading(false);
    }
  };

  const generateFileName = (extension) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const baseName = originalFileName?.replace('.pdf', '') || 'payroll-report';
    return `${baseName}-corrected-${timestamp}.${extension}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="download-report-container">
      <div className="download-header">
        <div className="success-icon">✅</div>
        <h3>Report Ready for Download</h3>
        <p>
          {changes.length === 0 
            ? 'Your payroll report has been processed and is ready for download.'
            : `Successfully applied ${changes.length} correction${changes.length !== 1 ? 's' : ''} to your payroll report.`
          }
        </p>
      </div>

      <div className="download-summary">
        <div className="summary-card">
          <h4>Processing Summary</h4>
          <div className="summary-stats">
            <div className="summary-item">
              <span className="label">Original File:</span>
              <span className="value">{originalFileName}</span>
            </div>
            <div className="summary-item">
              <span className="label">Employee Records:</span>
              <span className="value">{correctedData?.length || 0}</span>
            </div>
            <div className="summary-item">
              <span className="label">Corrections Applied:</span>
              <span className="value">{changes.length}</span>
            </div>
            <div className="summary-item">
              <span className="label">Processed:</span>
              <span className="value">{formatDate(new Date())}</span>
            </div>
          </div>
        </div>

        {changes.length > 0 && (
          <div className="changes-preview">
            <h4>Applied Corrections</h4>
            <div className="changes-list">
              {changes.slice(0, 5).map((change, index) => (
                <div key={index} className="change-preview-item">
                  <span className="employee">{change.employeeName}</span>
                  <span className="change-desc">
                    {change.field}: {change.originalValue} → {change.correctedValue}
                  </span>
                </div>
              ))}
              {changes.length > 5 && (
                <div className="more-changes">
                  ...and {changes.length - 5} more correction{changes.length - 5 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {downloadError && (
        <div className="download-error">
          <p>Error downloading file: {downloadError}</p>
        </div>
      )}

      <div className="download-options">
        <h4>Download Options</h4>
        
        <div className="download-buttons">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="btn btn-primary download-btn"
          >
            <div className="btn-content">
              <div className="btn-icon">📄</div>
              <div className="btn-text">
                <div className="btn-title">
                  {downloading ? 'Generating...' : 'Download PDF'}
                </div>
                <div className="btn-subtitle">Original format with corrections</div>
              </div>
            </div>
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="btn btn-secondary download-btn"
          >
            <div className="btn-content">
              <div className="btn-icon">📊</div>
              <div className="btn-text">
                <div className="btn-title">
                  {downloading ? 'Generating...' : 'Download Excel'}
                </div>
                <div className="btn-subtitle">Spreadsheet format</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="download-actions">
        <button 
          onClick={onStartOver}
          className="btn btn-outline"
          disabled={downloading}
        >
          Process Another Report
        </button>
      </div>

      <div className="download-notice">
        <h4>Important Notes</h4>
        <ul>
          <li>The corrected report maintains the original format and structure</li>
          <li>All changes are clearly documented and reversible</li>
          <li>Keep both original and corrected versions for your records</li>
          <li>Review the corrected report before submitting to payroll</li>
        </ul>
      </div>
    </div>
  );
};

export default DownloadReport;
