import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Dynamically set API base URL based on current host
const getApiBase = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8080/api';
  }
  return `http://${hostname}:8080/api`;
};

const API_BASE = getApiBase();

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Export API_BASE for use in other files
export { API_BASE };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get tenant ID from localStorage or subdomain
  const getTenantId = useCallback(() => {
    const stored = localStorage.getItem('hrms_tenant_id');
    if (stored) return stored;
    
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length >= 2 && !['www', 'localhost', '127'].includes(parts[0])) {
      return parts[0];
    }
    return 'SASA001';
  }, []);

  // Clear all auth data and redirect to login
  const clearAuth = useCallback((redirect = false) => {
    console.log('🔓 Clearing auth data...', new Error().stack);
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('hrms_user');
    sessionStorage.removeItem('hrms_access_token');
    
    if (redirect && window.location.pathname !== '/login') {
      console.log('🔄 Redirecting to login...');
      window.location.href = '/login';
    }
  }, []);

  // Validate token by making a test API call
  const validateToken = useCallback(async (token) => {
    console.log('🔍 validateToken called with token:', token ? token.substring(0, 30) + '...' : 'NONE');
    try {
      const response = await fetch(`${API_BASE}/employees?_limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': getTenantId(),
        },
      });
      
      console.log('🔍 validateToken response:', response.status);
      
      if (response.status === 401 || response.status === 403) {
        console.log('❌ Token validation failed - token is invalid or expired');
        return false;
      }
      
      console.log('✅ Token is valid');
      return true;
    } catch (err) {
      console.error('Token validation error:', err);
      return false;
    }
  }, [getTenantId]);

  // Refresh access token using refresh token cookie
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': getTenantId(),
        },
        credentials: 'include',
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
        console.log('✅ Token refreshed successfully');
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Token refresh failed:', err);
      return false;
    }
  }, [getTenantId]);

  // Check if user is authenticated on mount (page refresh)
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('hrms_user');
      const storedToken = sessionStorage.getItem('hrms_access_token');
      
      if (storedUser && storedToken) {
        // Validate the stored token before using it
        console.log('🔍 Validating stored token...');
        const isValid = await validateToken(storedToken);
        
        if (isValid) {
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setAccessToken(storedToken);
            console.log('✅ Session restored for:', userData.email);
          } catch (err) {
            console.error('Failed to parse stored user:', err);
            clearAuth(false);
          }
        } else {
          // Token invalid - try to refresh
          console.log('🔄 Token invalid, attempting refresh...');
          const refreshed = await refreshToken();
          if (!refreshed) {
            console.log('❌ Refresh failed, clearing auth');
            clearAuth(true); // Redirect to login
          }
        }
      } else if (storedUser && !storedToken) {
        // Token expired but user data exists - try to refresh
        const refreshed = await refreshToken();
        if (!refreshed) {
          clearAuth(false);
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [clearAuth, refreshToken, validateToken]);

  // Setup token refresh interval
  useEffect(() => {
    if (!accessToken) return;

    // Refresh token every 14 minutes (before 15 min expiry)
    const interval = setInterval(() => {
      refreshToken();
    }, 14 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken, refreshToken]);

  // Login
  const login = async (email, password) => {
    setError(null);
    setLoading(true);

    try {
      const tenantId = getTenantId();
      console.log('🔐 Login attempt:', { email, tenantId });
      
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, tenantId }),
      });

      const data = await response.json();
      console.log('📥 Login response:', { status: response.status, ok: response.ok, data });

      if (response.ok) {
        console.log('✅ Login successful, storing token...');
        console.log('📝 Token to store:', data.accessToken ? data.accessToken.substring(0, 50) + '...' : 'NONE');
        
        setAccessToken(data.accessToken);
        sessionStorage.setItem('hrms_access_token', data.accessToken);
        
        // Verify token was stored
        const storedToken = sessionStorage.getItem('hrms_access_token');
        console.log('✅ Token stored successfully:', storedToken ? storedToken.substring(0, 50) + '...' : 'STORAGE FAILED!');
        
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
    
    clearAuth(true); // Redirect to login
  };

  // Authenticated fetch - automatically handles 401/403
  const authFetch = useCallback(async (url, options = {}) => {
    const token = accessToken || sessionStorage.getItem('hrms_access_token');
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': getTenantId(),
      'X-Org-Id': getTenantId(),
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // Handle auth errors
      if (response.status === 401 || response.status === 403) {
        console.log('🔒 Auth error detected, attempting token refresh...');
        
        // Try to refresh the token
        const refreshed = await refreshToken();
        
        if (refreshed) {
          // Retry the request with new token
          const newToken = sessionStorage.getItem('hrms_access_token');
          headers['Authorization'] = `Bearer ${newToken}`;
          return fetch(url, { ...options, headers, credentials: 'include' });
        } else {
          // Refresh failed - redirect to login
          clearAuth(true);
          throw new Error('Session expired. Please login again.');
        }
      }

      return response;
    } catch (err) {
      console.error('Auth fetch error:', err);
      throw err;
    }
  }, [accessToken, getTenantId, refreshToken, clearAuth]);

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
  const getAccessToken = () => accessToken || sessionStorage.getItem('hrms_access_token');

  // Check if user has role
  const hasRole = (role) => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  // Role checks
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
    authFetch,
    hasRole,
    isAdmin,
    isHR,
    isAccountant,
    isAuthenticated: !!user && !!accessToken,
    tenantId: getTenantId(),
    clearAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
