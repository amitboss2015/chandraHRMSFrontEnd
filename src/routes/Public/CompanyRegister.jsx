import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:8080/api";

/**
 * Company Self-Registration Page
 * Allows new customers to create their company account
 */
function CompanyRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  
  const [form, setForm] = useState({
    companyName: "",
    adminName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!form.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }
    if (!form.adminName.trim()) {
      newErrors.adminName = "Your name is required";
    }
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (form.phone && form.phone.length < 10) {
      newErrors.phone = "Phone number must be at least 10 digits";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${API_BASE}/public/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          adminName: form.adminName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(true);
        setRegisteredEmail(form.email);
      } else {
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Success State
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                      flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">✉️</span>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email!</h1>
          
          <p className="text-slate-600 mb-6">
            We've sent an activation link to:
            <br />
            <strong className="text-indigo-600">{registeredEmail}</strong>
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-amber-800 text-sm">
              <strong>⏰ Important:</strong> The activation link expires in 24 hours. 
              If you don't see the email, check your spam folder.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = "https://mail.google.com"}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg 
                         font-semibold hover:from-indigo-700 hover:to-purple-700 transition"
            >
              Open Gmail →
            </button>
            
            <Link
              to="/login"
              className="block w-full border border-slate-300 text-slate-600 py-3 rounded-lg 
                         font-medium hover:bg-slate-50 transition"
            >
              Back to Login
            </Link>
          </div>
          
          <p className="text-slate-400 text-sm mt-6">
            Didn't receive the email?{" "}
            <button 
              onClick={async () => {
                try {
                  await fetch(`${API_BASE}/public/resend-activation?email=${encodeURIComponent(registeredEmail)}`, {
                    method: "POST"
                  });
                  alert("Activation email resent!");
                } catch (e) {
                  alert("Failed to resend. Please try again later.");
                }
              }}
              className="text-indigo-600 hover:underline"
            >
              Resend activation link
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                    flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-white">C</span>
            </div>
            <span className="text-xl font-bold text-slate-800">ChandraHR</span>
          </Link>
          
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Create Your Company</h1>
          <p className="text-slate-500">Start your free 14-day trial. No credit card required.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Company Name"
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            placeholder="Acme Corporation"
            error={errors.companyName}
            icon="🏢"
          />
          
          <InputField
            label="Your Name"
            name="adminName"
            value={form.adminName}
            onChange={handleChange}
            placeholder="John Doe"
            error={errors.adminName}
            icon="👤"
          />
          
          <InputField
            label="Work Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="john@acme.com"
            error={errors.email}
            icon="✉️"
          />
          
          <InputField
            label="Phone Number (optional)"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="+91 98765 43210"
            error={errors.phone}
            icon="📱"
          />
          
          <InputField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Min. 8 characters"
            error={errors.password}
            icon="🔒"
          />
          
          <InputField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter password"
            error={errors.confirmPassword}
            icon="🔒"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg 
                       font-semibold hover:from-indigo-700 hover:to-purple-700 transition
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Creating your account...
              </>
            ) : (
              <>
                Create My Company
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>

        {/* Terms */}
        <p className="text-center text-slate-400 text-xs mt-4">
          By creating an account, you agree to our{" "}
          <a href="#" className="text-indigo-500 hover:underline">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-indigo-500 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

// Input Field Component
function InputField({ label, name, type = "text", value, onChange, placeholder, error, icon }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">
          {icon}
        </span>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 
                     transition ${error 
                       ? "border-red-300 focus:ring-red-500" 
                       : "border-slate-300 focus:ring-indigo-500"
                     }`}
        />
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}

export default CompanyRegister;
