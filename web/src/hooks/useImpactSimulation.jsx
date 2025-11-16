import { useState, useCallback } from "react";

export const useImpactSimulation = () => {
  const [config, setConfig] = useState({
    asteroid: "Apophis",
    deltaVelocidade: 1,
    tipoMitigacao: "kinetic",
    distanciaTsunami: 0,
  });

  const [impactLocation, setImpactLocation] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchImpactData = useCallback(async () => {
    if (!impactLocation) {
      console.error("fetchImpactData: impactLocation não definido");
      return null;
    }

    console.log("fetchImpactData: Iniciando requisição...");
    console.log("Localização:", impactLocation);
    console.log("Configuração:", config);

    setIsLoading(true);

    try {     
      const params = new URLSearchParams({
        latCustom: impactLocation.lat,
        lonCustom: impactLocation.lng,
        asteroid: config.asteroid,
        deltaVelocidade: config.deltaVelocidade,
        tipoMitigacao: config.tipoMitigacao,
        distanciaTsunami: config.distanciaTsunami
      });

      const API_URL = import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000'

      const url = `${API_URL}/api/meteor?${params}`;
      console.log('URL da requisição:', url);

      const response = await fetch(url);
      console.log('Status da resposta:', response.status);
      console.log('Response OK?', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dados recebidos do backend:', data);
      
      setResultado(data);
      return data;
      
    } catch (error) {
      console.error("Erro ao buscar dados do impacto:", error);
      console.error("Stack trace:", error.stack);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [impactLocation, config]);

  return {
    config,
    setConfig,
    impactLocation,
    setImpactLocation,
    resultado,
    isLoading,
    fetchImpactData,
  };
};
