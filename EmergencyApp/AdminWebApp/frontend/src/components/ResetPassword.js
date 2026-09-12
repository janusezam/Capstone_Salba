import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../api";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

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
      setError("Missing reset token. Please open the reset link again from your email.");
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
      setError(err.response?.data?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F8FA] font-inter">
      {/* Centered Card Form */}
      <div className="w-full max-w-[420px] bg-white border border-[#E5E7EB] shadow-lg p-6 sm:p-8 relative">
        {/* Top Brand Accent Line */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: "linear-gradient(90deg, #CC3A18, #A82A10)" }}
        />

        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B7280] hover:text-brand transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>

        {/* Header Logo */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#F3F4F6]">
          <img src="/transparent-logo.png" alt="CDRRMO Logo" className="w-[40px] h-[40px] object-contain" />
          <div>
            <h1 className="font-barlow font-bold text-[#111214] text-[1.05rem] leading-none">
              MALAYBALAY CITY CDRRMO
            </h1>
            <p className="text-[10.5px] text-[#6B7280] uppercase tracking-wider font-semibold mt-0.5">
              Emergency Command Portal
            </p>
          </div>
        </div>

        {success ? (
          /* SUCCESS STATE */
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-[#CC3A18] mx-auto mb-4" />
            <h2 className="font-barlow font-bold text-[1.5rem] text-[#111214] uppercase mb-2">
              Password Updated
            </h2>
            <p className="text-[13.5px] text-[#6B7280] mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Link
              to="/login"
              className="w-full py-3 text-white font-barlow font-bold text-[1rem] tracking-[0.08em] uppercase transition-all hover:brightness-110 inline-block text-center cursor-pointer"
              style={{ background: "linear-gradient(135deg, #CC3A18, #A82A10)" }}
            >
              SIGN IN NOW
            </Link>
          </div>
        ) : (
          /* FORM STATE */
          <div>
            <h2 className="font-barlow font-bold text-[1.5rem] text-[#111214] uppercase mb-1">
              Set New Password
            </h2>
            <p className="text-[13px] text-[#6B7280] mb-6">
              Enter your new password below to complete your password reset.
            </p>

            {error && (
              <div className="mb-5 border-l-[3px] border-brand bg-brand/5 p-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#374151] font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-barlow text-[0.65rem] tracking-[0.15em] uppercase text-[#374151] font-bold mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-none px-4 py-3 text-[14px] text-[#111214] placeholder-[#9CA3AF] outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="block font-barlow text-[0.65rem] tracking-[0.15em] uppercase text-[#374151] font-bold mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D1D5DB] rounded-none px-4 py-3 text-[14px] text-[#111214] placeholder-[#9CA3AF] outline-none focus:border-brand"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-barlow font-bold text-[1rem] tracking-[0.08em] uppercase transition-all hover:brightness-110 disabled:opacity-75 cursor-pointer mt-2"
                style={{ background: "linear-gradient(135deg, #CC3A18, #A82A10)" }}
              >
                {loading ? "UPDATING..." : "UPDATE PASSWORD"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;


