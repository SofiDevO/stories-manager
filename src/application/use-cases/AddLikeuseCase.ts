import type { ILikeRepository } from "../../domain/repositories/ILikeRepository";
import type { IModerationRepository } from "../../domain/repositories/IModerationRepository";

export class AddLikeUseCase {
    constructor(
        private likeRepo: ILikeRepository,
        private moderationRepo: IModerationRepository
    ) { }
    async execute(storyId: string, ipAddress: string): Promise<void> {
        const isBanned = await this.moderationRepo.isIpBanned(ipAddress);
        if (isBanned) {
            const error = new Error("You are banned from liking stories");
            error.name = 'UnauthorizedError';
            throw error;
        }
        const alreadyLiked = await this.likeRepo.hasUserLiked(storyId, ipAddress);
        if (alreadyLiked) {
            const error = new Error("You have already liked this story");
            error.name = 'BadRequestError';
            throw error;
        }
        await this.likeRepo.addLike(storyId, ipAddress);
    }
}
