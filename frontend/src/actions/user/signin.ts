import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const signin = defineAction({
  input: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
  handler: async ({ email, password }, ctx) => {
    try {
      const res = await fetch('http://backend:3000/user/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        return { status: false, data: null, error: 'Email o contraseña inválidos' };
      }

      const responseData = await res.json();

      if (!responseData.success) {
        return { status: false, data: null, error: 'No se pudo iniciar sesión' };
      }

      const TEN_MINUTES = 60 * 10;
      const ONE_HOUR = 60 * 60;

      ctx.cookies.set('sid', responseData.token, {
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "lax",
        path: "/",
        maxAge: TEN_MINUTES
      });

      ctx.cookies.set('rid', responseData.refreshToken, {
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "lax",
        path: "/",
        maxAge: ONE_HOUR,
      });

      return { status: true };
      
    } catch (err) {
      console.error('Unexpected error in login action:', err);
      return { status: false, data: null, error: err instanceof Error ? err.message : String(err) };
    }
  },
});