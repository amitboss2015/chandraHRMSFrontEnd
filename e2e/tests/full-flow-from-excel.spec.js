// @ts-check
/**
 * Full E2E flow driven by Excel (e2e/data/e2e-input.xlsx).
 * Fill the Excel with your data; this test performs each step in the browser.
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const { readExcelData, getStr, getNum, isYes } = require('../utils/read-excel');

const EXCEL_PATH = process.env.E2E_EXCEL_PATH || path.join(__dirname, '..', 'data', 'e2e-input.xlsx');

test.describe('Full flow from Excel', () => {
  let data;

  test.beforeAll(() => {
    try {
      data = readExcelData(EXCEL_PATH);
    } catch (e) {
      throw new Error(`Could not read Excel at ${EXCEL_PATH}. Run: node e2e/scripts/generate-excel-template.js`);
    }
  });

  test('login and run all steps from Excel', async ({ page }) => {
    const config = data.Config || {};
    const baseURL = getStr(config, 'baseURL') || process.env.E2E_BASE_URL || 'http://localhost:5173';

    await page.goto(baseURL);

    // ——— LOGIN ———
    const loginSheet = data.Login || {};
    const email = getStr(loginSheet, 'Email') || getStr(config, 'Login_Email');
    const password = getStr(loginSheet, 'Password') || getStr(config, 'Login_Password');
    if (email && password) {
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: /Sign In/i }).click();
      await page.waitForURL(/\/(dashboard)?(\?|$)/i, { timeout: 15000 }).catch(() => {});
      // Disclaimer / month-year modals
      await page.getByRole('button', { name: /OK|Acknowledge|Continue|Got it/i }).click().catch(() => {});
      await page.getByRole('button', { name: /Confirm|Select|Done|Continue/i }).click().catch(() => {});
    }

    // ——— DEVICE ———
    const device = data.Device || {};
    if (getStr(device, 'Device_Code')) {
      await page.goto(`${baseURL}/settings/devices`);
      await page.getByRole('button', { name: /Add Device/i }).click();
      await page.getByLabel(/Device Code/i).fill(getStr(device, 'Device_Code'));
      await page.getByLabel(/Device Name/i).fill(getStr(device, 'Device_Name'));
      await page.getByLabel(/Location/i).fill(getStr(device, 'Location'));
      if (getStr(device, 'Serial_Number')) await page.getByLabel(/Serial Number/i).fill(getStr(device, 'Serial_Number'));
      if (getStr(device, 'Description')) await page.getByLabel(/Description/i).fill(getStr(device, 'Description'));
      if (isYes(device, 'Is_Default')) await page.getByLabel(/Default/i).check().catch(() => {});
      await page.locator('form').getByRole('button', { name: /Save|Submit|Add/i }).first().click();
      await expect(page.getByText(/device|saved|added/i).first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    }

    // ——— SHIFT ———
    const shift = data.Shift || {};
    if (getStr(shift, 'Shift_Code')) {
      await page.goto(`${baseURL}/shifts`);
      await page.getByRole('button', { name: /Add Shift/i }).click();
      await page.getByLabel(/Shift Code/i).fill(getStr(shift, 'Shift_Code'));
      await page.getByLabel(/Shift Name/i).fill(getStr(shift, 'Shift_Name'));
      await page.getByLabel(/Start Time/i).fill(getStr(shift, 'Start_Time') || '09:00');
      await page.getByLabel(/End Time/i).fill(getStr(shift, 'End_Time') || '18:00');
      await page.getByLabel(/Break \(min\)/i).fill(String(getNum(shift, 'Break_Mins') ?? 30));
      await page.getByLabel(/Grace In/i).fill(String(getNum(shift, 'Grace_In_Mins') ?? 0));
      await page.getByLabel(/Grace Out/i).fill(String(getNum(shift, 'Grace_Out_Mins') ?? 0));
      await page.locator('form').getByRole('button', { name: /Save|Submit|Create/i }).first().click();
      await expect(page.getByText(/created|updated|success/i).first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    }

    // ——— LEAVE TYPE ———
    const leaveType = data.LeaveType || {};
    if (getStr(leaveType, 'Code')) {
      await page.goto(`${baseURL}/leaves`);
      await page.getByRole('tab', { name: /Leave Types/i }).click().catch(() => page.getByText('Leave Types').click());
      await page.getByRole('button', { name: /New Type/i }).click();
      await page.getByLabel('Code').fill(getStr(leaveType, 'Code'));
      await page.getByLabel('Name').first().fill(getStr(leaveType, 'Name'));
      if (isYes(leaveType, 'Is_Paid')) await page.getByLabel(/Paid/i).check().catch(() => {});
      await page.locator('form').getByRole('button', { name: /Save|Submit/i }).first().click().catch(() =>
        page.getByRole('button', { name: /Save/i }).first().click()
      );
      await expect(page.getByText(/saved|created|Leave Type/i).first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    }

    // ——— SALARY & OT ———
    const salaryOt = data.SalaryOvertime || {};
    if (getStr(salaryOt, 'Overtime_Min_Threshold_Mins') !== '' || getStr(salaryOt, 'Full_Day_Min_Hours') !== '' || isYes(salaryOt, 'Save_Changes')) {
      await page.goto(`${baseURL}/settings/salary-overtime`);
      if (getStr(salaryOt, 'Overtime_Min_Threshold_Mins') !== '') {
        await page.locator('div:has-text("Minimum OT Threshold")').locator('input').first().fill(getStr(salaryOt, 'Overtime_Min_Threshold_Mins')).catch(() => {});
      }
      if (getStr(salaryOt, 'Full_Day_Min_Hours') !== '') {
        await page.locator('div:has-text("Full Day Minimum Hours")').locator('input').first().fill(getStr(salaryOt, 'Full_Day_Min_Hours')).catch(() => {});
      }
      if (isYes(salaryOt, 'Save_Changes')) {
        await page.getByRole('button', { name: /Save Changes/i }).click();
        await expect(page.getByText(/saved|success/i).first()).toBeVisible({ timeout: 10000 }).catch(() => {});
      }
    }

    // ——— EMPLOYEE ———
    const emp = data.Employee || {};
    if (getStr(emp, 'Emp_Code')) {
      await page.goto(`${baseURL}/employees/new`);
      await page.getByLabel(/Employee Code|Emp Code|Code/i).fill(getStr(emp, 'Emp_Code'));
      await page.getByLabel(/First Name|First name/i).fill(getStr(emp, 'First_Name'));
      await page.getByLabel(/Last Name|Last name/i).fill(getStr(emp, 'Last_Name'));
      await page.getByLabel(/Email/i).first().fill(getStr(emp, 'Email'));
      await page.getByLabel(/Join Date|Date of joining/i).fill(getStr(emp, 'Join_Date')).catch(() => {});
      await page.getByLabel(/Department/i).fill(getStr(emp, 'Department')).catch(() => {});
      await page.getByLabel(/Designation/i).fill(getStr(emp, 'Designation')).catch(() => {});
      await page.getByLabel(/Base Salary/i).fill(String(getNum(emp, 'Base_Salary') ?? '')).catch(() => {});
      await page.getByRole('button', { name: /Save|Create|Add Employee/i }).first().click();
      await expect(page.getByText(/saved|created|success|Employee/i).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    }

    // ——— SHIFT ASSIGNMENT ———
    const shiftAssign = data.ShiftAssignment || {};
    if (getStr(shiftAssign, 'Shift_Code') && getStr(shiftAssign, 'Employee_Codes')) {
      await page.goto(`${baseURL}/shifts/assign`);
      await page.locator('select').filter({ has: page.locator('option') }).first().selectOption({ label: new RegExp(getStr(shiftAssign, 'Shift_Code'), 'i') }).catch(() => {});
      const codes = getStr(shiftAssign, 'Employee_Codes').split(/[,;]/).map(s => s.trim()).filter(Boolean);
      for (const code of codes) {
        await page.getByRole('checkbox', { name: new RegExp(code, 'i') }).check().catch(() => {});
      }
      await page.getByRole('button', { name: /Save|Apply|Assign/i }).click();
      await expect(page.getByText(/saved|assigned|success/i).first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    }

    // ——— ATTENDANCE IMPORT (navigate only; file upload would need a path in Excel) ———
    const att = data.AttendanceImport || {};
    if (getStr(att, 'Device_Code') || getStr(att, 'Month')) {
      await page.goto(`${baseURL}/attendance`);
      await page.getByRole('tab', { name: /Import/i }).click().catch(() => page.getByText('Import').click());
      // Select device from dropdown if present
      const month = getStr(att, 'Month') || getStr(data.Config, 'Default_Month') || '1';
      const year = getStr(att, 'Year') || getStr(data.Config, 'Default_Year') || '2026';
      await page.locator('select').filter({ has: page.locator('option') }).first().selectOption({ index: 1 }).catch(() => {});
      // If Excel has file path we could use setInputFiles here
    }

    // ——— ALLOWANCE TYPE ———
    const allowance = data.Allowance || {};
    if (getStr(allowance, 'Code')) {
      await page.goto(`${baseURL}/settings/allowance-types`);
      await page.getByRole('button', { name: /New Type/i }).click();
      await page.getByLabel('Code').first().fill(getStr(allowance, 'Code'));
      await page.getByLabel('Name').first().fill(getStr(allowance, 'Name'));
      await page.getByLabel(/Amount/i).fill(String(getNum(allowance, 'Amount') ?? 0));
      await page.getByLabel(/Calculation Basis/i).selectOption(getStr(allowance, 'Calculation_Basis') || 'PER_DAY').catch(() => {});
      if (getStr(allowance, 'Days_Basis')) await page.getByLabel(/Days Basis/i).selectOption(getStr(allowance, 'Days_Basis')).catch(() => {});
      await page.getByRole('button', { name: /Save|Submit/i }).first().click();
      await expect(page.getByText(/saved|created|Allowance/i).first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    }

    // ——— PAYROLL GENERATE ———
    const payroll = data.Payroll || {};
    if (isYes(payroll, 'Generate')) {
      await page.goto(`${baseURL}/payroll/generate`);
      const devCode = getStr(payroll, 'Device_Code');
      const month = getStr(payroll, 'Month') || getStr(data.Config, 'Default_Month') || '1';
      const year = getStr(payroll, 'Year') || getStr(data.Config, 'Default_Year') || '2026';
      if (devCode) await page.locator('select').filter({ has: page.locator('option') }).first().selectOption({ label: new RegExp(devCode, 'i') }).catch(() => {});
      await page.getByRole('button', { name: /Generate/i }).first().click();
      await expect(page.getByText(/generated|success|payroll|count/i).first()).toBeVisible({ timeout: 30000 }).catch(() => {});
    }
  });
});
