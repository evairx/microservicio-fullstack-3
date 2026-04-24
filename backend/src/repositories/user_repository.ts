import { createClient } from "@libsql/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { generate } from 'short-uuid';
import { v4 as uuidv4 } from "uuid";

export async function userRepository() {
    try {
        const client = createClient({ url: "file:data.db" })

        const salt = 10

        await client.batch(
            [
                `CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    avatar TEXT,
                    banner TEXT,
                    description TEXT,
                    displayname TEXT NOT NULL,
                    username TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    isprivate BOOLEAN DEFAULT FALSE,
                    password TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_users_id ON users (id);
                CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
                CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
                `,
                `CREATE TABLE IF NOT EXISTS auth (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    refresh_token TEXT NOT NULL,
                    signature TEXT NOT NULL,
                    last_used DATETIME NOT NULL,
                    expires_at DATETIME NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_auth_id ON auth (id);
                CREATE INDEX IF NOT EXISTS idx_auth_refresh_token ON auth (refresh_token);
                CREATE INDEX IF NOT EXISTS idx_auth_user_id ON auth (user_id);
                CREATE INDEX IF NOT EXISTS idx_auth_signature ON auth (signature);
                `,
                `CREATE TABLE IF NOT EXISTS followers (
                    follower_id TEXT NOT NULL,
                    following_id TEXT NOT NULL,
                    date DATETIME NOT NULL,
                    PRIMARY KEY (follower_id, following_id),
                    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers (follower_id);
                CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers (following_id);
                `
            ],
            "write",
        )

        return {
            async signUp({ displayname, username, email, password, isprivate }: { displayname: string, username: string, email: string, password: string, isprivate: boolean }) {
                try {
                    const result = await client.execute({
                        sql: `INSERT INTO users (id, avatar, banner, description, displayname, username, email, password, isprivate) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?) RETURNING id, avatar, displayname, username, email`,
                        args: [uuidv4(), randomGenAvatar(), displayname, username, email, await bcrypt.hash(password, salt), isprivate]
                    })

                    return { success: true, user: result.rows[0] };
                } catch (error) {
                    return { success: false, message: "Error al registrar usuario" };
                }
            },
            async signIn({ email, password }: { email: string, password: string }) {
                try {
                    const result = await client.execute({
                        sql: `SELECT * FROM users WHERE email = ?`,
                        args: [email]
                    })

                    if (result.rows.length === 0) return { success: false, message: "Correo electrónico o contraseña incorrectos" };

                    const user = result.rows[0];

                    if (typeof user.password !== "string") {
                        return { success: false, message: "Correo electrónico o contraseña incorrectos" };
                    }

                    const isMatch = await bcrypt.compare(password, user.password);

                    if (!isMatch) {
                        return { success: false, message: "Correo electrónico o contraseña incorrectos" };
                    }

                    await client.execute({
                        sql: `DELETE FROM auth WHERE user_id = ? AND last_used <= datetime('now', '-1 day')`,
                        args: [user.id]
                    });

                    const refreshToken = generate();
                    const signature = randomBytes(64).toString('hex');

                    const id = uuidv4();

                    await client.execute({
                        sql: `
                            INSERT INTO auth (id, user_id, refresh_token, signature, last_used, expires_at)
                            VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+1 hour'))
                        `,
                        args: [id, user.id, refreshToken, signature]
                    });

                    const secret = process.env.JWT_SECRET;
                    if (!secret) return { success: false, message: "jwt secret no configurado" };

                    const user_token = jwt.sign({auth: id, user: user.id}, signature, { expiresIn: '10m' });
                    const token = jwt.sign({ session: user_token }, secret, { expiresIn: '10m' });

                    return { success: true, token: token, refreshToken: refreshToken, expiresIn: 3600 };

                } catch (err) {
                    return { success: false, message: "Error al iniciar sesión" };
                }
            },
            async refreshToken({ refreshToken }: { refreshToken: string }) {
                try {
                    const result = await client.execute({
                        sql: `
                            SELECT 
                                a.id AS auth_id, 
                                a.user_id, 
                                u.id AS user_exists,
                                CASE WHEN a.expires_at < datetime('now') THEN 1 ELSE 0 END AS is_expired
                            FROM auth a
                            LEFT JOIN users u ON a.user_id = u.id
                            WHERE a.refresh_token = ?
                        `,
                        args: [refreshToken]
                    });

                    if (result.rows.length === 0) return { success: false, message: "Refresh token inválido" };

                    const row = result.rows[0];

                    if (row.is_expired === 1) return { success: false, message: "Refresh token ha expirado" };

                    if (!row.user_exists) return { success: false, message: "Usuario no encontrado" };

                    const authId = row.auth_id as string;
                    const userId = row.user_id as string;

                    const newRefresh = generate();
                    const newSignature = randomBytes(64).toString('hex');

                    await client.execute({
                        sql: `
                            UPDATE auth 
                            SET 
                                refresh_token = ?, 
                                signature = ?, 
                                last_used = datetime('now'), 
                                expires_at = datetime('now', '+1 hour')
                            WHERE id = ?
                        `,
                        args: [newRefresh, newSignature, authId]
                    });

                    const user_token = jwt.sign({ auth: authId, user: userId }, newSignature, { expiresIn: '10m' });

                    const secret = process.env.JWT_SECRET;

                    if (!secret) throw new Error("Falta JWT_SECRET en las variables de entorno");

                    const token = jwt.sign({ session: user_token }, secret, { expiresIn: '10m' });

                    return { success: true, token: token, refreshToken: newRefresh, expiresIn: 3600 };
                } catch (err) {
                    return { success: false, message: "Error al iniciar sesión" };
                }
            },
            async account({ jwttoken }: { jwttoken: string }) {
                try {
                    if(!process.env.JWT_SECRET) return { success: false, message: "jwt secret no configurado" };

                    const token = jwt.decode(jwttoken) as { userId: number, exp: number };

                    if (token.exp < Math.floor(Date.now() / 1000)) {
                        return { success: false, message: "el Token ha expirado" };
                    }

                    const decode = jwt.verify(jwttoken, process.env.JWT_SECRET) as { session: string };
                    const session = decode.session;

                    const usertoken = jwt.decode(session) as { user: string, auth: string };

                    const user = await client.execute({
                        sql: `SELECT * FROM users WHERE id = ?`,
                        args: [usertoken.user]
                    })

                    if (user.rows.length === 0) return { success: false, message: "El usuario no existe" };

                    const userData = user.rows[0];

                    const auth = await client.execute({
                        sql: `SELECT signature FROM auth WHERE id = ?`,
                        args: [usertoken.auth]
                    });

                    if (auth.rows.length === 0) return { success: false, message: "Sesión no encontrada" };

                    const authData = auth.rows[0];
                    const signature = authData.signature as string;

                    jwt.verify(session, signature);

                    return { 
                        success: true, 
                        displayname: userData.displayname,
                        username: userData.username,
                        avatar: userData.avatar, 
                        banner: userData.banner,
                        description: userData.description,
                        email: userData.email 
                    };
                } catch (err) {
                    return { success: false, message: "Error al iniciar sesión" };
                }
            }
        }
    } catch (err) {
        return null
    }
}

