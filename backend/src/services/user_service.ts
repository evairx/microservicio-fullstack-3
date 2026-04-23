import { userRepository } from "../repositories/user_repository";
import { Context } from "hono";

async function addUser(c: Context) {
    try {
        const userRepo = await userRepository()
        
        if(!userRepo) return c.json({ error: "No se pudo conectar a la base de datos" }, 500)

        await userRepo.createUser();

        return c.json({ message: "Usuario creado exitosamente" }, 201)
    } catch (err) {
        return c.json({ error: "Hubo un error al crear el usuario" }, 500)
    }
}

export const UserService = {
    addUser
}