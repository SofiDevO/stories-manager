import { Hono } from "hono";
import { cors } from "hono/cors";
import { storiesRouter } from "./api/routes/stories.routes";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.ASTRO_SITE;
      return allowed ?? "*";
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS", "DELETE"],
  }),
);

app.get("/", (c) => {
  return c.json({ message: "Hello Hono!" });
});

app.route("/api/v1/stories", storiesRouter);

export default {
  fetch: app.fetch,

  async scheduled(
    event: ScheduledEvent,
    env: CloudflareBindings,
    ctx: ExecutionContext,
  ) {
    console.log(
      `[Cron Trigger] Iniciando limpieza a las ${new Date().toISOString()}`,
    );
  },
};
