import type { IModerationRepository } from "../../domain/repositories/IModerationRepository";

export class BanIpUseCase {
  constructor(private modRepo: IModerationRepository) {}

  async execute(ipAddress: string, reason?: string): Promise<void> {
    if (!ipAddress) {
      const error = new Error("IP address is required");
      error.name = "BadRequestError";
      throw error;
    }
    await this.modRepo.banIp(ipAddress, reason);
  }
}
