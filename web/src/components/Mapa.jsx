import React, { useEffect, useRef, useState, useCallback } from "react";
import { useMapbox } from "../hooks/useMapbox";
import { useImpactSimulation } from "../hooks/useImpactSimulation";
import { 
  addImpactMarker, 
  addImpactVisualization,
  removeImpactLayers,
  isValidLatitude, 
  formatCoordinates 
} from "../utils/mapUtils";
import { MAP_CONFIG } from "../constants/mapConfig";
import ConfigSidebar from "./ConfigSidebar";
import Asteroide from "./Asteroide";
import ImpactoModal from "./ImpactoModal";
import "../assets/styles/Mapa.css";

const Mapa = () => {
  const mapContainer = useRef(null);
  const { map, isReady } = useMapbox(mapContainer);
  const [modalAberto, setModalAberto] = useState(false);
  
  const {
    config,
    setConfig,
    impactLocation,
    setImpactLocation,
    resultado,
    fetchImpactData
  } = useImpactSimulation();

  useEffect(() => {
    if (!map || !isReady) return;

    const handleMapClick = (e) => {
      const { lng, lat } = e.lngLat;
      
      if (!isValidLatitude(lat)) return;

      // Remove visualizações anteriores
      removeImpactLayers(map);
      
      addImpactMarker(map, lng, lat);
      setImpactLocation({
        lng,
        lat,
        name: formatCoordinates(lng, lat)
      });
    };

    map.on("click", handleMapClick);
    return () => map.off("click", handleMapClick);
  }, [map, isReady, setImpactLocation]);

  const handleLaunch = useCallback(async () => {
    if (!impactLocation) {
      alert("Insira um local primeiro para prosseguir");
      return;
    }

    console.log('Iniciando simulação de impacto...');
    console.log('Localização:', impactLocation);
    console.log('Config:', config);

    // Busca dados do impacto ANTES da animação
    const data = await fetchImpactData();
    console.log('Dados recebidos:', data);

    if (!data) {
      console.error('Nenhum dado foi retornado do backend');
      alert('Erro ao buscar dados do impacto. Verifique o console para mais detalhes.');
      return;
    }

    // Animação de zoom para o local de impacto
    map.setProjection("mercator");
    map.flyTo({
      center: [impactLocation.lng, impactLocation.lat],
      ...MAP_CONFIG.impactView,
      essential: true
    });

    map.once('moveend', () => {
      console.log('Animação completada, adicionando visualização...');
      addImpactVisualization(map, impactLocation.lng, impactLocation.lat, data);
      setTimeout(() => setModalAberto(true), 300);
    });
  }, [impactLocation, map, fetchImpactData, config]);

  const handleReset = useCallback(() => {
    if (!map) return;

    // Remove todas as camadas de impacto
    removeImpactLayers(map);

    map.setProjection("globe");
    map.flyTo({
      ...MAP_CONFIG.defaultView,
      speed: 0.6,
      curve: 1.2,
      essential: true
    });
  }, [map]);

  return (
    <div className="app-container">
      <div ref={mapContainer} className="map-container" />

      <ConfigSidebar
        impactLocation={impactLocation}
        config={config}
        onConfigChange={setConfig}
        onLaunch={handleLaunch}
        onReset={handleReset}
        AsteroideComponent={Asteroide}
      />

      <ImpactoModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        data={resultado}
      />
    </div>
  );
};

export default Mapa;