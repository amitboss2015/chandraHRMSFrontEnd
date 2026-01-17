import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './SuperAdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const SuperAdminDashboard = () => {
  const { user, accessToken } = useAuth();
  const token = accessToken || sessionStorage.getItem('hrms_access_token');
  const [stats, setStats] = useState(null);
  const [trials, setTrials] = useState([]);
  const [highRiskTrials, setHighRiskTrials] = useState([]);
  const [duplicateIps, setDuplicateIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch helper
  const fetchApi = async (endpoint, options = {}) => {
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
  };

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
  }, [token]);

  // Filter trials
  const filteredTrials = statusFilter 
    ? trials.filter(t => t.trialStatus === statusFilter)
    : trials;

  // Actions
  const suspendTrial = async (tenantId) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;
    
    setActionLoading(tenantId);
    try {
      await fetchApi(`/api/admin/trials/${tenantId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason, suspendedBy: user?.email || 'Admin' }),
      });
      // Reload
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
          Try logging in with: <code>superadmin@hrms.in</code> / <code>SuperAdmin@123</code>
        </p>
      </div>
    );
  }

  return (
    <div className="super-admin-dashboard">
      <header className="admin-header">
        <h1>🛡️ Super Admin Dashboard</h1>
        <p>Monitor trials, registrations, and fraud detection</p>
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
    </div>
  );
};

export default SuperAdminDashboard;
