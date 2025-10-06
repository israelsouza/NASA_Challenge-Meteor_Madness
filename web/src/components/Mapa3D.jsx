import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MAP_CONFIG } from "../constants/mapConfig";
import "mapbox-gl/dist/mapbox-gl.css";

const Mapa3D = ({ center = [2.294, 48.8598], zoom = 15 }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    mapboxgl.accessToken = MAP_CONFIG.accessToken;

    mapInstance.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_CONFIG.styles.streets,
      center,
      zoom,
      pitch: 60,
      bearing: -20,
      antialias: true
    });

    mapInstance.current.addControl(
      new mapboxgl.NavigationControl(),
      "top-left"
    );

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [center, zoom]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "500px",
        borderRadius: "12px",
        overflow: "hidden"
      }}
    />
  );
};

export default Mapa3D;