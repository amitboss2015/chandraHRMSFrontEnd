// ------------- Excel Template -> Internal Model mapping -------------
export const TEMPLATE_TO_MODEL = {
  "Emp Code": "emp_code",
  "First Name": "first_name",
  "Last Name": "last_name",
  "Employment Type": "employment_type",
  "Department": "department",
  "Designation": "designation",
  "Shift(s)": "shifts",
  "Join Date": "join_date",
  "Status": "status",

  // Payroll
  "Salary Basis": "salary_basis", // MONTHLY | HOURLY
  "Base Salary": "base_salary",
  "Hourly Rate": "hourly_rate",

  // Contacts
  "Email": "email",
  "Phone": "phone",
  "Current Address": "address",
  "City": "city",
  "State": "state",
  "Pincode": "pincode",

  // KYC / Bank
  "Aadhaar Number": "aadhaar",
  "PAN Number": "pan",
  "Bank Account Number": "bank_account",
  "IFSC Code": "ifsc",

  // Emergency
  "Emergency Contact Name": "emergency_contact_name",
  "Emergency Contact Phone": "emergency_contact_phone",

  // Optional employment extras (add if present in your sheet)
  "Work Location": "work_location",
  "Reporting Manager": "reporting_manager",
  "UAN": "uan",
  "ESIC": "esic",

  // OT (per-employee policy)
  "OT Allowed": "ot_allowed",
  "OT Duration": "ot_duration", // e.g. "02:00" or minutes
};

// ------------- UI labels + grouping (used by Profile/Drawer) -------------
export const FIELD_META = {
  // Profile
  emp_code:   { label: "Emp Code", group: "Profile" },
  first_name: { label: "First Name", group: "Profile" },
  last_name:  { label: "Last Name", group: "Profile" },

  // Employment
  employment_type:   { label: "Employment Type", group: "Employment" },
  department:        { label: "Department", group: "Employment" },
  designation:       { label: "Designation", group: "Employment" },
  join_date:         { label: "Join Date", group: "Employment" },
  status:            { label: "Status", group: "Employment" },
  work_location:     { label: "Work Location", group: "Employment" },
  reporting_manager: { label: "Reporting Manager", group: "Employment" },
  uan:               { label: "UAN", group: "Employment" },
  esic:              { label: "ESIC", group: "Employment" },

  // Payroll & Bank
  salary_basis:   { label: "Salary Basis", group: "Payroll & Bank" },
  base_salary:    { label: "Base Salary", group: "Payroll & Bank" },
  hourly_rate:    { label: "Hourly Rate", group: "Payroll & Bank" },
  ot_allowed:     { label: "Overtime Allowed", group: "Payroll & Bank" },
  ot_duration:    { label: "OT Duration", group: "Payroll & Bank" },
  pan:            { label: "PAN", group: "Payroll & Bank" },
  aadhaar:        { label: "Aadhaar", group: "Payroll & Bank" },
  bank_account:   { label: "Bank Account", group: "Payroll & Bank" },
  ifsc:           { label: "IFSC", group: "Payroll & Bank" },

  // Shifts & Leave
  shifts:       { label: "Shifts", group: "Shifts & Leave" },
  weekly_off:   { label: "Weekly Off", group: "Shifts & Leave" },
  leave_policy: { label: "Leave Policy", group: "Shifts & Leave" },

  // Contacts
  email:                  { label: "Email", group: "Contacts" },
  phone:                  { label: "Phone", group: "Contacts" },
  address:                { label: "Address", group: "Contacts" },
  city:                   { label: "City", group: "Contacts" },
  state:                  { label: "State", group: "Contacts" },
  pincode:                { label: "Pincode", group: "Contacts" },
  emergency_contact_name: { label: "Emergency Contact", group: "Contacts" },
  emergency_contact_phone:{ label: "Emergency Phone", group: "Contacts" },

  // Documents (optional placeholders)
  address_proof: { label: "Address Proof", group: "Documents" },
  bank_doc:      { label: "Bank Proof", group: "Documents" },

  // Activity (computed)
  last_punch:    { label: "Last Punch", group: "Activity" },
  last_late_min: { label: "Last Late (min)", group: "Activity" },
  last_ot_min:   { label: "Last OT (min)", group: "Activity" },
};

// ------------- Convenience exports -------------
export const ALL_MODEL_FIELDS = Array.from(
  new Set([
    ...Object.values(TEMPLATE_TO_MODEL),
    // include fields that may not appear in the template but are shown in UI
    "weekly_off",
    "leave_policy",
    "address_proof",
    "bank_doc",
    "last_punch",
    "last_late_min",
    "last_ot_min",
  ])
);

// Order of tabs/sections in the profile view & drawers
export const GROUP_ORDER = [
  "Profile",
  "Employment",
  "Payroll & Bank",
  "Shifts & Leave",
  "Contacts",
  "Documents",
  "Activity",
];
