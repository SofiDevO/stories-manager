import type { Context } from "hono";
import { D1StoryRepository } from "../../infrastructure/repositories/D1StoryRepository";
import {
  R2StorageService,
  R2StorageService,
} from "../../infrastructure/storage/R2StorageService";
import { AddCommentUseCase } from "../../application/use-cases/AddCommentUseCase";
import { CreateStoryUseCase } from "../../application/use-cases/CreateStoryUseCase";
import { D1CommentRepository } from "../../infrastructure/repositories/D1CommentRepository";
import { D1ModerationRepository } from "../../infrastructure/repositories/D1ModerationRepository";

export class StroriesController {
  static async getActive(c: Context) {
    const storyRepo = new D1StoryRepository(c.env.stories_manager);
    const stories = await storyRepo.getActiveStories();

    return c.json({ success: true, data: stories }, 200);
  }

  static async create(c: Context) {
    try {
      const storyRepo = new D1StoryRepository(c.env.stories_manager);

      const storageService = new R2StorageService(
        c.env.CLOUDFLARE_ACCOUNT_ID,
        c.env.CLOUDFLARE_ACCESS_KEY,
        c.env.CLOUDFLARE_SECRET_KEY,
        "stories-bucket",
      );

      const useCase = new CreateStoryUseCase(
        storyRepo,
        storageService,
        c.env.PUBLIC_R2_URL,
      );
      const result = await useCase.execute();

      return c.json({ success: true, data: result }, 201);
    } catch (error: any) {
      return c.json(
        {
          success: false,
          error: error.message,
        },
        500,
      );
    }
  }
  static async addComment(c: Context) {
    try {
      const storyId = c.req.param("id");
      if (!storyId) {
        throw new Error("Invalid story ID");
      }
      const body = await c.req.json();

      const clientIP = c.get("clientIp") || "";

      const commentRepo = new D1CommentRepository(c.env.stories_manager);
      const modRepo = new D1ModerationRepository(c.env.stories_manager);

      const useCase = new AddCommentUseCase(commentRepo, modRepo);
      await useCase.execute(storyId, body.content, clientIP);

      return c.json({ success: true, message: "Comment added" }, 201);
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 403);
    }
  }
}
