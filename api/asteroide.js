import express from "express";
import axios from "axios";

const URL_NASA_GET = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";

const PI = Math.PI;
const KM_PER_AU = 149597870.7; // 1 Unidade Astronômica em km

const router = express.Router();

router.get("/meteor", (req, res) => {
  const { asteroid = "Apophis" } = req.query;

  const params = new URLSearchParams();
  params.set("fields", "full_name,diameter,a,e,i,om,w,tp");
  params.set("sb-ns", "n");
  params.set("sb-group", "neo");
  const endpoint = params.toString();

  axios
    .get(`${URL_NASA_GET}?${endpoint}`)
    .then(async (response) => {
      console.log("GET /meteor | Exibindo data");

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

      /*
    
        Resumo curto: esses cálculos determinam a posição heliocêntrica (x,y,z em AU) e a velocidade escalar (km/s) do asteroide no instante atual a partir dos elementos orbitais
    */

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

      return res.status(200).json({ data: ASTEROIDE });
    })
    .catch((error) => {
      console.log("GET /apophis-data | ERRO AO exibir data do APOPHIS ");
      console.log(error);
      return res.status(500).send("Internal Server Error");
    });
});

export default router;
