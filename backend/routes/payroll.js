const express = require('express');
const multer = require('multer');
const pdfParser = require('../services/pdfParser');
const ruleEngine = require('../services/ruleEngine');
const pdfGenerator = require('../services/pdfGenerator');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Process payroll PDF
router.post('/process', upload.single('payrollPdf'), async (req, res) => {
  try {
    // Log request details
    console.log('Received upload request');
    console.log('File present:', !!req.file);
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        error: 'No PDF file uploaded',
        details: 'File field "payrollPdf" is required'
      });
    }

    console.log('Processing PDF:', req.file.originalname, 'Size:', req.file.size);

    // Step 1: Extract text from PDF
    let extractedText;
    try {
      extractedText = await pdfParser.extractText(req.file.buffer);
      console.log('Text extracted successfully, length:', extractedText.length);
    } catch (extractError) {
      console.error('PDF extraction failed:', extractError);
      return res.status(422).json({
        error: 'Failed to extract text from PDF',
        details: extractError.message
      });
    }

    // Step 2: Parse employee data from text
    let employeeData;
    try {
      employeeData = await pdfParser.parseEmployeeData(extractedText);
      console.log('Parsed employee entries:', employeeData.length);
    } catch (parseError) {
      console.error('Data parsing failed:', parseError);
      return res.status(422).json({
        error: 'Failed to parse payroll data',
        details: parseError.message
      });
    }

    // Step 3: Apply business rules and track changes
    let correctedData, changes;
    try {
      const result = await ruleEngine.applyRules(employeeData);
      correctedData = result.correctedData;
      changes = result.changes;
      console.log('Rules applied successfully, changes made:', changes.length);
    } catch (ruleError) {
      console.error('Rule application failed:', ruleError);
      return res.status(500).json({
        error: 'Failed to apply business rules',
        details: ruleError.message
      });
    }

    // Return processed data and changes for review
    res.json({
      success: true,
      originalCount: employeeData.length,
      correctedCount: correctedData.length,
      changesCount: changes.length,
      data: {
        original: employeeData,
        corrected: correctedData,
        changes: changes
      },
      metadata: {
        filename: req.file.originalname,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Unexpected error processing payroll PDF:', error);
    console.error('Stack trace:', error.stack);
    
    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'An error occurred while processing the PDF' 
      : error.message;
    
    res.status(500).json({
      error: 'Failed to process PDF',
      message: message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// Generate corrected PDF
router.post('/generate-pdf', async (req, res) => {
  try {
    const { correctedData, originalFilename } = req.body;

    if (!correctedData || !Array.isArray(correctedData)) {
      return res.status(400).json({
        error: 'Invalid corrected data provided'
      });
    }

    console.log('Generating PDF for', correctedData.length, 'entries');

    // Generate PDF with corrected data
    const pdfBuffer = await pdfGenerator.generateCorrectedReport(correctedData, originalFilename);

    // Set response headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="corrected_${originalFilename || 'payroll_report'}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error.message
    });
  }
});

// Test endpoint for rule validation
router.post('/test-rules', async (req, res) => {
  try {
    const { testData } = req.body;

    if (!testData || !Array.isArray(testData)) {
      return res.status(400).json({
        error: 'Invalid test data provided'
      });
    }

    const { correctedData, changes } = await ruleEngine.applyRules(testData);

    res.json({
      success: true,
      input: testData,
      output: correctedData,
      changes: changes
    });

  } catch (error) {
    console.error('Error testing rules:', error);
    res.status(500).json({
      error: 'Failed to test rules',
      message: error.message
    });
  }
});

module.exports = router;
