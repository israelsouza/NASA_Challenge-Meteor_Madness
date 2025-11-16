import express from "express";
import axios from "axios";
import NodeCache from "node-cache";

const asteroidCache = new NodeCache({ stdTTL: 86400 });
const cache = new NodeCache({ stdTTL: 3600 });

const URL_NASA_GET = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";

const PI = Math.PI;
const KM_PER_AU = 149597870.7;
const GM_SUN = 1.3271244e11;
const DENSIDADE_ASTEROIDE_KG_M3 = 2700;
const DENSIDADE_SOLO_KG_M3 = 2500;
const G = 6.67430e-11;

const router = express.Router();

/**
 * Busca densidade populacional da WorldPop API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} raioKm - Raio de impacto em km
 * @returns {Promise<Object>} Dados populacionais
 */
async function getPopulationData(lat, lon, raioKm) {
  try {
    // WorldPop API endpoint para população
    // Usando dados de 2020 (ano mais recente disponível)
    const year = 2020;
    
    // Calcular bounding box baseado no raio
    const latOffset = raioKm / 111.32; // ~111.32 km por grau de latitude
    const lonOffset = raioKm / (111.32 * Math.cos(lat * PI / 180));
    
    const north = lat + latOffset;
    const south = lat - latOffset;
    const east = lon + lonOffset;
    const west = lon - lonOffset;
    
    // URL da WorldPop API (exemplo - ajuste conforme documentação)
    const worldpopUrl = `https://www.worldpop.org/rest/data/pop/wpgp?lon=${lon}&lat=${lat}`;
    
    console.log(`Buscando população em raio de ${raioKm}km...`);
    
    // Tenta buscar dados da WorldPop
    try {
      const response = await axios.get(worldpopUrl, { timeout: 10000 });
      
      if (response.data && response.data.data) {
        const densidadePorKm2 = response.data.data;
        return calcularVitimas(densidadePorKm2, raioKm, lat, lon);
      }
    } catch (apiError) {
      console.warn("WorldPop API falhou, usando estimativa alternativa");
    }
    
    // Fallback: Estimativa baseada em densidade média global/regional
    return estimarVitimasAlternativo(lat, lon, raioKm);
    
  } catch (error) {
    console.error("Erro ao buscar dados populacionais:", error.message);
    return {
      populacaoTotal: 0,
      mortesEstimadas: 0,
      feridasEstimadas: 0,
      metodo: "error",
      aviso: "Não foi possível calcular vítimas"
    };
  }
}

/**
 * Calcula vítimas baseado na densidade populacional
 */
function calcularVitimas(densidadePorKm2, raioKm, lat, lon) {
  // Área de impacto em km²
  const areaImpacto = PI * Math.pow(raioKm, 2);
  
  // População na área de impacto
  const populacaoTotal = Math.round(densidadePorKm2 * areaImpacto);
  
  // Zonas de letalidade (baseado em estudos de impactos)
  const raioLetalTotal = raioKm * 0.3; // 30% do raio = letalidade 100%
  const raioLetalAlta = raioKm * 0.6;  // 60% do raio = letalidade 70%
  const raioLetalMedia = raioKm * 0.9; // 90% do raio = letalidade 40%
  
  const areaLetalTotal = PI * Math.pow(raioLetalTotal, 2);
  const areaLetalAlta = PI * (Math.pow(raioLetalAlta, 2) - Math.pow(raioLetalTotal, 2));
  const areaLetalMedia = PI * (Math.pow(raioLetalMedia, 2) - Math.pow(raioLetalAlta, 2));
  const areaFeridos = areaImpacto - areaLetalTotal - areaLetalAlta - areaLetalMedia;
  
  const mortesZona1 = densidadePorKm2 * areaLetalTotal * 1.0;
  const mortesZona2 = densidadePorKm2 * areaLetalAlta * 0.7;
  const mortesZona3 = densidadePorKm2 * areaLetalMedia * 0.4;
  const feridos = densidadePorKm2 * areaFeridos * 0.8;
  
  const mortesEstimadas = Math.round(mortesZona1 + mortesZona2 + mortesZona3);
  const feridasEstimadas = Math.round(feridos);
  
  return {
    populacaoTotal,
    mortesEstimadas,
    feridasEstimadas,
    densidadePorKm2: Math.round(densidadePorKm2),
    areaImpactoKm2: Math.round(areaImpacto),
    metodo: "worldpop",
    zonasLetalidade: {
      zona1: { raio: raioLetalTotal.toFixed(2), letalidade: "100%", mortes: Math.round(mortesZona1) },
      zona2: { raio: raioLetalAlta.toFixed(2), letalidade: "70%", mortes: Math.round(mortesZona2) },
      zona3: { raio: raioLetalMedia.toFixed(2), letalidade: "40%", mortes: Math.round(mortesZona3) }
    }
  };
}

