import type { Admin } from "../entities/Admin";

export interface IAdminRepository {
  findByUsername(username: string): Promise<Admin | null>;
}
