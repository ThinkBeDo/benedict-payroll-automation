const moment = require('moment');

class RuleEngine {
  
  constructor() {
    // Define allowed labor rates for different cost codes
    this.SERVICE_INSTALL_LABOR_RATES = [
      'Tech', 'TechNB', 'MNTech', 'SCH_MNTECH', 'SCH_TECH', 
      'SCHTECHNB', 'WN MN TECH', 'WN TECH', 'WN TECHNB'
    ];
    
    this.PM_LABOR_RATES = [
      'MN PMTECH', 'PMTECH', 'TechNB', 'Sch MN PM Tech', 
      'SCH_MN PMTECH', 'SCH_PMTECH', 'WN MN PM TECH', 'WN PM TECH'
    ];

    // NEW: Office cost codes for Rule 7
    this.OFFICE_COST_CODES = ['1COAD', '1SCHOF', '1WNOF'];

    // NEW: Call work labor rates for enhanced Rule 5
    this.CALL_LABOR_RATES = {
      // Overtime variants
      OT: ['TechOT', 'SCH_MNTECHOT', 'WN MN TECHOT'],
      // No Bill variants  
      NB: ['TECHNB', 'SCH_TECHNB', 'WN TECHNB']
    };
  }

  /**
   * Apply all business rules to employee data
   */
  async applyRules(employeeData) {
    try {
      const correctedData = [];
      const changes = [];
      
      for (const entry of employeeData) {
        const correctedEntry = { ...entry };
        const entryChanges = [];
        
        // Apply each rule and track changes
        this.applyRule1_TechUnapplied(correctedEntry, entryChanges);
        this.applyRule2_ServiceInstallRates(correctedEntry, entryChanges);
        this.applyRule3_PMRates(correctedEntry, entryChanges);
        this.applyRule4_SundayPremium(correctedEntry, entryChanges);
        this.applyRule5_CallWork(correctedEntry, entryChanges);
        this.applyRule6_NoBillDetection(correctedEntry, entryChanges);  // NEW
        this.applyRule7_OfficeOverride(correctedEntry, entryChanges);   // NEW
        
        correctedData.push(correctedEntry);
        changes.push(...entryChanges);
      }
      
      return {
        correctedData,
        changes
      };
      
    } catch (error) {
      throw new Error(`Failed to apply rules: ${error.message}`);
    }
  }

  /**
   * Rule 1: If Cost Category = TechUnapplied, Then Pay Type ID = Unapplied
   */
  applyRule1_TechUnapplied(entry, changes) {
    if (entry.costCategory === 'TechUnapplyd' && entry.payType !== 'Unapplied') {
      changes.push({
        employeeName: entry.employeeName,
        employeeId: entry.employeeId,
        date: entry.date,
        field: 'payType',
        originalValue: entry.payType,
        correctedValue: 'Unapplied',
        rule: 'Rule 1: TechUnapplied → Unapplied Pay Type',
        description: 'Cost Category is TechUnapplyd, so Pay Type must be Unapplied'
      });
      
      entry.payType = 'Unapplied';
    }
  }

  /**
   * Rule 2: Service/Install cost codes require specific labor rates
   */
  applyRule2_ServiceInstallRates(entry, changes) {
    const costCode = entry.costCode?.toUpperCase();
    
    if ((costCode === 'SERVICE' || costCode === 'INSTALL') && 
        !this.SERVICE_INSTALL_LABOR_RATES.includes(entry.laborRate)) {
      
      // Default to 'Tech' if not in allowed list
      const correctedRate = 'Tech';
      
      changes.push({
        employeeName: entry.employeeName,
        employeeId: entry.employeeId,
        date: entry.date,
        field: 'laborRate',
        originalValue: entry.laborRate,
        correctedValue: correctedRate,
        rule: 'Rule 2: Service/Install Labor Rate Validation',
        description: `Cost Code is ${costCode}, Labor Rate must be one of: ${this.SERVICE_INSTALL_LABOR_RATES.join(', ')}`
      });
      
      entry.laborRate = correctedRate;
    }
  }

  /**
   * Rule 3: PM/PMF/FTPM cost codes require specific labor rates
   */
  applyRule3_PMRates(entry, changes) {
    const costCode = entry.costCode?.toUpperCase();
    
    if (['PM', 'PMF', 'FTPM'].includes(costCode) && 
        !this.PM_LABOR_RATES.includes(entry.laborRate)) {
      
      // Default to 'PMTECH' if not in allowed list
      const correctedRate = 'PMTECH';
      
      changes.push({
        employeeName: entry.employeeName,
        employeeId: entry.employeeId,
        date: entry.date,
        field: 'laborRate',
        originalValue: entry.laborRate,
        correctedValue: correctedRate,
        rule: 'Rule 3: PM Labor Rate Validation',
        description: `Cost Code is ${costCode}, Labor Rate must be one of: ${this.PM_LABOR_RATES.join(', ')}`
      });
      
      entry.laborRate = correctedRate;
    }
  }

