import { IStoryRepository } from "../../domain/repositories/IStoryRepository";
import type { Story } from "../../domain/entities/Story";
export class D1StoryRepository implements IStoryRepository{
    constructor(private db :D1Database){}

    async create(story: Story): Promise<void>{
        await this.db.prepare(
            'INSERT INTO stories (id, video_url,created_at) VALUES(?,?,?)'
        ).bind(story.id, story.videoUrl, story.createdAt).run();
    }
    async getActiveStories(): Promise<Story[]>{
        const {results} = await this.db.prepare(
            "SELECT id, video_url as videURL, created_at as createdAt FROM stories WHERE created_at > datetime('now', '-1 day') ORDER BY created_at ASC"
        ).all<Story>();
        return results || [];
    }

    async deleteExpiredStories(): Promise<void>{
        await this.db.prepare(
            "DELETE FROM stories WHERE created_at <= datetime('now','-1 day')"
        ).run();
    }

    async deleteStory(id: string): Promise<void>{
        await this.db.prepare(
            "DELETE FROM stories WHERE id = ?"
        ).bind(id).run();
    }
}