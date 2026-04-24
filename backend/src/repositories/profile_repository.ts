import { createClient } from "@libsql/client";
import jwt from "jsonwebtoken";

export async function profileRepository() {
    try {
        const client = createClient({ url: "file:data.db" });

        // Nos aseguramos de que followers exista cuando se consulta un perfil
        await client.execute(`
            CREATE TABLE IF NOT EXISTS followers (
                follower_id TEXT NOT NULL,
                following_id TEXT NOT NULL,
                date DATETIME NOT NULL,
                PRIMARY KEY (follower_id, following_id),
                FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        return {
            async GetProfile({ username, jwttoken }: { username: string, jwttoken?: string }) {
                try {
                    const userQuery = await client.execute({
                        sql: `SELECT id, avatar, banner, description, displayname, username, isprivate FROM users WHERE username = ?`,
                        args: [username]
                    });

                    if (userQuery.rows.length === 0) return { success: false, message: "Usuario no encontrado" };

                    const user = userQuery.rows[0];

                    let loggedInUserId = null;
                    if (jwttoken && process.env.JWT_SECRET) {
                        try {
                            const decode = jwt.verify(jwttoken, process.env.JWT_SECRET) as { session: string };
                            const session = decode.session;
                            const usertoken = jwt.decode(session) as { user: string, auth: string };
                            const auth = await client.execute({ sql: `SELECT signature FROM auth WHERE id = ?`, args: [usertoken.auth] });
                            if (auth.rows.length > 0) {
                                jwt.verify(session, auth.rows[0].signature as string);
                                loggedInUserId = usertoken.user;
                            }
                        } catch (e) {}
                    }

                    const followersQuery = await client.execute({ sql: `SELECT COUNT(*) as count FROM followers WHERE following_id = ?`, args: [user.id as string] });
                    const followingQuery = await client.execute({ sql: `SELECT COUNT(*) as count FROM followers WHERE follower_id = ?`, args: [user.id as string] });
                    
                    // SOLUCIÓN AL ERROR: Si la tabla posts no existe, asumimos 0 posts.
                    let total_posts = 0;
                    try {
                        const postsQuery = await client.execute({ sql: `SELECT COUNT(*) as count FROM posts WHERE user_id = ?`, args: [user.id as string] });
                        total_posts = postsQuery.rows[0].count as number;
                    } catch (e) {
                        // Silencioso: La tabla posts aún no ha sido creada
                    }

                    if (user.isprivate === 1) {
                        let canView = false;
                        if (loggedInUserId && loggedInUserId === user.id) canView = true;
                        if (loggedInUserId && !canView) {
                            const follows = await client.execute({
                                sql: `SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?`,
                                args: [loggedInUserId, user.id as string]
                            });
                            if (follows.rows.length > 0) canView = true;
                        }

                        if (!canView) {
                            return {
                                success: true,
                                is_private: true,
                                profile: {
                                    avatar: user.avatar,
                                    banner: user.banner,
                                    displayname: user.displayname,
                                    username: user.username,
                                    message: "Este perfil es privado"
                                }
                            };
                        }
                    }

                    return {
                        success: true,
                        is_private: false,
                        profile: {
                            avatar: user.avatar,
                            banner: user.banner,
                            displayname: user.displayname,
                            username: user.username,
                            description: user.description,
                            followers: followersQuery.rows[0].count,
                            following: followingQuery.rows[0].count,
                            total_posts: total_posts
                        }
                    };
                } catch (err) {
                    console.error("Error en GetProfile:", err);
                    return { success: false, message: "Error al obtener el perfil" };
                }
            },

            async GetUserPosts({ username, jwttoken }: { username: string, jwttoken?: string }) {
                try {
                    const userQuery = await client.execute({ sql: `SELECT id, isprivate FROM users WHERE username = ?`, args: [username] });
                    if (userQuery.rows.length === 0) return { success: false, message: "Usuario no encontrado" };
                    
                    const user = userQuery.rows[0];
                    let loggedInUserId = null;

                    if (jwttoken && process.env.JWT_SECRET) {
                        try {
                            const decode = jwt.verify(jwttoken, process.env.JWT_SECRET) as { session: string };
                            const session = decode.session;
                            const usertoken = jwt.decode(session) as { user: string, auth: string };
                            const auth = await client.execute({ sql: `SELECT signature FROM auth WHERE id = ?`, args: [usertoken.auth] });
                            if (auth.rows.length > 0) {
                                jwt.verify(session, auth.rows[0].signature as string);
                                loggedInUserId = usertoken.user;
                            }
                        } catch (e) {}
                    }

                    if (user.isprivate === 1) {
                        let canView = false;
                        if (loggedInUserId && loggedInUserId === user.id) canView = true;
                        if (loggedInUserId && !canView) {
                            const follows = await client.execute({ sql: `SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?`, args: [loggedInUserId, user.id as string] });
                            if (follows.rows.length > 0) canView = true;
                        }

                        if (!canView) return { success: false, is_private: true, message: "Este perfil es privado" };
                    }

                    // SOLUCIÓN AL ERROR: Intentamos buscar los posts, si la tabla no existe devolvemos array vacío.
                    try {
                        const result = await client.execute({
                            sql: `
                                SELECT 
                                    p.id, u.displayname, u.username, u.avatar, p.content_text AS comment_text, p.published_date AS date,
                                    (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes,
                                    (SELECT COUNT(*) FROM post_comment WHERE post_id = p.id) AS comments,
                                    (SELECT COUNT(*) FROM post_shared WHERE post_id = p.id) AS shared,
                                    (SELECT json_group_array(json_object('type_content', pc.type_content, 'content', pc.content)) 
                                     FROM post_content pc WHERE pc.post_id = p.id) AS contents
                                FROM posts p
                                JOIN users u ON p.user_id = u.id
                                WHERE u.username = ?
                                ORDER BY p.published_date DESC
                                LIMIT 50;
                            `,
                            args: [username]
                        });

                        if (result.rows.length === 0) return { success: true, posts: [] };

                        const posts = result.rows.map(row => {
                            let parsedContents = [];
                            if (row.contents && typeof row.contents === 'string') {
                                const parsed = JSON.parse(row.contents);
                                if (parsed.length > 0 && parsed[0].type_content !== null) parsedContents = parsed;
                            }
                            return {
                                id: row.id as string, displayname: row.displayname as string, username: row.username as string,
                                avatar: row.avatar as string | null, comment_text: row.comment_text as string | null,
                                contents: parsedContents, likes: row.likes as number, comments: row.comments as number,
                                shared: row.shared as number, date: row.date as string
                            };
                        });

                        return { success: true, posts };
                    } catch (e) {
                        // Silencioso: Las tablas de posts aún no existen, ergo no hay posts.
                        return { success: true, posts: [] };
                    }

                } catch (err) {
                    console.error("Error en GetUserPosts:", err);
                    return { success: false, message: "Error al obtener los posts del usuario" };
                }
            }
        };
    } catch (err) {
        return null;
    }
}