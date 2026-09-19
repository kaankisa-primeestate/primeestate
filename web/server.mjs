import { createServer } from "node:http";
import next from "next";

const port = Number(process.env.PORT || 3000);
const hostname = "0.0.0.0";

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer(async (req, res) => {
  if (req.url === "/__primeestate_probe") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("PrimeEstate server is running");
    return;
  }

  await handle(req, res);
});

server.listen(port, hostname, () => {
  console.log(`PrimeEstate Next server listening on http://${hostname}:${port}`);
});
