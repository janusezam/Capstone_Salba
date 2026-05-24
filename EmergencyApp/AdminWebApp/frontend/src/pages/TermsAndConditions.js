import React from "react";
import { Link } from "react-router-dom";

function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h1 className="text-2xl font-bold text-slate-900">Terms and Conditions</h1>
          <p className="text-sm text-slate-600 mt-1">
            DisasterSOS / SALBA Emergency Reporting and Response Coordination Platform
          </p>
          <p className="text-xs text-slate-500 mt-2">Last updated: April 9, 2026</p>
        </div>

        <div className="px-6 py-6 space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">1. Purpose of the Platform</h2>
            <p>
              This system is for emergency reporting, incident validation, and response coordination in Malaybalay City.
              You agree to use the platform only for lawful, accurate, and good-faith emergency communication.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">2. User Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide truthful, complete, and timely information when reporting incidents.</li>
              <li>Do not submit fabricated, malicious, or misleading emergency reports.</li>
              <li>Protect your account credentials and notify administrators of unauthorized access.</li>
            </ul>
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-base font-semibold text-amber-900 mb-2">3. False Alerts and Misuse</h2>
            <p className="text-amber-900">
              Submitting false alerts can divert responders, delay real rescues, and put lives at risk.
              The platform may log report metadata, access history, and audit records for investigation and legal compliance.
            </p>
            <p className="text-amber-900 mt-2">
              Users who intentionally submit false or malicious reports may be subject to account suspension, removal of access,
              and referral to proper authorities under applicable laws and local ordinances.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">4. Privacy and Data Protection</h2>
            <p>
              We process personal data in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173),
              its implementing rules, and applicable government data protection policies.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Data collected may include account details, report content, location context, and system audit logs.</li>
              <li>Data is used for emergency response operations, verification, analytics, and legal compliance.</li>
              <li>Access to sensitive data is limited to authorized personnel with operational need.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">5. Security and Retention</h2>
            <p>
              We implement reasonable administrative, technical, and organizational safeguards.
              Data retention follows operational, regulatory, and audit requirements.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">6. Service Availability</h2>
            <p>
              The system is provided on a best-effort basis. Service interruptions, maintenance periods,
              or technical limitations may occur during high-demand emergency situations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">7. Acceptance</h2>
            <p>
              By creating an account or continuing to use this platform, you acknowledge that you have read,
              understood, and agreed to these Terms and Conditions.
            </p>
          </section>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex flex-wrap gap-3">
          <Link
            to="/register"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Back to Register
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TermsAndConditions;
