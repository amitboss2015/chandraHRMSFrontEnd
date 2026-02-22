// HolidayManagement.jsx - Weekly Off Configuration (Yearly Holidays removed - use Calendar in Leave Management)
import React, { useState, useEffect } from "react";
import { holidayApi, getTenantId } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function HolidayManagement() {
  const { user } = useAuth();
  const [weeklyOffs, setWeeklyOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  
  // Local state for each employment type (for editing before save)
  const [localConfigs, setLocalConfigs] = useState({
    FULL_TIME: { weeklyOffDays: [], alternateSaturdayRule: 'NONE' },
    PART_TIME: { weeklyOffDays: [], alternateSaturdayRule: 'NONE' },
    CONTRACT: { weeklyOffDays: [], alternateSaturdayRule: 'NONE' }
  });
  
  // Track which configs have unsaved changes
  const [hasChanges, setHasChanges] = useState({
    FULL_TIME: false,
    PART_TIME: false,
    CONTRACT: false
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Use tenant ID from user object (from JWT) or localStorage, or fallback
      const tenantId = user?.tenantId || getTenantId() || localStorage.getItem('hrms_tenant_id') || '';
      if (!tenantId) {
        setMessage({ type: 'error', text: 'Tenant ID not found. Please login again.' });
        return;
      }
      console.log('Loading weekly off config for tenant:', tenantId);
      const weeklyOffData = await holidayApi.getWeeklyOff(tenantId);
      setWeeklyOffs(weeklyOffData || []);
      
      // Initialize local configs from loaded data
      const newLocalConfigs = {
        FULL_TIME: { weeklyOffDays: [], alternateSaturdayRule: 'NONE' },
        PART_TIME: { weeklyOffDays: [], alternateSaturdayRule: 'NONE' },
        CONTRACT: { weeklyOffDays: [], alternateSaturdayRule: 'NONE' }
      };
      
      weeklyOffData.forEach(config => {
        const empType = config.employmentType;
        newLocalConfigs[empType] = {
          weeklyOffDays: config.weeklyOffDays ? config.weeklyOffDays.split(',').filter(d => d.trim()) : [],
          alternateSaturdayRule: config.alternateSaturdayRule || 'NONE'
        };
      });
      
      setLocalConfigs(newLocalConfigs);
      setHasChanges({ FULL_TIME: false, PART_TIME: false, CONTRACT: false });
    } catch (error) {
      console.error('Failed to load data:', error);
      setMessage({ type: 'error', text: 'Failed to load weekly off configuration: ' + (error.message || '') });
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (empType, day) => {
    const currentConfig = localConfigs[empType];
    const alternateRule = currentConfig.alternateSaturdayRule || 'NONE';
    
    // If alternate Saturday rule is active, Saturday cannot be unselected
    if (day === 'SATURDAY' && alternateRule !== 'NONE') {
      // Don't allow unselecting Saturday when alternate rule is active
      return;
    }
    
    const currentDays = currentConfig.weeklyOffDays || [];
    let newDays;
    if (currentDays.includes(day)) {
      newDays = currentDays.filter(d => d !== day);
    } else {
      newDays = [...currentDays, day];
    }
    
    setLocalConfigs(prev => ({
      ...prev,
      [empType]: {
        ...prev[empType],
        weeklyOffDays: newDays
      }
    }));
    
    setHasChanges(prev => ({ ...prev, [empType]: true }));
  };

  const handleAlternateRuleChange = (empType, rule) => {
    const currentConfig = localConfigs[empType];
    let newWeeklyOffDays = [...(currentConfig.weeklyOffDays || [])];
    
    // If alternate rule is selected (not "NONE"), automatically select Saturday
    if (rule !== 'NONE') {
      if (!newWeeklyOffDays.includes('SATURDAY')) {
        newWeeklyOffDays.push('SATURDAY');
      }
    }
    
    setLocalConfigs(prev => ({
      ...prev,
      [empType]: {
        ...prev[empType],
        alternateSaturdayRule: rule,
        weeklyOffDays: newWeeklyOffDays
      }
    }));
    
    setHasChanges(prev => ({ ...prev, [empType]: true }));
  };

  const handleSaveWeeklyOff = async (empType) => {
    try {
      // Use tenant ID from user object (from JWT) or localStorage, or fallback
      const tenantId = user?.tenantId || getTenantId() || localStorage.getItem('hrms_tenant_id') || '';
      if (!tenantId) {
        setMessage({ type: 'error', text: 'Tenant ID not found. Please login again.' });
        return;
      }
      
      const config = localConfigs[empType];
      const daysString = config.weeklyOffDays.join(',');
      const alternateRule = config.alternateSaturdayRule || 'NONE';
      
      console.log('💾 Saving weekly off config:', {
        tenant: tenantId,
        employmentType: empType,
        weeklyOffDays: daysString,
        alternateSaturdayRule: alternateRule
      });
      
      const response = await holidayApi.saveWeeklyOff({
        orgId: tenantId,
        tenantId: tenantId,
        employmentType: empType,
        weeklyOffDays: daysString,
        alternateSaturdayRule: alternateRule
      });
      
      console.log('✅ Save response:', response);
      
      // Verify the saved data
      if (response.alternateSaturdayRule !== alternateRule) {
        console.warn('⚠️ Warning: Alternate rule mismatch!', {
          sent: alternateRule,
          received: response.alternateSaturdayRule
        });
        setMessage({ 
          type: 'error', 
          text: `Warning: Alternate rule may not have saved correctly. Expected: ${alternateRule}, Got: ${response.alternateSaturdayRule}` 
        });
      } else {
        console.log('✅ Verified: Alternate rule saved correctly:', alternateRule);
        setMessage({ 
          type: 'success', 
          text: `${empType.replace('_', ' ')} weekly off configuration saved successfully!` 
        });
      }
      
      // Reload data to get latest from server
      await loadData();
    } catch (error) {
      console.error('❌ Save error:', error);
      setMessage({ type: 'error', text: 'Failed to save weekly off configuration. ' + (error.message || '') });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🔄 Weekly Off Configuration</h1>
          <p className="text-slate-500 text-sm mt-1">Configure weekly off days for different employment types</p>
          <p className="text-xs text-amber-600 mt-2">
            💡 Note: For calendar holidays, please use the Calendar tab in Leave Management
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span>{message.type === 'success' ? '✅' : '❌'}</span>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Weekly Off Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {['FULL_TIME', 'PART_TIME', 'CONTRACT'].map((empType) => {
            const localConfig = localConfigs[empType] || { weeklyOffDays: [], alternateSaturdayRule: 'NONE' };
            const hasUnsavedChanges = hasChanges[empType];

            const typeLabels = {
              'FULL_TIME': { label: 'Full Time', icon: '👔', color: 'blue' },
              'PART_TIME': { label: 'Part Time', icon: '⏰', color: 'purple' },
              'CONTRACT': { label: 'Contract', icon: '📄', color: 'amber' },
            };

            const info = typeLabels[empType];

            return (
              <div key={empType} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className={`bg-gradient-to-r from-${info.color}-500 to-${info.color}-600 px-5 py-4`}>
                  <div className="flex items-center gap-3 text-white">
                    <span className="text-2xl">{info.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-bold">{info.label}</h3>
                      <p className="text-sm opacity-80">Weekly Off Config</p>
                    </div>
                    {hasUnsavedChanges && (
                      <span className="text-xs bg-yellow-500 px-2 py-1 rounded">Unsaved</span>
                    )}
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-3">Weekly Off Days</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map(day => {
                        const isChecked = localConfig.weeklyOffDays?.includes(day);
                        const alternateRule = localConfig.alternateSaturdayRule || 'NONE';
                        const isSaturdayLocked = day === 'SATURDAY' && alternateRule !== 'NONE';
                        const isDisabled = isSaturdayLocked;
                        
                        return (
                          <button
                            key={day}
                            onClick={() => handleDayToggle(empType, day)}
                            disabled={isDisabled}
                            title={isSaturdayLocked ? 'Saturday is automatically selected when alternate rule is active' : ''}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                              isChecked
                                ? isSaturdayLocked
                                  ? 'bg-emerald-600 text-white cursor-not-allowed opacity-75'
                                  : 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            {day.slice(0, 3)}
                            {isSaturdayLocked && <span className="ml-1 text-xs">🔒</span>}
                          </button>
                        );
                      })}
                    </div>
                    {localConfig.alternateSaturdayRule && localConfig.alternateSaturdayRule !== 'NONE' && (
                      <p className="text-xs text-amber-600 mt-2">
                        ℹ️ Saturday is automatically selected when alternate Saturday rule is active
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Alternate Saturday</label>
                    <select
                      value={localConfig.alternateSaturdayRule || 'NONE'}
                      onChange={(e) => handleAlternateRuleChange(empType, e.target.value)}
                      className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    >
                      <option value="NONE">No alternate rule</option>
                      <option value="ALL_SATURDAYS_OFF">All Saturdays Off</option>
                      <option value="SECOND_AND_FOURTH_OFF">2nd & 4th Off</option>
                      <option value="FIRST_AND_THIRD_OFF">1st & 3rd Off</option>
                    </select>
                    {localConfig.alternateSaturdayRule && localConfig.alternateSaturdayRule !== 'NONE' && (
                      <p className="text-xs text-slate-500 mt-1">
                        When alternate rule is active, Saturday is automatically included in weekly off days
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t">
                    <button
                      onClick={() => handleSaveWeeklyOff(empType)}
                      disabled={!hasUnsavedChanges}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        hasUnsavedChanges
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {hasUnsavedChanges ? '💾 Save Configuration' : '✓ Saved'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
}

export default HolidayManagement;
