import express from 'express'
import cors from 'cors'

const PORT = 3000

const app = express();

const corsOptions = {
  // Defina as origens permitidas para desenvolvimento e produção
  origin: [
    'http://localhost:3000', // URL do seu front-end em desenvolvimento
    'https://teste-teamplate-vercel-html-node.vercel.app' // URL do seu front-end em produção
  ],
  methods: ['GET', 'POST'], // Métodos permitidos
  optionsSuccessStatus: 200 // Algumas versões do Express precisam disso
};

app.use(cors(corsOptions));
app.use(express.json());

app.post('/api/hi', (req, res) => {
  console.log('Here')
  const { data } = req.body
  console.log('Data: ', data)

  return res.status(200).json({
    data: 'Algum retorno do meu proprio backend',
    message: 'Sucesso',
  })
})

// app.listen(PORT, () => {
//   console.log(`Servidor rodando em: http://localhost:${PORT}`)
// })

export default app