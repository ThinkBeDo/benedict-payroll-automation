const pdf = require('pdf-parse');

class PDFParser {
  
  /**
   * Extract text content from PDF buffer
   */
  async extractText(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Parse employee payroll data from extracted text
   */
  async parseEmployeeData(text) {
    try {
      const employees = [];
      const lines = text.split('\n');
      
      let currentEmployee = null;
      let payPeriodId = null;
      let reportDate = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Extract pay period and report date
        if (line.includes('Pay Period Id:')) {
          payPeriodId = line.split('Pay Period Id:')[1].trim().split(' ')[0];
        }
        
        if (line.match(/\w{3} \w{3} \d{2}, \d{4}/)) {
          reportDate = line.match(/\w{3} \w{3} \d{2}, \d{4}/)[0];
        }
        
        // Check for employee header (name and ID)
        const employeeMatch = line.match(/^([A-Za-z\s]+) - (\d+)$/);
        if (employeeMatch) {
          currentEmployee = {
            name: employeeMatch[1].trim(),
            id: employeeMatch[2],
            entries: []
          };
          continue;
        }
        
        // Parse individual time entries
        if (currentEmployee && line.length > 0) {
          const entry = this.parseTimeEntry(line);
          if (entry) {
            entry.employeeName = currentEmployee.name;
            entry.employeeId = currentEmployee.id;
            entry.payPeriodId = payPeriodId;
            entry.reportDate = reportDate;
            employees.push(entry);
          }
        }
        
        // Check for employee totals (end of employee section)
        if (line.includes('Employee Totals')) {
          currentEmployee = null;
        }
      }
      
      return employees;
    } catch (error) {
      throw new Error(`Failed to parse employee data: ${error.message}`);
    }
  }

  /**
   * Parse individual time entry line
   */
  parseTimeEntry(line) {
    try {
      // Pattern to match time entries like:
      // (CESRS117528)BAUER BUILT (1020 W PR 07/28/2025 1.50 - Regular - Tech - SERVICE - DirLab - Technician Regular
      
      // First, check if this line contains date pattern
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (!dateMatch) {
        return null;
      }
      
      const date = dateMatch[1];
      
      // Split the line to extract components
      const parts = line.split(' - ');
      if (parts.length < 6) {
        return null;
      }
      
      // Extract hours (should be before the first dash)
      const beforeFirstDash = parts[0];
      const hoursMatch = beforeFirstDash.match(/(\d+\.?\d*)\s*$/);
      if (!hoursMatch) {
        return null;
      }
      
      const hours = parseFloat(hoursMatch[1]);
      
      // Extract components after date and hours
      const payType = parts[1]?.trim();
      const laborRate = parts[2]?.trim();
      const costCode = parts[3]?.trim();
      const costCategory = parts[4]?.trim();
      const description = parts[5]?.trim();
      
      // Extract job code from beginning of line
      const jobCodeMatch = line.match(/^\(([\w\s]+)\)/);
      const jobCode = jobCodeMatch ? jobCodeMatch[1] : '';
      
      // Extract job description (between job code and date)
      let jobDescription = '';
      if (jobCodeMatch) {
        const afterJobCode = line.substring(jobCodeMatch[0].length);
        const beforeDate = afterJobCode.split(date)[0];
        jobDescription = beforeDate.trim();
      }
      
      return {
        jobCode,
        jobDescription,
        date,
        hours,
        payType,
        laborRate,
        costCode,
        costCategory,
        description,
        originalLine: line
      };
      
    } catch (error) {
      console.warn('Failed to parse time entry line:', line, error.message);
      return null;
    }
  }

  /**
   * Validate parsed data
   */
  validateData(employees) {
    const errors = [];
    
    employees.forEach((entry, index) => {
      if (!entry.employeeName) {
        errors.push(`Entry ${index}: Missing employee name`);
      }
      
      if (!entry.date || !entry.date.match(/\d{2}\/\d{2}\/\d{4}/)) {
        errors.push(`Entry ${index}: Invalid date format`);
      }
      
      if (!entry.hours || isNaN(entry.hours)) {
        errors.push(`Entry ${index}: Invalid hours`);
      }
      
      if (!entry.payType) {
        errors.push(`Entry ${index}: Missing pay type`);
      }
    });
    
    if (errors.length > 0) {
      throw new Error(`Validation errors:\n${errors.join('\n')}`);
    }
    
    return true;
  }
}

module.exports = new PDFParser();
