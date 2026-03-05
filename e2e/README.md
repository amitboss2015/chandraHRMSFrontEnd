# E2E: Data-driven flow from Excel

You fill an **Excel file** with your test data; Playwright runs the full flow in the browser (login → device → shift → leave → salary/OT → employee → shift assign → attendance → allowance → payroll).

## 1. Generate the Excel template

From the **project root** (attendance-ui-auth):

```bash
npm run e2e:template
```

This creates `e2e/data/e2e-input.xlsx` with one **sheet per page** and **column headers** that match the UI (e.g. `Login_Email`, `Device_Code`, `Shift_Code`, `Emp_Code`, `Generate`).

## 2. Fill the Excel

Open `e2e/data/e2e-input.xlsx` and fill **row 2** (first data row) for each sheet you want to run:

| Sheet | What to fill |
|-------|----------------|
| **Config** | `baseURL`, `Login_Email`, `Login_Password`, `Default_Month`, `Default_Year` |
| **Login** | Optional override: `Email`, `Password` |
| **Device** | `Device_Code`, `Device_Name`, `Location`, `Is_Default` (Y/N) |
| **Shift** | `Shift_Code`, `Shift_Name`, `Start_Time`, `End_Time`, `Break_Mins`, `Grace_*`, `Rounding`, `Mon`–`Sun` (Y/N), `Active` (Y/N) |
| **LeaveType** | `Code`, `Name`, `Is_Paid` (Y/N), `Accrual_Mode`, `Consume_Order`, `Min_Unit`, `Active` |
| **SalaryOvertime** | `Overtime_Min_Threshold_Mins`, `Full_Day_Min_Hours`, `Save_Changes` (Y) |
| **Employee** | `Emp_Code`, `First_Name`, `Last_Name`, `Email`, `Join_Date`, `Department`, `Designation`, `Base_Salary`, `Employment_Type` |
| **ShiftAssignment** | `Shift_Code`, `Employee_Codes` (comma-separated, e.g. E001,E002) |
| **AttendanceImport** | `Device_Code`, `Month`, `Year` (optional file path later) |
| **Allowance** | `Code`, `Name`, `Amount`, `Calculation_Basis`, `Days_Basis`, `Payout_Month`/`Payout_Year` for FIXED |
| **AllowanceAssignment** | `Allowance_Code`, `Employee_Codes` (comma-separated) |
| **Payroll** | `Device_Code`, `Month`, `Year`, `Generate` (Y to click Generate) |

Leave a sheet’s row 2 empty if you want to **skip** that step.

## 3. Run the E2E test

1. **First time:** Install Playwright browsers: `npx playwright install`
2. Start the app and backend (e.g. `npm run dev` and run the Spring Boot backend).
3. From project root:

```bash
npm run e2e
```

Or with a custom Excel path and base URL:

```bash
E2E_BASE_URL=http://localhost:5173 E2E_EXCEL_PATH=e2e/data/e2e-input.xlsx npm run e2e
```

- **Headed (see browser):** `npm run e2e:headed`
- **UI mode:** `npx playwright test --config=e2e/playwright.config.ts --ui`

## 4. Order of steps

The test runs in this order so that each step can depend on the previous one:

1. Login (Config / Login sheet)
2. Biometric device (Settings → Biometric Devices)
3. Shift (Shifts → Manage Shifts)
4. Leave type (Leaves → Leave Types tab)
5. Salary & OT (Settings → Salary & OT Rules)
6. Employee (Employees → Add)
7. Shift assignment (Shifts → Assign Shifts)
8. Attendance import (Attendance → Import tab; device/month/year from Excel)
9. Allowance type (Settings → Allowance Types)
10. Payroll generate (Payroll → Generate, if `Generate` = Y)

## 5. Tips

- Use **one row of data per sheet** (row 2). For multiple devices/shifts/employees, you can extend the test later to loop over rows.
- If the UI adds new fields, add columns to the Excel and update `e2e/tests/full-flow-from-excel.spec.js` to fill them.
- To add **file upload** (e.g. attendance file), put the file path in the Excel and use `page.setInputFiles()` in the spec for the AttendanceImport step.
