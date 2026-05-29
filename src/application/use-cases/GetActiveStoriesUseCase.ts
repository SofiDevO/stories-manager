import type { IStoryRepository } from "../../domain/repositories/IStoryRepository";
import type { Story } from "../../domain/entities/Story";

export class GetActiveStoriesUseCase {
  constructor(private storyRepo: IStoryRepository) {}
  async execute(): Promise<Story[]> {
    const stories = await this.storyRepo.getActiveStories();
    return stories;
  }
}
