import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MAP_CONFIG } from "../constants/mapConfig";
import { add3DBuildings } from "../utils/mapUtils";

export const useMapbox = (containerRef, options = {}) => {
  const mapRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAP_CONFIG.accessToken;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_CONFIG.styles.streets,
      ...MAP_CONFIG.defaultView,
      projection: "globe",
      antialias: true,
      ...options
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl());

    mapRef.current.on("style.load", () => {
      mapRef.current.setFog(MAP_CONFIG.fog);
      add3DBuildings(mapRef.current);
      setIsReady(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); 

  return { map: mapRef.current, isReady };
};