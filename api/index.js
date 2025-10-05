import express from "express";
import cors from "cors";
import asteroideRouter from "./asteroide.js";

const PORT = 3000;
const app = express();

const corsOptions = {
  origin: ["http://localhost:3000","https://teste-teamplate-vercel-html-node.vercel.app"],
  methods: ["GET", "POST"],
  optionsSuccessStatus: 200, // Algumas versões do Express precisam disso
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api", asteroideRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});

export default app;
