// HolidayManagement.jsx - Modern holiday management UI
import React, { useState, useEffect } from "react";
import { holidayApi } from "../../services/api";

function HolidayManagement() {
  const [activeTab, setActiveTab] = useState("holidays");
  const [holidays, setHolidays] = useState([]);
  const [weeklyOffs, setWeeklyOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [message, setMessage] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [newHoliday, setNewHoliday] = useState({
    orgId: 'ORG001',
    name: '',
    holidayDate: '',
    description: '',
    applicableEmploymentTypes: '',
    isPaid: true,
    isOptional: false
  });

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [holidaysData, weeklyOffData] = await Promise.all([
        holidayApi.getAll('ORG001', selectedYear),
        holidayApi.getWeeklyOff('ORG001')
      ]);
      setHolidays(holidaysData);
      setWeeklyOffs(weeklyOffData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      if (editingHoliday) {
        await holidayApi.update(editingHoliday.id, newHoliday);
        setMessage({ type: 'success', text: 'Holiday updated successfully!' });
      } else {
        await holidayApi.create(newHoliday);
        setMessage({ type: 'success', text: 'Holiday added successfully!' });
      }
      setShowAddModal(false);
      setEditingHoliday(null);
      setNewHoliday({
        orgId: 'ORG001',
        name: '',
        holidayDate: '',
        description: '',
        applicableEmploymentTypes: '',
        isPaid: true,
        isOptional: false
      });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save holiday.' });
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await holidayApi.delete(id);
      setMessage({ type: 'success', text: 'Holiday deleted successfully!' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete holiday.' });
    }
  };

  const handleEditHoliday = (holiday) => {
    setEditingHoliday(holiday);
    setNewHoliday({
      orgId: holiday.orgId,
      name: holiday.name,
      holidayDate: holiday.holidayDate,
      description: holiday.description || '',
      applicableEmploymentTypes: holiday.applicableEmploymentTypes || '',
      isPaid: holiday.isPaid,
      isOptional: holiday.isOptional
    });
    setShowAddModal(true);
  };

  const handleSaveWeeklyOff = async (empType, days, alternateSat) => {
    try {
      await holidayApi.saveWeeklyOff({
        orgId: 'ORG001',
        employmentType: empType,
        weeklyOffDays: days,
        alternateSaturdayRule: alternateSat
      });
      setMessage({ type: 'success', text: 'Weekly off configuration saved!' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save weekly off configuration.' });
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { weekday: 'short' });
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
          <h1 className="text-2xl font-bold text-slate-800">🎉 Holiday Management</h1>
          <p className="text-slate-500 text-sm mt-1">Configure holidays and weekly offs</p>
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

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
        <div className="flex">
          <button
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all relative ${
              activeTab === "holidays"
                ? "text-emerald-600 bg-emerald-50"
                : "text-slate-500 hover:text-emerald-600 hover:bg-slate-50"
            }`}
            onClick={() => setActiveTab("holidays")}
          >
            <span className="text-lg">📅</span>
            <span>Yearly Holidays</span>
            {activeTab === "holidays" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
            )}
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all relative ${
              activeTab === "weekly"
                ? "text-emerald-600 bg-emerald-50"
                : "text-slate-500 hover:text-emerald-600 hover:bg-slate-50"
            }`}
            onClick={() => setActiveTab("weekly")}
          >
            <span className="text-lg">🔄</span>
            <span>Weekly Off</span>
            {activeTab === "weekly" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
            )}
          </button>
        </div>
      </div>

      {/* Holidays Tab */}
      {activeTab === "holidays" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all font-medium flex items-center gap-2"
            >
              <span>+</span> Add Holiday
            </button>
          </div>

          {/* Holiday Cards (Mobile) / Table (Desktop) */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {/* Mobile View - Cards */}
            <div className="md:hidden divide-y">
              {holidays.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <span className="text-4xl block mb-2">📅</span>
                  No holidays configured for {selectedYear}
                </div>
              ) : (
                holidays.map((h) => (
                  <div key={h.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-slate-800">{h.name}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          {formatDate(h.holidayDate)} ({getDayOfWeek(h.holidayDate)})
                        </div>
                        <div className="flex gap-2 mt-2">
                          {h.isPaid && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">Paid</span>
                          )}
                          {h.isOptional && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">Optional</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditHoliday(h)} className="text-blue-500">✏️</button>
                        <button onClick={() => handleDeleteHoliday(h.id)} className="text-red-500">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Applicable To</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {holidays.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <span className="text-4xl block mb-2">📅</span>
                        No holidays configured for {selectedYear}
                      </td>
                    </tr>
                  ) : (
                    holidays.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                          {formatDate(h.holidayDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {getDayOfWeek(h.holidayDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                          {h.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {h.applicableEmploymentTypes?.replace(/_/g, ' ') || 'All'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-2">
                            {h.isPaid && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">Paid</span>
                            )}
                            {h.isOptional && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">Optional</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditHoliday(h)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteHoliday(h.id)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Off Tab */}
      {activeTab === "weekly" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {['FULL_TIME', 'PART_TIME', 'CONTRACT'].map((empType) => {
            const config = weeklyOffs.find(w => w.employmentType === empType) || {
              weeklyOffDays: empType === 'PART_TIME' ? 'SUNDAY' : 'SATURDAY,SUNDAY',
              alternateSaturdayRule: 'NONE'
            };

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
                    <div>
                      <h3 className="font-bold">{info.label}</h3>
                      <p className="text-sm opacity-80">Weekly Off Config</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-3">Weekly Off Days</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map(day => {
                        const isChecked = config.weeklyOffDays?.includes(day);
                        return (
                          <button
                            key={day}
                            onClick={() => {
                              const currentDays = config.weeklyOffDays?.split(',').filter(d => d) || [];
                              let newDays;
                              if (isChecked) {
                                newDays = currentDays.filter(d => d !== day);
                              } else {
                                newDays = [...currentDays, day];
                              }
                              handleSaveWeeklyOff(empType, newDays.join(','), config.alternateSaturdayRule);
                            }}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                              isChecked
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Alternate Saturday</label>
                    <select
                      value={config.alternateSaturdayRule || 'NONE'}
                      onChange={(e) => handleSaveWeeklyOff(empType, config.weeklyOffDays, e.target.value)}
                      className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    >
                      <option value="NONE">No alternate rule</option>
                      <option value="ALL_SATURDAYS_OFF">All Saturdays Off</option>
                      <option value="SECOND_AND_FOURTH_OFF">2nd & 4th Off</option>
                      <option value="FIRST_AND_THIRD_OFF">1st & 3rd Off</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingHoliday ? '✏️ Edit Holiday' : '➕ Add Holiday'}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditingHoliday(null); }}
                className="text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Holiday Name *</label>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
                  required
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g., Republic Day"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Date *</label>
                <input
                  type="date"
                  value={newHoliday.holidayDate}
                  onChange={(e) => setNewHoliday({...newHoliday, holidayDate: e.target.value})}
                  required
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  value={newHoliday.description}
                  onChange={(e) => setNewHoliday({...newHoliday, description: e.target.value})}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Applicable To</label>
                <select
                  value={newHoliday.applicableEmploymentTypes}
                  onChange={(e) => setNewHoliday({...newHoliday, applicableEmploymentTypes: e.target.value})}
                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">All Employees</option>
                  <option value="FULL_TIME">Full Time Only</option>
                  <option value="PART_TIME">Part Time Only</option>
                  <option value="FULL_TIME,PART_TIME">Full Time & Part Time</option>
                </select>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHoliday.isPaid}
                    onChange={(e) => setNewHoliday({...newHoliday, isPaid: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Paid Holiday</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHoliday.isOptional}
                    onChange={(e) => setNewHoliday({...newHoliday, isOptional: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Optional</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingHoliday(null); }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                >
                  {editingHoliday ? 'Update' : 'Add'} Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HolidayManagement;
