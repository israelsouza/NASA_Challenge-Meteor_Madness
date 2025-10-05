import express from "express";
import axios from "axios";
import NodeCache from "node-cache";

const asteroidCache = new NodeCache({ stdTTL: 86400 });
const cache = new NodeCache({ stdTTL: 3600 });

const URL_NASA_GET = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";

const PI = Math.PI;
const KM_PER_AU = 149597870.7; // 1 Unidade Astronômica em km
const GM_SUN = 1.3271244e11; // gravitacional do Sol em km^3/s^2
const DENSIDADE_KG_M3 = 2700;

const router = express.Router();

router.get("/meteor", (req, res) => {
  const {
    asteroid = "Apophis",
    latCustom,
    lonCustom,
    tipoMitigacao = "kinetic",
    deltaVelocidade = 0,
    distanciaTsunami = 0,
    elevacaoCustom,
  } = req.query;

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

  // Cache para asteroide
  const asteroidKey = asteroid;
  let asteroidDataCached = asteroidCache.get(asteroidKey);

  let ASTEROIDE, massa_kg, velocidade_km_s, pos_x_au, pos_y_au, pos_z_au;

  if (asteroidDataCached) {
    console.log(`Usando cache do asteroide "${asteroid}"`);
    ({ ASTEROIDE, massa_kg, velocidade_km_s, pos_x_au, pos_y_au, pos_z_au } =
      asteroidDataCached);
    // >>> EXECUTE O RESTO AQUI (sem axios)
    processAsteroidData(
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

        if (!asteroidData) {
          console.log(`Asteroid "${asteroid}" not found.`);
          return res
            .status(404)
            .json({ error: `Asteroid "${asteroid}" not found.` });
        }

        const diametro_km = parseFloat(asteroidData[1]); // Diâmetro em km
        const DENSIDADE_KG_M3 = 2700; // Densidade típica de asteroide rochoso
        const raio_m = (diametro_km / 2) * 1000; // Raio em metros
        const volume_m3 = (4 / 3) * PI * Math.pow(raio_m, 3);
        const massa_kg = DENSIDADE_KG_M3 * volume_m3; // Massa dinâmica

        const ASTEROIDE = {
          name: asteroidData[0].trim(),
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

        //  CÁLCULO DA ANOMALIA EXCÊNTRICA (E)
        const n_rad_s = Math.sqrt(GM_SUN / Math.pow(a_km, 3));
        const M_rad = n_rad_s * (JD_now - ASTEROIDE.tp_jd) * 86400;
        let E = M_rad;
        for (let i = 0; i < 5; i++) {
          E =
            E -
            (E - ASTEROIDE.e * Math.sin(E) - M_rad) /
              (1 - ASTEROIDE.e * Math.cos(E));
        }

        //  CÁLCULO DA POSIÇÃO (X, Y, Z)
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

        // CÁLCULO DA VELOCIDADE ESCALAR
        const vp_km_s = Math.sqrt(GM_SUN / a_km);
        const velocidade_km_s =
          vp_km_s *
          Math.sqrt((1 + ASTEROIDE.e) / (1 - ASTEROIDE.e)) *
          Math.abs(1 - ASTEROIDE.e * Math.cos(E));

        asteroidDataCached = {
          ASTEROIDE,
          massa_kg,
          velocidade_km_s,
          pos_x_au,
          pos_y_au,
          pos_z_au,
        };
        asteroidCache.set(asteroidKey, asteroidDataCached);
        console.log(`Dados do asteroide "${asteroid}" salvos no cache`);

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
        return res.status(500).send("Internal Server Error");
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

    function calcularEnergiaCinetica(massa, velocidade) {
      return 0.5 * massa * Math.pow(velocidade * 1000, 2);
    }

    const energia = calcularEnergiaCinetica(massa_kg, velocidade_km_s);
    console.log("Energia cinética:", energia);

    function calcularCratera(energia) {
      const energiaEmTNT = energia / 4.184e9; // Converter para equivalente TNT (1 TNT = 4.184e9 J)
      return 1.161 * Math.pow(energiaEmTNT / DENSIDADE_KG_M3, 0.78);
    }

    const cratera = calcularCratera(energia);
    console.log("Cratera diametro:", cratera);

    function cartesianToLatLon(x, y, z) {
      console.log("Coordenadas recebidas:", x, y, z);

      const R = 6371; // da Terra em km

      if (Math.abs(z) > R) {
        console.warn(
          "Coordenada z fora do raio da Terra. Usando localização aproximada (lat=0, lon=calculada)."
        );
        const lon = (Math.atan2(y, x) * 180) / PI;
        return { lat: 0, lon }; // Aproximação: assume impacto equatorial
      }
      const lat = (Math.asin(z / R) * 180) / PI;
      const lon = (Math.atan2(y, x) * 180) / PI;

      console.log("Lat/Lon calculados:", lat, lon);

      return { lat, lon };
    }

    const { lat, lon } = cartesianToLatLon(
      pos_x_au * KM_PER_AU,
      pos_y_au * KM_PER_AU,
      pos_z_au * KM_PER_AU
    );

    console.log("Lat/Lon calculados:", lat, lon);

    const finalLat = latCustom ? parseFloat(latCustom) : lat;
    const finalLon = lonCustom ? parseFloat(lonCustom) : lon;

    async function getElevation(lat, lon) {
      try {
        // Tente USGS primeiro
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
        console.warn("USGS falhou, tentando Open-Elevation...");
      }

      try {
        // Fallback para Open-Elevation
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
        console.error("Open-Elevation também falhou:", error);
      }

      // Fallback final: 0 (oceano)
      console.warn("Ambas as APIs falharam, assumindo oceano (elevation=0)");
      return 0;
    }

    let elevation = elevacaoCustom
      ? parseFloat(elevacaoCustom)
      : await getElevation(finalLat, finalLon);
    console.log("Elevation:", elevation);

    // falta calculo para desastre natural

    let tsunami = { alturaInicial: 0, alturaPropagada: 0 };

    function calcularTsunamiDetalhado(
      energia,
      elevacaoCosteira,
      distancia = 0
    ) {
      const alturaInicial = Math.sqrt(energia / 1e12) - elevacaoCosteira;

      const alturaPropagada =
        distancia === 0
          ? alturaInicial // Sem decaimento se distancia = 0
          : alturaInicial * Math.exp(-distancia / 1000); // Decaimento simplificado
      return {
        alturaInicial: Math.max(0, alturaInicial), // Garante não negativo
        alturaPropagada: Math.max(0, alturaPropagada), // Garante não negativo
      };
    }

    if (elevation <= 0) {
      // Só calcula tsunami se for oceano
      const tsunamiDetalhado = calcularTsunamiDetalhado(
        energia,
        elevation,
        distanciaTsunami
      );
      tsunami = tsunamiDetalhado;
    } else {
      console.warn(
        "Impacto em terra (elevação > 0m) - Nenhum tsunami calculado."
      );
    }

    console.log("Tsunami altura:", tsunami);

    function simularMitigacaoAvancada(
      velocidadeOriginal,
      deltaVelocidade,
      tipo
    ) {
      // Garantir que ambos sejam numbers
      const velocidadeOriginalNum = Number(velocidadeOriginal) || 0;
      const deltaVelocidadeNum = Number(deltaVelocidade) || 0;

      let novaVelocidade = velocidadeOriginalNum;
      let estrategia = "Nenhuma";
      let probabilidadeSucesso = 0;
      let desviado = false;

      if (tipo === "kinetic") {
        novaVelocidade = velocidadeOriginalNum + deltaVelocidadeNum; // Agora soma numbers
        estrategia = "Kinetic Impactor";
        probabilidadeSucesso = deltaVelocidadeNum > 0.01 ? 0.8 : 0.2;
        desviado = deltaVelocidadeNum !== 0;
      } else if (tipo === "gravity") {
        novaVelocidade =
          velocidadeOriginalNum - Math.abs(deltaVelocidadeNum) * 0.1;
        estrategia = "Gravity Tractor";
        probabilidadeSucesso = Math.abs(deltaVelocidadeNum) > 0.005 ? 0.7 : 0.3;
        desviado = deltaVelocidadeNum !== 0;
      }

      return {
        novaVelocidade: Number(novaVelocidade.toFixed(10)), // Agora funciona
        desviado,
        estrategia,
        probabilidadeSucesso,
      };
    }

    const mitigacao = simularMitigacaoAvancada(
      velocidade_km_s,
      deltaVelocidade,
      tipoMitigacao,
      ASTEROIDE
    );

    // Nova função para magnitude sísmica (Richter)
    function calcularMagnitudeSismica(energia) {
      const energiaTNT = energia / 4.184e9;
      return Math.log10(energiaTNT) - 4.8; // Fórmula aproximada
    }

    // Nova função para raio de ondas de choque (em km)
    function calcularRaioOndasChoque(energia) {
      const pressaoAr = 1e5; // Pa
      return Math.sqrt(energia / pressaoAr) / 1000; // Converter m para km
    }

    const magnitudeSismica = calcularMagnitudeSismica(energia);
    const raioOndasChoque = calcularRaioOndasChoque(energia);

    const result = {
      asteroidName: ASTEROIDE.name,
      mass_kg: massa_kg,
      velocity_km_s: velocidade_km_s,
      position_km: {
        x: pos_x_au * KM_PER_AU,
        y: pos_y_au * KM_PER_AU,
        z: pos_z_au * KM_PER_AU,
      },
      impacto: {
        energiaCinetica: energia,
        cratera: { diametro: cratera, unidade: "metros" },
        tsunami: tsunami,
        magnitudeSismica: magnitudeSismica,
        raioOndasChoque: { raio: raioOndasChoque, unidade: "km" },
        mitigacao: mitigacao,
      },
      location: { lat: finalLat, lon: finalLon, elevation_m: elevation },
    };

    console.log("Dados calculados:", result);

    return res.status(200).json(result);
  }
});

export default router;
