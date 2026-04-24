import { Context } from "hono";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs/promises";
import * as path from "path";
import jwt from "jsonwebtoken";
import { createClient } from "@libsql/client";

async function UploadFile(c: Context) {
    try {
        const jwttoken = c.req.header("Authorization")?.replace("Bearer ", "");
        if (!jwttoken) return c.json({ error: "Token de autorización no proporcionado" }, 401);

        if (!process.env.JWT_SECRET) return c.json({ error: "jwt secret no configurado" }, 500);

        const token = jwt.decode(jwttoken) as { userId: number, exp: number } | null;
        if (!token || token.exp < Math.floor(Date.now() / 1000)) {
            return c.json({ error: "El Token ha expirado" }, 401);
        }

        let session: string;
        try {
            const decode = jwt.verify(jwttoken, process.env.JWT_SECRET) as { session: string };
            session = decode.session;
        } catch (e) {
            return c.json({ error: "Token inválido" }, 401);
        }

        const usertoken = jwt.decode(session) as { user: string, auth: string } | null;
        if (!usertoken) return c.json({ error: "Sesión inválida" }, 401);

        const client = createClient({ url: "file:data.db" });
        const authQuery = await client.execute({
            sql: `SELECT signature FROM auth WHERE id = ?`,
            args: [usertoken.auth]
        });

        if (authQuery.rows.length === 0) return c.json({ error: "Sesión no encontrada o cerrada" }, 401);

        try {
            jwt.verify(session, authQuery.rows[0].signature as string);
        } catch (e) {
            return c.json({ error: "Firma de sesión inválida" }, 401);
        }

        const body = await c.req.parseBody();
        const file = body['file'];

        if (!(file instanceof File)) {
            return c.json({ error: "No se encontró ningún archivo válido en el form-data" }, 400);
        }

        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            return c.json({ error: "Solo se permiten imágenes, GIFs o videos" }, 400);
        }

        const extension = file.name.split('.').pop() || 'png';
        const fileName = `${uuidv4()}.${extension}`;
        
        const uploadDir = path.join(process.cwd(), 'images');

        await fs.mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, fileName);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.writeFile(filePath, buffer);

        return c.json({ 
            success: true, 
            message: "Archivo subido correctamente",
            url: `/images/${fileName}` 
        }, 200);

    } catch (err) {
        console.error("Error en UploadFile:", err);
        return c.json({ error: "Hubo un error al guardar el archivo" }, 500);
    }
}

export const UploadService = {
    UploadFile
}