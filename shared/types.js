/**
 * Shared type definitions and constants for Benedict Payroll Automation
 */

// Employee entry structure
const EmployeeEntry = {
  employeeName: 'string',
  employeeId: 'string',
  jobCode: 'string',
  jobDescription: 'string', 
  date: 'string', // MM/DD/YYYY format
  hours: 'number',
  payType: 'string', // Regular, Overtime, Double Time, Call, Unapplied
  laborRate: 'string',
  costCode: 'string',
  costCategory: 'string',
  description: 'string',
  payPeriodId: 'string',
  reportDate: 'string',
  originalLine: 'string'
};

// Change tracking structure
const PayrollChange = {
  employeeName: 'string',
  employeeId: 'string',
  date: 'string',
  field: 'string',
  originalValue: 'string',
  correctedValue: 'string',
  rule: 'string',
  description: 'string'
};

// API response structures
const ProcessResponse = {
  success: 'boolean',
  originalCount: 'number',
  correctedCount: 'number',
  changesCount: 'number',
  data: {
    original: 'EmployeeEntry[]',
    corrected: 'EmployeeEntry[]',
    changes: 'PayrollChange[]'
  },
  metadata: {
    filename: 'string',
    processedAt: 'string'
  }
};

// Business rule constants
const BUSINESS_RULES = {
  SERVICE_INSTALL_LABOR_RATES: [
    'Tech', 'TechNB', 'MNTech', 'SCH_MNTECH', 'SCH_TECH', 
    'SCHTECHNB', 'WN MN TECH', 'WN TECH', 'WN TECHNB'
  ],
  
  PM_LABOR_RATES: [
    'MN PMTECH', 'PMTECH', 'TechNB', 'Sch MN PM Tech', 
    'SCH_MN PMTECH', 'SCH_PMTECH', 'WN MN PM TECH', 'WN PM TECH'
  ],
  
  VALID_PAY_TYPES: [
    'Regular', 'Overtime', 'Double Time', 'Call', 'Unapplied'
  ],
  
  COST_CODES: {
    SERVICE_INSTALL: ['SERVICE', 'INSTALL'],
    PM_TYPES: ['PM', 'PMF', 'FTPM'],
    TECH_UNAPPLIED: 'TechUnapplyd'
  }
};

// Rule descriptions
const RULE_DESCRIPTIONS = {
  RULE_1: 'If Cost Category = TechUnapplied, Then Pay Type ID = Unapplied',
  RULE_2: 'If Cost Code = Service or Install, Then Labor Rate ID must be approved rate',
  RULE_3: 'If Cost Code = PM, PMF, or FTPM, Then Labor Rate ID must be approved PM rate', 
  RULE_4: 'If day of the week for the Date = Sunday, Then Paytype = Double Time and Labor Rate = PREM',
  RULE_5: 'If Paytype = Call, Then Labor Rate = TechOT'
};

// File validation constants
const FILE_VALIDATION = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['application/pdf'],
  ALLOWED_EXTENSIONS: ['.pdf']
};

// Date utilities
const DATE_FORMATS = {
  PAYROLL: 'MM/DD/YYYY',
  DISPLAY: 'MMM DD, YYYY',
  API: 'YYYY-MM-DD'
};

module.exports = {
  EmployeeEntry,
  PayrollChange,
  ProcessResponse,
  BUSINESS_RULES,
  RULE_DESCRIPTIONS,
  FILE_VALIDATION,
  DATE_FORMATS
};
