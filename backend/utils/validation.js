/**
 * Validation utilities for payroll data
 */

class Validator {
  
  /**
   * Validate employee entry data
   */
  static validateEntry(entry) {
    const errors = [];
    
    // Required fields
    if (!entry.employeeName || entry.employeeName.trim() === '') {
      errors.push('Employee name is required');
    }
    
    if (!entry.date || !this.isValidDate(entry.date)) {
      errors.push('Valid date is required (MM/DD/YYYY format)');
    }
    
    if (!entry.hours || isNaN(entry.hours) || entry.hours < 0) {
      errors.push('Valid hours value is required');
    }
    
    if (!entry.payType || entry.payType.trim() === '') {
      errors.push('Pay type is required');
    }
    
    if (!entry.laborRate || entry.laborRate.trim() === '') {
      errors.push('Labor rate is required');
    }
    
    return errors;
  }

  /**
   * Validate date format (MM/DD/YYYY)
   */
  static isValidDate(dateString) {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
    
    if (!regex.test(dateString)) {
      return false;
    }
    
    // Additional validation - check if date actually exists
    const parts = dateString.split('/');
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    const date = new Date(year, month - 1, day);
    
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  /**
   * Validate hours format
   */
  static isValidHours(hours) {
    const num = parseFloat(hours);
    return !isNaN(num) && num >= 0 && num <= 24;
  }

  /**
   * Validate pay type
   */
  static isValidPayType(payType) {
    const validPayTypes = [
      'Regular', 'Overtime', 'Double Time', 'Call', 'Unapplied'
    ];
    return validPayTypes.includes(payType);
  }

  /**
   * Validate cost code
   */
  static isValidCostCode(costCode) {
    // Allow alphanumeric cost codes
    return /^[A-Za-z0-9_]+$/.test(costCode);
  }

  /**
   * Sanitize text input
   */
  static sanitizeText(text) {
    if (typeof text !== 'string') {
      return '';
    }
    
    return text
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potential HTML/script chars
      .substring(0, 255); // Limit length
  }

  /**
   * Validate file upload
   */
  static validatePDFFile(file) {
    const errors = [];
    
    if (!file) {
      errors.push('No file provided');
      return errors;
    }
    
    // Check file type
    if (file.type !== 'application/pdf') {
      errors.push('File must be a PDF');
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }
    
    // Check filename
    if (!file.name || file.name.trim() === '') {
      errors.push('File must have a valid name');
    }
    
    return errors;
  }

  /**
   * Validate API response
   */
  static validateAPIResponse(response) {
    if (!response) {
      throw new Error('No response received');
    }
    
    if (response.error) {
      throw new Error(response.error.message || response.error);
    }
    
    return true;
  }
}

module.exports = Validator;
