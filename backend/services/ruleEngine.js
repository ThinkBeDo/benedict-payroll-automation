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
   * Rule 5: ENHANCED - Call pay type with No Bill logic and branch-appropriate rates
   */
  applyRule5_CallWork