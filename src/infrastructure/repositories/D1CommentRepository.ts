import type { ICommentRepository } from "../../domain/repositories/ICommentRepository";
import type { Comment } from "../../domain/entities/Comment";

export class D1CommentRepository implements ICommentRepository {
  constructor(private db: D1Database) {}

  async create(comment: Comment): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO comment(id,story_id, content, ip_address as ipAddress, created_at as createdAt FROM comments WHERE story_id= ? ORDER BY created_at ASC )",
      )
      .bind(
        comment.id,
        comment.storyId,
        comment.content,
        comment.ipAddress,
        comment.createdAt,
      )
      .run();
  }

  async getByStoryId(storyId: string): Promise<Comment[]> {
    const { results } = await this.db
      .prepare(
        "SELECT id, story_id as storyId, content, ip_address as ipAddress, created_at as createdAt FROM comments WHERE story_id = ? ORDER BY created_at ASC",
      )
      .bind(storyId)
      .all<Comment>();
    return results || [];
  }

  async deleteById(commentId: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM comments WHERE id = ?")
      .bind(commentId)
      .run();
  }
  async deleteExpiredComments(): Promise<void> {
    await this.db
      .prepare(
        "DELETE FROM comments WHERE created_at <= datetime('now', '-1 day')",
      )
      .run();
  }
}
