import type { Context } from "hono";
import { D1StoryRepository } from "../../infrastructure/repositories/D1StoryRepository";
import { AddCommentUseCase } from "../../application/use-cases/AddCommentUseCase";
import { CreateStoryUseCase } from "../../application/use-cases/CreateStoryUseCase";
import { D1CommentRepository } from "../../infrastructure/repositories/D1CommentRepository";
import { D1ModerationRepository } from "../../infrastructure/repositories/D1ModerationRepository";
import { R2StorageService } from "../../infrastructure/storage/R2StorageService";
import { GetActiveStoriesUseCase } from "../../application/use-cases/GetActiveStoriesUseCase";
import { UnauthorizedError, BadRequestError } from "../../helpers/error";
import { D1LikeRepository } from "../../infrastructure/repositories/D1LikeRepository";
import { AddLikeUseCase } from "../../application/use-cases/AddLikeuseCase";

export class StroriesController {
  static async getActive(c: Context) {
    try {
      const storyRepo = new D1StoryRepository(c.env.stories_manager);
      const useCase = new GetActiveStoriesUseCase(storyRepo);
      const stories = await useCase.execute();

      return c.json({ success: true, data: stories }, 200);
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
      if (error instanceof UnauthorizedError) {
        return c.json({ success: false, error: error.message }, 403);
      }
      if (error instanceof BadRequestError) {
        return c.json({ success: false, error: error.message }, 400);
      }
      return c.json({ success: false, error: error.message }, 500);
    }
  }
  static async addLike(c: Context) {
    try {
      const storyId = c.req.param('id');
      if (!storyId) {
        throw new Error('Invalid story ID');
      }
      const clientIP = c.get('clientIp') || '';
      const likeRepo = new D1LikeRepository(c.env.stories_manager);
      const modRepo = new D1ModerationRepository(c.env.stories_manager);

      const useCase = new AddLikeUseCase(likeRepo, modRepo);
      await useCase.execute(storyId, clientIP);
      return c.json({ success: true, message: 'Liked!' }, 201);

    } catch (error: any) {
      if (error.name === 'UnauthorizedError') {
        return c.json({ success: false, error: error.message }, 403);
      }
      if (error.name === 'BadRequestError') {
        return c.json({ success: false, error: error.message }, 400);
      }
      return c.json({ success: false, error: error.message }, 500);
    }
  }
}
