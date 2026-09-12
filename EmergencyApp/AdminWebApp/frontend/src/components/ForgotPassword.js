import React, { useState, useEffect } from "react";
import API from "../api";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertCircle, Clock, ShieldCheck } from "lucide-react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devResetCode, setDevResetCode] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  
  // Steps: "request" -> "code" -> "password" -> "success"
  const [step, setStep] = useState("request");

  // Timers: 60s resend cooldown, 300s (5 min) code expiration
  const [resendTimer, setResendTimer] = useState(60);
  const [expireTimer, setExpireTimer] = useState(300);

  const navigate = useNavigate();

  // Handle countdown timers when on "code" step
  useEffect(() => {
    let interval = null;
    if (step === "code") {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setExpireTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Step 1: Request Code
  const handleRequestCode = async (e) => {
    if (e) e.preventDefault();
    const emailToUse = email || submittedEmail;
    if (!emailToUse) {
      setError("Please enter your email address");
      return;
    }

    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const response = await API.post("/auth/forgot-password", { email: emailToUse });
      setSubmittedEmail(emailToUse);
      setDevResetCode(response?.data?.devResetCode || "");
      setStep("code");
      setCode("");
      
      // Reset timers (1 min resend, 5 min expire)
      setResendTimer(60);
      setExpireTimer(300);
      
      if (submittedEmail) {
        setInfoMessage("A new 6-digit code has been sent to your email.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset code. Please check your email.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code First
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");

    if (!code || code.trim() === "") {
      setError("Please enter the verification code");
      return;
    }

    if (expireTimer === 0) {
      setError("Verification code has expired (5 minute limit). Please request a new code.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/verify-code", {
        email: submittedEmail,
        code: code.trim(),
      });
      
      // Code is valid -> proceed to password step
      setVerifiedCode(code.trim());
      setStep("password");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired verification code. Please check your code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
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
        code: verifiedCode,
        newPassword,
      });
      setStep("success");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password. Please try again.");
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

        {/* STEP 4: SUCCESS STATE */}
        {step === "success" && (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-[#CC3A18] mx-auto mb-4" />
            <h2 className="font-barlow font-bold text-[1.5rem] text-[#111214] uppercase mb-2">
              Password Reset Complete
            </h2>
            <p className="text-[13.5px] text-[#6B7280] mb-6">
              Your password has been changed successfully for <strong>{submittedEmail}</strong>. You can now sign in with your new credentials.
            </p>
            <Link
              to="/login"
              className="w-full py-3 text-white font-barlow font-bold text-[1rem] tracking-[0.08em] uppercase transition-all hover:brightness-110 inline-block text-center cursor-pointer"
              style={{ background: "linear-gradient(135deg, #CC3A18, #A82A10)" }}
            >
              BACK TO MAIN LOGIN
            </Link>
          </div>
        )}

        {/* STEP 1: REQUEST EMAIL */}
        {step === "request" && (
          <div>
            <h2 className="font-barlow font-bold text-[1.5rem] text-[#111214] uppercase mb-1">
              Forgot Password
            </h2>
            <p className="text-[13px] text-[#6B7280] mb-6">
              Enter your email address to receive a 6-digit verification code.
            </p>

            {error && (
              <div className="mb-5 border-l-[3px] border-brand bg-brand/5 p-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#374151] font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block font-barlow text-[0.65rem] tracking-[0.15em] uppercase text-[#374151] font-bold mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="juan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-none px-4 py-3 text-[14px] text-[#111214] placeholder-[#9CA3AF] outline-none focus:border-brand"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-barlow font-bold text-[1rem] tracking-[0.08em] uppercase transition-all hover:brightness-110 disabled:opacity-75 cursor-pointer mt-2"
                style={{ background: "linear-gradient(135deg, #CC3A18, #A82A10)" }}
              >
                {loading ? "SENDING CODE..." : "SEND VERIFICATION CODE"}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: ENTER & VERIFY CODE */}
        {step === "code" && (
          <div>
            <h2 className="font-barlow font-bold text-[1.5rem] text-[#111214] uppercase mb-1">
              Verify Code
            </h2>
            <p className="text-[13px] text-[#6B7280] mb-4">
              Enter the 6-digit verification code sent to <strong>{submittedEmail}</strong>.
            </p>

            {/* Timers & Expiration Notice */}
            <div className="mb-5 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-none flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-1.5 text-[#4B5563]">
                <Clock className="w-3.5 h-3.5 text-brand" />
                <span>Expires in:</span>
                <span className={`font-mono font-bold ${expireTimer < 60 ? "text-red-600 animate-pulse" : "text-[#111214]"}`}>
                  {formatTime(expireTimer)}
                </span>
              </div>
              
              {expireTimer === 0 && (
                <span className="text-red-600 font-bold uppercase text-[10px]">Code Expired</span>
              )}
            </div>

            {/* Dev Code Notice */}
            {devResetCode && (
              <div className="mb-4 p-2.5 bg-amber-50 border-l-2 border-amber-500 text-amber-900 text-[12px]">
                Development Code: <strong className="font-mono text-sm">{devResetCode}</strong>
              </div>
            )}

            {infoMessage && (
              <div className="mb-4 p-2.5 bg-emerald-50 border-l-2 border-emerald-500 text-emerald-900 text-[12.5px]">
                {infoMessage}
              </div>
            )}

            {error && (
              <div className="mb-5 border-l-[3px] border-brand bg-brand/5 p-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#374151] font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block font-barlow text-[0.65rem] tracking-[0.15em] uppercase text-[#374151] font-bold mb-1.5">
                  Verification Code
                </label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-none px-4 py-3 text-[15px] font-mono tracking-widest text-[#111214] placeholder-[#9CA3AF] outline-none focus:border-brand uppercase"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || expireTimer === 0}
                className="w-full py-3 text-white font-barlow font-bold text-[1rem] tracking-[0.08em] uppercase transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "linear-gradient(135deg, #CC3A18, #A82A10)" }}
              >
                {loading ? "VERIFYING CODE..." : "VERIFY CODE"}
              </button>

              {/* Resend Cooldown Section */}
              <div className="text-center pt-2 border-t border-[#F3F4F6]">
                {resendTimer > 0 ? (
                  <p className="text-[12px] text-[#9CA3AF]">
                    Resend code available in <strong className="text-[#374151] font-mono">{resendTimer}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestCode}
                    disabled={loading}
                    className="text-[12px] text-brand hover:underline font-semibold cursor-pointer"
                  >
                    Didn't get code? Resend Code Now
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: SET NEW PASSWORD */}
        {step === "password" && (
          <div>
            <h2 className="font-barlow font-bold text-[1.5rem] text-[#111214] uppercase mb-1">
              New Password
            </h2>
            <p className="text-[13px] text-[#6B7280] mb-6">
              Verification code accepted. Please create your new password.
            </p>

            {error && (
              <div className="mb-5 border-l-[3px] border-brand bg-brand/5 p-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#374151] font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
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
                  className="w-full bg-white border border-[#D1D5DB] rounded-none px-4 py-3 text-[14px] text-[#111214] placeholder-[#9CA3AF] outline-none focus:border-brand"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-barlow font-bold text-[1rem] tracking-[0.08em] uppercase transition-all hover:brightness-110 disabled:opacity-75 cursor-pointer mt-2"
                style={{ background: "linear-gradient(135deg, #CC3A18, #A82A10)" }}
              >
                {loading ? "SAVING NEW PASSWORD..." : "UPDATE PASSWORD"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;




