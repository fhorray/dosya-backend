import { Hono } from "hono";
import { cors } from "hono/cors";

import upload from "./files/files.routes";

const app = new Hono();

// CORS
app.use("*", async (c, next) => {
  const corsMiddleware = cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  return corsMiddleware(c, next);
});

app.route("/files", upload);

export default app;
