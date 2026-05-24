import React, { useState, useEffect } from "react";
import API from "../api";
import "./UserDashboard.css"; // <-- we'll add this below

function UserDashboard() {
  const [loading, setLoading] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [reports, setReports] = useState([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedDisasterType, setSelectedDisasterType] = useState("fire");
  const [feedbackForm, setFeedbackForm] = useState({ category: "general", message: "" });
  const [feedbackNotice, setFeedbackNotice] = useState("");

  const disasterTypes = [
    { value: "fire", label: "Fire", color: "#dc2626" },
    { value: "earthquake", label: "Earthquake", color: "#9333ea" },
    { value: "flood", label: "Flood", color: "#0ea5e9" },
    { value: "landslide", label: "Landslide", color: "#92400e" },
    { value: "typhoon", label: "Typhoon", color: "#4338ca" },
  ];

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await API.get("/reports/user");
        setReports(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchReports();
  }, []);

  const handleReport = async () => {
    console.log("[UserDashboard] Creating report with disaster type:", selectedDisasterType);
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const data = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            disasterType: selectedDisasterType,
            // severity will be auto-mapped on backend based on disasterType
          };
          console.log("[UserDashboard] Sending report data:", data);
          const response = await API.post("/reports", data);
          console.log("[UserDashboard] Report creation response:", response.data);
          console.log("[UserDashboard] Report severity from server:", response.data?.severity);
          alert("Report sent successfully! Check admin dashboard for real-time update.");
          setReports((prev) => [
            response.data || { ...data, createdAt: new Date().toISOString(), severity: response.data?.severity || "pending" },
            ...prev,
          ]);
          setShowReportForm(false);
        } catch (error) {
          alert("Failed to send report: " + (error.response?.data?.message || error.message));
          console.error("[UserDashboard] Error sending report:", error);
        } finally {
          setLoading(false);
        }
      });
    } else {
      alert("Geolocation not supported.");
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.message.trim()) {
      alert("Please enter your feedback message.");
      return;
    }

    setSendingFeedback(true);
    setFeedbackNotice("");
    try {
      const res = await API.post("/feedback/user-feedback", {
        category: feedbackForm.category,
        message: feedbackForm.message.trim(),
      });

      setFeedbackForm({ category: "general", message: "" });
      setFeedbackNotice(res.data?.message || "Your feedback has been sent to admin.");
    } catch (error) {
      alert("Failed to send feedback: " + (error.response?.data?.message || error.message));
    } finally {
      setSendingFeedback(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h2 className="dashboard-title">User Dashboard</h2>

        {!showReportForm ? (
          <button
            className="send-btn"
            onClick={() => setShowReportForm(true)}
            disabled={loading}
          >
            Create Emergency Report
          </button>
        ) : (
          <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
            <h3 style={{ marginTop: 0 }}>Select Disaster Type</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom: "20px" }}>
              {disasterTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedDisasterType(type.value)}
                  style={{
                    padding: "12px 16px",
                    border: selectedDisasterType === type.value ? `3px solid ${type.color}` : "1px solid #ddd",
                    borderRadius: "6px",
                    backgroundColor: selectedDisasterType === type.value ? `${type.color}15` : "#f5f5f5",
                    cursor: "pointer",
                    fontWeight: selectedDisasterType === type.value ? "600" : "400",
                    color: type.color,
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className={`send-btn ${loading ? "disabled" : ""}`}
                onClick={handleReport}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? "Sending..." : "Send Report"}
              </button>
              <button
                onClick={() => setShowReportForm(false)}
                disabled={loading}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: "#f5f5f5",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h3 style={{ marginTop: 0 }}>Send Feedback to Admin</h3>
          <p style={{ marginTop: 0, color: "#64748b", fontSize: "14px" }}>
            Share bugs, suggestions, or concerns. Your feedback will be visible to admin.
          </p>

          {feedbackNotice && (
            <div style={{ backgroundColor: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "10px 12px", borderRadius: "6px", marginBottom: "12px" }}>
              {feedbackNotice}
            </div>
          )}

          <div style={{ display: "grid", gap: "10px" }}>
            <select
              value={feedbackForm.category}
              onChange={(e) => setFeedbackForm((prev) => ({ ...prev, category: e.target.value }))}
              disabled={sendingFeedback}
              style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "6px" }}
            >
              <option value="general">General</option>
              <option value="bug">Bug Report</option>
              <option value="suggestion">Suggestion</option>
              <option value="complaint">Complaint</option>
            </select>
            <textarea
              rows={4}
              value={feedbackForm.message}
              onChange={(e) => setFeedbackForm((prev) => ({ ...prev, message: e.target.value }))}
              disabled={sendingFeedback}
              placeholder="Type your feedback here"
              style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "6px", resize: "vertical" }}
            />
            <button
              className={`send-btn ${sendingFeedback ? "disabled" : ""}`}
              onClick={handleSubmitFeedback}
              disabled={sendingFeedback}
            >
              {sendingFeedback ? "Sending Feedback..." : "Send Feedback"}
            </button>
          </div>
        </div>

        <h3 className="reports-title">Your Reports</h3>

        {reports.length === 0 ? (
          <p className="no-reports">No reports yet.</p>
        ) : (
          <div className="reports-list">
            {reports.map((report, idx) => (
              <div className="report-card" key={idx}>
                <div>
                  <p className="report-severity">
                    Severity:{" "}
                    <span
                      className={`severity-text ${
                        report.severity === "high"
                          ? "red"
                          : report.severity === "moderate"
                          ? "orange"
                          : "green"
                      }`}
                    >
                      {report.severity}
                    </span>
                  </p>
                  <p className="report-date">
                    {report.createdAt
                      ? new Date(report.createdAt).toLocaleString()
                      : "Just now"}
                  </p>
                </div>
                <button
                  className="view-btn"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps?q=${report.lat},${report.lng}`,
                      "_blank"
                    )
                  }
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;
