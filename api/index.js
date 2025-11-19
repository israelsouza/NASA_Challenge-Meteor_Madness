import express from "express";
import cors from "cors";
import compression from "compression"; // NOVO
import asteroideRouter from "./asteroide.js";

const PORT = 3000;
const app = express();

const corsOptions = {
  origin: ["http://localhost:5173", "https://teste-teamplate-vercel-html-node.vercel.app"],
  methods: ["GET", "POST"],
  optionsSuccessStatus: 200,
};

// NOVO: Habilitar compressão para reduzir tamanho das respostas
app.use(compression());

app.use(cors(corsOptions));
app.use(express.json());

// NOVO: Timeout global de 30 segundos
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    console.error('Request timeout');
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

app.use("/api", asteroideRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});

export default app;