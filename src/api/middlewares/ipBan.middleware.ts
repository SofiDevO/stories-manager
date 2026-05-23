import { createMiddleware } from "hono/factory";
import { D1ModerationRepository } from "../../infrastructure/repositories/D1ModerationRepository";

type Env = {
  Bindings: {
    stories_manager: D1Database;
  };
  Variables: {
    clientIp: string;
  };
};

export const ipBanMiddleware = createMiddleware<Env>(async (c, next) => {
  const clientIp = c.req.header("cf-conecting-ip") || "";

  const moderationRepo = new D1ModerationRepository(c.env.stories_manager);

  const isBanned = await moderationRepo.isIpBanned(clientIp);

  if (isBanned) {
    return c.json(
      {
        success: false,
        error: "FORBIDDEN",
        message: "Ip address is banned",
      },
      403,
    );
  }
  c.set("clientIp", clientIp);
  await next();
});
