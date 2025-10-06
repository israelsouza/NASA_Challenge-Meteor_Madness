export const addImpactVisualization = (map, lng, lat, impactData) => {
  console.log('Adicionando visualização de impacto', { lng, lat, impactData });
  

  removeImpactLayers(map);

  if (!impactData?.impacto) {
    console.error('Dados de impacto não disponíveis');
    return;
  }

  const { cratera, raioOndasChoque } = impactData.impacto;

  // Converte metros para quilômetros
  const craterRadiusKm = (cratera.diametro / 2) / 1000;
  const shockwaveRadiusKm = raioOndasChoque.raio;
  
  console.log('Raios calculados:', { craterRadiusKm, shockwaveRadiusKm });


  const layers = [
    {
      id: 'impact-shockwave',
      radius: shockwaveRadiusKm,
      color: '#ff8c00',
      opacity: 0.2
    },
    {
      id: 'impact-severe',
      radius: shockwaveRadiusKm * 0.5,
      color: '#ff4500',
      opacity: 0.3
    },
    {
      id: 'impact-moderate',
      radius: shockwaveRadiusKm * 0.25,
      color: '#dc143c',
      opacity: 0.4
    },
    {
      id: 'impact-crater',
      radius: Math.max(craterRadiusKm, 0.5), 
      color: '#8b0000',
      opacity: 0.7
    }
  ];

  // Adiciona cada camada
  layers.forEach(layer => {
    try {
      addImpactCircle(map, lng, lat, layer);
      console.log(`Camada ${layer.id} adicionada com sucesso`);
    } catch (error) {
      console.error(`Erro ao adicionar camada ${layer.id}:`, error);
    }
  });

  addImpactMarker(map, lng, lat);
};

const addImpactCircle = (map, lng, lat, { id, radius, color, opacity }) => {
  const sourceId = `${id}-source`;

  // Cria círculo
  const circle = createCircle([lng, lat], radius);

  
  map.addSource(sourceId, {
    type: 'geojson',
    data: circle
  });

  // Adiciona layer de preenchimento
  map.addLayer({
    id: id,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': color,
      'fill-opacity': opacity
    }
  });

  map.addLayer({
    id: `${id}-outline`,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': color,
      'line-width': 2,
      'line-opacity': Math.min(opacity + 0.3, 1)
    }
  });
};

const createCircle = (center, radiusInKm, points = 128) => {
  const [lng, lat] = center;
  const ret = [];
  
  // Conversão mais precisa de km para graus
  const earthRadius = 6371; 
  const rad = radiusInKm / earthRadius;
  const latRad = lat * Math.PI / 180;

  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 2 * Math.PI;
    
    const destLat = Math.asin(
      Math.sin(latRad) * Math.cos(rad) +
      Math.cos(latRad) * Math.sin(rad) * Math.cos(bearing)
    );
    
    const destLng = ((lng * Math.PI / 180) + Math.atan2(
      Math.sin(bearing) * Math.sin(rad) * Math.cos(latRad),
      Math.cos(rad) - Math.sin(latRad) * Math.sin(destLat)
    )) * 180 / Math.PI;
    
    ret.push([destLng, destLat * 180 / Math.PI]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [ret]
    }
  };
};

export const removeImpactLayers = (map) => {
  const layerIds = [
    'impact-shockwave',
    'impact-shockwave-outline',
    'impact-severe',
    'impact-severe-outline',
    'impact-moderate',
    'impact-moderate-outline',
    'impact-crater',
    'impact-crater-outline'
  ];

  layerIds.forEach(id => {
    if (map.getLayer(id)) {
      map.removeLayer(id);
    }
  });

  const sourceIds = [
    'impact-shockwave-source',
    'impact-severe-source',
    'impact-moderate-source',
    'impact-crater-source'
  ];

  sourceIds.forEach(id => {
    if (map.getSource(id)) {
      map.removeSource(id);
    }
  });
};

export const addImpactMarker = (map, lng, lat) => {
  const sourceId = "ping-source";

  if (map.getLayer("ping-layer")) {
    map.removeLayer("ping-layer");
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }

  map.addSource(sourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] }
      }]
    }
  });

  map.addLayer({
    id: "ping-layer",
    type: "circle",
    source: sourceId,
    paint: {
      "circle-radius": 12,
      "circle-color": "#ff0000",
      "circle-opacity": 0.9,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3
    }
  });
};

export const add3DBuildings = (map) => {
  const layers = map.getStyle().layers;
  const labelLayerId = layers.find(
    (layer) => layer.type === "symbol" && layer.layout["text-field"]
  )?.id;

  if (!map.getLayer("3d-buildings")) {
    map.addLayer(
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
            15, 0,
            15.05, ["get", "height"]
          ],
          "fill-extrusion-base": [
            "interpolate",
            ["linear"],
            ["zoom"],
            15, 0,
            15.05, ["get", "min_height"]
          ],
          "fill-extrusion-opacity": 0.6
        }
      },
      labelLayerId
    );
  }
};

export const formatCoordinates = (lng, lat) => {
  return `Lng: ${lng.toFixed(2)}, Lat: ${lat.toFixed(2)}`;
};

export const isValidLatitude = (lat) => {
  return lat >= -85 && lat <= 85;
};