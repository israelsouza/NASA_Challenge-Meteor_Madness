import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import styles from "@styles/Mapa.module.css";

mapboxgl.accessToken = import.meta.env.VITE_MAP_BOXGL;

const Mapa = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [impactLocation, setImpactLocation] = useState(null);
  
  const [asteroid, setAsteroid] = useState(null);


  useEffect(() => {
    if (!mostrarMapa || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-47.93, -15.78],
      zoom: 2.2,
      projection: "globe",
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on("style.load", () => {
      map.current.setFog({
        color: "rgba(186, 210, 235, 0.6)",
        "high-color": "rgba(36, 92, 223, 0.6)",
        "space-color": "#000000",
        "horizon-blend": 0.2,
        "star-intensity": 0.2,
      });
    });

    map.current.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      if (lat < -85 || lat > 85) return;

      const sourceId = "ping-source";

      if (map.current.getLayer("ping-layer")) {
        map.current.removeLayer("ping-layer");
        map.current.removeSource(sourceId);
      }

      map.current.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [lng, lat] },
            },
          ],
        },
      });

      map.current.addLayer({
        id: "ping-layer",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 10,
          "circle-color": "red",
          "circle-opacity": 0.8,
          "circle-stroke-color": "white",
          "circle-stroke-width": 2,
        },
      });

      setImpactLocation({
        lng: lng.toFixed(2),
        lat: lat.toFixed(2),
        name: `Lng: ${lng.toFixed(2)}, Lat: ${lat.toFixed(2)}`,
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
      <div className={styles.menuLateral}>
        <h2 className={styles.tituloMenu}>Veja o impacto do asteroide</h2>
 
        <div className={styles.informacoes}>
          <div>
            <span className={styles.negrito}>Configurações do asteroide</span>
          </div>
          <div className={styles.linhaInfo}>
            <span>Asteroide:</span>
            <select
              value={asteroid}
              onChange={(e) => setAsteroid(e.target.value)}
            >
              <option value="Apophis">Apophis</option>
              <option value="Bennu">Bennu</option>
              <option value="Ryugu">Ryugu</option>
            </select>
          </div>

          <br />
          <div className={styles.localizacao}>
            <span>Local do Impacto:</span> <br />
            <span>
              {impactLocation ? impactLocation.name : "Selecione no mapa"}
            </span>
          </div>
        </div>
        <button
          className={styles.botao}
          onClick={() => {
            if (!impactLocation) {
              alert("Insira um local primeiro para proseguir");
            } else {
              alert(`Asteroide lançado em ${impactLocation.name}!`);
            }
          }}
        >
          Jogar asteroide
        </button>
        <div className={styles.instrucao}>selecione local de impacto</div>
      </div>
    </div>
  );
};

export default Mapa;
