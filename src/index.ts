import { Hono } from "hono";
import { cors } from "hono/cors";
import { D1StoryRepository } from "./infrastructure/repositories/D1StoryRepository";
import { D1CommentRepository } from "./infrastructure/repositories/D1CommentRepository";
import { CleanExpiredDataUseCase } from "./application/use-cases/CleanExpiredDataUseCase";
import { storiesRouter } from "./api/routes/stories.routes";
import { authRouter } from "./api/routes/auth.routes";
import { adminRouter } from "./api/routes/admin.routes";

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

app.route("/api/v1/auth", authRouter);
app.route("/api/v1/stories", storiesRouter);
app.route("/api/v1/admin", adminRouter);

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

    const storyRepo = new D1StoryRepository(env.stories_manager);
    const commentRepo = new D1CommentRepository(env.stories_manager);

    const cleanUseCase = new CleanExpiredDataUseCase(storyRepo, commentRepo);

    ctx.waitUntil(cleanUseCase.execute());
  },
};
