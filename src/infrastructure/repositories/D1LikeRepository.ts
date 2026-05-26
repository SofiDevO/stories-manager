import type { ILikeRepository } from "../../domain/repositories/ILikeRepository";

export class D1LikeRepository implements ILikeRepository {
  constructor(private db: D1Database) {}

  async addLike(storyId: string, ipAddress: string): Promise<void> {
    await this.db
      .prepare(
        "INSERT OR IGNORE INTO likes (stori_id, ip_address, created_at) VALUES(?,?,?)",
      )
      .bind(storyId, ipAddress, new Date().toISOString())
      .run();
  }

  async getLikesCount(storyId: string): Promise<number> {
    const result = await this.db
      .prepare("SELECT COUNT(*) as count FROM likes WHERE story_id = ?")
      .bind(storyId)
      .first<{ count: number }>();
    return result?.count || 0;
  }
}
