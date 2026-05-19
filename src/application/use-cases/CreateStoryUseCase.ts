import type { IStoryRepository } from "../../domain/repositories/IStoryRepository";
import type { IStorageService } from "../../domain/repositories/IStorageService";
import type { Story } from "../../domain/entities/Story";

export class CreateStoryUseCase {
  constructor(
    private storyrepo: IStoryRepository,
    private storageService: IStorageService,
    private publicR2Url: string,
  ) {}

  async execute(): Promise<{ uploadUrl: string; storyId: string }> {
    const storyId = crypto.randomUUID();
    const fileName = `stories/${storyId}.mp4`;

    const uploadUrl = await this.storageService.generateUploadUrl(fileName);

    const finalVideoUrl = `${this.publicR2Url}/${fileName}`;

    const newStory: Story = {
      id: storyId,
      videoUrl: finalVideoUrl,
      createdAt: new Date().toISOString(),
    };

    await this.storyrepo.create(newStory);

    return { uploadUrl, storyId };
  }
}
