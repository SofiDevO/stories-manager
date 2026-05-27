import type { Context } from "hono";
import { D1StoryRepository } from "../../infrastructure/repositories/D1StoryRepository";
import { R2StorageService } from "../../infrastructure/storage/R2StorageService";
import { AddCommentUseCase } from "../../application/use-cases/AddCommentUseCase";
import { CreateStoryUseCase } from "../../application/use-cases/CreateStoryUseCase";
import { D1CommentRepository } from "../../infrastructure/repositories/D1CommentRepository";
import { D1ModerationRepository } from "../../infrastructure/repositories/D1ModerationRepository";

export class StroriesController {

}