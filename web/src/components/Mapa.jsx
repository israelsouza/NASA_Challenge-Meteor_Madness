import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import styles from "@styles/Mapa.module.css";

mapboxgl.accessToken = import.meta.env.VITE_MAP_BOXGL;

const Mapa = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [mostrarMapa, setMostrarMapa] = useState(true);

  useEffect(() => {
    if (!mostrarMapa || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-47.93, -15.78],
      zoom: 2.2,
      projection: "globe",
    });

    map.current.on("style.load", () => {
      map.current.setFog({
        color: "rgba(186, 210, 235, 0.6)",
        "high-color": "rgba(36, 92, 223, 0.6)",
        "space-color": "#000000",
        "horizon-blend": 0.2,
        "star-intensity": 0.2,
      });
    });

    return () => {
      map.current.remove();
      map.current = null;
    };
  }, [mostrarMapa]);

  if (!mostrarMapa) {
    return (
      <div className={styles.example} onClick={() => setMostrarMapa(true)}>
        Clique para carregar o Maps
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div ref={mapContainer} className={styles.mapa}></div>
    </div>
  );
};

export default Mapa;