  /**
   * Rule 4: Sunday work gets Double Time pay and PREM labor rate
   */
  applyRule4_SundayPremium(entry, changes) {
    try {
      const date = moment(entry.date, 'MM/DD/YYYY');
      
      if (date.isValid() && date.day() === 0) { // Sunday = 0
        
        // Change pay type to Double Time
        if (entry.payType !== 'Double Time') {
          changes.push({
            employeeName: entry.employeeName,
            employeeId: entry.employeeId,
            date: entry.date,
            field: 'payType',
            originalValue: entry.payType,
            correctedValue: 'Double Time',
            rule: 'Rule 4: Sunday Premium Pay',
            description: 'Work on Sunday requires Double Time pay type'
          });
          
          entry.payType = 'Double Time';
        }
        
        // Change labor rate to PREM
        if (entry.laborRate !== 'PREM') {
          changes.push({
            employeeName: entry.employeeName,
            employeeId: entry.employeeId,
            date: entry.date,
            field: 'laborRate',
            originalValue: entry.laborRate,
            correctedValue: 'PREM',
            rule: 'Rule 4: Sunday Premium Rate',
            description: 'Work on Sunday requires PREM labor rate'
          });
          
          entry.laborRate = 'PREM';
        }
      }
      
    } catch (error) {
      console.warn('Failed to parse date for Sunday rule:', entry.date, error.message);
    }
  }

  /**
   * Rule 5: Call pay type requires TechOT labor rate
   */
  applyRule5_CallWork(entry, changes) {
    if (entry.payType === 'Call' && entry.laborRate !== 'TechOT') {
      changes.push({
        employeeName: entry.employeeName,
        employeeId: entry.employeeId,
        date: entry.date,
        field: 'laborRate',
        originalValue: entry.laborRate,
        correctedValue: 'TechOT',
        rule: 'Rule 5: Call Work Labor Rate',
        description: 'Call pay type requires TechOT labor rate'
      });
      
      entry.laborRate = 'TechOT';
    }
  }

  /**
   * Rule 6: NEW - No Bill Detection
   * Scan description field for "No Bill" text and add NB suffix while preserving branch prefixes
   * Examples: WN TECH → WN TECHNB, SCH_TECH → SCHTECHNB, Tech → TechNB
   */
  applyRule6_NoBillDetection(entry, changes) {
    // Check if description contains "No Bill" (case insensitive)
    if (entry.description && entry.description.toLowerCase().includes('no bill')) {
      const currentRate = entry.laborRate;
      let correctedRate = currentRate;
      
      // Skip if already has NB suffix
      if (!currentRate || currentRate.toUpperCase().endsWith('NB')) {
        return;
      }
      
      // Handle branch-specific rates
      if (currentRate.toUpperCase().startsWith('WN ')) {
        // WN TECH → WN TECHNB, WN MN TECH → WN MN TECHNB
        if (currentRate.toUpperCase() === 'WN TECH') {
          correctedRate = 'WN TECHNB';
        } else if (currentRate.toUpperCase() === 'WN MN TECH') {
          correctedRate = 'WN MN TECHNB';
        } else if (currentRate.toUpperCase() === 'WN PM TECH') {
          correctedRate = 'WN PM TECHNB';
        }
      } else if (currentRate.toUpperCase().startsWith('SCH')) {
        // SCH_TECH → SCHTECHNB, SCH_MNTECH → SCH_MNTECHNB
        if (currentRate.toUpperCase() === 'SCH_TECH') {
          correctedRate = 'SCHTECHNB';
        } else if (currentRate.toUpperCase() === 'SCH_MNTECH') {
          correctedRate = 'SCH_MNTECHNB';
        } else if (currentRate.toUpperCase() === 'SCH_PMTECH') {
          correctedRate = 'SCH_PMTECHNB';
        }
      } else if (currentRate.toUpperCase() === 'TECH') {
        // Tech → TechNB
        correctedRate = 'TechNB';
      } else if (currentRate.toUpperCase() === 'MNTECH') {
        // MNTech → MNTechNB
        correctedRate = 'MNTechNB';
      } else if (currentRate.toUpperCase() === 'PMTECH') {
        // PMTECH → PMTECHNB
        correctedRate = 'PMTECHNB';
      } else if (currentRate.toUpperCase() === 'MN PMTECH') {
        // MN PMTECH → MN PMTECHNB
        correctedRate = 'MN PMTECHNB';
      }
      
      // Apply change if rate was modified
      if (correctedRate !== currentRate) {
        changes.push({
          employeeName: entry.employeeName,
          employeeId: entry.employeeId,
          date: entry.date,
          field: 'laborRate',
          originalValue: currentRate,
          correctedValue: correctedRate,
          rule: 'Rule 6: No Bill Detection',
          description: 'Description contains "No Bill" - adding NB suffix to labor rate'
        });
        
        entry.laborRate = correctedRate;
      }
    }
  }

