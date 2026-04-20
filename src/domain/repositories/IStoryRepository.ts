import type { Story } from "../entities/Story";

export interface IstoryRepository {
    create(story:Story): Promise<void>;
    getActiveStories(): Promise<Story[]>;
    deleteExpiredStories():Promise<void>;
}