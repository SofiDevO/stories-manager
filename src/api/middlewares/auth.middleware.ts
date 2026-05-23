import { jwt } from "hono/jwt";
import { createMiddleware } from "hono/factory";

type Env = {
  Bindings: {
    JWT_SECRET: string;
  };
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  if (!c.env.JWT_SECRET) {
    return c.json({ error: "Missing JWT" });
  }
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: "HS256",
  });
  return jwtMiddleware(c, next);
});
