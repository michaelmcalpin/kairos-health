const { createServer } = require("http");
const next = require("next");

const dev = false;
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    // Support SSE / streaming connections (e.g. tRPC subscriptions, AI streaming)
    // by disabling the default 2-minute timeout on keep-alive connections
    if (
      req.headers.accept === "text/event-stream" ||
      req.url?.includes("/api/trpc")
    ) {
      req.socket.setTimeout(0);
      req.socket.setNoDelay(true);
      req.socket.setKeepAlive(true);
      res.writeHead(200, {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
    }

    handle(req, res);
  });

  // Azure App Service sends SIGTERM when recycling the app
  process.on("SIGTERM", () => {
    console.log("SIGTERM received — shutting down gracefully");
    server.close(() => {
      process.exit(0);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Kairos app ready on http://${hostname}:${port}`);
  });
});
