const pdf = require('pdf-parse');

class PDFParser {
  
  /**
   * Extract text content from PDF buffer
   */
  async extractText(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer);
      console.log(`PDF text extracted successfully, length: ${data.text.length}`);
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
      console.log('Starting to parse employee data from PDF text...');
      
      const allEntries = [];
      const lines = text.split('\n');
      
      let currentEmployee = null;
      let employeeEntries = [];
      let payPeriodId = null;
      let reportDate = null;
      let employeeCount = 0;
      let totalEntriesCount = 0;
      
      console.log(`Total lines to process: ${lines.length}`);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) continue;
        
        // Extract pay period ID
        if (trimmedLine.includes('Pay Period Id:')) {
          const match = trimmedLine.match(/Pay Period Id:\s*([^\s]+)/);
          if (match) {
            payPeriodId = match[1];
            console.log(`Found Pay Period ID: ${payPeriodId}`);
          }
        }
        
        // Extract report date
        if (!reportDate && trimmedLine.match(/\w{3}\s+\w{3}\s+\d{1,2},\s+\d{4}/)) {
          const dateMatch = trimmedLine.match(/\w{3}\s+\w{3}\s+\d{1,2},\s+\d{4}/);
          if (dateMatch) {
            reportDate = dateMatch[0];
            console.log(`Found Report Date: ${reportDate}`);
          }
        }
        
        // Check for employee header - more flexible pattern
        // Matches: "FirstName LastName - 12345" or "LastName, FirstName - 12345"
        const employeeMatch = trimmedLine.match(/^([A-Za-z',.\s-]+?)\s*-\s*(\d+)\s*$/);
        if (employeeMatch) {
          // Save previous employee's entries if exists
          if (currentEmployee && employeeEntries.length > 0) {
            console.log(`  Saving ${employeeEntries.length} entries for ${currentEmployee.name}`);
            employeeEntries.forEach(entry => {
              allEntries.push({
                ...entry,
                employeeName: currentEmployee.name,
                employeeId: currentEmployee.id,
                payPeriodId: payPeriodId,
                reportDate: reportDate
              });
            });
            totalEntriesCount += employeeEntries.length;
          }
          
          // Start new employee
          currentEmployee = {
            name: employeeMatch[1].trim(),
            id: employeeMatch[2].trim()
          };
          employeeEntries = [];
          employeeCount++;
          console.log(`Found employee #${employeeCount}: ${currentEmployee.name} (ID: ${currentEmployee.id})`);
          continue;
        }
        
        // Parse time entries for current employee
        if (currentEmployee) {
          // Look for lines that contain time entry data
          // Must have a date (MM/DD/YYYY format) and hours
          const dateMatch = trimmedLine.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          
          if (dateMatch && !trimmedLine.includes('Employee Totals') && !trimmedLine.includes('Report Totals')) {
            const entry = this.parseTimeEntry(trimmedLine, dateMatch[1]);
            if (entry) {
              employeeEntries.push(entry);
            }
          }
        }
        
        // Check for Employee Totals (end of employee section)
        if (trimmedLine.includes('Employee Totals')) {
          // Extract total hours if present
          const totalMatch = trimmedLine.match(/Employee Totals\s+(\d+\.?\d*)/);
          if (totalMatch && currentEmployee) {
            console.log(`  Employee ${currentEmployee.name} total hours: ${totalMatch[1]}`);
          }
          
          // Save current employee's entries
          if (currentEmployee && employeeEntries.length > 0) {
            console.log(`  Saving ${employeeEntries.length} entries for ${currentEmployee.name}`);
            employeeEntries.forEach(entry => {
              allEntries.push({
                ...entry,
                employeeName: currentEmployee.name,
                employeeId: currentEmployee.id,
                payPeriodId: payPeriodId,
                reportDate: reportDate
              });
            });
            totalEntriesCount += employeeEntries.length;
          }
          
          // Reset for next employee
          currentEmployee = null;
          employeeEntries = [];
        }
        
        // Check for Report Totals (end of all employees)
        if (trimmedLine.includes('Report Totals')) {
          console.log('Reached Report Totals - end of employee data');
          break;
        }
      }
      
      // Don't forget the last employee if no Employee Totals line
      if (currentEmployee && employeeEntries.length > 0) {
        console.log(`  Saving ${employeeEntries.length} entries for ${currentEmployee.name} (last employee)`);
        employeeEntries.forEach(entry => {
          allEntries.push({
            ...entry,
            employeeName: currentEmployee.name,
            employeeId: currentEmployee.id,
            payPeriodId: payPeriodId,
            reportDate: reportDate
          });
        });
        totalEntriesCount += employeeEntries.length;
      }
      
      console.log(`\n=== PARSING SUMMARY ===`);
      console.log(`Total employees parsed: ${employeeCount}`);
      console.log(`Total time entries parsed: ${allEntries.length}`);
      console.log(`Average entries per employee: ${employeeCount > 0 ? (allEntries.length / employeeCount).toFixed(1) : 0}`);
      console.log(`======================\n`);
      
      if (allEntries.length === 0) {
        console.warn('WARNING: No entries were parsed from the PDF!');
        console.log('First 500 chars of text:', text.substring(0, 500));
      }
      
      return allEntries;
      
    } catch (error) {
      console.error('Error in parseEmployeeData:', error);
      throw new Error(`Failed to parse employee data: ${error.message}`);
    }
  }

  /**
   * Parse individual time entry line
   */
  parseTimeEntry(line, dateStr) {
    try {
      // Skip if no date provided
      if (!dateStr) return null;
      
      // Initialize default values
      let jobCode = '';
      let jobDescription = '';
      let hours = 0;
      let payType = 'Regular';
      let laborRate = 'Tech';
      let costCode = 'SERVICE';
      let costCategory = 'DirLab';
      let description = '';
      
      // Extract job code if present (usually in parentheses at start)
      const jobCodeMatch = line.match(/^\(([^)]+)\)/);
      if (jobCodeMatch) {
        jobCode = jobCodeMatch[1];
      }
      
      // Extract hours - look for decimal numbers
      // Hours usually appear after the date
      const afterDate = line.substring(line.indexOf(dateStr) + dateStr.length);
      const hoursMatch = afterDate.match(/^\s*(\d+\.?\d*)/);
      if (hoursMatch) {
        hours = parseFloat(hoursMatch[1]);
      } else {
        // Try to find hours anywhere in the line
        const anyHoursMatch = line.match(/\b(\d+\.\d{2})\b/);
        if (anyHoursMatch) {
          hours = parseFloat(anyHoursMatch[1]);
        }
      }
      
      // Extract pay type
      const payTypes = ['Regular', 'Overtime', 'Double Time', 'Call', 'Unapplied', 'OTClearing'];
      for (const type of payTypes) {
        if (line.includes(type)) {
          payType = type;
          break;
        }
      }
      
      // Extract labor rate
      const laborRates = [
        'TechOT', 'TechNB', 'Tech', 'PMTECH', 'MN PMTECH', 'MNTech', 
        'SCH_MNTECH', 'SCH_TECH', 'SCHTECHNB', 'SCH_PMTECH', 'SCH_MN PMTECH',
        'WN MN TECH', 'WN TECH', 'WN TECHNB', 'WN MN PM TECH', 'WN PM TECH',
        'PREM', 'SHOP', 'MN PMTECH', 'Sch MN PM Tech'
      ];
      
      // Sort by length descending to match longer rates first
      laborRates.sort((a, b) => b.length - a.length);
      
      for (const rate of laborRates) {
        if (line.includes(rate)) {
          laborRate = rate;
          break;
        }
      }
      
      // Extract cost code
      const costCodes = ['SERVICE', 'INSTALL', 'PM', 'PMF', 'FTPM', 'SHMTL', 'RETAIL'];
      for (const code of costCodes) {
        // Use word boundary to avoid partial matches
        const regex = new RegExp(`\\b${code}\\b`);
        if (regex.test(line)) {
          costCode = code;
          break;
        }
      }
      
      // Extract cost category
      const categories = ['DirLab', 'TechUnapplyd', 'TechUnapplied', 'Office', 'CLEARING'];
      for (const cat of categories) {
        if (line.includes(cat)) {
          costCategory = cat === 'TechUnapplied' ? 'TechUnapplyd' : cat;
          break;
        }
      }
      
      // Extract job description (text between job code and date)
      if (jobCodeMatch) {
        const afterJobCode = line.substring(jobCodeMatch[0].length);
        const beforeDate = afterJobCode.split(dateStr)[0];
        jobDescription = beforeDate.trim();
      }
      
      // Get description (usually last part after all the dashes)
      const parts = line.split(' - ');
      if (parts.length > 1) {
        description = parts[parts.length - 1].trim();
      }
      
      // Only return if we have valid hours
      if (hours > 0) {
        return {
          jobCode,
          jobDescription,
          date: dateStr,
          hours,
          payType,
          laborRate,
          costCode,
          costCategory,
          description,
          originalLine: line.trim()
        };
      }
      
      return null;
      
    } catch (error) {
      console.warn('Failed to parse time entry:', error.message);
      console.warn('Line was:', line);
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
      
      if (!entry.date || !entry.date.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
        errors.push(`Entry ${index}: Invalid date format`);
      }
      
      if (!entry.hours || isNaN(entry.hours) || entry.hours <= 0) {
        errors.push(`Entry ${index}: Invalid hours`);
      }
      
      if (!entry.payType) {
        errors.push(`Entry ${index}: Missing pay type`);
      }
      
      if (!entry.laborRate) {
        errors.push(`Entry ${index}: Missing labor rate`);
      }
    });
    
    if (errors.length > 0) {
      console.error('Validation errors found:', errors.length);
      console.error('First 5 errors:', errors.slice(0, 5));
      // Don't throw, just log - allow partial data through
    }
    
    return true;
  }
}

module.exports = new PDFParser();