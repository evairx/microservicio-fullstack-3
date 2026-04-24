import { createClient } from "@libsql/client";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export interface PostContentInput {
    type_content: 'image' | 'video' | 'iframe' | 'gif';
    content: string;
}

export async function postRepository() {
    try {
        const client = createClient({ url: "file:data.db" });

        await client.batch(
            [
                `CREATE TABLE IF NOT EXISTS posts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    published_date DATETIME NOT NULL,
                    public BOOLEAN DEFAULT TRUE,
                    content_text TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);
                CREATE INDEX IF NOT EXISTS idx_posts_date ON posts (published_date);
                `,
                `CREATE TABLE IF NOT EXISTS post_content (
                    id TEXT PRIMARY KEY,
                    post_id TEXT NOT NULL,
                    type_content TEXT NOT NULL,
                    content TEXT NOT NULL,
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_post_content_post_id ON post_content (post_id);
                `,
                `CREATE TABLE IF NOT EXISTS post_likes (
                    id TEXT PRIMARY KEY,
                    post_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    date DATETIME NOT NULL,
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(post_id, user_id)
                );
                CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes (post_id);
                `,
                `CREATE TABLE IF NOT EXISTS post_comment (
                    id TEXT PRIMARY KEY,
                    post_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    comment_text TEXT,
                    date DATETIME NOT NULL,
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_post_comment_post_id ON post_comment (post_id);
                `,
                `CREATE TABLE IF NOT EXISTS post_comment_content (
                    id TEXT PRIMARY KEY,
                    post_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    comment_id TEXT NOT NULL,
                    type_content TEXT NOT NULL,
                    content TEXT NOT NULL,
                    date DATETIME NOT NULL,
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (comment_id) REFERENCES post_comment(id) ON DELETE CASCADE
                );
                `,
                `CREATE TABLE IF NOT EXISTS post_comment_likes (
                    id TEXT PRIMARY KEY,
                    comment_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    date DATETIME NOT NULL,
                    FOREIGN KEY (comment_id) REFERENCES post_comment(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(comment_id, user_id)
                );
                `,
                `CREATE TABLE IF NOT EXISTS post_shared (
                    id TEXT PRIMARY KEY,
                    post_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    date DATETIME NOT NULL,
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(post_id, user_id)
                );
                CREATE INDEX IF NOT EXISTS idx_post_shared_post_id ON post_shared (post_id);
                `
            ],
            "write"
        );

        return {
            async AddPost({ jwttoken, content_text, is_public = true, contents = [] }: { jwttoken: string, content_text: string | null, is_public?: boolean, contents?: PostContentInput[] }) {
                try {
                    if (!process.env.JWT_SECRET) return { success: false, message: "jwt secret no configurado" };

                    const token = jwt.decode(jwttoken) as { userId: number, exp: number };

                    if (token.exp < Math.floor(Date.now() / 1000)) {
                        return { success: false, message: "el Token ha expirado" };
                    }

                    const decode = jwt.verify(jwttoken, process.env.JWT_SECRET) as { session: string };
                    const session = decode.session;

                    const usertoken = jwt.decode(session) as { user: string, auth: string };

                    const auth = await client.execute({
                        sql: `SELECT signature FROM auth WHERE id = ?`,
                        args: [usertoken.auth]
                    });

                    if (auth.rows.length === 0) return { success: false, message: "Sesión no encontrada" };

                    const signature = auth.rows[0].signature as string;
                    jwt.verify(session, signature);

                    const postId = uuidv4();
                    
                    await client.execute({
                        sql: `INSERT INTO posts (id, user_id, published_date, public, content_text) VALUES (?, ?, datetime('now'), ?, ?)`,
                        args: [postId, usertoken.user, is_public, content_text]
                    });

                    if (contents.length > 0) {
                        const queries = contents.map(c => ({
                            sql: `INSERT INTO post_content (id, post_id, type_content, content) VALUES (?, ?, ?, ?)`,
                            args: [uuidv4(), postId, c.type_content, c.content]
                        }));
                        
                        await client.batch(queries, "write");
                    }

                    return { success: true, message: "Post creado con éxito", post_id: postId };

                } catch (err) {
                    return { success: false, message: "Error al crear el post" };
                }
            },

            async GetPosts() {
                try {
                    const result = await client.execute(`
                        SELECT 
                            p.id,
                            u.displayname,
                            u.username,
                            u.avatar,
                            p.content_text AS comment_text,
                            p.published_date AS date,
                            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes,
                            (SELECT COUNT(*) FROM post_comment WHERE post_id = p.id) AS comments,
                            (SELECT COUNT(*) FROM post_shared WHERE post_id = p.id) AS shared,
                            (
                                SELECT json_group_array(
                                    json_object(
                                        'type_content', pc.type_content, 
                                        'content', pc.content
                                    )
                                ) 
                                FROM post_content pc 
                                WHERE pc.post_id = p.id
                            ) AS contents
                        FROM posts p
                        JOIN users u ON p.user_id = u.id
                        WHERE p.public = 1
                        ORDER BY p.published_date DESC
                        LIMIT 50;
                    `);

                    if (result.rows.length === 0) return [];

                    const posts = result.rows.map(row => {
                        let parsedContents = [];
                        
                        if (row.contents && typeof row.contents === 'string') {
                            const parsed = JSON.parse(row.contents);
                            if (parsed.length > 0 && parsed[0].type_content !== null) {
                                parsedContents = parsed;
                            }
                        }

                        return {
                            id: row.id as string,
                            displayname: row.displayname as string,
                            username: row.username as string,
                            avatar: row.avatar as string | null,
                            comment_text: row.comment_text as string | null,
                            contents: parsedContents,
                            likes: row.likes as number,
                            comments: row.comments as number,
                            shared: row.shared as number,
                            date: row.date as string
                        };
                    });

                    return posts;

                } catch (err) {
                    return [];
                }
            },

            async GetPostById({ id }: { id: string }) {
                try {
                    const postQuery = await client.execute({
                        sql: `SELECT p.id, p.content_text, p.published_date, u.displayname, u.username, u.avatar 
                              FROM posts p 
                              JOIN users u ON p.user_id = u.id 
                              WHERE p.id = ?`,
                        args: [id]
                    });

                    if (postQuery.rows.length === 0) return { success: false, message: "Post no encontrado" };

                    const post = postQuery.rows[0];

                    const contentsQuery = await client.execute({
                        sql: `SELECT type_content, content FROM post_content WHERE post_id = ?`,
                        args: [id]
                    });

                    const likesQuery = await client.execute({
                        sql: `SELECT u.displayname, u.username, u.avatar, pl.date 
                              FROM post_likes pl 
                              JOIN users u ON pl.user_id = u.id 
                              WHERE pl.post_id = ?`,
                        args: [id]
                    });

                    const sharedQuery = await client.execute({
                        sql: `SELECT u.displayname, u.username, u.avatar, ps.date 
                              FROM post_shared ps 
                              JOIN users u ON ps.user_id = u.id 
                              WHERE ps.post_id = ?`,
                        args: [id]
                    });

                    const commentsQuery = await client.execute({
                        sql: `SELECT c.id, c.comment_text, c.date, u.displayname, u.username, u.avatar 
                              FROM post_comment c 
                              JOIN users u ON c.user_id = u.id 
                              WHERE c.post_id = ? 
                              ORDER BY c.date DESC`,
                        args: [id]
                    });

                    const commentsList = await Promise.all(commentsQuery.rows.map(async (cRow) => {
                        const cContents = await client.execute({
                            sql: `SELECT type_content, content FROM post_comment_content WHERE comment_id = ?`,
                            args: [cRow.id as string]
                        });
                        return {
                            id: cRow.id,
                            displayname: cRow.displayname,
                            username: cRow.username,
                            avatar: cRow.avatar,
                            comment_text: cRow.comment_text,
                            date: cRow.date,
                            contents: cContents.rows
                        };
                    }));

                    return {
                        success: true,
                        post: {
                            id: post.id,
                            displayname: post.displayname,
                            username: post.username,
                            avatar: post.avatar,
                            comment_text: post.content_text,
                            date: post.published_date,
                            contents: contentsQuery.rows,
                            likes: {
                                count: likesQuery.rows.length,
                                liked_users: likesQuery.rows
                            },
                            comments: {
                                count: commentsQuery.rows.length,
                                comment_list: commentsList
                            },
                            shared: {
                                count: sharedQuery.rows.length,
                                shared_users: sharedQuery.rows
                            }
                        }
                    };
                } catch (err) {
                    return { success: false, message: "Error al obtener el post" };
                }
            },

            async ToggleLike({ jwttoken, post_id }: { jwttoken: string, post_id: string }) {
                try {
                    if (!process.env.JWT_SECRET) return { success: false, message: "jwt secret no configurado" };

                    const token = jwt.decode(jwttoken) as { userId: number, exp: number };
                    if (token.exp < Math.floor(Date.now() / 1000)) return { success: false, message: "el Token ha expirado" };

                    const decode = jwt.verify(jwttoken, process.env.JWT_SECRET) as { session: string };
                    const session = decode.session;
                    const usertoken = jwt.decode(session) as { user: string, auth: string };

                    const auth = await client.execute({
                        sql: `SELECT signature FROM auth WHERE id = ?`,
                        args: [usertoken.auth]
                    });

                    if (auth.rows.length === 0) return { success: false, message: "Sesión no encontrada" };

                    const signature = auth.rows[0].signature as string;
                    jwt.verify(session, signature);

                    const postCheck = await client.execute({
                        sql: `SELECT id FROM posts WHERE id = ?`,
                        args: [post_id]
                    });

                    if (postCheck.rows.length === 0) return { success: false, message: "Post no encontrado" };

                    const likeCheck = await client.execute({
                        sql: `SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?`,
                        args: [post_id, usertoken.user]
                    });

                    if (likeCheck.rows.length > 0) {
                        await client.execute({
                            sql: `DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`,
                            args: [post_id, usertoken.user]
                        });
                        return { success: true, message: "Like removido" };
                    } else {
                        await client.execute({
                            sql: `INSERT INTO post_likes (id, post_id, user_id, date) VALUES (?, ?, ?, datetime('now'))`,
                            args: [uuidv4(), post_id, usertoken.user]
                        });
                        return { success: true, message: "Like añadido" };
                    }
                } catch (err) {
                    return { success: false, message: "Error al procesar el like" };
                }
            },

            async AddComment({ jwttoken, post_id, comment_text, contents = [] }: { jwttoken: string, post_id: string, comment_text: string | null, contents?: PostContentInput[] }) {
                try {
                    if (!process.env.JWT_SECRET) return { success: false, message: "jwt secret no configurado" };

                    const token = jwt.decode(jwttoken) as { userId: number, exp: number };
                    if (token.exp < Math.floor(Date.now() / 1000)) return { success: false, message: "el Token ha expirado" };

                    const decode = jwt.verify(jwttoken, process.env.JWT_SECRET) as { session: string };
                    const session = decode.session;
                    const usertoken = jwt.decode(session) as { user: string, auth: string };

                    const auth = await client.execute({
                        sql: `SELECT signature FROM auth WHERE id = ?`,
                        args: [usertoken.auth]
                    });

                    if (auth.rows.length === 0) return { success: false, message: "Sesión no encontrada" };

                    const signature = auth.rows[0].signature as string;
                    jwt.verify(session, signature);

                    const postCheck = await client.execute({
                        sql: `SELECT id FROM posts WHERE id = ?`,
                        args: [post_id]
                    });

                    if (postCheck.rows.length === 0) return { success: false, message: "Post no encontrado" };

                    const commentId = uuidv4();
                    
                    await client.execute({
                        sql: `INSERT INTO post_comment (id, post_id, user_id, comment_text, date) VALUES (?, ?, ?, ?, datetime('now'))`,
                        args: [commentId, post_id, usertoken.user, comment_text]
                    });

                    if (contents.length > 0) {
                        const queries = contents.map(c => ({
                            sql: `INSERT INTO post_comment_content (id, post_id, user_id, comment_id, type_content, content, date) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
                            args: [uuidv4(), post_id, usertoken.user, commentId, c.type_content, c.content]
                        }));
                        
                        await client.batch(queries, "write");
                    }

                    return { success: true, message: "Comentario añadido con éxito", comment_id: commentId };

                } catch (err) {
                    return { success: false, message: "Error al crear el comentario" };
                }
            }
        };
    } catch (err) {
        return null;
    }
}