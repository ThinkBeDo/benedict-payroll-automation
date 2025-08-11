import React, { useState, useMemo } from 'react';

const ReviewChanges = ({ changes, onApprove, onReject }) => {
  const [sortField, setSortField] = useState('employeeName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRule, setFilterRule] = useState('all');

  // Get unique rules for filter dropdown
  const uniqueRules = useMemo(() => {
    const rules = [...new Set(changes.map(change => change.rule))];
    return rules.sort();
  }, [changes]);

  // Filter and sort changes
  const filteredAndSortedChanges = useMemo(() => {
    let filtered = changes;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(change => 
        change.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.originalValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.correctedValue.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply rule filter
    if (filterRule !== 'all') {
      filtered = filtered.filter(change => change.rule === filterRule);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [changes, searchTerm, filterRule, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return '↕️';
    }
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatFieldName = (field) => {
    const fieldNames = {
      payType: 'Pay Type',
      laborRate: 'Labor Rate',
      costCode: 'Cost Code',
      costCategory: 'Cost Category'
    };
    return fieldNames[field] || field;
  };

  return (
    <div className="review-changes-container">
      <div className="review-header">
        <h3>Review Proposed Changes</h3>
        <p>
          {changes.length === 0 
            ? 'No corrections needed - all entries follow the rules!'
            : `Found ${changes.length} correction${changes.length !== 1 ? 's' : ''} to apply:`
          }
        </p>
      </div>

      {changes.length > 0 && (
        <>
          <div className="review-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by employee, field, or value..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-box">
              <select
                value={filterRule}
                onChange={(e) => setFilterRule(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Rules</option>
                {uniqueRules.map(rule => (
                  <option key={rule} value={rule}>{rule}</option>
                ))}
              </select>
            </div>

            <div className="results-count">
              Showing {filteredAndSortedChanges.length} of {changes.length} changes
            </div>
          </div>

          <div className="changes-table-container">
            <table className="changes-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('employeeName')} className="sortable">
                    Employee {getSortIcon('employeeName')}
                  </th>
                  <th onClick={() => handleSort('date')} className="sortable">
                    Date {getSortIcon('date')}
                  </th>
                  <th onClick={() => handleSort('field')} className="sortable">
                    Field {getSortIcon('field')}
                  </th>
                  <th>Original Value</th>
                  <th>Corrected Value</th>
                  <th onClick={() => handleSort('rule')} className="sortable">
                    Rule Applied {getSortIcon('rule')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedChanges.map((change, index) => (
                  <tr key={index} className="change-row">
                    <td className="employee-cell">
                      <div className="employee-name">{change.employeeName}</div>
                      <div className="employee-id">ID: {change.employeeId}</div>
                    </td>
                    <td className="date-cell">{change.date}</td>
                    <td className="field-cell">{formatFieldName(change.field)}</td>
                    <td className="original-value">
                      <span className="value-badge original">{change.originalValue}</span>
                    </td>
                    <td className="corrected-value">
                      <span className="value-badge corrected">{change.correctedValue}</span>
                    </td>
                    <td className="rule-cell">
                      <div className="rule-name">{change.rule}</div>
                      <div className="rule-description">{change.description}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="review-actions">
        <button 
          onClick={onReject} 
          className="btn btn-secondary"
        >
          Cancel
        </button>
        
        <button 
          onClick={onApprove} 
          className="btn btn-primary"
        >
          {changes.length === 0 
            ? 'Continue to Download' 
            : `Apply ${changes.length} Correction${changes.length !== 1 ? 's' : ''}`
          }
        </button>
      </div>

      {changes.length > 0 && (
        <div className="review-notice">
          <p>
            <strong>Notice:</strong> Clicking "Apply Corrections" will generate a new payroll report 
            with the above changes applied. You can review the final report before downloading.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewChanges;
