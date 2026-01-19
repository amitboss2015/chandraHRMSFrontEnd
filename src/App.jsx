import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

// Public Pages (SaaS Landing & Registration)
import LandingPage from "./routes/Public/LandingPage";
import CompanyRegister from "./routes/Public/CompanyRegister";
import ActivateAccount from "./routes/Public/ActivateAccount";

import Dashboard from "./routes/Dashboard";
import Login from "./routes/Auth/Login";
import Signup from "./routes/Auth/Signup";
import EmployeeList from "./routes/Employees/EmployeeList";
import EmployeeUpsert from "./routes/Employees/EmployeeUpsert";
import EmployeeProfile from "./routes/Employees/EmployeeProfile";
import EmployeeImport from "./routes/Employees/EmployeeImport";

import ShiftList from "./routes/Shifts/ShiftList";
import ShiftAssign from "./routes/Shifts/ShiftAssign";
import AttendanceLogs from "./routes/Attendance/AttendanceLogs";
import AttendanceSheet from "./routes/Attendance/AttendanceSheet";
import PayrollGen from "./routes/Payroll/PayrollGen";
import Payroll from "./routes/Payroll/payroll";
import SalarySheets from "./routes/Payroll/SalarySheets";
import Payslip from "./routes/Payroll/Payslip";
import Loans from "./routes/Loans/Loans.jsx";
import Reports from "./routes/Reports/Reports";
import LeaveTypes from "./routes/Leaves/LeaveTypes";
import MarkLeave from "./routes/Leaves/MarkLeave";
import LeaveManagement from "./routes/Leaves/LeaveManagement";
import HolidayManagement from "./routes/Settings/HolidayManagement";
import SalaryOvertimeConfig from "./routes/Settings/SalaryOvertimeConfig";
import DeviceManagement from "./routes/Settings/DeviceManagement";
import SuperAdminDashboard from "./routes/Admin/SuperAdminDashboard";

// Main Layout Component with responsive sidebar
function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes - SaaS Onboarding */}
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/register" element={<CompanyRegister />} />
          <Route path="/activate/:token" element={<ActivateAccount />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                   
                    <Route path="/employees">
                      <Route index element={<EmployeeList />} />
                      <Route path="new" element={<EmployeeUpsert mode="create" />} />
                      <Route path="import" element={<EmployeeImport />} />
                      <Route path=":empCode" element={<EmployeeProfile />} />
                      <Route path=":empCode/edit" element={<EmployeeUpsert mode="edit" />} />
                    </Route>

                    <Route path="/shifts" element={<ShiftList />} />
                    <Route path="/shifts/assign" element={<ShiftAssign />} />
                    <Route path="/leaves/*" element={<LeaveManagement />} />
                    <Route path="/attendance" element={<AttendanceSheet />} />
                    <Route path="/attendance/logs" element={<AttendanceLogs />} />
                   
                    <Route path="/payroll/generate" element={<PayrollGen />} />
                    <Route path="/payroll" element={<Payroll />} />
                    <Route path="/payroll/sheets" element={<SalarySheets />} />

                    <Route path="/loans" element={<Loans />} />
                    <Route path="/reports/*" element={<Reports />} />
                    <Route path="/holidays" element={<HolidayManagement />} />
                    <Route path="/settings/holidays" element={<HolidayManagement />} />
                    <Route path="/settings/salary-overtime" element={<SalaryOvertimeConfig />} />
                    <Route path="/settings/devices" element={<DeviceManagement />} />
                    
                    {/* Super Admin Routes */}
                    <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
