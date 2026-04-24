import { profileRepository } from "../repositories/profile_repository";
import { Context } from "hono";

async function GetProfile(c: Context) {
    try {
        const username = c.req.param("username");
        if (!username) return c.json({ error: "Username no proporcionado" }, 400);

        const jwttoken = c.req.header("Authorization")?.replace("Bearer ", "");

        const profileRepo = await profileRepository();
        if (!profileRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500);

        const res = await profileRepo.GetProfile({ username, jwttoken });

        if (!res.success) return c.json({ error: res.message }, 404);

        if (res.is_private) {
            return c.json(res.profile, 403);
        }

        return c.json(res.profile, 200);
    } catch (err) {
        return c.json({ error: "Hubo un error al obtener el perfil" }, 500);
    }
}

async function GetUserPosts(c: Context) {
    try {
        const username = c.req.param("username");
        if (!username) return c.json({ error: "Username no proporcionado" }, 400);

        const jwttoken = c.req.header("Authorization")?.replace("Bearer ", "");

        const profileRepo = await profileRepository();
        if (!profileRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500);

        const res = await profileRepo.GetUserPosts({ username, jwttoken });

        if (!res.success) {
            if (res.is_private) return c.json({ error: res.message }, 403);
            return c.json({ error: res.message }, 404);
        }

        return c.json(res.posts, 200);
    } catch (err) {
        return c.json({ error: "Hubo un error al obtener los posts" }, 500);
    }
}

export const ProfileService = {
    GetProfile,
    GetUserPosts
}