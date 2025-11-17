import express from "express";
import axios from "axios";
import NodeCache from "node-cache";

// NOVO: Cache com TTL mais longo para asteroides (24h) e resultados (1h)
const asteroidCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
const elevationCache = new NodeCache({ stdTTL: 604800 }); // 7 dias para elevação (raramente muda)

const URL_NASA_GET = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";

const PI = Math.PI;
const KM_PER_AU = 149597870.7;
const GM_SUN = 1.3271244e11;
const DENSIDADE_ASTEROIDE_KG_M3 = 2700;
const DENSIDADE_SOLO_KG_M3 = 2500;
const G = 6.67430e-11;

const router = express.Router();

/**
 * OTIMIZADO: Busca elevação com cache agressivo e paralelismo
 */
async function getElevation(lat, lon) {
  const cacheKey = `elev-${lat.toFixed(4)}-${lon.toFixed(4)}`;
  const cached = elevationCache.get(cacheKey);
  if (cached !== undefined) {
    console.log("Usando cache de elevação");
    return cached;
  }

  try {
    // NOVO: Chamar ambas APIs em paralelo com timeout curto
    const results = await Promise.allSettled([
      axios.get(`https://nationalmap.gov/epqs/pqs.php?x=${lon}&y=${lat}&units=Meters&output=json`, {
        timeout: 3000 // 3 segundos de timeout
      }),
      axios.get(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`, {
        timeout: 3000
      })
    ]);

    // Tentar USGS primeiro
    if (results[0].status === 'fulfilled' && results[0].value.data?.USGS_Elevation_Point_Query_Service) {
      const elevation = results[0].value.data.USGS_Elevation_Point_Query_Service.Elevation_Query.Elevation;
      elevationCache.set(cacheKey, elevation);
      return elevation;
    }

    // Tentar Open-Elevation
    if (results[1].status === 'fulfilled' && results[1].value.data?.results?.[0]) {
      const elevation = results[1].value.data.results[0].elevation;
      elevationCache.set(cacheKey, elevation);
      return elevation;
    }

    console.warn("Ambas APIs de elevação falharam, assumindo oceano (elevation=0)");
    elevationCache.set(cacheKey, 0);
    return 0;
  } catch (error) {
    console.error("Erro ao buscar elevação:", error.message);
    elevationCache.set(cacheKey, 0);
    return 0;
  }
}

/**
 * OTIMIZADO: Estimativa rápida sem chamada à WorldPop (sempre falha)
 */
function estimarVitimasRapido(lat, lon, raioKm) {
  let densidadeEstimada = 50; // Densidade padrão (área rural)

  // Ajustes regionais aproximados
  if (Math.abs(lat) < 30 && Math.abs(lon) < 50) {
    densidadeEstimada = 100; // África/Oriente Médio
  } else if (lat > 30 && lat < 60 && lon > -10 && lon < 40) {
    densidadeEstimada = 200; // Europa
  } else if (lat > 20 && lat < 50 && lon > 70 && lon < 150) {
    densidadeEstimada = 400; // Ásia (densidade alta)
  } else if (lat > -60 && lat < 15 && lon > -80 && lon < -30) {
    densidadeEstimada = 80; // América do Sul
  } else if (lat > 15 && lat < 60 && lon > -130 && lon < -60) {
    densidadeEstimada = 120; // América do Norte
  }

  // Área de impacto em km²
  const areaImpacto = PI * Math.pow(raioKm, 2);
  const populacaoTotal = Math.round(densidadeEstimada * areaImpacto);

  // Zonas de letalidade
  const raioLetalTotal = raioKm * 0.3;
  const raioLetalAlta = raioKm * 0.6;
  const raioLetalMedia = raioKm * 0.9;

  const areaLetalTotal = PI * Math.pow(raioLetalTotal, 2);
  const areaLetalAlta = PI * (Math.pow(raioLetalAlta, 2) - Math.pow(raioLetalTotal, 2));
  const areaLetalMedia = PI * (Math.pow(raioLetalMedia, 2) - Math.pow(raioLetalAlta, 2));
  const areaFeridos = areaImpacto - areaLetalTotal - areaLetalAlta - areaLetalMedia;

  const mortesZona1 = densidadeEstimada * areaLetalTotal * 1.0;
  const mortesZona2 = densidadeEstimada * areaLetalAlta * 0.7;
  const mortesZona3 = densidadeEstimada * areaLetalMedia * 0.4;
  const feridos = densidadeEstimada * areaFeridos * 0.8;

  return {
    populacaoTotal,
    mortesEstimadas: Math.round(mortesZona1 + mortesZona2 + mortesZona3),
    feridasEstimadas: Math.round(feridos),
    densidadePorKm2: Math.round(densidadeEstimada),
    areaImpactoKm2: Math.round(areaImpacto),
    metodo: "estimativa_regional",
    zonasLetalidade: {
      zona1: { raio: raioLetalTotal.toFixed(2), letalidade: "100%", mortes: Math.round(mortesZona1) },
      zona2: { raio: raioLetalAlta.toFixed(2), letalidade: "70%", mortes: Math.round(mortesZona2) },
      zona3: { raio: raioLetalMedia.toFixed(2), letalidade: "40%", mortes: Math.round(mortesZona3) }
    }
  };
}

router.get("/meteor", async (req, res) => {
  const startTime = Date.now(); // NOVO: Medir tempo de resposta

  const {
    asteroid = "Apophis",
    latCustom,
    lonCustom,
    tipoMitigacao = "kinetic",
    deltaVelocidade = 0,
    distanciaTsunami = 0,
    elevacaoCustom,
  } = req.query;

  console.log("=== INÍCIO DA REQUISIÇÃO ===");
  console.log("Parâmetros:", { asteroid, latCustom, lonCustom, tipoMitigacao, deltaVelocidade, distanciaTsunami });

  const cacheKey = `${asteroid}-${deltaVelocidade}-${latCustom || 0}-${lonCustom || 0}-${tipoMitigacao}-${distanciaTsunami}`;

  // OTIMIZADO: Verificar cache primeiro
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    console.log("✅ USANDO CACHE DO BACKEND - Tempo:", Date.now() - startTime, "ms");
    return res.json(cachedResult);
  }

  const asteroidKey = asteroid;
  let asteroidDataCached = asteroidCache.get(asteroidKey);

  let ASTEROIDE, massa_kg, velocidade_km_s, pos_x_au, pos_y_au, pos_z_au;

  if (asteroidDataCached) {
    console.log(`✅ USANDO CACHE DO ASTEROIDE "${asteroid}"`);
    ({ ASTEROIDE, massa_kg, velocidade_km_s, pos_x_au, pos_y_au, pos_z_au } = asteroidDataCached);
    return processAsteroidData(ASTEROIDE, massa_kg, velocidade_km_s, pos_x_au, pos_y_au, pos_z_au);
  }

  // OTIMIZADO: Buscar dados da NASA com timeout
  const params = new URLSearchParams();
  params.set("fields", "full_name,diameter,a,e,i,om,w,tp");
  params.set("sb-ns", "n");
  params.set("sb-group", "neo");

  try {
    console.log("⏳ Buscando dados da NASA...");
    const response = await axios.get(`${URL_NASA_GET}?${params.toString()}`, {
      timeout: 5000 // 5 segundos de timeout
    });

    if (!response.data?.data || !Array.isArray(response.data.data)) {
      console.error("❌ Dados da API inválidos");
      return res.status(500).json({ error: "Dados da API inválidos." });
    }

    const asteroidData = response.data.data.find((item) =>
      item[0].toLowerCase().includes(asteroid.toLowerCase())
    );

    if (!asteroidData) {
      console.error(`❌ Asteroide "${asteroid}" não encontrado`);
      return res.status(404).json({ error: `Asteroid "${asteroid}" not found.` });
    }

    console.log("✅ Dados da NASA recebidos");

    const diametro_km = parseFloat(asteroidData[1]);
    const raio_m = (diametro_km / 2) * 1000;
    const volume_m3 = (4 / 3) * PI * Math.pow(raio_m, 3);
    massa_kg = DENSIDADE_ASTEROIDE_KG_M3 * volume_m3;

    ASTEROIDE = {
      name: asteroidData[0].trim(),
      diameter_km: diametro_km,
      a_au: parseFloat(asteroidData[2]),
      e: parseFloat(asteroidData[3]),
      i_rad: !isNaN(parseFloat(asteroidData[4])) ? (parseFloat(asteroidData[4]) * PI) / 180 : 0,
      om_rad: !isNaN(parseFloat(asteroidData[5])) ? (parseFloat(asteroidData[5]) * PI) / 180 : 0,
      w_rad: !isNaN(parseFloat(asteroidData[6])) ? (parseFloat(asteroidData[6]) * PI) / 180 : 0,
      tp_jd: parseFloat(asteroidData[7]),
    };

    // Cálculos orbitais (otimizado com menos iterações)
    const a_km = ASTEROIDE.a_au * KM_PER_AU;
    const JD_now = new Date().getTime() / 86400000 + 2440587.5;
    const n_rad_s = Math.sqrt(GM_SUN / Math.pow(a_km, 3));
    const M_rad = n_rad_s * (JD_now - ASTEROIDE.tp_jd) * 86400;

    let E = M_rad;
    for (let i = 0; i < 5; i++) { // OTIMIZADO: Reduzido de 10 para 5 iterações
      E = E - (E - ASTEROIDE.e * Math.sin(E) - M_rad) / (1 - ASTEROIDE.e * Math.cos(E));
    }

    const r_au = ASTEROIDE.a_au * (1 - ASTEROIDE.e * Math.cos(E));
    const nu_rad = Math.atan2(
      Math.sqrt(1 - Math.pow(ASTEROIDE.e, 2)) * Math.sin(E),
      Math.cos(E) - ASTEROIDE.e
    );

    const x_prime = r_au * Math.cos(nu_rad);
    const y_prime = r_au * Math.sin(nu_rad);

    pos_x_au =
      x_prime * (Math.cos(ASTEROIDE.om_rad) * Math.cos(ASTEROIDE.w_rad) -
        Math.sin(ASTEROIDE.om_rad) * Math.sin(ASTEROIDE.w_rad) * Math.cos(ASTEROIDE.i_rad)) -
      y_prime * (Math.cos(ASTEROIDE.om_rad) * Math.sin(ASTEROIDE.w_rad) +
        Math.sin(ASTEROIDE.om_rad) * Math.cos(ASTEROIDE.w_rad) * Math.cos(ASTEROIDE.i_rad));

    pos_y_au =
      x_prime * (Math.sin(ASTEROIDE.om_rad) * Math.cos(ASTEROIDE.w_rad) +
        Math.cos(ASTEROIDE.om_rad) * Math.sin(ASTEROIDE.w_rad) * Math.cos(ASTEROIDE.i_rad)) +
      y_prime * (Math.cos(ASTEROIDE.om_rad) * Math.cos(ASTEROIDE.w_rad) * Math.cos(ASTEROIDE.i_rad) -
        Math.sin(ASTEROIDE.om_rad) * Math.sin(ASTEROIDE.w_rad));

    pos_z_au =
      x_prime * (Math.sin(ASTEROIDE.w_rad) * Math.sin(ASTEROIDE.i_rad)) +
      y_prime * (Math.cos(ASTEROIDE.w_rad) * Math.sin(ASTEROIDE.i_rad));

    velocidade_km_s = Math.sqrt(GM_SUN * (2 / (r_au * KM_PER_AU) - 1 / a_km));

    // NOVO: SALVAR NO CACHE DO ASTEROIDE
    asteroidCache.set(asteroidKey, {
      ASTEROIDE,
      massa_kg,
      velocidade_km_s,
      pos_x_au,
      pos_y_au,
      pos_z_au,
    });
    console.log("✅ Dados do asteroide salvos no cache");

    return processAsteroidData(ASTEROIDE, massa_kg, velocidade_km_s, pos_x_au, pos_y_au, pos_z_au);

  } catch (error) {
    console.error("❌ Erro ao buscar dados da NASA:", error.message);
    return res.status(500).json({ error: "Erro ao buscar dados da NASA" });
  }

  async function processAsteroidData(ASTEROIDE, massa_kg, velocidade_km_s, pos_x_au, pos_y_au, pos_z_au) {
    const finalLat = latCustom ? parseFloat(latCustom) : 0;
    const finalLon = lonCustom ? parseFloat(lonCustom) : 0;

    // Cálculos rápidos (sem mudanças)
    const energia = 0.5 * massa_kg * Math.pow(velocidade_km_s * 1000, 2);

    const velocidade_m_s = velocidade_km_s * 1000;
    const diametro_projetil_m = ASTEROIDE.diameter_km * 1000;
    const cratera = 0.132 * Math.pow(
      (massa_kg * Math.pow(velocidade_m_s, 2)) / (DENSIDADE_SOLO_KG_M3 * 9.81 * Math.pow(diametro_projetil_m, 3)),
      0.41
    ) * diametro_projetil_m;

    // OTIMIZADO: Buscar elevação em paralelo com cálculos
    const elevation = elevacaoCustom ? parseFloat(elevacaoCustom) : await getElevation(finalLat, finalLon);

    let tsunami = { alturaInicial: 0, alturaPropagada: 0 };
    if (elevation <= 0) {
      const profundidade_abs = Math.abs(elevation);
      const alturaInicial = 0.00007 * Math.pow(energia / 4.184e15, 0.5) * Math.sqrt(profundidade_abs);
      const distancia_km = parseFloat(distanciaTsunami) || 0;
      tsunami = {
        alturaInicial: Math.max(0, alturaInicial),
        alturaPropagada: distancia_km === 0 ? alturaInicial : alturaInicial * Math.pow(1 + distancia_km / 100, -0.5),
      };
    }

    const magnitudeSismica = Math.max(0, (Math.log10(energia) - 4.8) / 1.5);
    const raioOndasChoque = 2.2 * Math.pow(energia / 4.184e15, 0.33);

    // OTIMIZADO: Usar estimativa rápida em vez de chamar WorldPop (sempre falha)
    const dadosPopulacionais = estimarVitimasRapido(finalLat, finalLon, raioOndasChoque);

    const velocidadeOriginalNum = Number(velocidade_km_s) || 0;
    const deltaVelocidadeNum = Number(deltaVelocidade) || 0;
    let novaVelocidade = velocidadeOriginalNum;
    let estrategia = "None";
    let probabilidadeSucesso = 0;
    let desviado = false;

    if (tipoMitigacao === "kinetic") {
      novaVelocidade = Math.abs(velocidadeOriginalNum - deltaVelocidadeNum);
      estrategia = "Kinetic Impactor";
      probabilidadeSucesso = Math.min(0.95, Math.abs(deltaVelocidadeNum / velocidadeOriginalNum) * 100);
      desviado = deltaVelocidadeNum !== 0;
    } else if (tipoMitigacao === "gravity") {
      novaVelocidade = Math.abs(velocidadeOriginalNum - Math.abs(deltaVelocidadeNum) * 0.1);
      estrategia = "Gravity Tractor";
      probabilidadeSucesso = Math.min(0.85, Math.abs(deltaVelocidadeNum / velocidadeOriginalNum) * 8);
      desviado = deltaVelocidadeNum !== 0;
    }

    const result = {
      asteroidName: ASTEROIDE.name,
      mass_kg: massa_kg,
      velocity_km_s: velocidade_km_s,
      diameter_km: ASTEROIDE.diameter_km,
      position_heliocentric_au: { x: pos_x_au, y: pos_y_au, z: pos_z_au },
      impacto: {
        energiaCinetica: energia,
        cratera: { diametro: cratera, unidade: "meters" },
        tsunami,
        magnitudeSismica,
        raioOndasChoque: { raio: raioOndasChoque, unidade: "km" },
        mitigacao: {
          novaVelocidade: Number(novaVelocidade.toFixed(10)),
          desviado,
          estrategia,
          probabilidadeSucesso,
        },
        vitimas: dadosPopulacionais,
      },
      location: {
        lat: finalLat,
        lon: finalLon,
        elevation_m: elevation,
      },
    };

    // NOVO: SALVAR NO CACHE DE RESULTADOS
    cache.set(cacheKey, result);

    const totalTime = Date.now() - startTime;
    console.log(`✅ RESPOSTA ENVIADA - Tempo total: ${totalTime}ms`);

    return res.status(200).json(result);
  }
});

export default router;