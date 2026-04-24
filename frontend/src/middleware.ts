import { defineMiddleware } from "astro:middleware";

const IGNORED_PATHS = ["/_actions", "/_server-islands", "/_astro", "/favicon.ico"];

export const onRequest = defineMiddleware(async (context, next) => {
    const { url, cookies } = context;
    const path = url.pathname;

    if (IGNORED_PATHS.some((p) => path.startsWith(p)) || path.includes(".")) {
        return next();
    }

    const sid = cookies.get("sid")?.value;
    const rid = cookies.get("rid")?.value;

    if (!sid && rid) {
        try {
            const response = await fetch("http://backend:3000/user/refresh-token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ refreshToken: rid }),
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    cookies.set("sid", data.token, {
                        path: "/",
                        maxAge: 10 * 60,
                        httpOnly: true,
                        secure: import.meta.env.PROD,
                        sameSite: "lax",
                    });

                    cookies.set("rid", data.refreshToken, {
                        path: "/",
                        maxAge: 60 * 60,
                        httpOnly: true,
                        secure: import.meta.env.PROD,
                        sameSite: "lax",
                    });
                } else {
                    cookies.delete("rid", { path: "/" });
                }
            } else {
                cookies.delete("rid", { path: "/" });
            }
        } catch (error) {
            console.error("Error al intentar refrescar el token:", error);
        }
    }

    return next();
});