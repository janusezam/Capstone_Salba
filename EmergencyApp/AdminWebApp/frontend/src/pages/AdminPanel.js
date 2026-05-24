import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminDashboard from "../components/AdminDashboard";

function AdminPanel() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (!token || !user) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser.role !== "admin") {
        alert("Access denied. Admin only.");
        navigate("/login");
        return;
      }
      setIsAuthorized(true);
    } catch (err) {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <AdminDashboard />;
}

export default AdminPanel;
