import type { IAdminRepository } from "../../domain/repositories/IAdminRepository";
import type { Admin } from "../../domain/entities/Admin";

export class D1AdminRepository implements IAdminRepository{
    constructor(private db: D1Database){}

    async findByUsername(username:string): Promise<Admin | null>{
        const result = await this.db.prepare(
            'SELECT username, password_hash as passwordHash FROM admins WHERE  username = ?'
        ).bind(username).first<Admin>();
        return result || null
    }
}
