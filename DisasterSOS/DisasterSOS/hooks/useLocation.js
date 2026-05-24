import * as Location from "expo-location";
import { useState, useEffect } from "react";

export const useLocation = () => {
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Permission to access location was denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCoords(location.coords);
    })();
  }, []);

  return coords;
};
