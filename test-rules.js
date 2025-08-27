const ruleEngine = require('./backend/services/ruleEngine');

// Test data to verify our rule fixes
const testData = [
  // Test Rule 2: SERVICE with overtime should now be valid
  {
    employeeName: 'Stephen Peters',
    employeeId: '45',
    date: '11/01/2024',
    payType: 'Call',
    laborRate: 'TechOT',
    costCode: 'SERVICE',
    costCategory: 'Tech',
    hours: 4,
    description: 'Emergency service call'
  },
  {
    employeeName: 'Aaron Engler',
    employeeId: '12',
    date: '11/01/2024',
    payType: 'Call',
    laborRate: 'WN TECHOT',
    costCode: 'SERVICE',
    costCategory: 'Tech',
    hours: 3,
    description: 'Service call WN branch'
  },
  {
    employeeName: 'Keith Oitzman',
    employeeId: '34',
    date: '11/01/2024',
    payType: 'Call',
    laborRate: 'SCH_TECHOT',
    costCode: 'SERVICE',
    costCategory: 'Tech',
    hours: 2.5,
    description: 'Service call SCH branch'
  },
  // Test Rule 4: Sunday work should preserve geographic prefix
  {
    employeeName: 'Test Worker',
    employeeId: '99',
    date: '11/03/2024', // Sunday
    payType: 'Regular',
    laborRate: 'WN TECH',
    costCode: 'SERVICE',
    costCategory: 'Tech',
    hours: 8,
    description: 'Sunday work'
  },
  // Test Rule 5: Call work should preserve geographic prefix
  {
    employeeName: 'Another Worker',
    employeeId: '100',
    date: '11/04/2024',
    payType: 'Call',
    laborRate: 'SCH_TECH',
    costCode: 'SERVICE',
    costCategory: 'Tech',
    hours: 4,
    description: 'Call work'
  }
];

async function testRules() {
  console.log('Testing Rule Engine with fixed business rules...\n');
  
  const result = await ruleEngine.applyRules(testData);
  
  console.log('=== RULE APPLICATION RESULTS ===\n');
  console.log(`Total changes made: ${result.changes.length}\n`);
  
  // Group changes by rule
  const changesByRule = {};
  result.changes.forEach(change => {
    if (!changesByRule[change.rule]) {
      changesByRule[change.rule] = [];
    }
    changesByRule[change.rule].push(change);
  });
  
  console.log('Changes by Rule:');
  Object.keys(changesByRule).forEach(rule => {
    console.log(`\n${rule}: ${changesByRule[rule].length} changes`);
    changesByRule[rule].forEach(change => {
      console.log(`  - ${change.employeeName}: ${change.field} changed from "${change.originalValue}" to "${change.correctedValue}"`);
    });
  });
  
  console.log('\n=== CRITICAL VALIDATIONS ===\n');
  
  // Check Stephen Peters case
  const stephenEntry = result.correctedData.find(e => e.employeeName === 'Stephen Peters');
  const stephenChanged = result.changes.some(c => 
    c.employeeName === 'Stephen Peters' && 
    c.field === 'laborRate' &&
    c.rule.includes('Rule 2')
  );
  console.log(`✓ Stephen Peters (Call + TechOT + SERVICE): ${stephenChanged ? '❌ INCORRECTLY FLAGGED' : '✅ VALID (no change)'}`);
  
  // Check Aaron Engler case
  const aaronEntry = result.correctedData.find(e => e.employeeName === 'Aaron Engler');
  const aaronChanged = result.changes.some(c => 
    c.employeeName === 'Aaron Engler' && 
    c.field === 'laborRate' &&
    c.rule.includes('Rule 2')
  );
  console.log(`✓ Aaron Engler (Call + WN TECHOT + SERVICE): ${aaronChanged ? '❌ INCORRECTLY FLAGGED' : '✅ VALID (no change)'}`);
  console.log(`  Final labor rate: ${aaronEntry.laborRate}`);
  
  // Check Keith Oitzman case
  const keithEntry = result.correctedData.find(e => e.employeeName === 'Keith Oitzman');
  const keithChanged = result.changes.some(c => 
    c.employeeName === 'Keith Oitzman' && 
    c.field === 'laborRate' &&
    c.rule.includes('Rule 2')
  );
  console.log(`✓ Keith Oitzman (Call + SCH_TECHOT + SERVICE): ${keithChanged ? '❌ INCORRECTLY FLAGGED' : '✅ VALID (no change)'}`);
  console.log(`  Final labor rate: ${keithEntry.laborRate}`);
  
  // Check Sunday geographic preservation
  const sundayWorker = result.correctedData.find(e => e.employeeName === 'Test Worker');
  console.log(`\n✓ Sunday Premium (WN TECH → ${sundayWorker.laborRate}): ${sundayWorker.laborRate === 'WN PREM' ? '✅ Geographic prefix preserved' : '❌ Prefix lost'}`);
  
  // Check Call work geographic preservation  
  const callWorker = result.correctedData.find(e => e.employeeName === 'Another Worker');
  console.log(`✓ Call Work (SCH_TECH → ${callWorker.laborRate}): ${callWorker.laborRate === 'SCH_TECHOT' ? '✅ Geographic prefix preserved' : '❌ Prefix lost'}`);
  
  console.log('\n=== TEST COMPLETE ===');
}

testRules().catch(console.error);