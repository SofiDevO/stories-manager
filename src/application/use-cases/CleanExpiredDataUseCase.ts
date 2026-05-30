import type { IStoryRepository } from "../../domain/repositories/IStoryRepository";
import type { ICommentRepository } from "../../domain/repositories/ICommentRepository";

export class CleanExpiredDataUseCase {
  constructor(
    private storyRepo: IStoryRepository,
    private commentRepo: ICommentRepository,
  ) {}
  async execute(): Promise<void> {
    console.log("[CleanExpiredDataUseCase] Iniciando limpieza en D1...");

    try {
      await this.commentRepo.deleteExpiredComments();
      await this.storyRepo.deleteExpiredStories();
      console.log(
        "[CleanExpiredDataUseCase] Limpieza completada exitosamente.",
      );
    } catch (error) {
      console.error(
        "[CleanExpiredDataUseCase] Error durante la limpieza:",
        error,
      );
      throw error;
    }
  }
}
