import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use("*", cors());

app.get("/", (c) => c.text("Stories Manager API"));

export default app;
