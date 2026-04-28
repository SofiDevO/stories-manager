export interface ILikeRepository {
  addLike(storyId: string, ipAddress: string): Promise<void>;
  getLikesCount(storyId: string): Promise<number>;
  hasUserLiked(storyId: string, ipAddress: string): Promise<boolean>;
}