function randomGenAvatar() {
    const avatars = [
        'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairDreads01&accessoriesType=Prescription02&hairColor=PastelPink&facialHairType=MoustacheFancy&facialHairColor=Blonde&clotheType=BlazerSweater&eyeType=EyeRoll&eyebrowType=UpDown&mouthType=Serious&skinColor=Pale',
        'https://avataaars.io/?avatarStyle=Circle&topType=Hijab&accessoriesType=Kurt&hatColor=Blue03&clotheType=BlazerShirt&eyeType=Cry&eyebrowType=SadConcerned&mouthType=Concerned&skinColor=Tanned',
        'https://avataaars.io/?avatarStyle=Circle&topType=LongHairShavedSides&accessoriesType=Wayfarers&hatColor=Gray01&facialHairType=Blank&clotheType=ShirtCrewNeck&clotheColor=Blue02&eyeType=Wink&eyebrowType=UnibrowNatural&mouthType=Smile&skinColor=Tanned',
        'https://avataaars.io/?avatarStyle=Circle&topType=ShortHairDreads02&accessoriesType=Round&hairColor=Auburn&facialHairType=MoustacheFancy&facialHairColor=Black&clotheType=BlazerShirt&clotheColor=Blue02&eyeType=Side&eyebrowType=RaisedExcited&mouthType=Vomit&skinColor=Brown',
        'https://avataaars.io/?avatarStyle=Circle&topType=LongHairStraightStrand&accessoriesType=Round&hairColor=Platinum&facialHairType=BeardLight&facialHairColor=Brown&clotheType=GraphicShirt&clotheColor=Gray01&graphicType=Skull&eyeType=Cry&eyebrowType=UpDownNatural&mouthType=Concerned&skinColor=Brown'
    ]
    return avatars[Math.floor(Math.random() * avatars.length)];
}