import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const signup = defineAction({
  input: z.object({
    displayname: z.string().min(1, "El nombre en pantalla es requerido"),
    username: z.string().min(1, "El nombre de usuario es requerido"),
    email: z.string().email("Correo electrónico inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  }),
  handler: async ({ displayname, username, email, password }) => {
    try {
      // Usamos backend:3000 porque estamos en la red interna de Docker Compose
      const res = await fetch('http://backend:3000/user/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          displayname, 
          username, 
          email, 
          password,
          isprivate: false // Se envía en false por defecto tal como lo pediste
        }),
      });

      // Si la respuesta HTTP no es exitosa (ej. 400, 500)
      if (!res.ok) {
        let errorMessage = 'Error al registrar usuario';
        
        // Intentamos leer el JSON de error que devuelve tu API
        try {
          const errorData = await res.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseErr) {
          // Si por alguna razón el backend no devuelve un JSON, usamos el error por defecto
        }

        return { status: false, error: errorMessage };
      }

      // Si todo fue bien (ej. status 200 o 201)
      return { status: true };
      
    } catch (err) {
      console.error('Unexpected error in signup action:', err);
      return { 
        status: false, 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  },
});