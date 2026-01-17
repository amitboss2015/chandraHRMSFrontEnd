import React from "react";
import { Link } from "react-router-dom";

/**
 * Modern SaaS Landing Page for ChandraHR
 * Features: Hero, Features Grid, Pricing, CTA
 */
function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🌙</span>
              </div>
              <span className="text-xl font-bold">ChandraHR</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-slate-300 hover:text-white transition">
                Login
              </Link>
              <Link 
                to="/register" 
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/30 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-2 mb-6">
            <span className="animate-pulse w-2 h-2 bg-emerald-400 rounded-full"></span>
            <span className="text-sm text-indigo-300">Free 14-day trial • No credit card required</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            From <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Attendance</span>
            <br />to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Payroll</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-3xl mx-auto">
            The all-in-one HR management platform that automates attendance tracking, 
            leave management, and payroll processing. Simple, powerful, affordable.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/register"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 
                         px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-indigo-500/30 
                         transition-all hover:scale-105 flex items-center gap-2"
            >
              Create Your Company Free
              <span>→</span>
            </Link>
            <a 
              href="#features"
              className="px-8 py-4 rounded-xl font-semibold text-lg border border-slate-700 
                         hover:border-slate-600 hover:bg-slate-800 transition"
            >
              See How It Works
            </a>
          </div>
          
          {/* Trust badges */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-slate-500">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <span className="text-sm">Secure & Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">☁️</span>
              <span className="text-sm">Cloud-Based</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📱</span>
              <span className="text-sm">Mobile Friendly</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span className="text-sm">Setup in 5 mins</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Stop juggling multiple tools. Manage your entire HR workflow from one powerful dashboard.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon="✅"
              title="Attendance Tracking"
              description="Import biometric data, track punches, handle multi-shift employees, and manage overtime automatically."
              color="emerald"
            />
            <FeatureCard 
              icon="📝"
              title="Leave Management"
              description="Configure leave types, track balances, approve requests, and maintain complete leave history."
              color="blue"
            />
            <FeatureCard 
              icon="💰"
              title="Payroll Processing"
              description="Auto-calculate salaries with ESI, PF, advances, loans. Generate payslips with one click."
              color="amber"
            />
            <FeatureCard 
              icon="🏢"
              title="Multi-Branch Support"
              description="Manage multiple offices, departments, and shifts under one account."
              color="purple"
            />
            <FeatureCard 
              icon="📊"
              title="Reports & Analytics"
              description="Comprehensive reports for attendance, leaves, payroll, and employee performance."
              color="rose"
            />
            <FeatureCard 
              icon="⚙️"
              title="Configurable Rules"
              description="Set your own OT rules, salary thresholds, late penalties, and calculation formulas."
              color="cyan"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Started in Minutes</h2>
            <p className="text-slate-400 text-lg">No complex setup. No IT team required.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard 
              number="1"
              title="Create Your Account"
              description="Enter your company name, email, and create a password. Takes 30 seconds."
            />
            <StepCard 
              number="2"
              title="Add Employees"
              description="Import from Excel or add manually. Set up shifts, departments, and roles."
            />
            <StepCard 
              number="3"
              title="Start Managing"
              description="Import attendance, manage leaves, generate payroll. You're ready to go!"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400 text-lg">Start free. Upgrade when you're ready.</p>
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Free Trial</h3>
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
                  14 Days
                </span>
              </div>
              
              <div className="mb-6">
                <span className="text-5xl font-bold">₹0</span>
                <span className="text-slate-400 ml-2">for 14 days</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400">✓</span> Up to 25 employees
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400">✓</span> All features included
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400">✓</span> Attendance & Payroll
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400">✓</span> Leave Management
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400">✓</span> Email Support
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400">✓</span> No credit card required
                </li>
              </ul>
              
              <Link 
                to="/register"
                className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 
                           hover:to-purple-700 text-center py-4 rounded-xl font-semibold text-lg transition"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Simplify Your HR?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Start managing your workforce efficiently with ChandraHR - built for Indian businesses.
          </p>
          <Link 
            to="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 
                       hover:from-emerald-600 hover:to-teal-600 px-8 py-4 rounded-xl font-semibold 
                       text-lg shadow-lg shadow-emerald-500/30 transition-all hover:scale-105"
          >
            Create Your Company Now
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-sm">🌙</span>
            </div>
            <span className="font-bold">ChandraHR</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 ChandraHR. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description, color }) {
  const colorClasses = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
    rose: "from-rose-500/20 to-rose-500/5 border-rose-500/30",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
  };
  
  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-6 hover:scale-105 transition-transform`}>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

// Step Card Component
function StepCard({ number, title, description }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full 
                      flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

export default LandingPage;
