import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAP_BOXGL;

const Mapa3D = () => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    mapInstance.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [2.294, 48.8598],
      zoom: 15,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    mapInstance.current.addControl(
      new mapboxgl.NavigationControl(),
      "top-left"
    );

    return () => mapInstance.current.remove();
  }, []);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "500px",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    />
  );
};

export default Mapa3D;
