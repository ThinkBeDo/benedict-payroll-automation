const fs = require('fs');
const pdfParser = require('./backend/services/pdfParser');

async function testPDFParser() {
  try {
    console.log('Reading PDF file...');
    const pdfBuffer = fs.readFileSync('/Users/tylerlafleur/Downloads/RPRTIME (1).pdf');
    
    console.log('Extracting text from PDF...');
    const text = await pdfParser.extractText(pdfBuffer);
    console.log(`Text extracted, length: ${text.length}`);
    
    // Show first 500 characters to verify extraction
    console.log('\nFirst 500 characters of extracted text:');
    console.log(text.substring(0, 500));
    console.log('...\n');
    
    console.log('Parsing employee data...');
    const employees = await pdfParser.parseEmployeeData(text);
    
    console.log('\n=== FINAL RESULTS ===');
    console.log(`Total employees parsed: ${new Set(employees.map(e => e.employeeName)).size}`);
    console.log(`Total time entries parsed: ${employees.length}`);
    
    // Show summary by employee
    const employeeSummary = {};
    employees.forEach(entry => {
      if (!employeeSummary[entry.employeeName]) {
        employeeSummary[entry.employeeName] = {
          id: entry.employeeId,
          count: 0,
          totalHours: 0
        };
      }
      employeeSummary[entry.employeeName].count++;
      employeeSummary[entry.employeeName].totalHours += entry.hours;
    });
    
    console.log('\nEmployee Summary:');
    Object.keys(employeeSummary).slice(0, 10).forEach(name => {
      const emp = employeeSummary[name];
      console.log(`  ${name} (ID: ${emp.id}): ${emp.count} entries, ${emp.totalHours.toFixed(2)} hours`);
    });
    
    if (Object.keys(employeeSummary).length > 10) {
      console.log(`  ... and ${Object.keys(employeeSummary).length - 10} more employees`);
    }
    
    // Show sample entries
    if (employees.length > 0) {
      console.log('\nSample parsed entries:');
      employees.slice(0, 3).forEach((entry, idx) => {
        console.log(`\nEntry ${idx + 1}:`);
        console.log(`  Employee: ${entry.employeeName} (ID: ${entry.employeeId})`);
        console.log(`  Date: ${entry.date}`);
        console.log(`  Hours: ${entry.hours}`);
        console.log(`  Job: ${entry.jobCode} - ${entry.jobDescription}`);
        console.log(`  Pay Type: ${entry.payType}`);
        console.log(`  Labor Rate: ${entry.laborRate}`);
        console.log(`  Cost Code: ${entry.costCode}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing PDF parser:', error);
  }
}

testPDFParser();