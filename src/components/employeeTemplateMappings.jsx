// header -> model keys (as before)
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
  "Salary Basis": "salary_basis",
  "Base Salary": "base_salary",
  "Hourly Rate": "hourly_rate",
  "Email": "email",
  "Phone": "phone",
  "Current Address": "address",
  "City": "city",
  "State": "state",
  "Pincode": "pincode",
  "Aadhaar Number": "aadhaar",
  "PAN Number": "pan",
  "Bank Account Number": "bank_account",
  "IFSC Code": "ifsc",
  "Emergency Contact Name": "emergency_contact_name",
  "Emergency Contact Phone": "emergency_contact_phone",
  // …add the rest of your columns here
};

// provide labels (UI names) and a group for each field
export const FIELD_META = {
  emp_code:               { label: "Emp Code", group: "Profile" },
  first_name:             { label: "First Name", group: "Profile" },
  last_name:              { label: "Last Name", group: "Profile" },
  employment_type:        { label: "Employment Type", group: "Employment" },
  department:             { label: "Department", group: "Employment" },
  designation:            { label: "Designation", group: "Employment" },
  shifts:                 { label: "Shifts", group: "Shifts & Leave" },
  join_date:              { label: "Join Date", group: "Employment" },
  status:                 { label: "Status", group: "Employment" },
  salary_basis:           { label: "Salary Basis", group: "Payroll & Bank" },
  base_salary:            { label: "Base Salary", group: "Payroll & Bank" },
  hourly_rate:            { label: "Hourly Rate", group: "Payroll & Bank" },
  email:                  { label: "Email", group: "Contacts" },
  phone:                  { label: "Phone", group: "Contacts" },
  address:                { label: "Address", group: "Contacts" },
  city:                   { label: "City", group: "Contacts" },
  state:                  { label: "State", group: "Contacts" },
  pincode:                { label: "Pincode", group: "Contacts" },
  aadhaar:                { label: "Aadhaar", group: "KYC" },
  pan:                    { label: "PAN", group: "KYC" },
  bank_account:           { label: "Bank Account", group: "Payroll & Bank" },
  ifsc:                   { label: "IFSC", group: "Payroll & Bank" },
  emergency_contact_name: { label: "Emergency Contact", group: "Contacts" },
  emergency_contact_phone:{ label: "Emergency Phone", group: "Contacts" },
  // …give group+label for every remaining model field you have
};

// helpers
export const ALL_MODEL_FIELDS = Object.values(TEMPLATE_TO_MODEL);
export const GROUP_ORDER = [
  "Profile",
  "Employment",
  "Payroll & Bank",
  "Shifts & Leave",
  "Contacts",
  "KYC",
  "Documents",
  "Activity",
];
