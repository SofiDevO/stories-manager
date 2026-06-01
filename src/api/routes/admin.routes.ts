import { Hono } from "hono";
import { AdminController } from "../controllers/admin.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

type Env = {
  Bindings: {
    stories_manager: D1Database;
    JWT_SECRET: string;
  };
};

export const adminRouter = new Hono<Env>();

// Proteger todas las rutas de este router
adminRouter.use("/*", authMiddleware);

adminRouter.get("/bans", AdminController.getBans);
adminRouter.post("/bans", AdminController.banIp);
adminRouter.delete("/bans/:ip", AdminController.unbanIp);
