import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../../utils/apiConfig";

/**
 * Account Activation Page
 * Handles the activation link clicked from email
 */
function ActivateAccount() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("");
  const [tenantInfo, setTenantInfo] = useState(null);
  
  // Prevent double API calls (React StrictMode in dev causes double mount)
  const activationAttempted = useRef(false);

  useEffect(() => {
    if (token && !activationAttempted.current) {
      activationAttempted.current = true;
      activateAccount();
    } else if (!token) {
      setStatus("error");
      setMessage("Invalid activation link. No token provided.");
    }
  }, [token]);

  const activateAccount = async () => {
    try {
      const response = await fetch(`${API_BASE}/public/activate/${token}`);
      const data = await response.json();
      
      // Handle success OR "already activated" (which means it was successful before)
      if (response.ok && data.success) {
        setStatus("success");
        setMessage(data.message);
        setTenantInfo({
          tenantId: data.tenantId,
          subdomain: data.subdomain,
        });
        
        // Auto-redirect to login after 5 seconds
        setTimeout(() => {
          navigate("/login");
        }, 5000);
      } else if (data.message && data.message.toLowerCase().includes("already been activated")) {
        // Already activated is essentially a success - redirect to login
        setStatus("success");
        setMessage("Your account is already activated! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(data.message || "Activation failed. The link may be invalid or expired.");
      }
    } catch (err) {
      console.error("Activation error:", err);
      setStatus("error");
      setMessage("Network error. Please try again later.");
    }
  };

  // Loading State
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                      flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="animate-spin w-16 h-16 border-4 border-indigo-600 border-t-transparent 
                          rounded-full mx-auto mb-6"></div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Activating Your Account...</h1>
          <p className="text-slate-500">Please wait while we set up your company.</p>
        </div>
      </div>
    );
  }

  // Success State
  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                      flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🎉</span>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Account Activated!</h1>
          
          <p className="text-slate-600 mb-6">
            Your company has been successfully set up. You can now start using HRMS!
          </p>
          
          {tenantInfo && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-emerald-800 text-sm mb-1">
                <strong>Your Company ID:</strong> {tenantInfo.tenantId}
              </p>
              <p className="text-emerald-800 text-sm">
                <strong>Your URL:</strong> {tenantInfo.subdomain}.hrms.in
              </p>
            </div>
          )}
          
          <Link
            to="/login"
            className="block w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 
                       rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition"
          >
            Login to Your Dashboard →
          </Link>
          
          <p className="text-slate-400 text-sm mt-4">
            Redirecting to login in 5 seconds...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                    flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">😕</span>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Activation Failed</h1>
        
        <p className="text-slate-600 mb-6">
          {message}
        </p>
        
        <div className="space-y-3">
          <Link
            to="/register"
            className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 
                       rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition"
          >
            Register Again
          </Link>
          
          <Link
            to="/login"
            className="block w-full border border-slate-300 text-slate-600 py-3 rounded-lg 
                       font-medium hover:bg-slate-50 transition"
          >
            Back to Login
          </Link>
        </div>
        
        <p className="text-slate-400 text-sm mt-6">
          Need help?{" "}
          <a href="mailto:support@hrms.in" className="text-indigo-600 hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

export default ActivateAccount;
