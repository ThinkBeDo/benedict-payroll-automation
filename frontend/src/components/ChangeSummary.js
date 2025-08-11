import React, { useMemo } from 'react';

const ChangeSummary = ({ changes, originalData, fileName }) => {
  const summary = useMemo(() => {
    const stats = {
      totalChanges: changes.length,
      changesByRule: {},
      changesByEmployee: {},
      changesByField: {},
      totalEmployees: originalData ? originalData.length : 0,
      employeesAffected: [...new Set(changes.map(change => change.employeeName))].length
    };

    changes.forEach(change => {
      // Count by rule
      if (!stats.changesByRule[change.rule]) {
        stats.changesByRule[change.rule] = 0;
      }
      stats.changesByRule[change.rule]++;

      // Count by employee
      if (!stats.changesByEmployee[change.employeeName]) {
        stats.changesByEmployee[change.employeeName] = 0;
      }
      stats.changesByEmployee[change.employeeName]++;

      // Count by field
      if (!stats.changesByField[change.field]) {
        stats.changesByField[change.field] = 0;
      }
      stats.changesByField[change.field]++;
    });

    return stats;
  }, [changes, originalData]);

  const formatFieldName = (field) => {
    const fieldNames = {
      payType: 'Pay Type',
      laborRate: 'Labor Rate',
      costCode: 'Cost Code',
      costCategory: 'Cost Category'
    };
    return fieldNames[field] || field;
  };

  const getTopEmployees = () => {
    return Object.entries(summary.changesByEmployee)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  return (
    <div className="change-summary-container">
      <div className="summary-header">
        <h3>Processing Summary</h3>
        <div className="file-info">
          <span className="file-name">{fileName}</span>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-card primary">
          <div className="stat-number">{summary.totalChanges}</div>
          <div className="stat-label">
            Total Correction{summary.totalChanges !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{summary.employeesAffected}</div>
          <div className="stat-label">
            Employee{summary.employeesAffected !== 1 ? 's' : ''} Affected
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-number">{summary.totalEmployees}</div>
          <div className="stat-label">
            Total Employee{summary.totalEmployees !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-number">
            {summary.totalEmployees > 0 
              ? Math.round((summary.employeesAffected / summary.totalEmployees) * 100)
              : 0
            }%
          </div>
          <div className="stat-label">Employees Needing Corrections</div>
        </div>
      </div>

      {summary.totalChanges > 0 && (
        <div className="summary-details">
          <div className="detail-section">
            <h4>Changes by Rule</h4>
            <div className="rule-breakdown">
              {Object.entries(summary.changesByRule).map(([rule, count]) => (
                <div key={rule} className="rule-item">
                  <div className="rule-info">
                    <span className="rule-name">{rule}</span>
                    <span className="rule-count">{count} change{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="rule-bar">
                    <div 
                      className="rule-fill" 
                      style={{ width: `${(count / summary.totalChanges) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h4>Changes by Field</h4>
            <div className="field-breakdown">
              {Object.entries(summary.changesByField).map(([field, count]) => (
                <div key={field} className="field-item">
                  <span className="field-name">{formatFieldName(field)}</span>
                  <span className="field-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {summary.employeesAffected > 0 && (
            <div className="detail-section">
              <h4>Most Affected Employees</h4>
              <div className="employee-breakdown">
                {getTopEmployees().map(([employee, count]) => (
                  <div key={employee} className="employee-item">
                    <span className="employee-name">{employee}</span>
                    <span className="employee-count">{count} change{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {summary.totalChanges === 0 && (
        <div className="no-changes-message">
          <div className="success-icon">✅</div>
          <h4>Perfect Compliance!</h4>
          <p>All payroll entries are already following the business rules correctly. No corrections are needed.</p>
        </div>
      )}
    </div>
  );
};

export default ChangeSummary;
