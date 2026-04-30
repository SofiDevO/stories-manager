export interface IModerationRepository {
  banIp(ipAdress: string, reasson?: string): Promise<void>;
  isIpBanned(ipAddress: string): Promise<boolean>;
  getBannedIps(): Promise<{ ipAddress: string; bannedAt: string }[]>;
  unBanIp(ipAddress: string): Promise<void>;
}
