import type { Context } from "hono";
import { D1ModerationRepository } from "../../infrastructure/repositories/D1ModerationRepository";
import { BanIpUseCase } from "../../application/use-cases/BanIpUseCase";
import { UnbanIpUseCase } from "../../application/use-cases/UnbanIpUseCase";
import { GetBannedIpsUseCase } from "../../application/use-cases/GetBannedIpsUseCase";

export class AdminController {
  static async getBans(c: Context) {
    try {
      const modRepo = new D1ModerationRepository(c.env.stories_manager);
      const useCase = new GetBannedIpsUseCase(modRepo);
      const bans = await useCase.execute();

      return c.json({ success: true, data: bans }, 200);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  }

  static async banIp(c: Context) {
    try {
      const body = await c.req.json();
      if (!body.ipAddress) {
        return c.json({ success: false, error: "ipAddress is required" }, 400);
      }

      const modRepo = new D1ModerationRepository(c.env.stories_manager);
      const useCase = new BanIpUseCase(modRepo);
      await useCase.execute(body.ipAddress, body.reason);

      return c.json({ success: true, message: "IP banned successfully" }, 201);
    } catch (error: any) {
      if (error.name === "BadRequestError") {
        return c.json({ success: false, error: error.message }, 400);
      }
      return c.json({ success: false, error: error.message }, 500);
    }
  }

  static async unbanIp(c: Context) {
    try {
      const ipAddress = c.req.param("ip");
      if (!ipAddress) {
        return c.json({ success: false, error: "IP address is required" }, 400);
      }

      const modRepo = new D1ModerationRepository(c.env.stories_manager);
      const useCase = new UnbanIpUseCase(modRepo);
      await useCase.execute(ipAddress);

      return c.json({ success: true, message: "IP unbanned successfully" }, 200);
    } catch (error: any) {
      if (error.name === "BadRequestError") {
        return c.json({ success: false, error: error.message }, 400);
      }
      return c.json({ success: false, error: error.message }, 500);
    }
  }
}