  /**
   * Rule 7: NEW - Office Override
   * Office cost codes (1COAD, 1SCHOF, 1WNOF) always get "Regular" pay type
   */
  applyRule7_OfficeOverride(entry, changes) {
    const costCode = entry.costCode?.toUpperCase();
    
    // Check if cost code is an office code
    if (this.OFFICE_COST_CODES.includes(costCode) && entry.payType !== 'Regular') {
      changes.push({
        employeeName: entry.employeeName,
        employeeId: entry.employeeId,
        date: entry.date,
        field: 'payType',
        originalValue: entry.payType,
        correctedValue: 'Regular',
        rule: 'Rule 7: Office Override',
        description: `Office cost code ${costCode} requires Regular pay type`
      });
      
      entry.payType = 'Regular';
    }
  }

  /**
   * Validate a single entry against all rules
   */
  validateEntry(entry) {
    const issues = [];
    
    // Rule 1 validation
    if (entry.costCategory === 'TechUnapplyd' && entry.payType !== 'Unapplied') {
      issues.push('Cost Category is TechUnapplyd but Pay Type is not Unapplied');
    }
    
    // Rule 2 validation
    const costCode = entry.costCode?.toUpperCase();
    if ((costCode === 'SERVICE' || costCode === 'INSTALL') && 
        !this.SERVICE_INSTALL_LABOR_RATES.includes(entry.laborRate)) {
      issues.push(`Service/Install work requires approved labor rate, got: ${entry.laborRate}`);
    }
    
    // Rule 3 validation
    if (['PM', 'PMF', 'FTPM'].includes(costCode) && 
        !this.PM_LABOR_RATES.includes(entry.laborRate)) {
      issues.push(`PM work requires approved labor rate, got: ${entry.laborRate}`);
    }
    
    // Rule 4 validation
    try {
      const date = moment(entry.date, 'MM/DD/YYYY');
      if (date.isValid() && date.day() === 0) {
        if (entry.payType !== 'Double Time') {
          issues.push('Sunday work requires Double Time pay type');
        }
        if (entry.laborRate !== 'PREM') {
          issues.push('Sunday work requires PREM labor rate');
        }
      }
    } catch (error) {
      issues.push(`Invalid date format: ${entry.date}`);
    }
    
    // Rule 5 validation
    if (entry.payType === 'Call' && entry.laborRate !== 'TechOT') {
      issues.push('Call work requires TechOT labor rate');
    }
    
    // Rule 6 validation - NEW
    if (entry.description && entry.description.toLowerCase().includes('no bill')) {
      const currentRate = entry.laborRate;
      if (currentRate && !currentRate.toUpperCase().endsWith('NB')) {
        issues.push('Description contains "No Bill" but labor rate lacks NB suffix');
      }
    }
    
    // Rule 7 validation - NEW
    if (this.OFFICE_COST_CODES.includes(costCode) && entry.payType !== 'Regular') {
      issues.push(`Office cost code ${costCode} requires Regular pay type`);
    }
    
    return issues;
  }

  /**
   * Get summary statistics for rules applied
   */
  getSummary(changes) {
    const summary = {
      totalChanges: changes.length,
      changesByRule: {},
      changesByEmployee: {},
      changesByField: {}
    };
    
    changes.forEach(change => {
      // Count by rule
      if (!summary.changesByRule[change.rule]) {
        summary.changesByRule[change.rule] = 0;
      }
      summary.changesByRule[change.rule]++;
      
      // Count by employee
      if (!summary.changesByEmployee[change.employeeName]) {
        summary.changesByEmployee[change.employeeName] = 0;
      }
      summary.changesByEmployee[change.employeeName]++;
      
      // Count by field
      if (!summary.changesByField[change.field]) {
        summary.changesByField[change.field] = 0;
      }
      summary.changesByField[change.field]++;
    });
    
    return summary;
  }
}

module.exports = new RuleEngine();