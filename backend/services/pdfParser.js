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
        
        // Debug logging for analyzing format
        if (i < 50 && trimmedLine.length > 0) {
          console.log(`Line ${i}: [${trimmedLine.substring(0, 100)}]`);
        }
        
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
        // Updated to handle spacing and any trailing text after ID
        const employeeMatch = trimmedLine.match(/^([A-Za-z',.\s-]+?)\s+-\s+(\d+)/);
        if (employeeMatch && !trimmedLine.includes('Date') && !trimmedLine.includes('Hours')) {
          console.log(`DEBUG: Matched employee line: "${trimmedLine}"`);
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
        // Handle multi-line format where job code, date, hours, and details are on separate lines
        if (currentEmployee) {
          // Check if this line starts with a job code (parentheses format)
          const jobCodeMatch = trimmedLine.match(/^\(([A-Z][^)]*)\)(.*)$/) || trimmedLine.match(/^([A-Z]+)\)(.*)$/);
          
          if (jobCodeMatch) {
            // This is the start of a time entry
            // Next lines should be: date, hours, details
            const jobCode = jobCodeMatch[1];
            const jobDescription = (jobCodeMatch[2] || '').trim();
            
            // Look ahead for date, hours, and details
            if (i + 3 < lines.length) {
              const nextLine1 = lines[i + 1].trim(); // Should be date
              const nextLine2 = lines[i + 2].trim(); // Should be hours
              const nextLine3 = lines[i + 3].trim(); // Should be details with dashes
              
              const dateMatch = nextLine1.match(/^(\d{1,2}\/\d{1,2}\/\d{4})$/);
              const hoursMatch = nextLine2.match(/^(\d+(?:\.\d+)?)\s*$/);
              
              if (dateMatch && hoursMatch && nextLine3.includes(' - ')) {
                const date = dateMatch[1];
                const hours = parseFloat(hoursMatch[1]);
                
                // Parse the dash-separated fields
                const dashParts = nextLine3.split(' - ').map(p => p.trim());
                const payType = dashParts[0] || 'Regular';
                const laborRate = dashParts[1] || 'Tech';
                const costCode = dashParts[2] || 'SERVICE';
                const costCategory = dashParts[3] || 'DirLab';
                const description = dashParts[4] || '';
                
                const entry = {
                  jobCode,
                  jobDescription,
                  date,
                  hours,
                  payType,
                  laborRate,
                  costCode,
                  costCategory,
                  description,
                  originalLine: `${trimmedLine} ${nextLine1} ${nextLine2} ${nextLine3}`
                };
                
                employeeEntries.push(entry);
                console.log(`  Added entry for ${currentEmployee.name}: ${date} - ${hours} hours`);
                
                // Skip the lines we just processed
                i += 3;
                
                // Sometimes there's a "Source" and "Labor" line after, skip those too
                if (i + 1 < lines.length && (lines[i + 1].trim() === 'Source' || lines[i + 1].trim().startsWith('Labor'))) {
                  i++;
                }
                if (i + 1 < lines.length && lines[i + 1].trim().match(/^\d+$/)) {
                  i++; // Skip numeric line
                }
              }
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
      console.log(`    parseTimeEntry input: "${line}"`);
      
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
        console.log(`      Found job code: ${jobCode}`);
      }
      
      // Extract hours - look for decimal numbers after the date
      // Format: (JOBCODE)DESCRIPTION DATE HOURS - PayType - LaborRate - CostCode - CostCategory - Description
      const dateIndex = line.indexOf(dateStr);
      if (dateIndex !== -1) {
        const afterDate = line.substring(dateIndex + dateStr.length);
        // Match hours which can be like "1.25" or "10.00" or "1.00"
        const hoursMatch = afterDate.match(/^\s+(\d+(?:\.\d+)?)\s/);
        if (hoursMatch) {
          hours = parseFloat(hoursMatch[1]);
          console.log(`      Found hours: ${hours}`);
        }
      }
      
      // Parse the dash-separated fields after the hours
      // Format: HOURS - PayType - LaborRate - CostCode - CostCategory - Description
      const dashParts = line.split(' - ');
      console.log(`      Dash parts count: ${dashParts.length}`);
      
      if (dashParts.length >= 2) {
        // Find which part contains the hours to know where we are in the format
        let startIndex = -1;
        for (let i = 0; i < dashParts.length; i++) {
          if (dashParts[i].includes(dateStr) && i < dashParts.length - 1) {
            // The part after the one with date should have paytype
            startIndex = i + 1;
            break;
          }
        }
        
        if (startIndex > 0 && startIndex < dashParts.length) {
          // PayType is usually the first field after hours
          const payTypeStr = dashParts[startIndex].trim();
          const payTypes = ['Regular', 'Overtime', 'Double Time', 'Call', 'Unapplied', 'OTClearing'];
          for (const type of payTypes) {
            if (payTypeStr.includes(type)) {
              payType = type;
              console.log(`      Found payType: ${payType}`);
              break;
            }
          }
          
          // Labor Rate is next
          if (startIndex + 1 < dashParts.length) {
            laborRate = dashParts[startIndex + 1].trim();
            console.log(`      Found laborRate: ${laborRate}`);
          }
          
          // Cost Code is next
          if (startIndex + 2 < dashParts.length) {
            costCode = dashParts[startIndex + 2].trim();
            console.log(`      Found costCode: ${costCode}`);
          }
          
          // Cost Category is next
          if (startIndex + 3 < dashParts.length) {
            costCategory = dashParts[startIndex + 3].trim();
            console.log(`      Found costCategory: ${costCategory}`);
          }
          
          // Description is last
          if (startIndex + 4 < dashParts.length) {
            description = dashParts[startIndex + 4].trim();
            console.log(`      Found description: ${description}`);
          }
        }
      }
      
      // Extract job description (text between job code and date)
      if (jobCodeMatch) {
        const afterJobCode = line.substring(jobCodeMatch[0].length);
        const beforeDate = afterJobCode.split(dateStr)[0];
        jobDescription = beforeDate.trim();
        console.log(`      Found job description: ${jobDescription}`);
      }
      
      // Only return if we have valid hours
      if (hours > 0) {
        const result = {
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
        console.log(`      PARSED ENTRY:`, JSON.stringify(result, null, 2));
        return result;
      }
      
      console.log(`      No hours found, returning null`);
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