import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import Asteroide from "./Asteroide";
import styles from "@styles/Mapa.module.css";
import ImpactoModal from "./ImpactoModal";
import Mapa3D from "@components/Mapa3d.jsx";

mapboxgl.accessToken = import.meta.env.VITE_MAP_BOXGL;

const Mapa = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [impactLocation, setImpactLocation] = useState(null);

  const [asteroid, setAsteroid] = useState("Apophis");

  const deltaVelocidadeRef = useRef(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [deltaVelocidade, setDeltaVelocidade] = useState(1);
  const [tipoMitigacao, setTipoMitigacao] = useState("kinetic");
  const [distanciaTsunami, setDistanciaTsunami] = useState(0);

  const [resultado, setResultado] = useState(null);

  async function getAsteroidInfos() {
    const lat = impactLocation.lat;
    const lng = impactLocation.lng;

    if (map.current && impactLocation) {
      console.log("Fazendo zoom para:", lng, lat);

      map.current.setProjection("mercator");

      map.current.flyTo({
        center: [lng, lat],
        zoom: 16,
        pitch: 70,
        bearing: 30,
        speed: 0.5,
        curve: 1.4,
        essential: true,
      });
    }

    const cacheKey = `${lat}-${lng}-${asteroid}-${deltaVelocidade}-${tipoMitigacao}-${distanciaTsunami}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}-time`);
    const now = Date.now();
    const cacheDuration = 60 * 60 * 500;

    if (cachedData && cacheTime && now - parseInt(cacheTime) < cacheDuration) {
      console.log("Usando dados do cache");
      setResultado(JSON.parse(cachedData));
      setModalAberto(true);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("latCustom", lat);
      params.set("lonCustom", lng);
      params.set("deltaVelocidade", deltaVelocidade);
      params.set("asteroid", asteroid);
      params.set("tipoMitigacao", tipoMitigacao);
      params.set("distanciaTsunami", distanciaTsunami);

      const endpoint = params.toString();
      const response = await fetch(
        `http://localhost:3000/api/meteor?${endpoint}`,
        {
          method: "GET",
        }
      );

      const data = await response.json();
      console.log("Dados do backend: ", data);

      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(`${cacheKey}-time`, now.toString());

      setResultado(data);
      setTimeout(() => {
        setModalAberto(true);
      }, 800);
    } catch (error) {
      console.log("Erro no fetch:", error);
      setTimeout(() => {
        setModalAberto(true);
      }, 800);
    }
  }

  const resetarVisualizacao = () => {
    if (map.current) {
      map.current.setProjection("globe");
      map.current.flyTo({
        center: [-47.93, -15.78],
        zoom: 2.2,
        pitch: 0,
        bearing: 0,
        speed: 0.6,
        curve: 1.2,
        essential: true,
      });
    }
  };

  useEffect(() => {
    if (!mostrarMapa || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-47.93, -15.78],
      zoom: 2.2,
      projection: "globe",
      antialias: true,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on("load", () => {
      map.current.setFog({
        color: "rgba(186, 210, 235, 0.6)",
        "high-color": "rgba(36, 92, 223, 0.6)",
        "space-color": "#000000",
        "horizon-blend": 0.2,
        "star-intensity": 0.2,
      });

      const layers = map.current.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === "symbol" && layer.layout["text-field"]
      )?.id;

      if (!map.current.getLayer("3d-buildings")) {
        map.current.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#aaa",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                15.05,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.6,
            },
          },
          labelLayerId
        );
      }
    });

    // Habilita prédios 3D

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
        lng: lng,
        lat: lat,
        name: `Lng: ${lng.toFixed(2)}, Lat: ${lat.toFixed(2)}`,
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mostrarMapa]);

  if (!mostrarMapa) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          cursor: "pointer",
          fontSize: "24px",
          color: "#ffffff",
        }}
        onClick={() => setMostrarMapa(true)}
      >
        Clique para carregar o Maps
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div ref={mapContainer} className={styles.mapa}></div>
      <div className={styles.menuLateral}>
        <h2 className={styles.tituloMenu}>Veja o impacto do asteroide</h2>
        <Asteroide />
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
          <div className={styles.linhaInfo}>
            <span>Delta Velocidade (km/s):</span>
            <input
              ref={deltaVelocidadeRef}
              onChange={(e) => setDeltaVelocidade(Number(e.target.value) || 0)}
              value={deltaVelocidade}
              type="number"
              min={0}
              step={0.01}
            />
          </div>
          <div className={styles.linhaInfo}>
            <span>Tipo de Mitigação:</span>
            <select
              value={tipoMitigacao}
              onChange={(e) => setTipoMitigacao(e.target.value)}
            >
              <option value="kinetic">Kinetic Impactor</option>
              <option value="gravity">Gravity Tractor</option>
            </select>
          </div>
          <div className={styles.linhaInfo}>
            <span>Distância Tsunami (km):</span>
            <input
              onChange={(e) => setDistanciaTsunami(Number(e.target.value) || 0)}
              value={distanciaTsunami}
              type="number"
              min={0}
            />
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
              getAsteroidInfos();
            }
          }}
        >
          Jogar asteroide
        </button>
        <button
          onClick={resetarVisualizacao}
          style={{
            width: "100%",
            padding: "10px",
            background: "#4a90e2",
            color: "#ffffff",
            border: "none",
            borderRadius: "4px",
            fontSize: "14px",
            cursor: "pointer",
            marginBottom: "10px",
          }}
        >
          Resetar Visualização
        </button>
        <div className={styles.instrucao}>selecione local de impacto</div>
      </div>
      <ImpactoModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        data={resultado}
      />
    </div>
  );
};

export default Mapa;
