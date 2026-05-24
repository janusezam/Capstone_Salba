import React, { useState } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      const role = res.data.user.role;
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "rescuer") {
        navigate("/rescuer");
      } else {
        navigate("/user");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/google-login", {
        credential: credentialResponse.credential,
      });
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      const role = res.data.user.role;
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "rescuer") {
        navigate("/rescuer");
      } else {
        navigate("/user");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Google authentication failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google login failed. Please try again.");
  };

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 flex-col justify-between p-12">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-3 mb-20">
            <img
              src="/CDRRMO_LOGO.png"
              alt="SALBA Logo"
              className="w-10 h-10 rounded-lg bg-white object-contain p-1"
            />
            <h1 className="text-2xl font-bold text-white">DisasterSOS</h1>
          </div>

          {/* Main Heading */}
          <h2 className="text-5xl font-bold text-white mb-6 leading-tight">Emergency Response Coordination</h2>
          <p className="text-lg text-blue-100 mb-12">Manage and coordinate disaster response operations with real-time alerts and team management.</p>

          {/* Features List */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Real-time Alerts</p>
                <p className="text-sm text-blue-100">Instant disaster notifications and tracking</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Team Coordination</p>
                <p className="text-sm text-blue-100">Assign and manage rescue operations</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Analytics & Reports</p>
                <p className="text-sm text-blue-100">Comprehensive emergency statistics</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-blue-100 text-sm">
          <p>Serving Malaybalay City Emergency Management</p>
          <p className="mt-1">© 2026 DisasterSOS. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-2 mb-8">
              <img
                src="/CDRRMO_LOGO.png"
                alt="SALBA Logo"
                className="w-8 h-8 rounded-lg object-contain"
              />
              <h1 className="text-xl font-bold text-slate-900">DisasterSOS</h1>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-600">Sign in to your emergency management account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5 mb-8">
            {/* Username or Email Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Username or Email</label>
              <input
                type="text"
                placeholder="juan.dela.cruz or juan@example.com"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 pr-10 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500" />
                <span className="text-slate-700">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-600">Or continue with</span>
            </div>
          </div>

          {/* Google Login */}
          <div className="mb-8">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signin"
              width="350"
            />
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-slate-600">
              Admin accounts are created only by existing admins in User Management.
            </p>
            <p className="text-xs text-slate-500 mt-3">
              By continuing, you acknowledge our{" "}
              <Link to="/terms-and-conditions" className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2">
                Terms and Conditions
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
