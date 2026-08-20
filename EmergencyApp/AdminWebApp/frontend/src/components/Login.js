import React, { useState } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!executeRecaptcha) {
      setError("ReCAPTCHA not ready yet. Please try again in a moment.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha("login");
      const res = await API.post("/auth/login", { ...form, recaptchaToken });
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
    if (!executeRecaptcha) {
      setError("ReCAPTCHA not ready yet. Please try again in a moment.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha("google_login");
      const res = await API.post("/auth/google-login", {
        credential: credentialResponse.credential,
        recaptchaToken,
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
    <div className="min-h-screen flex bg-[#F7F8FA] overflow-hidden font-inter">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-full lg:w-[55%] relative flex-col justify-between p-8 lg:px-12 py-10">
        {/* Background Image with Filter */}
        <img 
          src="/bg-building.jpg" 
          alt="CDRRMO Building" 
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.55) saturate(0.8)" }}
        />
        {/* Overlay */}
        <div 
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(8,12,20,0.82) 0%, rgba(8,12,20,0.55) 50%, rgba(8,12,20,0.70) 100%)" }}
        />
        {/* Left accent bar */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: "linear-gradient(180deg, #CC3A18, #A82A10)" }}
        />

        {/* Content Top */}
        <div className="relative z-10">
          {/* Logo lockup */}
          <div className="flex items-center gap-4 mb-10">
            <img src="/transparent-logo.png" alt="CDRRMO Logo" className="w-[50px] h-[50px] object-contain drop-shadow-xl" />
            <div className="w-[1px] h-[40px] bg-white/20"></div>
            <div className="flex flex-col justify-center gap-1">
              <h1 className="font-barlow font-bold text-white leading-[1.1] tracking-wide" style={{ fontSize: '1.05rem' }}>
                City Disaster Risk Reduction<br/>& Management Office
              </h1>
              <p className="font-barlow font-bold text-brand tracking-[0.2em] text-[0.65rem] uppercase">
                MALAYBALAY CITY · CDRRMO
              </p>
            </div>
          </div>

          {/* Status strip */}
          <div className="flex items-center border-l-[3px] border-brand bg-[#111317]/40 px-3.5 py-1.5 mb-6 w-fit backdrop-blur-md">
             <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse mr-3"></div>
             <p className="font-barlow uppercase text-[0.7rem] tracking-[0.15em] text-brand font-bold mr-3">System Operational</p>
             <p className="font-barlow text-[0.7rem] text-white/50 tracking-[0.1em] uppercase border-l border-white/20 pl-3">Secure Access Portal</p>
          </div>

          {/* Heading */}
          <h2 className="font-barlow font-extrabold text-white mb-4 uppercase"
              style={{ fontSize: "clamp(2.4rem, 4vw, 3.8rem)", lineHeight: 0.95, letterSpacing: "-0.01em" }}>
            Emergency<br/>Response<br/><span className="text-brand">Coordination</span>
          </h2>
          
          {/* Subtext */}
          <p className="text-[13px] text-white/60 max-w-[340px] leading-relaxed mb-8">
            Manage and coordinate disaster response operations with real-time alerts and team management.
          </p>

          {/* Feature rows */}
          <div className="space-y-0 relative">
            <div className="absolute left-[70px] top-4 bottom-4 w-[1px] bg-white/10 z-0"></div>
            
            {/* Feature 1 */}
            <div className="flex items-start relative z-10 group">
              <span className="font-barlow font-bold text-brand/50 text-[13px] mt-2.5 w-[32px] tracking-wider">01</span>
              <div className="w-[38px] h-[38px] bg-brand/10 border border-brand/30 flex items-center justify-center mr-6 backdrop-blur-sm group-hover:bg-brand/20 transition-colors">
                {/* Siren beacon SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand">
                  <path d="M12 4C14.7614 4 17 6.23858 17 9V12H7V9C7 6.23858 9.23858 4 12 4Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 12H19V14H5V12Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 14H17V17C17 18.1046 16.1046 19 15 19H9C7.89543 19 7 18.1046 7 17V14Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 2V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M19.071 4.92896L17.6568 6.34317" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M4.92896 4.92896L6.34317 6.34317" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="flex-1 border-b border-white/10 pb-4 pt-1 flex justify-between items-center pr-2">
                <div>
                  <h3 className="font-barlow font-bold text-white uppercase tracking-wider text-[1.1rem]">Real-time Alerts</h3>
                  <p className="text-[12.5px] text-white/45 mt-0.5">Instant disaster notifications and tracking</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="square" className="group-hover:stroke-brand transition-colors">
                  <path d="M9 18L15 12L9 6" />
                </svg>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start relative z-10 group pt-4">
              <span className="font-barlow font-bold text-brand/50 text-[13px] mt-2.5 w-[32px] tracking-wider">02</span>
              <div className="w-[38px] h-[38px] bg-brand/10 border border-brand/30 flex items-center justify-center mr-6 backdrop-blur-sm group-hover:bg-brand/20 transition-colors">
                {/* Walkie talkie SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand">
                  <rect x="7" y="8" width="10" height="13" rx="1.5" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
                  <path d="M14 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
                  <circle cx="12" cy="15" r="2.5" fill="currentColor" opacity="0.8"/>
                </svg>
              </div>
              <div className="flex-1 border-b border-white/10 pb-4 pt-1 flex justify-between items-center pr-2">
                <div>
                  <h3 className="font-barlow font-bold text-white uppercase tracking-wider text-[1.1rem]">Team Coordination</h3>
                  <p className="text-[12.5px] text-white/45 mt-0.5">Assign and manage rescue operations</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="square" className="group-hover:stroke-brand transition-colors">
                  <path d="M9 18L15 12L9 6" />
                </svg>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start relative z-10 group pt-4">
              <span className="font-barlow font-bold text-brand/50 text-[13px] mt-2.5 w-[32px] tracking-wider">03</span>
              <div className="w-[38px] h-[38px] bg-brand/10 border border-brand/30 flex items-center justify-center mr-6 backdrop-blur-sm group-hover:bg-brand/20 transition-colors">
                {/* Clipboard chart SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand">
                  <path d="M9 3H15V6H9V3Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M9 4.5H6C5.44772 4.5 5 4.94772 5 5.5V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V5.5C19 4.94772 18.5523 4.5 18 4.5H15" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="8" y="15" width="2" height="3" fill="currentColor" opacity="0.8"/>
                  <rect x="11" y="11" width="2" height="7" fill="currentColor" opacity="0.8"/>
                  <rect x="14" y="13" width="2" height="5" fill="currentColor" opacity="0.8"/>
                </svg>
              </div>
              <div className="flex-1 pb-1 pt-1 flex justify-between items-center pr-2">
                <div>
                  <h3 className="font-barlow font-bold text-white uppercase tracking-wider text-[1.1rem]">Analytics & Reports</h3>
                  <p className="text-[12.5px] text-white/45 mt-0.5">Comprehensive emergency statistics</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="square" className="group-hover:stroke-brand transition-colors">
                  <path d="M9 18L15 12L9 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex justify-between items-end mt-8 w-full">
          <div>
            <p className="text-white/60 text-[13px] font-medium">Serving Malaybalay City Emergency Management</p>
            <p className="text-white/30 text-[12px] mt-1">© 2026 DisasterSOS. All rights reserved.</p>
          </div>
          <div className="border border-white/20 px-3 py-1.5 backdrop-blur-sm bg-black/10">
            <span className="font-barlow text-[0.6rem] uppercase tracking-widest text-white/40 font-bold">Official Use Only</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center px-8 py-8 relative bg-[#F7F8FA]">
        
        <div className="w-full max-w-[420px]">
          {/* Badge */}
          <div className="inline-flex items-center border-l-[3px] border-brand bg-brand/5 px-2.5 py-1 mb-6">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-brand mr-2">
              <path d="M12 2C9.243 2 7 4.243 7 7V10H6C4.897 10 4 10.897 4 12V20C4 21.103 4.897 22 6 22H18C19.103 22 20 21.103 20 20V12C20 10.897 19.103 10 18 10H17V7C17 4.243 14.757 2 12 2ZM9 7C9 5.346 10.346 4 12 4C13.654 4 15 5.346 15 7V10H9V7ZM12 17C10.895 17 10 16.105 10 15C10 13.895 10.895 13 12 13C13.105 13 14 13.895 14 15C14 16.105 13.105 17 12 17Z" />
            </svg>
            <span className="font-barlow text-[0.65rem] uppercase tracking-widest text-brand font-bold">Restricted Access</span>
          </div>

          <h2 className="font-barlow font-bold text-[1.8rem] text-[#111214] leading-none mb-2">Administrator Sign In</h2>
          <p className="text-[13.5px] text-[#6B7280] mb-6 font-light">Sign in to your emergency management account</p>

          {error && (
            <div className="mb-5 border-l-[3px] border-brand bg-brand/5 p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#374151] font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-barlow text-[0.65rem] tracking-[0.15em] uppercase text-[#374151] font-bold mb-1.5">Username or Email</label>
              <input
                type="text"
                placeholder="juan.dela.cruz or juan@example.com"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                className="w-full bg-[#FFFFFF] border border-[#D1D5DB] rounded-none px-4 py-3 text-[14px] text-[#111214] placeholder-[#9CA3AF] outline-none transition-all focus:border-brand focus:shadow-[0_0_0_3px_rgba(204,58,24,0.1)]"
                required
              />
            </div>

            <div>
              <label className="block font-barlow text-[0.65rem] tracking-[0.15em] uppercase text-[#374151] font-bold mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#D1D5DB] rounded-none px-4 py-3 pr-12 text-[14px] text-[#111214] placeholder-[#9CA3AF] outline-none transition-all focus:border-brand focus:shadow-[0_0_0_3px_rgba(204,58,24,0.1)]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" strokeWidth={1.5} /> : <Eye className="w-5 h-5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[13px] pt-1 pb-3">
              <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`flex items-center justify-center w-[16px] h-[16px] border ${rememberMe ? 'border-brand bg-brand' : 'border-[#D1D5DB] bg-white'} transition-colors group-hover:border-brand`}>
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7L5 10L12 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"/>
                    </svg>
                  )}
                </div>
                <span className="text-[#6B7280]">Remember this device</span>
              </label>
              <Link to="/forgot-password" className="text-brand hover:text-[#A82A10] font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-barlow font-bold text-[1.05rem] tracking-[0.1em] uppercase transition-all hover:brightness-110 disabled:opacity-75 disabled:cursor-not-allowed mt-2"
              style={{ 
                background: "linear-gradient(135deg, #CC3A18, #A82A10)",
                boxShadow: "0 4px 20px rgba(204,58,24,0.3)" 
              }}
            >
              {loading ? "Signing in..." : "SIGN IN TO COMMAND CENTER"}
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 h-[1px] bg-[#E5E7EB]"></div>
            <span className="px-5 text-[12px] text-[#9CA3AF] font-light">or continue with</span>
            <div className="flex-1 h-[1px] bg-[#E5E7EB]"></div>
          </div>

          <div className="mb-6 w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signin_with"
              width="420"
            />
          </div>

          <div className="border-l-[3px] border-brand bg-brand/5 p-4 text-center mt-5">
            <p className="text-[12px] text-[#6B7280] leading-relaxed font-light">
              Log in to your SALBA CDRRMO account to access the emergency response dashboard.
            </p>
          </div>
          
          <div className="text-center mt-5">
            <p className="text-[12px] text-[#9CA3AF] font-light">
              By continuing, you acknowledge our{" "}
              <Link to="/terms-and-conditions" className="text-brand hover:text-[#A82A10] underline underline-offset-2 decoration-brand/30">
                Terms and Conditions
              </Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
