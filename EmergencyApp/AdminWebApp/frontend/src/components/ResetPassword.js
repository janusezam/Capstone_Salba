import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../api";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "./ui/Button";

function ResetPassword() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing reset token. Please open the reset link again.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/reset-password", {
        token,
        newPassword,
      });
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <CheckCircle className="w-16 h-16 text-salba-success" />
          </div>
          <h1 className="text-3xl font-bold text-salba-navy mb-3">Password Updated</h1>
          <p className="text-salba-text-secondary mb-8">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <Link to="/login">
            <Button variant="primary" size="md" className="w-full">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-salba-blue-accent hover:text-salba-blue-primary mb-8 font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>

        <h1 className="text-3xl font-bold text-salba-navy mb-2">Reset Password</h1>
        <p className="text-salba-text-secondary mb-8">Enter your new password to continue.</p>

        {error && (
          <div className="mb-6 p-4 bg-salba-critical/5 border border-salba-critical/30 rounded-lg">
            <p className="text-sm text-salba-critical font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <Button type="submit" variant="primary" size="md" disabled={loading} className="w-full">
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
