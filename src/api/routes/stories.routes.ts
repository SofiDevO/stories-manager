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

// get comments on story
storiesRouter.get("/:id/comments", StroriesController.getComments);

// post like on story
storiesRouter.post("/:id/likes", ipBanMiddleware, StroriesController.addLike);

// get likes count on story
storiesRouter.get("/:id/likes", StroriesController.getLikesCount);

// admin routes
storiesRouter.post("/", authMiddleware, StroriesController.create);
storiesRouter.delete("/:id", authMiddleware, StroriesController.deleteStory);
