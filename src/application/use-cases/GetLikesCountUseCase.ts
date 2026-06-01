import type { ILikeRepository } from "../../domain/repositories/ILikeRepository";

export class GetLikesCountUseCase {
  constructor(private likeRepo: ILikeRepository) {}

  async execute(storyId: string): Promise<number> {
    const count = await this.likeRepo.getLikesCount(storyId);
    return count;
  }
}
