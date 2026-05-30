import { Hono } from "hono";
import { StroriesController } from "../controllers/stories.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { ipBanMiddleware } from "../middlewares/ipBan.middleware";

type Env = {
  Bindings: {
    stories_manager: D1Database;
    JWT_SECRET: string;
  };
  Variables: {
    clientIp: string;
  };
};

export const storiesRouter = new Hono<Env>();

// get active stories
storiesRouter.get("/", StroriesController.getActive);

// post comment on story
storiesRouter.post(
  "/:id/comments",
  ipBanMiddleware,
  StroriesController.addComment,
);

// post like on story
storiesRouter.post("/:id/likes", ipBanMiddleware, StroriesController.addLike);

// admin routes
storiesRouter.post("/", authMiddleware, StroriesController.create);
