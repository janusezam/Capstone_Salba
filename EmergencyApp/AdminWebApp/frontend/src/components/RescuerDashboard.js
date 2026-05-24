import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import API from "../api";
import io from "socket.io-client";

function RescuerDashboard() {
  const [reports, setReports] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [route, setRoute] = useState(null);
  const [team, setTeam] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [socket, setSocket] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Not Assigned");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Setup Socket.io connection
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const newSocket = io("http://localhost:5000", {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on("connect", () => {
      console.log("✓ RescuerApp connected to Socket.io");
      const userId = JSON.parse(localStorage.getItem("user"))?._id;
      if (userId) {
        newSocket.emit("join_rescuer_room", userId);
      }
    });

    // Listen for dispatch alerts
    newSocket.on("dispatch_alert", (data) => {
      console.log("📢 Dispatch alert received:", data);
      setStatusMessage("🚨 Team Assigned - Mission Active!");
      setAssignment(data);
      fetchTeamData();
    });

    // Listen for team status updates
    newSocket.on("team_dispatched", (data) => {
      console.log("🚨 Team dispatched:", data);
      if (data.team) {
        setTeam(data.team);
        setStatusMessage("Team Deployed");
      }
    });

    // Listen for mission complete
    newSocket.on("mission_complete", (data) => {
      console.log("✅ Mission completed");
      setAssignment(null);
      setStatusMessage("Not Assigned");
      fetchTeamData();
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from Socket.io");
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // Fetch team assignment data
  const fetchTeamData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("❌ Not logged in. Please login first.");
        setLoading(false);
        return;
      }
      
      const teamRes = await API.get("/rescue/my-team", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (teamRes.data) {
        setTeam(teamRes.data);
        console.log("✓ Team data fetched:", teamRes.data);
        setError(null);
        
        // Update status based on team status
        if (teamRes.data.status === "deployed") {
          setStatusMessage("🚨 TEAM DEPLOYED");
        } else if (teamRes.data.status === "standby") {
          setStatusMessage("On Standby");
        } else {
          setStatusMessage("Not Assigned");
        }
        
        // If team has currentMission, fetch mission details
        if (teamRes.data.currentMission) {
          try {
            const missionRes = await API.get("/rescue/my-mission", {
              headers: { Authorization: `Bearer ${token}` }
            });
            setAssignment(missionRes.data);
            setStatusMessage("🚨 Mission Assigned - Check Details Below!");
            setError(null);
          } catch (err) {
            console.error("Error fetching mission:", err);
            setError(`⚠️ Mission Error: ${err.response?.data?.message || err.message}`);
          }
        } else {
          setAssignment(null);
          if (teamRes.data.status === "available") {
            setStatusMessage("Not Assigned");
          }
        }
      } else {
        setTeam(null);
        setAssignment(null);
        setStatusMessage("No Team Assignment");
        setError("ℹ️ You are not assigned to any team yet.");
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching team data:", err);
      const errorMsg = err.response?.data?.message || err.message || "Unknown error";
      setError(`❌ Team Load Error: ${errorMsg}`);
      setStatusMessage("Error loading status");
      setLoading(false);
    }
  };

  // Initial data load and reports fetch
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("❌ Not logged in. Token not found. Please login first.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        // Fetch team assignment
        await fetchTeamData();

        // Fetch new reports
        try {
          const reportRes = await API.get("/rescue/new", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setReports(reportRes.data || []);
          console.log("✓ Reports fetched:", reportRes.data?.length || 0);
        } catch (err) {
          console.error("Error fetching reports:", err);
          setError(prev => prev + ` | Reports Error: ${err.response?.data?.message || err.message}`);
        }
      } catch (err) {
        console.error("Data load error:", err);
      }
    };

    loadData();
  
    // Get rescuer's initial location and set up continuous tracking
    let watchId = null;
    
    const startLocationTracking = () => {
      // Use watchPosition for continuous real-time location updates
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          
          setCurrentLocation([lat, lng]);
          console.log(`📍 Location updated: ${lat.toFixed(4)}, ${lng.toFixed(4)} (±${accuracy.toFixed(0)}m)`);
          
          // Send location to backend via Socket.IO for real-time admin updates
          if (socket && socket.connected) {
            const user = JSON.parse(localStorage.getItem("user"));
            socket.emit("rescuer_location", {
              rescuerId: user._id,
              rescuerName: user.name,
              lat,
              lng,
              accuracy,
              timestamp: new Date()
            });
            console.log('📤 Location sent to backend');
          }
        },
        (err) => {
          console.warn("⚠️ Geolocation error:", err);
          setError(prev => (prev ? prev + " | " : "") + `Geolocation Error: ${err.message}`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0 // Don't use cached position
        }
      );
    };

    // Start location tracking
    startLocationTracking();

    // Refresh team data every 10 seconds
    const interval = setInterval(fetchTeamData, 10000);
    
    return () => {
      clearInterval(interval);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [socket]);

  const startRescue = async (report) => {
    if (!currentLocation) return alert("Unable to get your location");

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      // Step 1: Notify backend that rescue started
      await API.post(
        `/rescue/start/${report._id}`,
        {
          rescuerId: user._id,
          rescuerName: user.name,
          rescuerLat: currentLocation[0],
          rescuerLng: currentLocation[1],
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Step 2: Request road route from your backend proxy
      const start = `${currentLocation[1]},${currentLocation[0]}`; // lng,lat
      const end = `${report.lng},${report.lat}`;
      console.log("Requesting route from", start, "to", end);
      
      const routeRes = await API.get(`/route?start=${start}&end=${end}`);
      
      console.log("Route response:", routeRes.data);

      // Step 3: Convert ORS coordinates to Leaflet format [lat, lng]
      if (!routeRes.data.geometry) {
        console.error("No geometry in route response");
        alert("Failed to get route geometry from server");
        return;
      }

      const routeCoords = routeRes.data.geometry.coordinates.map((c) => [c[1], c[0]]);
      
      if (!routeCoords || routeCoords.length === 0) {
        console.error("Route coordinates are empty after conversion");
        alert("Route coordinates empty - please try again");
        return;
      }

      setRoute({
        from: currentLocation,
        to: [report.lat, report.lng],
        path: routeCoords,
        report,
      });

      alert("Rescue mission started! Following road route.");
      console.log("Route received:", routeCoords.length, "points");
    } catch (err) {
      console.error("Failed to start rescue:", err.response?.data || err.message);
      console.error("Full error:", err);
      alert(err.response?.data?.message || "Failed to start rescue - check console for details");
    }
  };

  // Check geofence
  useEffect(() => {
    if (!route) return;

    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const distance = L.latLng(pos.coords.latitude, pos.coords.longitude)
          .distanceTo(L.latLng(route.to[0], route.to[1]));

        if (distance <= route.report.geofenceRadiusMeters) {
          alert("You have entered the geofence area!");
          clearInterval(interval);
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [route]);

  return (
    <div className="flex flex-col items-center p-6 bg-slate-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-2">Rescuer Dashboard</h2>
      
      {/* Loading Spinner */}
      {loading && (
        <div className="w-full max-w-2xl p-8 mb-4 bg-blue-100 rounded-lg text-center">
          <div className="inline-block animate-spin">⏳</div>
          <p className="text-blue-800 font-bold">Loading dashboard data...</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="w-full max-w-2xl p-4 mb-4 bg-red-100 rounded-lg border-2 border-red-500">
          <p className="text-red-800 font-bold mb-2">⚠️ Error</p>
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
            onClick={fetchTeamData}
          >
            🔄 Retry
          </button>
        </div>
      )}
      
      {/* Team Assignment Status */}
      {!error && (
        <div className={`w-full max-w-2xl p-4 mb-4 rounded-lg text-center font-bold text-xl ${
          assignment 
            ? 'bg-red-100 text-red-800 border-2 border-red-500' 
            : 'bg-blue-100 text-blue-800 border-2 border-blue-500'
        }`}>
          {statusMessage}
        </div>
      )}

      {/* Team Info Display */}
      {team && (
        <div className="w-full max-w-2xl p-4 mb-4 bg-white rounded-lg shadow-md border-l-4 border-blue-500">
          <h3 className="text-lg font-bold mb-2">Team: {team.name}</h3>
          <p className="text-slate-600">Status: <span className="font-bold text-blue-600">{team.status.toUpperCase()}</span></p>
          <p className="text-slate-600">Members: {team.members?.length || 0}</p>
          {team.leader && <p className="text-slate-600">Leader: {team.leader.name}</p>}
        </div>
      )}

      {/* Current Mission Assignment */}
      {assignment && (
        <div className="w-full max-w-2xl p-4 mb-4 bg-red-50 rounded-lg shadow-md border-l-4 border-red-500">
          <h3 className="text-lg font-bold text-red-700 mb-2">
            🚨 Current Mission Assignment
          </h3>
          <p className="text-slate-700"><b>Type:</b> {assignment.incidentType}</p>
          <p className="text-slate-700"><b>Severity:</b> {assignment.severity}</p>
          <p className="text-slate-700"><b>Location:</b> {assignment.address}</p>
          <p className="text-slate-700"><b>Coordinates:</b> {assignment.lat}, {assignment.lng}</p>
          {assignment.description && (
            <p className="text-slate-700"><b>Details:</b> {assignment.description}</p>
          )}
          <button 
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700"
            onClick={() => startRescue(assignment)}
          >
            Start Assigned Mission
          </button>
        </div>
      )}

      {/* Map */}
      {currentLocation && (
        <MapContainer
          center={currentLocation}
          zoom={13}
          className="w-full h-[70vh] rounded-xl shadow-md"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <Marker position={currentLocation}>
            <Popup>Your current location</Popup>
          </Marker>

          {/* Show assigned mission on map if exists */}
          {assignment && (
            <Marker position={[assignment.lat, assignment.lng]}>
              <Popup>
                <div>
                  <b>🚨 Your Mission</b> <br />
                  <b>Type:</b> {assignment.incidentType} <br />
                  <b>Severity:</b> {assignment.severity} <br />
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded mt-2 font-bold"
                    onClick={() => startRescue(assignment)}
                  >
                    Start Mission
                  </button>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Show other available reports */}
          {!assignment && reports.map((r) => (
            <Marker key={r._id} position={[r.lat, r.lng]}>
              <Popup>
                <div>
                  <b>Severity:</b> {r.severity} <br />
                  <b>Status:</b> {r.status} <br />
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded mt-2"
                    onClick={() => startRescue(r)}
                  >
                    Start Rescue
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Show route if active */}
          {route && route.path && route.path.length > 0 ? (
            <Polyline
              positions={route.path}
              pathOptions={{ color: "red", weight: 4 }}
            />
          ) : route ? (
            <div style={{ color: "red" }}>[Alert] Route not loaded properly</div>
          ) : null}
        </MapContainer>
      )}
    </div>
  );
}

export default RescuerDashboard;
