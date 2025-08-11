const { jsPDF } = require('jspdf');
const moment = require('moment');

class PDFGenerator {
  
  /**
   * Generate corrected payroll report PDF
   */
  async generateCorrectedReport(correctedData, originalFilename) {
    try {
      const doc = new jsPDF('p', 'pt', 'letter');
      
      // Set up fonts and styling
      doc.setFont('helvetica');
      
      // Generate report content
      this.addHeader(doc, originalFilename);
      this.addEmployeeData(doc, correctedData);
      this.addFooter(doc);
      
      // Return PDF buffer
      return Buffer.from(doc.output('arraybuffer'));
      
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Add header to PDF
   */
  addHeader(doc, originalFilename) {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Payroll Time-Entry Report (CORRECTED)', pageWidth / 2, 50, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Get current date and time
    const now = moment();
    const reportDate = now.format('ddd MMM DD, YYYY hh:mm:ss A');
    
    doc.text(`Generated: ${reportDate}`, pageWidth / 2, 70, { align: 'center' });
    
    if (originalFilename) {
      doc.text(`Source: ${originalFilename}`, pageWidth / 2, 85, { align: 'center' });
    }
    
    doc.text('BENEDICT REFRIGERATION SERVICE, INC.', pageWidth / 2, 100, { align: 'center' });
    
    // Add line separator
    doc.setLineWidth(1);
    doc.line(50, 110, pageWidth - 50, 110);
  }

  /**
   * Add employee data to PDF
   */
  addEmployeeData(doc, correctedData) {
    let yPosition = 130;
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 50;
    const lineHeight = 12;
    
    // Group data by employee
    const employeeGroups = this.groupByEmployee(correctedData);
    
    doc.setFontSize(10);
    
    Object.entries(employeeGroups).forEach(([employeeKey, entries]) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 50;
      }
      
      // Employee header
      doc.setFont('helvetica', 'bold');
      doc.text(employeeKey, margin, yPosition);
      yPosition += lineHeight + 5;
      
      // Employee entries
      doc.setFont('helvetica', 'normal');
      
      entries.forEach(entry => {
        // Check if we need a new page for this entry
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 50;
        }
        
        const entryText = this.formatEntryLine(entry);
        
        // Split long lines if necessary
        const splitText = doc.splitTextToSize(entryText, 500);
        
        splitText.forEach(line => {
          doc.text(line, margin + 20, yPosition);
          yPosition += lineHeight;
        });
        
        yPosition += 3; // Small gap between entries
      });
      
      // Employee totals
      const totals = this.calculateEmployeeTotals(entries);
      yPosition += 5;
      
      Object.entries(totals).forEach(([payType, hours]) => {
        if (hours > 0) {
          doc.text(`${hours.toFixed(2)} ${payType}`, margin + 20, yPosition);
          yPosition += lineHeight;
        }
      });
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Employee Totals ${totals.total.toFixed(2)}`, margin + 20, yPosition);
      yPosition += lineHeight + 15;
      
      doc.setFont('helvetica', 'normal');
    });
    
    // Report totals
    this.addReportTotals(doc, correctedData, yPosition);
  }

  /**
   * Format individual entry line
   */
  formatEntryLine(entry) {
    const parts = [
      entry.jobCode ? `(${entry.jobCode})` : '',
      entry.jobDescription || '',
      entry.date,
      entry.hours.toString(),
      entry.payType,
      entry.laborRate,
      entry.costCode,
      entry.costCategory,
      entry.description || ''
    ].filter(part => part !== '');
    
    return parts.join(' - ');
  }

  /**
   * Group entries by employee
   */
  groupByEmployee(data) {
    const grouped = {};
    
    data.forEach(entry => {
      const key = `${entry.employeeName} - ${entry.employeeId}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      
      grouped[key].push(entry);
    });
    
    return grouped;
  }

  /**
   * Calculate employee totals
   */
  calculateEmployeeTotals(entries) {
    const totals = {
      regular: 0,
      overtime: 0,
      call: 0,
      doubleTime: 0,
      unapplied: 0,
      total: 0
    };
    
    entries.forEach(entry => {
      const hours = parseFloat(entry.hours) || 0;
      totals.total += hours;
      
      switch (entry.payType?.toLowerCase()) {
        case 'regular':
          totals.regular += hours;
          break;
        case 'overtime':
          totals.overtime += hours;
          break;
        case 'call':
          totals.call += hours;
          break;
        case 'double time':
          totals.doubleTime += hours;
          break;
        case 'unapplied':
          totals.unapplied += hours;
          break;
      }
    });
    
    return totals;
  }

  /**
   * Add report totals
   */
  addReportTotals(doc, data, yPosition) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 50;
    
    // Check if we need a new page
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 50;
    }
    
    const reportTotals = this.calculateReportTotals(data);
    
    yPosition += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    
    Object.entries(reportTotals).forEach(([payType, hours]) => {
      if (hours > 0) {
        doc.text(`${hours.toFixed(2)} ${payType}`, margin, yPosition);
        yPosition += 15;
      }
    });
    
    doc.text(`Report Totals ${reportTotals.total.toFixed(2)}`, margin, yPosition);
  }

  /**
   * Calculate report totals
   */
  calculateReportTotals(data) {
    const totals = {
      regular: 0,
      overtime: 0,
      call: 0,
      'double time': 0,
      unapplied: 0,
      total: 0
    };
    
    data.forEach(entry => {
      const hours = parseFloat(entry.hours) || 0;
      totals.total += hours;
      
      const payType = entry.payType?.toLowerCase();
      if (totals.hasOwnProperty(payType)) {
        totals[payType] += hours;
      }
    });
    
    return totals;
  }

  /**
   * Add footer
   */
  addFooter(doc) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    
    const footerText = 'This report was automatically generated and corrected using Benedict Payroll Automation';
    doc.text(footerText, pageWidth / 2, pageHeight - 30, { align: 'center' });
    
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    doc.text(`Generated: ${timestamp}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
  }

  /**
   * Generate change summary PDF
   */
  async generateChangeSummary(changes, originalFilename) {
    try {
      const doc = new jsPDF('p', 'pt', 'letter');
      
      doc.setFont('helvetica');
      
      // Header
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Payroll Corrections Summary', pageWidth / 2, 50, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Source: ${originalFilename}`, pageWidth / 2, 70, { align: 'center' });
      doc.text(`Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, pageWidth / 2, 85, { align: 'center' });
      
      // Summary stats
      let yPosition = 120;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Changes Made: ${changes.length}`, 50, yPosition);
      
      yPosition += 30;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // List each change
      changes.forEach(change => {
        const changeText = `${change.employeeName} (${change.date}): ${change.field} changed from "${change.originalValue}" to "${change.correctedValue}" - ${change.rule}`;
        const splitText = doc.splitTextToSize(changeText, 500);
        
        splitText.forEach(line => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
          doc.text(line, 50, yPosition);
          yPosition += 12;
        });
        
        yPosition += 5;
      });
      
      return Buffer.from(doc.output('arraybuffer'));
      
    } catch (error) {
      throw new Error(`Failed to generate change summary: ${error.message}`);
    }
  }
}

module.exports = new PDFGenerator();
