import api from './api';

/**
 * PayrollService - Handles all payroll-related API calls
 */
class PayrollService {
  /**
   * Process uploaded PDF file and apply payroll rules
   * @param {File} file - The PDF file to process
   * @returns {Promise<Object>} Processing results with changes and summary
   */
  async processPDF(file) {
    try {
      const formData = new FormData();
      formData.append('payrollPdf', file);

      const response = await api.post('/payroll/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      this.handleError('Failed to process PDF', error);
    }
  }

  /**
   * Download processed payroll report as PDF
   * @param {Object} data - Processed payroll data
   * @param {string} format - Download format ('pdf' or 'excel')
   * @returns {Promise<Blob>} File blob for download
   */
  async downloadReport(data, format = 'pdf') {
    try {
      const response = await api.post(`/payroll/download/${format}`, data, {
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      this.handleError(`Failed to download ${format.toUpperCase()} report`, error);
    }
  }

  /**
   * Validate uploaded file
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const errors = [];
    const warnings = [];

    // Check file type
    if (file.type !== 'application/pdf') {
      errors.push('Only PDF files are supported');
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }

    // Check for minimum file size (avoid empty files)
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      errors.push('File appears to be empty or corrupted');
    }

    // Check filename for payroll patterns
    const filename = file.name.toLowerCase();
    if (!filename.includes('payroll') && !filename.includes('time')) {
      warnings.push('File name doesn\'t appear to be a payroll report');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get rule descriptions for UI display
   * @returns {Object} Rule descriptions mapped by rule number
   */
  getRuleDescriptions() {
    return {
      1: 'TechUnapplied → Unapplied Pay Type',
      2: 'Service/Install → Valid Tech Labor Rates',
      3: 'PM/PMF/FTPM → Valid PM Labor Rates',
      4: 'Sunday Work → Double Time + PREM',
      5: 'Call Pay Type → TechOT Labor Rate',
    };
  }

  /**
   * Generate summary statistics from changes
   * @param {Array} changes - Array of change objects
   * @returns {Object} Summary statistics
   */
  generateSummary(changes) {
    const summary = {
      totalChanges: changes.length,
      employeesAffected: new Set(changes.map(c => c.employeeName)).size,
      ruleBreakdown: {},
    };

    // Count changes by rule
    changes.forEach(change => {
      const ruleKey = `rule${change.ruleNumber}`;
      summary.ruleBreakdown[ruleKey] = (summary.ruleBreakdown[ruleKey] || 0) + 1;
    });

    return summary;
  }

  /**
   * Filter changes based on search and filter criteria
   * @param {Array} changes - Array of change objects
   * @param {string} searchTerm - Search term for employee names
   * @param {string} ruleFilter - Rule number filter ('all' or specific rule)
   * @returns {Array} Filtered changes
   */
  filterChanges(changes, searchTerm = '', ruleFilter = 'all') {
    let filtered = changes;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(change =>
        change.employeeName.toLowerCase().includes(term)
      );
    }

    // Apply rule filter
    if (ruleFilter !== 'all') {
      const ruleNumber = parseInt(ruleFilter);
      filtered = filtered.filter(change => change.ruleNumber === ruleNumber);
    }

    return filtered;
  }

  /**
   * Sort changes by specified field and direction
   * @param {Array} changes - Array of change objects
   * @param {string} field - Field to sort by
   * @param {string} direction - Sort direction ('asc' or 'desc')
   * @returns {Array} Sorted changes
   */
  sortChanges(changes, field, direction = 'asc') {
    const sorted = [...changes].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];

      // Handle special cases
      if (field === 'employeeName') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (field === 'date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  /**
   * Download file with proper filename
   * @param {Blob} blob - File blob
   * @param {string} filename - Desired filename
   * @param {string} format - File format
   */
  downloadFile(blob, filename, format) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    link.download = `${filename}_corrected_${timestamp}.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Handle API errors with user-friendly messages
   * @param {string} defaultMessage - Default error message
   * @param {Error} error - Error object
   * @throws {Error} User-friendly error
   */
  handleError(defaultMessage, error) {
    let message = defaultMessage;

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      if (status === 400) {
        message = data.message || 'Invalid request. Please check your file and try again.';
      } else if (status === 413) {
        message = 'File is too large. Please upload a smaller file.';
      } else if (status === 422) {
        message = data.message || 'File format is not supported or is corrupted.';
      } else if (status === 500) {
        message = 'Server error occurred while processing your request.';
      } else {
        message = data.message || `Request failed with status ${status}`;
      }
    } else if (error.request) {
      // Request was made but no response received
      message = 'Cannot connect to server. Please check your internet connection.';
    } else if (error.code === 'ECONNABORTED') {
      // Request timeout
      message = 'Request timed out. Please try again with a smaller file.';
    }

    const userError = new Error(message);
    userError.originalError = error;
    throw userError;
  }
}

// Export singleton instance
export default new PayrollService();
