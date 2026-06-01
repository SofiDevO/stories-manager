import type { IAdminRepository } from "../../domain/repositories/IAdminRepository";
export class LoginAdminUseCase {
  constructor(private adminRepo: IAdminRepository) {}

  async execute(username: string, passwordHash: string): Promise<string> {
    const admin = await this.adminRepo.findByUsername(username);

    if (!admin) {
      const error = new Error("Username not found");
      error.name = "NotAuthorizedError";
      throw error;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(passwordHash);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (admin.passwordHash !== hashHex) {
      const error = new Error("Credenciales inválidas.");
      error.name = "UnauthorizedError";
      throw error;
    }
    return admin.username;
  }
}
