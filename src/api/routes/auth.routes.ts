import { Hono } from "hono";

import { AuthController } from "../controllers/auth.controller";
type Env = {
  Bindings: {
    stories_manager: D1Database;
    JWT_SECRET: string;
  };
};

export const authRouter = new Hono<Env>();

authRouter.post("/login", AuthController.login);
