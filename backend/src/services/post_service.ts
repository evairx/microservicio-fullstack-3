import { postRepository } from "../repositories/post_repository";
import { Context } from "hono";
import { z } from "zod";

const postContentSchema = z.object({
    type_content: z.enum(['image', 'video', 'iframe', 'gif'], {
        errorMap: () => ({ message: "Tipo de contenido inválido" })
    }),
    content: z.string().min(1, "El contenido no puede estar vacío")
});

const addPostSchema = z.object({
    content_text: z.string().nullable().optional(),
    is_public: z.boolean().optional(),
    contents: z.array(postContentSchema).optional()
}).refine(data => data.content_text || (data.contents && data.contents.length > 0), {
    message: "El post debe tener texto o contenido multimedia",
});

const addCommentSchema = z.object({
    comment_text: z.string().nullable().optional(),
    contents: z.array(postContentSchema).optional()
}).refine(data => data.comment_text || (data.contents && data.contents.length > 0), {
    message: "El comentario debe tener texto o contenido multimedia",
});

async function AddPost(c: Context) {
    try {
        const jwttoken = c.req.header("Authorization")?.replace("Bearer ", "");
        if (!jwttoken) return c.json({ error: "Token de autorización no proporcionado" }, 401);

        let body;

        try {
            body = await c.req.json();
        } catch {
            return c.json({ error: "Campo JSON Body vacio" }, 400);
        }

        const parsed = addPostSchema.safeParse(body);

        if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);

        const { content_text, is_public, contents } = parsed.data;

        const postRepo = await postRepository();
        
        if (!postRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500);

        const res = await postRepo.AddPost({ 
            jwttoken, 
            content_text: content_text ?? null, 
            is_public: is_public ?? true, 
            contents: contents ?? [] 
        });

        if (!res.success) return c.json({ error: res.message }, 400);

        return c.json(res, 200);
    } catch (err) {
        return c.json({ error: "Hubo un error al crear el post" }, 500);
    }
}

async function GetPosts(c: Context) {
    try {
        const postRepo = await postRepository();
        
        if (!postRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500);

        const posts = await postRepo.GetPosts();

        return c.json(posts, 200);
    } catch (err) {
        return c.json({ error: "Hubo un error al obtener los posts" }, 500);
    }
}

async function GetPostById(c: Context) {
    try {
        const id = c.req.param("id");
        if (!id) return c.json({ error: "ID no proporcionado" }, 400);

        const postRepo = await postRepository();
        if (!postRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500);

        const res = await postRepo.GetPostById({ id });

        if (!res.success) return c.json({ error: res.message }, 404);

        return c.json(res.post, 200);
    } catch (err) {
        return c.json({ error: "Hubo un error al obtener el post" }, 500);
    }
}

async function ToggleLike(c: Context) {
    try {
        const jwttoken = c.req.header("Authorization")?.replace("Bearer ", "");
        if (!jwttoken) return c.json({ error: "Token de autorización no proporcionado" }, 401);

        const id = c.req.param("id");
        if (!id) return c.json({ error: "ID no proporcionado" }, 400);

        const postRepo = await postRepository();
        if (!postRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500);

        const res = await postRepo.ToggleLike({ jwttoken, post_id: id });

        if (!res.success) return c.json({ error: res.message }, 400);

        return c.json({ message: res.message }, 200);
    } catch (err) {
        return c.json({ error: "Hubo un error al procesar el like" }, 500);
    }
}

async function AddComment(c: Context) {
    try {
        const jwttoken = c.req.header("Authorization")?.replace("Bearer ", "");
        if (!jwttoken) return c.json({ error: "Token de autorización no proporcionado" }, 401);

        const id = c.req.param("id");
        if (!id) return c.json({ error: "ID no proporcionado" }, 400);

        let body;
        try {
            body = await c.req.json();
        } catch {
            return c.json({ error: "Campo JSON Body vacio" }, 400);
        }

        const parsed = addCommentSchema.safeParse(body);
        if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);

        const { comment_text, contents } = parsed.data;

        const postRepo = await postRepository();
        if (!postRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500);

        const res = await postRepo.AddComment({
            jwttoken,
            post_id: id,
            comment_text: comment_text ?? null,
            contents: contents ?? []
        });

        if (!res.success) return c.json({ error: res.message }, 400);

        return c.json({ message: res.message, comment_id: res.comment_id }, 200);
    } catch (err) {
        return c.json({ error: "Hubo un error al crear el comentario" }, 500);
    }
}

export const PostService = {
    AddPost,
    GetPosts,
    GetPostById,
    ToggleLike,
    AddComment
}