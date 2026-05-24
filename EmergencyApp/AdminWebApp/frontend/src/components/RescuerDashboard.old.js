import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import API from "../api";

function RescuerDashboard() {
  const [reports, setReports] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [route, setRoute] = useState(null);

useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

API.get("/rescue/new", {
  headers: { Authorization: `Bearer ${token}` },
})

    .then((res) => setReports(res.data))
    .catch((err) => console.error(err));
  
  // Get rescuer’s location
  navigator.geolocation.getCurrentPosition((pos) => {
    setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
  });
}, []);


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
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold mb-4">Rescuer Dashboard</h2>

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

          {reports.map((r) => (
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
