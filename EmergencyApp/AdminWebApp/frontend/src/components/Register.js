import React, { useState } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", organization: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!agreeTerms) {
      setError("Please accept the Terms and Conditions before creating an account");
      return;
    }

    setLoading(true);
    try {
      const acceptedAt = new Date().toISOString();
      const res = await API.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        organization: form.organization,
        termsAccepted: true,
        termsVersion: '2026-04-09',
        termsAcceptedAt: acceptedAt,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate(res.data.user.role === "admin" ? "/admin" : "/user");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");

    if (!agreeTerms) {
      setError("Please accept the Terms and Conditions before signing up with Google");
      return;
    }

    setLoading(true);
    try {
      const acceptedAt = new Date().toISOString();
      const res = await API.post("/auth/google-login", {
        credential: credentialResponse.credential,
        termsAccepted: true,
        termsVersion: '2026-04-09',
        termsAcceptedAt: acceptedAt,
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
    setError("Google registration failed. Please try again.");
  };

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 flex-col justify-between p-12">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-3 mb-20">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-blue-600">
              S
            </div>
            <h1 className="text-2xl font-bold text-white">DisasterSOS</h1>
          </div>

          {/* Main Heading */}
          <h2 className="text-5xl font-bold text-white mb-6 leading-tight">Join Our Response Team</h2>
          <p className="text-lg text-blue-100 mb-12">Create an account to coordinate disaster response operations and help save lives in your community.</p>

          {/* Features List */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Community Coordination</p>
                <p className="text-sm text-blue-100">Join responders across Malaybalay City</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Real-time Information</p>
                <p className="text-sm text-blue-100">Access live disaster data and maps</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Organized Response</p>
                <p className="text-sm text-blue-100">Manage and coordinate rescue operations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-blue-100 text-sm">
          <p>Create an account and be part of Malaybalay's emergency response network</p>
          <p className="mt-1">© 2026 DisasterSOS. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
                S
              </div>
              <h1 className="text-xl font-bold text-slate-900">DisasterSOS</h1>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h2>
            <p className="text-slate-600">Join the emergency response network</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5 mb-8">
            {/* Full Name Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Organization Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Organization / Agency</label>
              <input
                type="text"
                placeholder="Your organization name"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-10 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 mt-1 rounded border-slate-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              />
              <label htmlFor="terms" className="text-sm text-slate-600 cursor-pointer">
                I agree to the{" "}
                <Link to="/terms-and-conditions" className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2">
                  Terms and Conditions
                </Link>
                {" "}including data privacy compliance and accountability for false alerts.
              </label>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-75 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Creating Account..." : "Create Account"}
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

          {/* Google Signup */}
          <div className="mb-8">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signup_with"
              width="350"
            />
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
