/**
 * Shared Month/Year Selection State
 * Persists selected month/year across all pages using localStorage
 * Tenant-specific storage to support multi-tenant scenarios
 */

const getTenantId = () => localStorage.getItem('hrms_tenant_id') || 'SASA001';

const STORAGE_KEY = (tenantId) => `hrms_selected_period_${tenantId}`;

/**
 * Get the stored month/year selection
 * Returns { month, year } or null if not set
 */
export const getStoredPeriod = () => {
  try {
    const tenantId = getTenantId();
    const stored = localStorage.getItem(STORAGE_KEY(tenantId));
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate month (1-12) and year (2000-2100)
      if (parsed.month >= 1 && parsed.month <= 12 && 
          parsed.year >= 2000 && parsed.year <= 2100) {
        return { month: parsed.month, year: parsed.year };
      }
    }
  } catch (e) {
    console.error('Error reading stored period:', e);
  }
  return null;
};

/**
 * Store the selected month/year
 */
export const setStoredPeriod = (month, year) => {
  try {
    const tenantId = getTenantId();
    localStorage.setItem(STORAGE_KEY(tenantId), JSON.stringify({ month, year }));
  } catch (e) {
    console.error('Error storing period:', e);
  }
};

/**
 * Get default month/year (current month/year or stored value)
 */
export const getDefaultPeriod = () => {
  const stored = getStoredPeriod();
  if (stored) {
    return stored;
  }
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  };
};

import React from 'react';

/**
 * React hook for managing month/year selection with persistence
 */
export const usePeriodSelection = () => {
  const [month, setMonth] = React.useState(() => {
    const defaultPeriod = getDefaultPeriod();
    return defaultPeriod.month;
  });
  
  const [year, setYear] = React.useState(() => {
    const defaultPeriod = getDefaultPeriod();
    return defaultPeriod.year;
  });

  // Update stored value whenever month/year changes
  React.useEffect(() => {
    setStoredPeriod(month, year);
  }, [month, year]);

  // Track if we're currently syncing (to prevent event loops)
  const isSyncingRef = React.useRef(false);

  // Sync with stored value on mount and when localStorage changes
  React.useEffect(() => {
    let isMounted = true;
    
    const syncFromStorage = () => {
      if (!isMounted) return;
      const stored = getStoredPeriod();
      if (stored && (stored.month !== month || stored.year !== year)) {
        isSyncingRef.current = true; // Mark as syncing to prevent event dispatch
        setMonth(stored.month);
        setYear(stored.year);
        // Reset sync flag after state update
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 100);
      }
    };

    // Sync on mount only (not on every month/year change to prevent loops)
    syncFromStorage();

    // Listen for storage changes (when another component updates month/year)
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('hrms_selected_period_')) {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event (for same-tab updates) - debounced to prevent loops
    let timeoutId;
    const handleCustomEvent = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(syncFromStorage, 100);
    };
    window.addEventListener('periodSelectionChanged', handleCustomEvent);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('periodSelectionChanged', handleCustomEvent);
    };
  }, []); // Empty deps - only run on mount

  return {
    month,
    year,
    setMonth: (newMonth) => {
      if (isSyncingRef.current) return; // Prevent loops during sync
      setMonth(newMonth);
      setStoredPeriod(newMonth, year);
      // Dispatch custom event to notify other components in same tab (debounced)
      setTimeout(() => {
        if (!isSyncingRef.current) {
          window.dispatchEvent(new CustomEvent('periodSelectionChanged'));
        }
      }, 50);
    },
    setYear: (newYear) => {
      if (isSyncingRef.current) return; // Prevent loops during sync
      setYear(newYear);
      setStoredPeriod(month, newYear);
      // Dispatch custom event to notify other components in same tab (debounced)
      setTimeout(() => {
        if (!isSyncingRef.current) {
          window.dispatchEvent(new CustomEvent('periodSelectionChanged'));
        }
      }, 50);
    },
    setPeriod: (newMonth, newYear) => {
      if (isSyncingRef.current) return; // Prevent loops during sync
      setMonth(newMonth);
      setYear(newYear);
      setStoredPeriod(newMonth, newYear);
      // Dispatch custom event to notify other components in same tab (debounced)
      setTimeout(() => {
        if (!isSyncingRef.current) {
          window.dispatchEvent(new CustomEvent('periodSelectionChanged'));
        }
      }, 50);
    }
  };
};

// For non-React usage (vanilla JS)
export default {
  getStoredPeriod,
  setStoredPeriod,
  getDefaultPeriod
};
