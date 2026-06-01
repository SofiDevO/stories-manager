import type { IModerationRepository } from "../../domain/repositories/IModerationRepository";

export class GetBannedIpsUseCase {
  constructor(private modRepo: IModerationRepository) {}

  async execute(): Promise<{ ipAddress: string; bannedAt: string }[]> {
    return await this.modRepo.getBannedIps();
  }
}
