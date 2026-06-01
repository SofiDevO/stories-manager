import type { IModerationRepository } from "../../domain/repositories/IModerationRepository";

export class UnbanIpUseCase {
  constructor(private modRepo: IModerationRepository) {}

  async execute(ipAddress: string): Promise<void> {
    if (!ipAddress) {
      const error = new Error("IP address is required");
      error.name = "BadRequestError";
      throw error;
    }
    await this.modRepo.unBanIp(ipAddress);
  }
}
