import React from "react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-200 text-center p-6">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-lg">
        {/* Logo */}
        <img src="/salbalogo.png" alt="SALBA Logo" className="w-56 h-56 mx-auto mb-6 object-contain" />
        
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          SALBA
        </h1>
        <p className="text-emerald-600 font-medium mb-4">
          Malaybalay City
        </p>
        <p className="text-gray-600 mb-2 text-sm leading-relaxed">
          An AI-Assisted One-Tap Digital Platform for Emergency Reporting and Rescue Coordination
        </p>
        <p className="text-gray-500 mb-8 text-xs">
          Welcome! Please log in or create an account to continue.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/login"
            className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium shadow-md hover:shadow-lg"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-8 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-all font-medium border border-gray-200"
          >
            Register
          </Link>
        </div>
        
        <p className="mt-8 text-xs text-gray-400">
          Emergency Response System for Malaybalay City
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Read our{" "}
          <Link to="/terms-and-conditions" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2 font-medium">
            Terms and Conditions
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default Home;
