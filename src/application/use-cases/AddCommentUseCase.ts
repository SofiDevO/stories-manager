import type { ICommentRepository } from "../../domain/repositories/ICommentRepository";
import type { IModerationRepository } from "../../domain/repositories/IModerationRepository";
import type { Comment } from "../../domain/entities/Comment";
import { UnauthorizedError, BadRequestError } from "../../helpers/error";
export class AddCommentUseCase {
    constructor(
        private commentRepo: ICommentRepository,
        private moderationRepo: IModerationRepository
    ) { }
    async execute(storyId: string, content: string, ipAddress: string): Promise<void> {
        const isIpBanned = await this.moderationRepo.isIpBanned(ipAddress);
        if (isIpBanned) {
            throw new UnauthorizedError('Your IP address has been banned');
        }

        if (!content) {
            throw new BadRequestError('Comment content is required');
        }

        const newComment: Comment = {
            id: crypto.randomUUID(),
            storyId,
            content: content.trim(),
            ipAddress,
            createdAt: new Date().toISOString()
        };
        await this.commentRepo.create(newComment);
    }
}