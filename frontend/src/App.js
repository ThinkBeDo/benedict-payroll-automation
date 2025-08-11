import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ReviewChanges from './components/ReviewChanges';
import ChangeSummary from './components/ChangeSummary';
import DownloadReport from './components/DownloadReport';
import payrollService from './services/payrollService';
import './App.css';

function App() {
  const [currentStep, setCurrentStep] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [changes, setChanges] = useState([]);
  const [correctedData, setCorrectedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate file before processing
      const validation = payrollService.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      // Process PDF using payroll service
      const result = await payrollService.processPDF(file);
      
      setUploadedFile(file);
      setParsedData(result.employeeData);
      setChanges(result.changes);
      setCorrectedData(result.correctedData);
      setCurrentStep('review');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveChanges = () => {
    setCurrentStep('download');
  };

  const handleRejectChanges = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setParsedData(null);
    setChanges([]);
    setCorrectedData(null);
  };

  const handleStartOver = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setParsedData(null);
    setChanges([]);
    setCorrectedData(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Benedict Refrigeration</h1>
        <h2>Payroll Report Automation</h2>
        <div className="steps">
          <div className={`step ${currentStep === 'upload' ? 'active' : ''}`}>
            1. Upload Report
          </div>
          <div className={`step ${currentStep === 'review' ? 'active' : ''}`}>
            2. Review Changes
          </div>
          <div className={`step ${currentStep === 'download' ? 'active' : ''}`}>
            3. Download Corrected Report
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner">
            <div className="error-content">
              <h3>Error Processing File</h3>
              <p>{error}</p>
              <button onClick={handleStartOver} className="btn btn-secondary">
                Try Again
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Processing PDF and applying rules...</p>
          </div>
        )}

        {currentStep === 'upload' && !loading && (
          <FileUpload 
            onFileUpload={handleFileUpload}
            disabled={loading}
          />
        )}

        {currentStep === 'review' && !loading && (
          <div className="review-container">
            <ChangeSummary 
              changes={changes}
              originalData={parsedData}
              fileName={uploadedFile?.name}
            />
            
            <ReviewChanges 
              changes={changes}
              onApprove={handleApproveChanges}
              onReject={handleRejectChanges}
            />
          </div>
        )}

        {currentStep === 'download' && !loading && (
          <DownloadReport 
            correctedData={correctedData}
            changes={changes}
            originalFileName={uploadedFile?.name}
            onStartOver={handleStartOver}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2025 Benedict Refrigeration Service, Inc.</p>
      </footer>
    </div>
  );
}

export default App;
