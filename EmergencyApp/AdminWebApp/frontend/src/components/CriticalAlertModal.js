import React, { useState, useEffect } from 'react';
import '../styles/CriticalAlertModal.css';

export default function CriticalAlertModal({ 
  report, 
  aiData, 
  teams, 
  onDismiss, 
  onDispatch 
}) {
  const [nearestTeams, setNearestTeams] = useState([]);

  useEffect(() => {
    // Calculate distance from each team to report location
    if (teams && report) {
      const teamsWithDistance = teams
        .filter(team => team.status === 'available')
        .map(team => {
          if (!team.currentLocation) return null;
          
          // Haversine formula for distance
          const R = 6371; // Earth radius in km
          const dLat = (report.lat - team.currentLocation.lat) * Math.PI / 180;
          const dLng = (report.lng - team.currentLocation.lng) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(team.currentLocation.lat * Math.PI / 180) * 
            Math.cos(report.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          return { ...team, distance };
        })
        .filter(t => t !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
      
      setNearestTeams(teamsWithDistance);
    }
  }, [teams, report]);

  const getWarningLevel = () => {
    if (!aiData) return 'CRITICAL';
    if (aiData.isCritical) return 'CRITICAL';
    if (aiData.severity === 'high') return 'HIGH';
    return 'MODERATE';
  };

  return (
    <div className="critical-alert-overlay">
      <div className="critical-alert-modal">
        {/* Header */}
        <div className="alert-header critical">
          <span className="alert-icon">🚨</span>
          <h2>CRITICAL EMERGENCY ALERT</h2>
          <button className="close-btn" onClick={onDismiss}>✕</button>
        </div>

        {/* Content */}
        <div className="alert-content">
          {/* Report Details */}
          <div className="report-details">
            <h3>{report.type || report.disasterType || 'Emergency'}</h3>
            <p><strong>Reporter:</strong> {report.userId?.name || 'Anonymous'}</p>
            <p><strong>Location:</strong> {report.address || `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`}</p>
            <p><strong>Time:</strong> {new Date(report.createdAt).toLocaleTimeString()}</p>
            <p><strong>Description:</strong> {report.reportText || report.note || 'No description'}</p>
          </div>

          {/* AI Analysis */}
          {aiData && (
            <div className="ai-analysis">
              <h4>⚙️ AI Analysis Results</h4>
              <div className="ai-metrics">
                <div className="metric">
                  <span>Legitimacy:</span>
                  <strong style={{ color: aiData.isLegitimate ? '#10b981' : '#ef4444' }}>
                    {aiData.isLegitimate ? 'VERIFIED ✓' : 'SUSPICIOUS ⚠'}
                  </strong>
                </div>
                <div className="metric">
                  <span>Confidence:</span>
                  <strong>{(aiData.confidence * 100).toFixed(1)}%</strong>
                </div>
                <div className="metric">
                  <span>False Alarm Risk:</span>
                  <strong style={{ color: aiData.falseAlarmRisk > 0.5 ? '#f59e0b' : '#10b981' }}>
                    {(aiData.falseAlarmRisk * 100).toFixed(1)}%
                  </strong>
                </div>
              </div>
              {aiData.issues && aiData.issues.length > 0 && (
                <div className="ai-issues">
                  <strong>⚠️ Issues Detected:</strong>
                  <ul>
                    {aiData.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Dispatch Recommendations */}
          <div className="dispatch-recommendations">
            <h4>🎯 Urgent Dispatch Recommendations</h4>
            {nearestTeams.length > 0 ? (
              <div className="teams-list">
                {nearestTeams.map((team, idx) => (
                  <div key={team._id} className="team-option">
                    <div className="team-info">
                      <div className="rank">#{idx + 1} PRIORITY</div>
                      <div className="team-name">{team.name}</div>
                      <div className="team-distance">
                        📍 {team.distance.toFixed(1)} km away
                      </div>
                      <div className="team-members">
                        {team.members ? `${team.members.length} members` : 'No members assigned'}
                      </div>
                    </div>
                    <button
                      className="dispatch-btn"
                      onClick={() => onDispatch(team._id, report._id)}
                    >
                      DISPATCH NOW
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#ef4444' }}>⚠️ No available teams nearby!</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="alert-actions">
            <button className="btn-secondary" onClick={onDismiss}>
              Dismiss Alert
            </button>
            <button className="btn-primary" onClick={() => {
              if (nearestTeams.length > 0) {
                onDispatch(nearestTeams[0]._id, report._id);
              }
            }}>
              Auto-Dispatch Top Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
