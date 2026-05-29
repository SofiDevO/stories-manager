import type { IModerationRepository } from "../../domain/repositories/IModerationRepository";

export class D1ModerationRepository implements IModerationRepository {
    constructor(private db: D1Database) { }

    async banIp(ipAddress: string, reason?: string): Promise<void> {
        await this.db.prepare(
            'INSERT OR IGNORE INTO banned_ips (ip_address, reason, banned_at) VALUES (?, ?, ?)'
        ).bind(ipAddress, reason || null, new Date().toISOString()).run();
    }
    async isIpBanned(ipAddress: string): Promise<boolean> {
        const result = await this.db.prepare(
            'SELECT ip_address FROM banned_ips WHERE ip_address = ?'
        ).bind(ipAddress).first();
        return result !== null;
    }
    async getBannedIps(): Promise<{ ipAddress: string, bannedAt: string }[]> {
        const { results } = await this.db.prepare(
            'SELECT ip_address as ipAddress, banned_at as bannedAt FROM banned_ips ORDER BY banned_at DESC'
        ).all<{ ipAddress: string, bannedAt: string }>();
        return results || [];
    }
    async unBanIp(ipAddress: string): Promise<void> {
        await this.db.prepare(
            'DELETE FROM banned_ips WHERE ip_address = ?'
        ).bind(ipAddress).run();
    }
}
