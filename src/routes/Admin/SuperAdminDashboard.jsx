import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import './SuperAdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const SuperAdminDashboard = ({ tab = 'overview' }) => {
  const { user, accessToken } = useAuth();
  const token = accessToken || sessionStorage.getItem('hrms_access_token');
  const [stats, setStats] = useState(null);
  const [trials, setTrials] = useState([]);
  const [highRiskTrials, setHighRiskTrials] = useState([]);
  const [duplicateIps, setDuplicateIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Map tab prop to internal tab names
  const tabMapping = {
    'overview': 'overview',
    'companies': 'companies',
    'trials': 'overview',
    'devices': 'devices',
    'fraud': 'highrisk',
    'maintenance': 'maintenance',
    'highrisk': 'highrisk',
    'duplicates': 'duplicates'
  };
  const [activeTab, setActiveTab] = useState(tabMapping[tab] || 'overview');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Company Management State
  const [companies, setCompanies] = useState([]);
  const [deletedCompanies, setDeletedCompanies] = useState([]);
  const [companyStats, setCompanyStats] = useState(null);
  const [companyView, setCompanyView] = useState('active'); // 'active' or 'recyclebin'
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDataCounts, setCompanyDataCounts] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [confirmText, setConfirmText] = useState('');

  // Fetch helper
  const fetchApi = useCallback(async (endpoint, options = {}) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [token]);

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statsData, trialsData, highRiskData, duplicateData] = await Promise.all([
          fetchApi('/api/admin/dashboard/stats'),
          fetchApi('/api/admin/trials'),
          fetchApi('/api/admin/trials/high-risk?minScore=50'),
          fetchApi('/api/admin/trials/duplicate-ips'),
        ]);
        setStats(statsData);
        setTrials(trialsData);
        setHighRiskTrials(highRiskData);
        setDuplicateIps(duplicateData);
        setError(null);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
        setError('Failed to load dashboard data. Make sure you have SUPER_ADMIN access.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchApi]);

  // Load company management data
  const loadCompanyData = useCallback(async () => {
    try {
      const [activeCompanies, recycledCompanies, statsData] = await Promise.all([
        fetchApi('/api/admin/companies'),
        fetchApi('/api/admin/companies/recycle-bin'),
        fetchApi('/api/admin/companies/stats'),
      ]);
      setCompanies(activeCompanies);
      setDeletedCompanies(recycledCompanies);
      setCompanyStats(statsData);
    } catch (err) {
      console.error('Failed to load company data:', err);
    }
  }, [fetchApi]);

  useEffect(() => {
    if (activeTab === 'companies') {
      loadCompanyData();
    }
  }, [activeTab, loadCompanyData]);

  // Filter trials
  const filteredTrials = statusFilter 
    ? trials.filter(t => t.trialStatus === statusFilter)
    : trials;

  // Trial Actions
  const suspendTrial = async (tenantId) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;
    
    setActionLoading(tenantId);
    try {
      await fetchApi(`/api/admin/trials/${tenantId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason, suspendedBy: user?.email || 'Admin' }),
      });
      const trialsData = await fetchApi('/api/admin/trials');
      setTrials(trialsData);
    } catch (err) {
      alert('Failed to suspend: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const reactivateTrial = async (tenantId) => {
    if (!confirm('Reactivate this trial?')) return;
    
    setActionLoading(tenantId);
    try {
      await fetchApi(`/api/admin/trials/${tenantId}/reactivate?reactivatedBy=${user?.email || 'Admin'}`, {
        method: 'POST',
      });
      const trialsData = await fetchApi('/api/admin/trials');
      setTrials(trialsData);
    } catch (err) {
      alert('Failed to reactivate: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const extendTrial = async (tenantId) => {
    const days = prompt('Enter number of days to extend:', '7');
    if (!days || isNaN(days)) return;
    
    setActionLoading(tenantId);
    try {
      await fetchApi(`/api/admin/trials/${tenantId}/extend?days=${days}&extendedBy=${user?.email || 'Admin'}`, {
        method: 'POST',
      });
      const trialsData = await fetchApi('/api/admin/trials');
      setTrials(trialsData);
    } catch (err) {
      alert('Failed to extend: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteTrial = async (tenantId) => {
    if (!confirm(`Delete registration for ${tenantId}? This cannot be undone!`)) return;
    
    setActionLoading(tenantId);
    try {
      await fetchApi(`/api/admin/trials/${tenantId}`, { method: 'DELETE' });
      const trialsData = await fetchApi('/api/admin/trials');
      setTrials(trialsData);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Company Management Actions
  const openSoftDeleteModal = async (company) => {
    // Prevent deleting system tenant
    if (company.id === 'SASA001') {
      alert('⚠️ Cannot delete the system tenant (SASA001).\n\nThis is the default tenant used for Super Admin access and system operations.');
      return;
    }
    
    setSelectedCompany(company);
    setDeleteReason('');
    setShowDeleteModal(true);
    
    // Load data counts for this company
    try {
      const counts = await fetchApi(`/api/admin/companies/${company.id}/data-counts`);
      setCompanyDataCounts(counts);
    } catch (err) {
      console.error('Failed to load data counts:', err);
      setCompanyDataCounts(null);
    }
  };

  const softDeleteCompany = async () => {
    if (!deleteReason.trim()) {
      alert('Please provide a reason for deletion.');
      return;
    }

    setActionLoading(selectedCompany.id);
    try {
      await fetchApi(`/api/admin/companies/${selectedCompany.id}/soft-delete`, {
        method: 'POST',
        body: JSON.stringify({ reason: deleteReason, deletedBy: user?.email || 'Admin' }),
      });
      setShowDeleteModal(false);
      await loadCompanyData();
      alert(`Company "${selectedCompany.name}" has been moved to recycle bin.`);
    } catch (err) {
      alert('Failed to delete company: ' + err.message);
    } finally {
      setActionLoading(null);
      setSelectedCompany(null);
      setDeleteReason('');
    }
  };

  const restoreCompany = async (company) => {
    if (!confirm(`Restore "${company.name}" from recycle bin?`)) return;

    setActionLoading(company.id);
    try {
      await fetchApi(`/api/admin/companies/${company.id}/restore`, {
        method: 'POST',
      });
      await loadCompanyData();
      alert(`Company "${company.name}" has been restored successfully!`);
    } catch (err) {
      alert('Failed to restore company: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openPermanentDeleteModal = async (company) => {
    setSelectedCompany(company);
    setConfirmText('');
    setShowPermanentDeleteModal(true);
    
    // Load data counts
    try {
      const counts = await fetchApi(`/api/admin/companies/${company.id}/data-counts`);
      setCompanyDataCounts(counts);
    } catch (err) {
      setCompanyDataCounts(null);
    }
  };

  const permanentDeleteCompany = async () => {
    if (confirmText !== selectedCompany.id) {
      alert(`Please type "${selectedCompany.id}" to confirm permanent deletion.`);
      return;
    }

    setActionLoading(selectedCompany.id);
    try {
      const result = await fetchApi(`/api/admin/companies/${selectedCompany.id}/permanent`, {
        method: 'DELETE',
      });
      setShowPermanentDeleteModal(false);
      await loadCompanyData();
      alert(`Company "${result.companyName}" and ${result.totalRecordsDeleted} records have been permanently deleted.`);
    } catch (err) {
      alert('Failed to permanently delete: ' + err.message);
    } finally {
      setActionLoading(null);
      setSelectedCompany(null);
      setConfirmText('');
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <h2>⚠️ Access Denied</h2>
        <p>{error}</p>
        <p style={{marginTop: '1rem', fontSize: '0.9rem', color: '#888'}}>
          You need to be logged in as <strong>SUPER_ADMIN</strong> to access this page.
          <br /><br />
          Try logging in with: <code>superadmin@hrms.in</code> or <code>superadmin@chandrahr.in</code> / <code>SuperAdmin@123</code>
        </p>
      </div>
    );
  }

  return (
    <div className="super-admin-dashboard">
      <header className="admin-header">
        <h1>🛡️ Super Admin Dashboard</h1>
        <p>Monitor trials, registrations, company management & fraud detection</p>
      </header>

      {/* Stats Overview */}
      <section className="stats-grid">
        <div className="stat-card primary">
          <span className="stat-icon">📊</span>
          <div className="stat-content">
            <h3>{stats?.totalRegistrations || 0}</h3>
            <p>Total Registrations</p>
          </div>
        </div>
        <div className="stat-card success">
          <span className="stat-icon">✅</span>
          <div className="stat-content">
            <h3>{stats?.activeTrials || 0}</h3>
            <p>Active Trials</p>
          </div>
        </div>
        <div className="stat-card warning">
          <span className="stat-icon">⏳</span>
          <div className="stat-content">
            <h3>{stats?.pendingActivation || 0}</h3>
            <p>Pending Activation</p>
          </div>
        </div>
        <div className="stat-card info">
          <span className="stat-icon">💰</span>
          <div className="stat-content">
            <h3>{stats?.convertedTrials || 0}</h3>
            <p>Converted (Paid)</p>
          </div>
        </div>
        <div className="stat-card danger">
          <span className="stat-icon">⚠️</span>
          <div className="stat-content">
            <h3>{stats?.highRiskRegistrations || 0}</h3>
            <p>High Risk</p>
          </div>
        </div>
        <div className="stat-card dark">
          <span className="stat-icon">🚫</span>
          <div className="stat-content">
            <h3>{stats?.suspendedAccounts || 0}</h3>
            <p>Suspended</p>
          </div>
        </div>
      </section>

      {/* Quick Stats Row */}
      <section className="quick-stats">
        <div className="quick-stat">
          <span>Today:</span> {stats?.registrationsToday || 0} new
        </div>
        <div className="quick-stat">
          <span>Last 7 days:</span> {stats?.registrationsLast7Days || 0}
        </div>
        <div className="quick-stat">
          <span>Expiring Soon:</span> {stats?.trialsExpiringSoon || 0}
        </div>
        <div className="quick-stat">
          <span>Conversion Rate:</span> {stats?.conversionRate || 0}%
        </div>
        <div className="quick-stat">
          <span>Avg Fraud Score:</span> {stats?.averageFraudScore || 0}
        </div>
      </section>

      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}>
          📋 All Trials
        </button>
        <button 
          className={activeTab === 'companies' ? 'active' : ''} 
          onClick={() => setActiveTab('companies')}>
          🏢 Company Management
        </button>
        <button 
          className={activeTab === 'highrisk' ? 'active' : ''} 
          onClick={() => setActiveTab('highrisk')}>
          ⚠️ High Risk ({highRiskTrials.length})
        </button>
        <button 
          className={activeTab === 'duplicates' ? 'active' : ''} 
          onClick={() => setActiveTab('duplicates')}>
          🔄 Duplicate IPs ({duplicateIps.length})
        </button>
      </div>

      {/* Tab Content */}
      <section className="admin-content">
        {activeTab === 'overview' && (
          <>
            <div className="filter-bar">
              <label>Filter by Status:</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRED">Expired</option>
                <option value="CONVERTED">Converted</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <div className="trials-table-container">
              <table className="trials-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Admin Email</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Trial Period</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrials.map(trial => (
                    <tr key={trial.tenantId} className={trial.isSuspended ? 'suspended' : ''}>
                      <td>
                        <strong>{trial.companyName}</strong>
                        <br />
                        <small className="tenant-id">{trial.tenantId}</small>
                      </td>
                      <td>
                        {trial.adminEmail}
                        {trial.adminPhone && <><br /><small>{trial.adminPhone}</small></>}
                      </td>
                      <td>
                        <span className={`status-badge ${trial.trialStatus?.toLowerCase()}`}>
                          {trial.trialStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`risk-badge ${trial.riskLevel?.toLowerCase()}`}>
                          {trial.fraudScore} ({trial.riskLevel})
                        </span>
                      </td>
                      <td>
                        {trial.trialStartDate} → {trial.trialEndDate}
                        <br />
                        <small>
                          {trial.daysRemaining > 0 
                            ? `${trial.daysRemaining} days left` 
                            : 'Expired'}
                        </small>
                      </td>
                      <td>
                        {new Date(trial.createdAt).toLocaleDateString()}
                        <br />
                        <small>{trial.ipAddress}</small>
                      </td>
                      <td className="actions">
                        {actionLoading === trial.tenantId ? (
                          <span className="loading">...</span>
                        ) : (
                          <>
                            {!trial.isSuspended ? (
                              <>
                                <button 
                                  className="btn-extend" 
                                  onClick={() => extendTrial(trial.tenantId)}
                                  title="Extend Trial">
                                  ➕
                                </button>
                                <button 
                                  className="btn-suspend" 
                                  onClick={() => suspendTrial(trial.tenantId)}
                                  title="Suspend">
                                  🚫
                                </button>
                              </>
                            ) : (
                              <button 
                                className="btn-reactivate" 
                                onClick={() => reactivateTrial(trial.tenantId)}
                                title="Reactivate">
                                ✅
                              </button>
                            )}
                            <button 
                              className="btn-delete" 
                              onClick={() => deleteTrial(trial.tenantId)}
                              title="Delete">
                              🗑️
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTrials.length === 0 && (
                <p className="no-data">No trials found</p>
              )}
            </div>
          </>
        )}

        {/* Company Management Tab */}
        {activeTab === 'companies' && (
          <div className="company-management">
            {/* Company Stats */}
            {companyStats && (
              <div className="company-stats-bar">
                <div className="company-stat active">
                  <span className="icon">🏢</span>
                  <span className="count">{companyStats.activeCount || 0}</span>
                  <span className="label">Active Companies</span>
                </div>
                <div className="company-stat deleted">
                  <span className="icon">🗑️</span>
                  <span className="count">{companyStats.deletedCount || 0}</span>
                  <span className="label">In Recycle Bin</span>
                </div>
                <div className="company-stat total">
                  <span className="icon">📊</span>
                  <span className="count">{companyStats.totalCount || 0}</span>
                  <span className="label">Total Companies</span>
                </div>
              </div>
            )}

            {/* View Toggle */}
            <div className="company-view-toggle">
              <button 
                className={`view-btn ${companyView === 'active' ? 'active' : ''}`}
                onClick={() => setCompanyView('active')}>
                🏢 Active Companies ({companies.length})
              </button>
              <button 
                className={`view-btn recycle ${companyView === 'recyclebin' ? 'active' : ''}`}
                onClick={() => setCompanyView('recyclebin')}>
                🗑️ Recycle Bin ({deletedCompanies.length})
              </button>
            </div>

            {/* Active Companies View */}
            {companyView === 'active' && (
              <div className="companies-grid">
                {companies.length === 0 ? (
                  <p className="no-data">No active companies found</p>
                ) : (
                  companies.map(company => (
                    <div key={company.id} className="company-card">
                      <div className="company-header">
                        <div className="company-logo">
                          {company.name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div className="company-info">
                          <h3>{company.name}</h3>
                          <span className="company-id">{company.id}</span>
                        </div>
                        <span className={`plan-badge ${company.plan?.toLowerCase()}`}>
                          {company.plan || 'FREE'}
                        </span>
                      </div>
                      <div className="company-details">
                        <p><strong>Subdomain:</strong> {company.subdomain}.chandrahr.in</p>
                        <p><strong>Email:</strong> {company.email}</p>
                        <p><strong>Created:</strong> {new Date(company.createdAt).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> 
                          <span className={`status ${company.isActive ? 'active' : 'inactive'}`}>
                            {company.isActive ? '✅ Active' : '⏸️ Inactive'}
                          </span>
                        </p>
                      </div>
                      <div className="company-actions">
                        <button 
                          className="btn-danger"
                          onClick={() => openSoftDeleteModal(company)}
                          disabled={actionLoading === company.id}>
                          {actionLoading === company.id ? '...' : '🗑️ Move to Recycle Bin'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Recycle Bin View */}
            {companyView === 'recyclebin' && (
              <div className="recycle-bin">
                <div className="recycle-bin-header">
                  <h3>🗑️ Recycle Bin</h3>
                  <p className="recycle-warning">
                    ⚠️ Companies in recycle bin are disabled. You can restore them or permanently delete all data.
                  </p>
                </div>
                
                {deletedCompanies.length === 0 ? (
                  <div className="empty-recycle-bin">
                    <span className="empty-icon">♻️</span>
                    <p>Recycle bin is empty</p>
                    <small>Deleted companies will appear here</small>
                  </div>
                ) : (
                  <div className="deleted-companies-list">
                    {deletedCompanies.map(company => (
                      <div key={company.id} className="deleted-company-card">
                        <div className="deleted-company-info">
                          <div className="company-logo deleted">
                            {company.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div className="company-details">
                            <h4>{company.name}</h4>
                            <p className="company-id">{company.id}</p>
                            <p className="delete-info">
                              <span className="deleted-by">Deleted by: {company.deletedBy}</span>
                              <span className="deleted-at">
                                {company.deletedAt && new Date(company.deletedAt).toLocaleString()}
                              </span>
                            </p>
                            {company.deleteReason && (
                              <p className="delete-reason">
                                <strong>Reason:</strong> {company.deleteReason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="deleted-company-actions">
                          <button 
                            className="btn-restore"
                            onClick={() => restoreCompany(company)}
                            disabled={actionLoading === company.id}>
                            {actionLoading === company.id ? '...' : '♻️ Restore'}
                          </button>
                          <button 
                            className="btn-permanent-delete"
                            onClick={() => openPermanentDeleteModal(company)}
                            disabled={actionLoading === company.id}>
                            {actionLoading === company.id ? '...' : '💀 Delete Forever'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'highrisk' && (
          <div className="highrisk-section">
            <h3>⚠️ High Risk Registrations (Score ≥ 50)</h3>
            {highRiskTrials.length === 0 ? (
              <p className="no-data">No high-risk registrations found</p>
            ) : (
              <div className="trials-table-container">
                <table className="trials-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Email</th>
                      <th>Fraud Score</th>
                      <th>Reasons</th>
                      <th>IP Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRiskTrials.map(trial => (
                      <tr key={trial.tenantId} className="high-risk-row">
                        <td>
                          <strong>{trial.companyName}</strong>
                          <br />
                          <small>{trial.tenantId}</small>
                        </td>
                        <td>{trial.adminEmail}</td>
                        <td>
                          <span className="risk-score">{trial.fraudScore}</span>
                        </td>
                        <td>
                          <small>{trial.fraudReasons || 'N/A'}</small>
                        </td>
                        <td>{trial.ipAddress}</td>
                        <td>
                          <button 
                            className="btn-suspend" 
                            onClick={() => suspendTrial(trial.tenantId)}>
                            🚫 Suspend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'duplicates' && (
          <div className="duplicates-section">
            <h3>🔄 Duplicate IP Registrations</h3>
            {duplicateIps.length === 0 ? (
              <p className="no-data">No duplicate IP registrations found</p>
            ) : (
              duplicateIps.map((item, idx) => (
                <div key={idx} className="duplicate-card">
                  <div className="duplicate-header">
                    <span className="ip-address">📍 {item.ipAddress}</span>
                    <span className="count">{item.registrationCount} registrations</span>
                  </div>
                  <div className="duplicate-list">
                    {item.registrations?.map((reg, regIdx) => (
                      <div key={regIdx} className="duplicate-item">
                        <span>{reg.companyName}</span>
                        <span>{reg.email}</span>
                        <span>{new Date(reg.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Soft Delete Modal */}
      {showDeleteModal && selectedCompany && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header warning">
              <h2>🗑️ Move to Recycle Bin</h2>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="company-preview">
                <div className="preview-logo">{selectedCompany.name?.charAt(0)?.toUpperCase()}</div>
                <div className="preview-info">
                  <h3>{selectedCompany.name}</h3>
                  <p>{selectedCompany.id}</p>
                </div>
              </div>

              {companyDataCounts && (
                <div className="data-counts">
                  <h4>📊 Data to be disabled:</h4>
                  <div className="counts-grid">
                    {Object.entries(companyDataCounts).map(([key, value]) => (
                      <div key={key} className="count-item">
                        <span className="count-value">{value}</span>
                        <span className="count-label">{key.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Reason for deletion <span className="required">*</span></label>
                <textarea
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="Enter the reason for moving this company to recycle bin..."
                  rows={3}
                />
              </div>

              <div className="modal-info">
                <p>✅ The company will be <strong>disabled</strong> but all data will be preserved.</p>
                <p>✅ You can <strong>restore</strong> the company at any time from the recycle bin.</p>
                <p>⚠️ Users of this company will not be able to login until restored.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-confirm-delete"
                onClick={softDeleteCompany}
                disabled={!deleteReason.trim() || actionLoading}>
                {actionLoading ? 'Deleting...' : '🗑️ Move to Recycle Bin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal */}
      {showPermanentDeleteModal && selectedCompany && (
        <div className="modal-overlay" onClick={() => setShowPermanentDeleteModal(false)}>
          <div className="modal permanent-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header danger">
              <h2>💀 PERMANENT DELETION</h2>
              <button className="close-btn" onClick={() => setShowPermanentDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="danger-zone">
                <div className="danger-icon">⚠️</div>
                <h3>This action is IRREVERSIBLE!</h3>
                <p>You are about to permanently delete all data for:</p>
              </div>

              <div className="company-preview danger">
                <div className="preview-logo danger">{selectedCompany.name?.charAt(0)?.toUpperCase()}</div>
                <div className="preview-info">
                  <h3>{selectedCompany.name}</h3>
                  <p>{selectedCompany.id}</p>
                </div>
              </div>

              {companyDataCounts && (
                <div className="data-counts danger">
                  <h4>🔥 Data that will be PERMANENTLY DELETED:</h4>
                  <div className="counts-grid">
                    {Object.entries(companyDataCounts).map(([key, value]) => (
                      <div key={key} className="count-item danger">
                        <span className="count-value">{value}</span>
                        <span className="count-label">{key.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="confirm-section">
                <label>
                  Type <code>{selectedCompany.id}</code> to confirm permanent deletion:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={selectedCompany.id}
                  className={confirmText === selectedCompany.id ? 'valid' : ''}
                />
              </div>

              <div className="modal-warning">
                <p>❌ This will delete ALL employees, attendance, payroll, leaves, loans, and user accounts.</p>
                <p>❌ This action CANNOT be undone.</p>
                <p>❌ All data will be PERMANENTLY removed from the database.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowPermanentDeleteModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-permanent-confirm"
                onClick={permanentDeleteCompany}
                disabled={confirmText !== selectedCompany.id || actionLoading}>
                {actionLoading ? 'Deleting...' : '💀 DELETE FOREVER'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
