import type { ICommentRepository } from "../../domain/repositories/ICommentRepository";
import type { CommentResponseDTO } from "../dtos/CommentResponseDTO";

export class GetStoryCommentsUseCase {
  constructor(private commentRepo: ICommentRepository) {}

  async execute(storyId: string): Promise<CommentResponseDTO[]> {
    const comments = await this.commentRepo.getByStoryId(storyId);

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
    }));
  }
}
