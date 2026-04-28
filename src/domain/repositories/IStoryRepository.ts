import type { Story } from "../entities/Story";

export interface IStoryRepository {
  create(story: Story): Promise<void>;
  getActiveStories(): Promise<Story[]>;
  deleteExpiredStories(): Promise<void>;
}
