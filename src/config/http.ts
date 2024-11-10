// @ts-nocheck
import http from "http";
// Porta fornecida pelo Heroku
const PORT = process.env.PORT || 3000;

// Função para responder as requisições
const requestHandler = (req: any, res: any) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running");
};

// Criando o servidor
const server = http.createServer(requestHandler);

// Faz o servidor ouvir na porta configurada
export function startHttpServer() {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