/**
 * Estimativa alternativa baseada em região
 */
function estimarVitimasAlternativo(lat, lon, raioKm) {
  // Densidade populacional estimada por região (pessoas/km²)
  let densidadeEstimada = 50; // Densidade padrão (área rural)
  
  // Ajustes regionais aproximados
  if (Math.abs(lat) < 30 && Math.abs(lon) < 50) {
    // África/Oriente Médio
    densidadeEstimada = 100;
  } else if (lat > 30 && lat < 60 && lon > -10 && lon < 40) {
    // Europa
    densidadeEstimada = 200;
  } else if (lat > 20 && lat < 50 && lon > 70 && lon < 150) {
    // Ásia (densidade alta)
    densidadeEstimada = 400;
  } else if (lat > -60 && lat < 15 && lon > -80 && lon < -30) {
    // América do Sul
    densidadeEstimada = 80;
  } else if (lat > 15 && lat < 60 && lon > -130 && lon < -60) {
    // América do Norte
    densidadeEstimada = 120;
  }
  
  console.log(`Usando densidade estimada: ${densidadeEstimada} pessoas/km²`);
  
  return calcularVitimas(densidadeEstimada, raioKm, lat, lon);
}

router.get("/meteor", async (req, res) => {
  const {
    asteroid = "Apophis",
    latCustom,
    lonCustom,
    tipoMitigacao = "kinetic",
    deltaVelocidade = 0,
    distanciaTsunami = 0,
    elevacaoCustom,
  } = req.query;

  console.log("Momento inicial");
  console.log(asteroid, latCustom, lonCustom, tipoMitigacao, deltaVelocidade, distanciaTsunami, elevacaoCustom);

  const cacheKey = `${req.query.asteroid || "Apophis"}-${
    req.query.deltaVelocidade || 0
  }-${req.query.latCustom || 0}-${req.query.lonCustom || 0}-${
    req.query.tipoMitigacao || "kinetic"
  }-${req.query.distanciaTsunami || 0}`;

  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    console.log("Usando cache do backend");
    return res.json(cachedResult);
  }

  const asteroidKey = asteroid;
  let asteroidDataCached = asteroidCache.get(asteroidKey);

  let ASTEROIDE, massa_kg, velocidade_km_s, pos_x_au, pos_y_au, pos_z_au;

  if (asteroidDataCached) {
    console.log(`Usando cache do asteroide "${asteroid}"`);
    ({ ASTEROIDE, massa_kg, velocidade_km_s, pos_x_au, pos_y_au, pos_z_au } =
      asteroidDataCached);
    await processAsteroidData(
      ASTEROIDE,
      massa_kg,
      velocidade_km_s,
      pos_x_au,
      pos_y_au,
      pos_z_au
    );
  } else {
    const params = new URLSearchParams();
    params.set("fields", "full_name,diameter,a,e,i,om,w,tp");
    params.set("sb-ns", "n");
    params.set("sb-group", "neo");
    const endpoint = params.toString();

    axios
      .get(`${URL_NASA_GET}?${endpoint}`)
      .then(async (response) => {
        console.log("Resposta da API recebida.");
        if (
          !response.data ||
          !response.data.data ||
          !Array.isArray(response.data.data)
        ) {
          console.log("Dados da API inválidos ou vazios.");
          return res.status(500).json({ error: "Dados da API inválidos." });
        }

        let dadosRetorno = response.data.data;

        const asteroidData = dadosRetorno.find((item) =>
          item[0].toLowerCase().includes(asteroid.toLowerCase())
        );

        console.log("asteroidData encontrado:", asteroidData);

        if (!asteroidData) {
          console.log(`Asteroid "${asteroid}" not found.`);
          return res
            .status(404)
            .json({ error: `Asteroid "${asteroid}" not found.` });
        }

        const diametro_km = parseFloat(asteroidData[1]);
        const raio_m = (diametro_km / 2) * 1000;
        const volume_m3 = (4 / 3) * PI * Math.pow(raio_m, 3);
        const massa_kg = DENSIDADE_ASTEROIDE_KG_M3 * volume_m3;

        const ASTEROIDE = {
          name: asteroidData[0].trim(),
          diameter_km: diametro_km,
          a_au: parseFloat(asteroidData[2]),
          e: parseFloat(asteroidData[3]),
          i_rad: !isNaN(parseFloat(asteroidData[4]))
            ? (parseFloat(asteroidData[4]) * PI) / 180
            : 0,
          om_rad: !isNaN(parseFloat(asteroidData[5]))
            ? (parseFloat(asteroidData[5]) * PI) / 180
            : 0,
          w_rad: !isNaN(parseFloat(asteroidData[6]))
            ? (parseFloat(asteroidData[6]) * PI) / 180
            : 0,
          tp_jd: parseFloat(asteroidData[7]),
        };

        const a_km = ASTEROIDE.a_au * KM_PER_AU;
        const JD_now = new Date().getTime() / 86400000 + 2440587.5;

        const n_rad_s = Math.sqrt(GM_SUN / Math.pow(a_km, 3));
        const M_rad = n_rad_s * (JD_now - ASTEROIDE.tp_jd) * 86400;
        let E = M_rad;
        for (let i = 0; i < 10; i++) {
          E =
            E -
            (E - ASTEROIDE.e * Math.sin(E) - M_rad) /
              (1 - ASTEROIDE.e * Math.cos(E));
        }

        const r_au = ASTEROIDE.a_au * (1 - ASTEROIDE.e * Math.cos(E));
        const nu_rad = Math.atan2(
          Math.sqrt(1 - Math.pow(ASTEROIDE.e, 2)) * Math.sin(E),
          Math.cos(E) - ASTEROIDE.e
        );

        const x_prime = r_au * Math.cos(nu_rad);
        const y_prime = r_au * Math.sin(nu_rad);

        const pos_x_au =
          x_prime *
            (Math.cos(ASTEROIDE.om_rad) * Math.cos(ASTEROIDE.w_rad) -
              Math.sin(ASTEROIDE.om_rad) *
                Math.sin(ASTEROIDE.w_rad) *
                Math.cos(ASTEROIDE.i_rad)) -
          y_prime *
            (Math.cos(ASTEROIDE.om_rad) * Math.sin(ASTEROIDE.w_rad) +
              Math.sin(ASTEROIDE.om_rad) *
                Math.cos(ASTEROIDE.w_rad) *
                Math.cos(ASTEROIDE.i_rad));
        const pos_y_au =
          x_prime *
            (Math.sin(ASTEROIDE.om_rad) * Math.cos(ASTEROIDE.w_rad) +
              Math.cos(ASTEROIDE.om_rad) *
                Math.sin(ASTEROIDE.w_rad) *
                Math.cos(ASTEROIDE.i_rad)) +
          y_prime *
            (Math.cos(ASTEROIDE.om_rad) *
              Math.cos(ASTEROIDE.w_rad) *
              Math.cos(ASTEROIDE.i_rad) -
              Math.sin(ASTEROIDE.om_rad) * Math.sin(ASTEROIDE.w_rad));
        const pos_z_au =
          x_prime * (Math.sin(ASTEROIDE.w_rad) * Math.sin(ASTEROIDE.i_rad)) +
          y_prime * (Math.cos(ASTEROIDE.w_rad) * Math.sin(ASTEROIDE.i_rad));

        const velocidade_km_s = Math.sqrt(GM_SUN * (2 / (r_au * KM_PER_AU) - 1 / a_km));

        await processAsteroidData(
          ASTEROIDE,
          massa_kg,
          velocidade_km_s,
          pos_x_au,
          pos_y_au,
          pos_z_au
        );
      })
      .catch((error) => {
        console.log("Erro:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      });
  }

  async function processAsteroidData(
    ASTEROIDE,
    massa_kg,
    velocidade_km_s,
    pos_x_au,
    pos_y_au,
    pos_z_au
  ) {
    console.log("Speed km/s:", velocidade_km_s);
    console.log("Massa kg:", massa_kg);

    const finalLat = latCustom ? parseFloat(latCustom) : 0;
    const finalLon = lonCustom ? parseFloat(lonCustom) : 0;

    console.log("Usando localização:", { lat: finalLat, lon: finalLon });

    function calcularEnergiaCinetica(massa, velocidade) {
      return 0.5 * massa * Math.pow(velocidade * 1000, 2);
    }

    const energia = calcularEnergiaCinetica(massa_kg, velocidade_km_s);
    console.log("Energia cinética (J):", energia);

    function calcularCratera(energia, massa, velocidade_m_s, densidade_solo) {
      const diametro_projetil_m = ASTEROIDE.diameter_km * 1000;
      const K1 = 0.132;
      const mu = 0.41;
      const nu = 0.4;
      const g = 9.81;
      
      const diametro_cratera_m = K1 * Math.pow(
        (massa * Math.pow(velocidade_m_s, 2)) / (densidade_solo * g * Math.pow(diametro_projetil_m, 3)),
        mu
      ) * diametro_projetil_m;
      
      return diametro_cratera_m;
    }

    const velocidade_m_s = velocidade_km_s * 1000;
    const cratera = calcularCratera(energia, massa_kg, velocidade_m_s, DENSIDADE_SOLO_KG_M3);
    console.log("Cratera diâmetro (m):", cratera);

    async function getElevation(lat, lon) {
      try {
        const usgsResponse = await fetch(
          `https://nationalmap.gov/epqs/pqs.php?x=${lon}&y=${lat}&units=Meters&output=json`
        );
        if (usgsResponse.ok) {
          const data = await usgsResponse.json();
          if (data && data.USGS_Elevation_Point_Query_Service) {
            return data.USGS_Elevation_Point_Query_Service.Elevation_Query
              .Elevation;
          }
        }
      } catch (error) {
        console.warn("USGS failed, trying Open-Elevation...");
      }

      try {
        const openElevationResponse = await fetch(
          `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
        );
        if (openElevationResponse.ok) {
          const data = await openElevationResponse.json();
          if (data && data.results && data.results.length > 0) {
            return data.results[0].elevation;
          }
        }
      } catch (error) {
        console.error("Open-Elevation also failed:", error);
      }

      console.warn("Both APIs failed, assuming ocean (elevation=0)");
      return 0;
    }

    let elevation = elevacaoCustom
      ? parseFloat(elevacaoCustom)
      : await getElevation(finalLat, finalLon);
    console.log("Elevation (m):", elevation);

    let tsunami = { alturaInicial: 0, alturaPropagada: 0 };

    function calcularTsunamiDetalhado(energia, profundidade_m, distancia_km = 0) {
      if (profundidade_m >= 0) {
        return { alturaInicial: 0, alturaPropagada: 0 };
      }

      const profundidade_abs = Math.abs(profundidade_m);
      const alturaInicial = 0.00007 * Math.pow(energia / 4.184e15, 0.5) * Math.sqrt(profundidade_abs);
      const alturaPropagada = distancia_km === 0
        ? alturaInicial
        : alturaInicial * Math.pow(1 + distancia_km / 100, -0.5);

      return {
        alturaInicial: Math.max(0, alturaInicial),
        alturaPropagada: Math.max(0, alturaPropagada),
      };
    }

    if (elevation <= 0) {
      tsunami = calcularTsunamiDetalhado(energia, elevation, parseFloat(distanciaTsunami) || 0);
      console.log("Tsunami calculado:", tsunami);
    } else {
      console.warn("Land impact (elevation > 0m) - No tsunami calculated.");
    }

    function calcularMagnitudeSismica(energia) {
      const magnitude = (Math.log10(energia) - 4.8) / 1.5;
      return Math.max(0, magnitude);
    }

    function calcularRaioOndasChoque(energia) {
      const energiaMegatons = energia / 4.184e15;
      const raio_km = 2.2 * Math.pow(energiaMegatons, 0.33);
      return raio_km;
    }

    const magnitudeSismica = calcularMagnitudeSismica(energia);
    const raioOndasChoque = calcularRaioOndasChoque(energia);

    console.log("Magnitude sísmica:", magnitudeSismica);
    console.log("Raio ondas de choque (km):", raioOndasChoque);

    // *** NOVO: Calcular vítimas ***
    console.log("Calculando vítimas...");
    const dadosPopulacionais = await getPopulationData(finalLat, finalLon, raioOndasChoque);
    console.log("Dados populacionais:", dadosPopulacionais);

    function simularMitigacaoAvancada(velocidadeOriginal, deltaVelocidade, tipo) {
      const velocidadeOriginalNum = Number(velocidadeOriginal) || 0;
      const deltaVelocidadeNum = Number(deltaVelocidade) || 0;

      let novaVelocidade = velocidadeOriginalNum;
      let estrategia = "None";
      let probabilidadeSucesso = 0;
      let desviado = false;

      if (tipo === "kinetic") {
        novaVelocidade = Math.abs(velocidadeOriginalNum - deltaVelocidadeNum);
        estrategia = "Kinetic Impactor";
        const mudancaRelativa = Math.abs(deltaVelocidadeNum / velocidadeOriginalNum);
        probabilidadeSucesso = Math.min(0.95, mudancaRelativa * 100);
        desviado = deltaVelocidadeNum !== 0;
      } else if (tipo === "gravity") {
        novaVelocidade = Math.abs(velocidadeOriginalNum - Math.abs(deltaVelocidadeNum) * 0.1);
        estrategia = "Gravity Tractor";
        const mudancaRelativa = Math.abs(deltaVelocidadeNum / velocidadeOriginalNum) * 0.1;
        probabilidadeSucesso = Math.min(0.85, mudancaRelativa * 80);
        desviado = deltaVelocidadeNum !== 0;
      }

      return {
        novaVelocidade: Number(novaVelocidade.toFixed(10)),
        desviado,
        estrategia,
        probabilidadeSucesso,
      };
    }

    const mitigacao = simularMitigacaoAvancada(
      velocidade_km_s,
      deltaVelocidade,
      tipoMitigacao
    );

    const result = {
      asteroidName: ASTEROIDE.name,
      mass_kg: massa_kg,
      velocity_km_s: velocidade_km_s,
      diameter_km: ASTEROIDE.diameter_km,
      position_heliocentric_au: {
        x: pos_x_au,
        y: pos_y_au,
        z: pos_z_au,
      },
      impacto: {
        energiaCinetica: energia,
        cratera: { diametro: cratera, unidade: "meters" },
        tsunami: tsunami,
        magnitudeSismica: magnitudeSismica,
        raioOndasChoque: { raio: raioOndasChoque, unidade: "km" },
        mitigacao: mitigacao,
        vitimas: dadosPopulacionais // *** NOVO CAMPO ***
      },
      location: { 
        lat: finalLat, 
        lon: finalLon, 
        elevation_m: elevation,
        note: "Location is user-provided or default, not calculated from heliocentric coordinates"
      },
    };

    console.log("Calculated data:", result);

    cache.set(cacheKey, result);

    return res.status(200).json(result);
  }
});

export default router;