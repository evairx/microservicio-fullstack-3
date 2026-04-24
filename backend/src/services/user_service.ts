import { userRepository } from "../repositories/user_repository";
import { Context } from "hono";
import { z } from "zod";

const signUpSchema = z.object({
    displayname: z.string().min(1, "Falta el nombre para mostrar"),
    username: z.string().min(1, "Falta el nombre de usuario"),
    email: z.string().email("El correo electrónico no es válido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    isprivate: z.boolean()
}).refine(data => !data.username.toLowerCase().includes(data.password.toLowerCase()), {
    message: "El nombre de usuario no puede contener la contraseña",
});

async function signUp(c: Context) {
    try {
        let body;

        try {
            body = await c.req.json();
        } catch{
            return c.json({ error: "Campo JSON Body vacio" }, 400)
        }
        
        const { displayname, username, email, password, isprivate } = body;

        if(!displayname || !username || !email || !password || isprivate === undefined) return c.json({ error: "Faltan campos requeridos" }, 400)

        const parsed = signUpSchema.safeParse(body);

        if(!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400);

        const userRepo = await userRepository()
        
        if(!userRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500)
        
        const res = await userRepo.signUp({ displayname, username, email, password, isprivate });

        if(!res.success) return c.json({ error: res.message }, 400)
        
        return c.json({ message: "Usuario creado exitosamente" }, 200)
    } catch (err) {
        return c.json({ error: "Hubo un error al crear el usuario" }, 500)
    }
}

async function signIn(c: Context) {
    try {
        let body;

        try {
            body = await c.req.json();
        } catch{
            return c.json({ error: "Campo JSON Body vacio" }, 400)
        }
        
        const { email, password } = body;

        if(!email || !password) return c.json({ error: "Faltan campos requeridos" }, 400)
        
        const userRepo = await userRepository()
        
        if(!userRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500)

        const res = await userRepo.signIn({ email, password });

        if(!res.success) return c.json({ error: res.message }, 400)

        return c.json(res, 200)
    } catch (err) {
        return c.json({ error: "Hubo un error al iniciar sesión" }, 500)
    }
}

async function refreshToken(c: Context) {
    try {
        let body;

        try {
            body = await c.req.json();
        } catch{
            return c.json({ error: "Campo JSON Body vacio" }, 400)
        }

        const { refreshToken } = body;

        if(!refreshToken) return c.json({ error: "Falta el refresh token" }, 400)
        
        const userRepo = await userRepository()

        if(!userRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500)

        const res = await userRepo.refreshToken({ refreshToken });

        if(!res.success) return c.json({ error: res.message }, 400)

        return c.json(res, 200)
    } catch (err) {
        return c.json({ error: "Hubo un error al obtener el perfil" }, 500)
    }
}

async function account(c: Context) {
    try {
        const jwttoken = c.req.header("Authorization")?.replace("Bearer ", "");
        if(!jwttoken) return c.json({ error: "Token de autorización no proporcionado" }, 401)
            
        const userRepo = await userRepository()
        if(!userRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500)
            
        const res = await userRepo.account({ jwttoken });
        if(!res.success) return c.json({ error: res.message }, 400)

        return c.json({ user: res }, 200)
    } catch (err) {
        return c.json({ error: "Hubo un error al obtener el perfil" }, 500)
    }
}

export const UserService = {
    signUp,
    signIn,
    refreshToken,
    account,
}