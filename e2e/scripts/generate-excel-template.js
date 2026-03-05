/**
 * Generates e2e-input.xlsx template with one sheet per UI page.
 * Column headers = labels/keys you fill in Excel; Playwright reads and uses them.
 * Run: node e2e/scripts/generate-excel-template.js
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', 'data');
const outPath = path.join(outDir, 'e2e-input.xlsx');

const sheets = {
  Config: [
    ['baseURL', 'Login_Email', 'Login_Password', 'Default_Month', 'Default_Year'],
    ['http://localhost:5173', 'your@email.com', 'yourpassword', '1', '2026'],
  ],
  Login: [
    ['Email', 'Password'],
    ['', ''],
  ],
  Device: [
    ['Device_Code', 'Device_Name', 'Location', 'Serial_Number', 'Description', 'Is_Default'],
    ['DEVICE_01', 'Main Gate', 'Mumbai', '', '', 'Y'],
  ],
  Shift: [
    ['Shift_Code', 'Shift_Name', 'Start_Time', 'End_Time', 'Break_Mins', 'Grace_In_Mins', 'Grace_Out_Mins', 'Rounding', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Active'],
    ['GEN', 'General', '09:00', '18:00', '30', '0', '0', 'NONE', 'Y', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y'],
  ],
  LeaveType: [
    ['Code', 'Name', 'Is_Paid', 'Accrual_Mode', 'Consume_Order', 'Min_Unit', 'Active'],
    ['CL', 'Casual Leave', 'Y', 'ANNUAL', 'MONTHLY_THEN_ANNUAL', 'DAY', 'Y'],
  ],
  SalaryOvertime: [
    ['Overtime_Min_Threshold_Mins', 'Full_Day_Min_Hours', 'Overtime_Enabled', 'Save_Changes'],
    ['30', '7', 'Y', 'Y'],
  ],
  Employee: [
    ['Emp_Code', 'First_Name', 'Last_Name', 'Email', 'Join_Date', 'Department', 'Designation', 'Base_Salary', 'Employment_Type'],
    ['E001', 'Test', 'User', 'test@example.com', '2025-01-01', 'IT', 'Developer', '50000', 'FULL_TIME'],
  ],
  ShiftAssignment: [
    ['Shift_Code', 'Employee_Codes'],
    ['GEN', 'E001,E002'],
  ],
  AttendanceImport: [
    ['Device_Code', 'Month', 'Year', 'Import_File_Path_Or_Use_Existing'],
    ['DEVICE_01', '1', '2026', ''],
  ],
  Allowance: [
    ['Code', 'Name', 'Amount', 'Calculation_Basis', 'Days_Basis', 'Shift_Code_Filter', 'Min_Work_Minutes', 'Payout_Month', 'Payout_Year', 'Active'],
    ['FARE', 'Conveyance', '50', 'PER_DAY', 'PRESENT_DAYS', '', '', '', '', 'Y'],
  ],
  AllowanceAssignment: [
    ['Allowance_Code', 'Employee_Codes'],
    ['FARE', 'E001,E002'],
  ],
  Payroll: [
    ['Device_Code', 'Month', 'Year', 'Generate'],
    ['DEVICE_01', '1', '2026', 'Y'],
  ],
};

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const wb = XLSX.utils.book_new();
for (const [sheetName, rows] of Object.entries(sheets)) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}
XLSX.writeFile(wb, outPath);
console.log('Written:', outPath);
