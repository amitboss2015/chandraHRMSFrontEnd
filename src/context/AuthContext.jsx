import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:8080/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get tenant ID from localStorage or subdomain
  const getTenantId = () => {
    const stored = localStorage.getItem('hrms_tenant_id');
    if (stored) return stored;
    
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length >= 2 && !['www', 'localhost', '127'].includes(parts[0])) {
      return parts[0];
    }
    return 'ORG001';
  };

  // API call helper with auth
  const authFetch = useCallback(async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': getTenantId(),
      ...options.headers,
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    return response;
  }, [accessToken]);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('hrms_user');
      const storedToken = sessionStorage.getItem('hrms_access_token');
      
      if (storedUser && storedToken) {
        try {
          // Verify token is still valid
          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'X-Tenant-Id': getTenantId(),
            },
            credentials: 'include',
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setAccessToken(storedToken);
          } else {
            // Token expired, try refresh
            await refreshToken();
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          clearAuth();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Refresh access token
  const refreshToken = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': getTenantId(),
        },
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.accessToken);
        sessionStorage.setItem('hrms_access_token', data.accessToken);
        
        const userData = {
          id: data.userId,
          email: data.email,
          name: data.name,
          tenantId: data.tenantId,
          tenantName: data.tenantName,
          role: data.role,
        };
        setUser(userData);
        localStorage.setItem('hrms_user', JSON.stringify(userData));
        return true;
      }
      
      clearAuth();
      return false;
    } catch (err) {
      console.error('Token refresh failed:', err);
      clearAuth();
      return false;
    }
  };

  // Setup token refresh interval
  useEffect(() => {
    if (!accessToken) return;

    // Refresh token every 14 minutes (before 15 min expiry)
    const interval = setInterval(() => {
      refreshToken();
    }, 14 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken]);

  // Login
  const login = async (email, password) => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': getTenantId(),
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, tenantId: getTenantId() }),
      });

      const data = await response.json();

      if (response.ok) {
        setAccessToken(data.accessToken);
        sessionStorage.setItem('hrms_access_token', data.accessToken);
        
        const userData = {
          id: data.userId,
          email: data.email,
          name: data.name,
          tenantId: data.tenantId,
          tenantName: data.tenantName,
          role: data.role,
        };
        setUser(userData);
        localStorage.setItem('hrms_user', JSON.stringify(userData));
        localStorage.setItem('hrms_tenant_id', data.tenantId);
        
        setLoading(false);
        return { success: true };
      } else {
        setError(data.message || 'Login failed');
        setLoading(false);
        return { success: false, error: data.message || 'Invalid credentials' };
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
      setLoading(false);
      return { success: false, error: 'Network error' };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Tenant-Id': getTenantId(),
        },
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    clearAuth();
  };

  // Clear all auth data
  const clearAuth = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('hrms_user');
    sessionStorage.removeItem('hrms_access_token');
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authFetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        await logout();
        return { success: true, message: 'Password changed. Please login again.' };
      }
      
      const data = await response.json();
      return { success: false, error: data.message };
    } catch (err) {
      return { success: false, error: 'Failed to change password' };
    }
  };

  // Get access token for API calls
  const getAccessToken = () => accessToken;

  // Check if user has role
  const hasRole = (role) => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  // Check if user is admin
  const isAdmin = () => hasRole(['SUPER_ADMIN', 'ADMIN']);
  const isHR = () => hasRole(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']);
  const isAccountant = () => hasRole(['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT']);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    refreshToken,
    changePassword,
    getAccessToken,
    hasRole,
    isAdmin,
    isHR,
    isAccountant,
    isAuthenticated: !!user,
    tenantId: getTenantId(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
