import express from "express";
import axios from "axios";

const URL_NASA_GET = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";

const PI = Math.PI;

const router = express.Router();

router.get("/meteor", (req, res) => {
  const { asteroid = "Apophis" } = req.query;

  const params = new URLSearchParams();
  params.set("fields", "full_name,diameter,a,e,i,om,w,tp");
  params.set("sb-ns", "n");
  params.set("sb-group", "neo");
  const endpoint = params.toString();

  axios.get(`${URL_NASA_GET}?${endpoint}`).then(async (response) => {
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

    return res.status(200).json({ data: ASTEROIDE });
  });
});

export default router;
