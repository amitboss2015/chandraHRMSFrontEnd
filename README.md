# 🏢 HRMS Frontend

**Human Resource Management System** - A modern React frontend for managing employees, attendance, payroll, leaves, and loans.

![React](https://img.shields.io/badge/React-18.x-blue)
![Vite](https://img.shields.io/badge/Vite-5.x-purple)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-teal)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

### 📊 Dashboard
- Impressive overview with charts
- Weekly attendance visualization
- Quick stats cards
- Quick action buttons
- Recent activity feed
- Mobile-responsive design

### 👥 Employee Management
- Employee listing with search & filters
- Card and table view toggle
- Add/Edit employee forms
- Bulk import via Excel
- Employee profile view
- Grouped information display

### 🕐 Shift Management
- Visual shift cards with timing
- Shift configuration form
- Working days selection
- Grace period and rounding rules
- Shift assignment to employees
- Multi-select employee picker

### ✅ Attendance Tracking
- Excel import from biometric
- Monthly summary report
- Daily attendance records
- Status badges (Present, Absent, Late, etc.)
- Weekly off & Holiday tracking
- Overtime day detection

### 📝 Leave Management
- Mark leave interface
- Leave calendar view
- Leave reports
- Leave type configuration

### 💰 Payroll
- Payroll generation workflow
- Detailed payroll breakdown
- Salary sheets (paid records)
- Payslip generation
- Advance/Due management

### 💳 Loan Management
- Loan list and details
- Add new loan
- Loan reports

### 🎉 Holiday Management
- Yearly holiday calendar
- Weekly off configuration
- Employment type specific settings

---

## 🎨 Design System

### Theme
- **Primary Color**: Emerald/Teal gradient
- **Background**: Slate-50/100 tones
- **Cards**: White with rounded-2xl, subtle shadows
- **Buttons**: Gradient backgrounds with shadows

### Responsive
- Mobile-first approach
- Collapsible sidebar on mobile
- Touch-friendly tap targets
- Adaptive layouts

---

## 🛠 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Library |
| Vite | 5.x | Build tool |
| TailwindCSS | 3.x | Styling |
| React Router | 6.x | Routing |
| xlsx | - | Excel processing |
| file-saver | - | File downloads |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- HRMS Backend running

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/amitboss2015/hrms-frontend.git
   cd hrms-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API URL** (optional)
   
   Create `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:8080/api
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Access the app**
   
   Open: `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

---

## 📁 Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── Card.jsx
│   ├── Modal.jsx
│   ├── Sidebar.jsx
│   ├── Table.jsx
│   ├── Tabs.jsx
│   └── Topbar.jsx
│
├── context/                 # React contexts
│   └── AuthContext.jsx
│
├── routes/                  # Page components
│   ├── Auth/
│   │   ├── Login.jsx
│   │   └── Signup.jsx
│   ├── Dashboard.jsx
│   ├── Employees/
│   │   ├── EmployeeList.jsx
│   │   ├── EmployeeUpsert.jsx
│   │   └── EmployeeProfile.jsx
│   ├── Shifts/
│   │   ├── ShiftList.jsx
│   │   └── ShiftAssign.jsx
│   ├── Attendance/
│   │   ├── AttendanceSheet.jsx
│   │   └── AttendanceLogs.jsx
│   ├── Leaves/
│   │   ├── LeaveManagement.jsx
│   │   └── ...
│   ├── Payroll/
│   │   ├── PayrollGen.jsx
│   │   ├── SalarySheets.jsx
│   │   └── Payslip.jsx
│   ├── Loans/
│   │   └── ...
│   ├── Reports/
│   │   └── ...
│   └── Settings/
│       └── HolidayManagement.jsx
│
├── services/
│   └── api.js               # API client
│
├── App.jsx                  # Main app with routing
├── main.jsx                 # Entry point
└── index.css                # Global styles
```

---

## 🎯 Key Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Overview with stats and charts |
| Employees | `/employees` | Employee list and management |
| Add Employee | `/employees/new` | Create new employee |
| Shifts | `/shifts` | Shift configuration |
| Assign Shifts | `/shifts/assign` | Assign shifts to employees |
| Attendance | `/attendance` | Attendance import and reports |
| Leaves | `/leaves` | Leave management |
| Payroll | `/payroll` | Payroll generation |
| Loans | `/loans` | Loan management |
| Holidays | `/holidays` | Holiday configuration |
| Reports | `/reports` | Various reports |

---

## 🔐 Authentication

Default login credentials (for demo):
- Username: `admin`
- Password: `admin`

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add: your feature"`
4. Push: `git push origin feature/your-feature`
5. Open Pull Request

### Code Style
- Use functional components with hooks
- Follow existing file structure
- Use TailwindCSS for styling
- Keep components focused and small

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

## 👤 Author

**Amit Kumar**
- GitHub: [@amitboss2015](https://github.com/amitboss2015)

---

## 🔗 Related

- [HRMS Backend](https://github.com/amitboss2015/hrms-backend) - Spring Boot API

---

⭐ **Star this repo if you find it helpful!**
