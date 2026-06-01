import type { IStoryRepository } from "../../domain/repositories/IStoryRepository";

export class DeleteStoryUseCase {
  constructor(private storyRepo: IStoryRepository) {}

  async execute(storyId: string): Promise<void> {
    if (!storyId) {
      const error = new Error("Story ID is required");
      error.name = "BadRequestError";
      throw error;
    }
    await this.storyRepo.deleteStory(storyId);
  }
}
