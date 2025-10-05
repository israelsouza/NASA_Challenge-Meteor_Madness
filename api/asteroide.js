import express from "express";

const router = express.Router();

router.get("/meteor", (req, res) => {
  res.json({
    message: "Rota GET /api/asteroide funcionando",
    sample: { id: 1, name: "Asteroide Exemplo" },
  });
});

export default router;
