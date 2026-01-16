// AttendanceReport.jsx - Real API Integration
import React, { useState, useEffect } from "react";
import { reportApi } from "../../services/api";

function AttendanceReport() {
  const now = new Date();
  const [reportType, setReportType] = useState("monthly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      if (reportType === 'monthly') {
        const result = await reportApi.getMonthlyAttendance(year, month);
        setData(result);
      } else {
        const result = await reportApi.getDailyAttendance(date);
        setData(result);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, year, month, date]);

  const getMonthName = (m) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[m - 1];
  };

  const exportToCSV = () => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${reportType === 'monthly' ? `${year}_${month}` : date}.csv`;
    link.click();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Report Type:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="monthly">Monthly Summary</option>
            <option value="daily">Daily Report</option>
          </select>
        </div>

        {reportType === 'monthly' ? (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Month:</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Year:</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
        )}

        <button
          onClick={loadReport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Generate Report
        </button>

        {data.length > 0 && (
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <p>No data available for the selected period.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
            <thead className="bg-gray-50">
              <tr>
                {reportType === 'monthly' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Present</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Absent</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Half Day</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Leave</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Work Hours</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">OT Hours</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">In Time</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Out Time</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Work Mins</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-gray-50'}>
                  {reportType === 'monthly' ? (
                    <>
                      <td className="px-4 py-3 text-sm font-medium">{row.empCode}</td>
                      <td className="px-4 py-3 text-sm">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.department || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">{row.present}</td>
                      <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">{row.absent}</td>
                      <td className="px-4 py-3 text-sm text-center text-yellow-600">{row.halfDay}</td>
                      <td className="px-4 py-3 text-sm text-center text-blue-600">{row.leave}</td>
                      <td className="px-4 py-3 text-sm text-right">{row.totalWorkHours}</td>
                      <td className="px-4 py-3 text-sm text-right text-purple-600">{row.overtimeHours}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-medium">{row.empCode}</td>
                      <td className="px-4 py-3 text-sm">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.department || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          row.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                          row.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                          row.status === 'LEAVE' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{row.inTime}</td>
                      <td className="px-4 py-3 text-sm text-center">{row.outTime}</td>
                      <td className="px-4 py-3 text-sm text-right">{row.workMins}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AttendanceReport;
