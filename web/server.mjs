import { createServer } from "node:http";
import next from "next";

const port = Number(process.env.PORT || 3000);
const hostname = "0.0.0.0";

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer(async (req, res) => {
  const rawUrl = req.url || "/";
  const pathname = new URL(rawUrl, `http://${req.headers.host || "localhost"}`).pathname;

  console.log(`PrimeEstate request: ${req.method || "GET"} ${pathname}`);

  if (pathname === "/__primeestate_probe") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("PrimeEstate server is running");
    return;
  }

  try {
    await handle(req, res);
  } catch (error) {
    console.error("PrimeEstate request error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Internal Server Error");
    } else {
      res.end();
    }
  }
});

server.on("error", (error) => {
  console.error("PrimeEstate server error:", error);
  process.exit(1);
});

server.listen(port, hostname, () => {
  console.log(`PrimeEstate Next server listening on http://${hostname}:${port}`);
});
