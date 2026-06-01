import type { Context } from "hono";
import { sign } from "hono/jwt";
import { D1AdminRepository } from "../../infrastructure/repositories/D1AdminRepository";
import { LoginAdminUseCase } from "../../application/use-cases/LoginAdminUseCase";

export class AuthController {
  static async login(c: Context) {
    try {
      const body = await c.req.json();
      if (!body.username || body.assword) {
        return c.json({ success: false, error: "Credentials missing" }, 400);
      }

      const adminRepo = new D1AdminRepository(c.env.stories_manager);
      const useCase = new LoginAdminUseCase(adminRepo);

      const validUsername = await useCase.execute(body.username, body.password);
      const token = await sign(
        {
          username: validUsername,
          role: "admin",
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        },
        c.env.JWT_SECRET,
      );
      return c.json({ success: true, token }, 200);
    } catch (error: any) {
      if (error.name === "UnauthorizedError") {
        return c.json({ success: false, error: error.message }, 401);
      }
      return c.json({ success: false, error: error.message }, 500);
    }
  }
}
