import { createMiddleware } from "hono/factory";
import { D1ModerationRepository } from "../../infrastructure/repositories/D1ModerationRepository";


type Env = {
    Bindings: {
        stories_manager: D1Database;
    };
    Variables: {
        clientIp: string;
    }
};

