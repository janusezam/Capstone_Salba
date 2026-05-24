import React, { useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "./ui/Button";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devResetCode, setDevResetCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("request");
  const [success, setSuccess] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await API.post("/auth/forgot-password", { email });
      setSubmittedEmail(email);
      setDevResetCode(response?.data?.devResetCode || "");
      setStep("verify");
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset code");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/reset-password", {
        email: submittedEmail,
        code,
        newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex bg-white overflow-hidden">
        {/* Left Panel - Branded */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-salba-navy via-salba-blue-primary to-salba-blue-accent flex-col justify-between p-12">
          <div>
            <div className="flex items-center gap-3 mb-16">
              <img src="/salbalogo.png" alt="SALBA" className="w-12 h-12" />
              <h1 className="text-3xl font-bold text-white">SALBA</h1>
            </div>
            <h2 className="text-5xl font-bold text-white mb-6">Reset Your Password</h2>
            <p className="text-lg text-blue-100">Your password has been changed successfully. You can sign in now.</p>
          </div>
        </div>

        {/* Right Panel - Success Message */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <div className="mb-8 flex justify-center">
              <CheckCircle className="w-16 h-16 text-salba-success" />
            </div>

            <h2 className="text-3xl font-bold text-salba-navy mb-4">Check Your Email</h2>
            <p className="text-salba-text-secondary mb-8">
              Password reset complete for <strong>{submittedEmail}</strong>. You can now log in with your new password.
            </p>

            <div className="bg-salba-bg rounded-card p-6 mb-8">
              <p className="text-sm text-salba-text-secondary">
                If you did not request this, contact your administrator immediately.
              </p>
            </div>

            <Link to="/login">
              <Button variant="primary" size="md" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      {/* Left Panel - Branded */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-salba-navy via-salba-blue-primary to-salba-blue-accent flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <img src="/salbalogo.png" alt="SALBA" className="w-12 h-12" />
            <h1 className="text-3xl font-bold text-white">SALBA</h1>
          </div>
          <h2 className="text-5xl font-bold text-white mb-6">Reset Your Password</h2>
          <p className="text-lg text-blue-100">Enter your email, receive a verification code, then create a new password.</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Back Link */}
          <Link to="/login" className="inline-flex items-center gap-2 text-salba-blue-accent hover:text-salba-blue-primary mb-8 font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          {/* Heading */}
          <h2 className="text-3xl font-bold text-salba-navy mb-2">Forgot Password?</h2>
          <p className="text-salba-text-secondary mb-8">
            {step === "request"
              ? "Enter the email address associated with your account and we'll send a verification code."
              : "Enter the 6-digit code from your email and set your new password."}
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-salba-critical/5 border border-salba-critical/30 rounded-lg">
              <p className="text-sm text-salba-critical font-medium">{error}</p>
            </div>
          )}

          {step === "request" ? (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-salba-navy mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-salba-border rounded-input text-salba-navy placeholder-salba-text-secondary focus:outline-none focus:ring-2 focus:ring-salba-blue-accent focus:border-transparent transition-all"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Sending..." : "Send Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
                Code sent to <strong>{submittedEmail}</strong>
              </div>

              {devResetCode && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-300 text-sm text-yellow-900">
                  Development code: <strong>{devResetCode}</strong>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-salba-navy mb-2">Verification Code</label>
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-salba-border rounded-input text-salba-navy placeholder-salba-text-secondary focus:outline-none focus:ring-2 focus:ring-salba-blue-accent focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-salba-navy mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-salba-border rounded-input text-salba-navy placeholder-salba-text-secondary focus:outline-none focus:ring-2 focus:ring-salba-blue-accent focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-salba-navy mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-salba-border rounded-input text-salba-navy placeholder-salba-text-secondary focus:outline-none focus:ring-2 focus:ring-salba-blue-accent focus:border-transparent transition-all"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Resetting..." : "Verify Code & Reset Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
