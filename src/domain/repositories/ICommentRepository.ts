import type { Comment } from "../entities/Comment";

export interface ICommentRepository {
  create(comment: Comment): Promise<void>;
  getByStoryId(storyId: string): Promise<Comment[]>;
  deleteById(commentId: string): Promise<void>;
  deleteExpiredComments(): Promise<void>;
}
