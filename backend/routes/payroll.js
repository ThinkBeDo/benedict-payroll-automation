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
    if (!req.file) {
      return res.status(400).json({
        error: 'No PDF file uploaded'
      });
    }

    console.log('Processing PDF:', req.file.originalname);

    // Step 1: Extract text from PDF
    const extractedText = await pdfParser.extractText(req.file.buffer);
    console.log('Text extracted, length:', extractedText.length);

    // Step 2: Parse employee data from text
    const employeeData = await pdfParser.parseEmployeeData(extractedText);
    console.log('Parsed employee entries:', employeeData.length);

    // Step 3: Apply business rules and track changes
    const { correctedData, changes } = await ruleEngine.applyRules(employeeData);
    console.log('Rules applied, changes made:', changes.length);

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
    console.error('Error processing payroll PDF:', error);
    res.status(500).json({
      error: 'Failed to process PDF',
      message: error.message
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
