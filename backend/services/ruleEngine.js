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
