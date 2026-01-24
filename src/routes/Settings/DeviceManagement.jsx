import React, { useState, useEffect } from "react";
import { getToken, getTenantId } from "../../services/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8080/api' : '/api');

/**
 * Biometric Device Management Page
 * Allows admins to manage biometric devices and their employee mappings
 */
function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal states
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showMappings, setShowMappings] = useState(null); // deviceId or null
  const [editDevice, setEditDevice] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    deviceCode: "",
    deviceName: "",
    location: "",
    description: "",
    serialNumber: "",
    isDefault: false
  });
  
  // Mapping state
  const [mappings, setMappings] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [newMapping, setNewMapping] = useState({ deviceEmpCode: "", hrmsEmpCode: "", deviceEmpName: "" });
  
  useEffect(() => {
    loadDevices();
  }, []);
  
  const loadDevices = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE}/devices`, {
        headers: {
          "X-Tenant-Id": getTenantId(),
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
        }
      });
      if (!resp.ok) throw new Error("Failed to load devices");
      const data = await resp.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMappings = async (deviceId) => {
    setMappingLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/devices/${deviceId}/mappings`, {
        headers: {
          "X-Tenant-Id": getTenantId(),
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
        }
      });
      if (!resp.ok) throw new Error("Failed to load mappings");
      const data = await resp.json();
      setMappings(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setMappingLoading(false);
    }
  };
  
  const handleSubmitDevice = async (e) => {
    e.preventDefault();
    try {
      const url = editDevice 
        ? `${API_BASE}/devices/${editDevice.id}`
        : `${API_BASE}/devices`;
      const method = editDevice ? "PUT" : "POST";
      
      const resp = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": getTenantId(),
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
        },
        body: JSON.stringify(form)
      });
      
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Failed to save device");
      }
      
      setShowAddDevice(false);
      setEditDevice(null);
      setForm({ deviceCode: "", deviceName: "", location: "", description: "", serialNumber: "", isDefault: false });
      loadDevices();
    } catch (e) {
      alert(e.message);
    }
  };
  
  const handleDeleteDevice = async (device) => {
    if (!confirm(`Delete device "${device.deviceCode}"? This action cannot be undone.`)) return;
    
    try {
      const resp = await fetch(`${API_BASE}/devices/${device.id}`, {
        method: "DELETE",
        headers: {
          "X-Tenant-Id": getTenantId(),
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
        }
      });
      
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || errData.message || "Failed to delete device");
      }
      
      loadDevices();
    } catch (e) {
      alert(e.message);
    }
  };
  
  const handleAddMapping = async (e) => {
    e.preventDefault();
    if (!showMappings) return;
    
    try {
      const resp = await fetch(`${API_BASE}/devices/${showMappings}/mappings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": getTenantId(),
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
        },
        body: JSON.stringify(newMapping)
      });
      
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || errData.message || "Failed to add mapping");
      }
      
      setNewMapping({ deviceEmpCode: "", hrmsEmpCode: "", deviceEmpName: "" });
      loadMappings(showMappings);
    } catch (e) {
      alert(e.message);
    }
  };
  
  const handleDeleteMapping = async (mappingId) => {
    if (!confirm("Delete this mapping?")) return;
    
    try {
      const resp = await fetch(`${API_BASE}/devices/${showMappings}/mappings/${mappingId}`, {
        method: "DELETE",
        headers: {
          "X-Tenant-Id": getTenantId(),
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
        }
      });
      
      if (!resp.ok) throw new Error("Failed to delete mapping");
      loadMappings(showMappings);
    } catch (e) {
      alert(e.message);
    }
  };
  
  const openMappings = (deviceId) => {
    setShowMappings(deviceId);
    loadMappings(deviceId);
  };
  
  const openEdit = (device) => {
    setEditDevice(device);
    setForm({
      deviceCode: device.deviceCode,
      deviceName: device.deviceName || "",
      location: device.location || "",
      description: device.description || "",
      serialNumber: device.serialNumber || "",
      isDefault: device.isDefault || false
    });
    setShowAddDevice(true);
  };
  
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Biometric Devices</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage attendance devices and employee code mappings
          </p>
        </div>
        <button
          onClick={() => { setShowAddDevice(true); setEditDevice(null); setForm({ deviceCode: "", deviceName: "", location: "", description: "", serialNumber: "", isDefault: false }); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <span>➕</span> Add Device
        </button>
      </div>
      
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {/* Devices List */}
      {loading ? (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 mt-2">Loading devices...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <div className="text-5xl mb-4">📟</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Devices Configured</h3>
          <p className="text-slate-500 mb-4">
            Add your biometric attendance devices to manage employee code mappings.
          </p>
          <p className="text-sm text-slate-400">
            <strong>Note:</strong> Without device configuration, attendance import uses direct employee code matching (backward compatible).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => (
            <div 
              key={device.id} 
              className={`bg-white rounded-xl border p-5 ${device.isDefault ? 'border-emerald-500 ring-2 ring-emerald-100' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📟</span>
                    <h3 className="font-bold text-slate-800">{device.deviceCode}</h3>
                  </div>
                  {device.isDefault && (
                    <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded mt-1">
                      Default Device
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(device)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteDevice(device)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {device.deviceName && (
                <p className="text-slate-600 text-sm mb-1">{device.deviceName}</p>
              )}
              {device.location && (
                <p className="text-slate-500 text-xs flex items-center gap-1">
                  <span>📍</span> {device.location}
                </p>
              )}
              
              <div className="mt-4 pt-3 border-t flex justify-between items-center">
                <span className="text-sm text-slate-500">
                  {device.mappingCount || 0} employee mappings
                </span>
                <button
                  onClick={() => openMappings(device.id)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Manage Mappings →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add/Edit Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-slate-800">
                {editDevice ? 'Edit Device' : 'Add New Device'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmitDevice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Device Code *</label>
                <input
                  type="text"
                  value={form.deviceCode}
                  onChange={(e) => setForm({...form, deviceCode: e.target.value.toUpperCase()})}
                  placeholder="e.g., MUMBAI_GATE_1"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                  disabled={!!editDevice}
                />
                <p className="text-xs text-slate-400 mt-1">Unique identifier for this device</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Device Name</label>
                <input
                  type="text"
                  value={form.deviceName}
                  onChange={(e) => setForm({...form, deviceName: e.target.value})}
                  placeholder="e.g., Mumbai Office - Main Gate"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({...form, location: e.target.value})}
                  placeholder="e.g., Mumbai"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  value={form.serialNumber}
                  onChange={(e) => setForm({...form, serialNumber: e.target.value})}
                  placeholder="Optional hardware ID"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Optional notes about this device"
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm({...form, isDefault: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="isDefault" className="text-sm text-slate-700">
                  Set as default device (used when no device is specified during import)
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddDevice(false); setEditDevice(null); }}
                  className="flex-1 px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                >
                  {editDevice ? 'Update Device' : 'Add Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Mappings Modal */}
      {showMappings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Device Mappings</h2>
                <p className="text-slate-500 text-sm">
                  Map device employee codes to HRMS employees
                </p>
              </div>
              <button
                onClick={() => { setShowMappings(null); setMappings([]); }}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                ✕
              </button>
            </div>
            
            {/* Add Mapping Form */}
            <form onSubmit={handleAddMapping} className="p-4 border-b bg-slate-50 flex gap-3 flex-wrap">
              <input
                type="text"
                value={newMapping.deviceEmpCode}
                onChange={(e) => setNewMapping({...newMapping, deviceEmpCode: e.target.value})}
                placeholder="Device Emp Code (e.g., 101)"
                className="flex-1 min-w-[120px] px-3 py-2 border rounded-lg text-sm"
                required
              />
              <input
                type="text"
                value={newMapping.hrmsEmpCode}
                onChange={(e) => setNewMapping({...newMapping, hrmsEmpCode: e.target.value})}
                placeholder="HRMS Emp Code"
                className="flex-1 min-w-[120px] px-3 py-2 border rounded-lg text-sm"
                required
              />
              <input
                type="text"
                value={newMapping.deviceEmpName}
                onChange={(e) => setNewMapping({...newMapping, deviceEmpName: e.target.value})}
                placeholder="Name in Device (optional)"
                className="flex-1 min-w-[150px] px-3 py-2 border rounded-lg text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
              >
                Add Mapping
              </button>
            </form>
            
            {/* Mappings List */}
            <div className="flex-1 overflow-auto p-4">
              {mappingLoading ? (
                <div className="text-center py-8 text-slate-500">Loading mappings...</div>
              ) : mappings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No mappings yet. Add device employee codes above.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Device Code</th>
                      <th className="px-4 py-2 text-left">Device Name</th>
                      <th className="px-4 py-2 text-left">→</th>
                      <th className="px-4 py-2 text-left">HRMS Code</th>
                      <th className="px-4 py-2 text-left">HRMS Name</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map(m => (
                      <tr key={m.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono">{m.deviceEmpCode}</td>
                        <td className="px-4 py-3 text-slate-500">{m.deviceEmpName || '-'}</td>
                        <td className="px-4 py-3 text-emerald-500">→</td>
                        <td className="px-4 py-3 font-mono">{m.hrmsEmpCode}</td>
                        <td className="px-4 py-3">{m.employeeName}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteMapping(m.id)}
                            className="text-red-500 hover:text-red-700 px-2 py-1"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Info Footer */}
            <div className="p-4 border-t bg-amber-50 text-amber-800 text-xs">
              <strong>💡 How it works:</strong> When importing attendance, the system looks up 
              "Device Emp Code" in this mapping to find the correct HRMS employee. Same device code 
              can map to different employees in different devices.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceManagement;
