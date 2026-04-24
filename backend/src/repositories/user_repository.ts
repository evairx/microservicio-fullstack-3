import { createClient } from "@libsql/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "crypto";

export async function userRepository() {
    try {
        const client = createClient({ url: "file:data.db" })

        const salt = 10

        await client.batch(
            [
                `CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    avatar TEXT,
                    name TEXT,
                    email TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL
                );
                INDEX IF NOT EXISTS idx_users_email ON users (email);
                `,
                `
                CREATE TABLE IF NOT EXISTS auth (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    refresh_token TEXT NOT NULL,
                    signature TEXT NOT NULL,
                    last_used DATETIME NOT NULL,
                    expires_at DATETIME NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                INDEX IF NOT EXISTS idx_auth_user_id ON auth (user_id);
                INDEX IF NOT EXISTS idx_auth_signature ON auth (signature);
                `,
                {
                    sql: `INSERT OR IGNORE INTO users (avatar, name, email, password) VALUES (?, ?, ?, ?)`,
                    args: [randomGenAvatar(), "Pepito", "pepito@gmail.com", await bcrypt.hash("password123", salt)],
                }
            ],
            "write",
        )

        return {
            async signUp({ name, email, password }: { name: string, email: string, password: string }) {
                try {
                    const result = await client.execute({
                        sql: `INSERT INTO users (avatar, name, email, password) VALUES (?, ?, ?, ?) RETURNING id, avatar, name, email`,
                        args: [randomGenAvatar(), name, email, await bcrypt.hash(password, salt)]
                    })

                    return { success: true, user: result.rows[0] };
                } catch (error) {
                    console.error("Error al registrar usuario:", error);
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

                    const refreshToken = randomBytes(32).toString('hex');
                    const signature = randomUUID();

                    await client.execute({
                        sql: `
                            INSERT INTO auth (user_id, refresh_token, signature, last_used, expires_at)
                            VALUES (?, ?, ?, datetime('now'), datetime('now', '+1 hour'))
                        `,
                        args: [user.id, refreshToken, signature]
                    });

                    if (!process.env.JWT_SECRET) return { success: false, message: "jwt secret no configurado" };

                    const user_token = jwt.sign({ userId: user.id }, signature, { expiresIn: '10m' });
                    const token = jwt.sign({ session: user_token }, process.env.JWT_SECRET, { expiresIn: '10m' });

                    return { success: true, token: token, refreshToken: refreshToken, expiresIn: 3600 };

                } catch (err) {
                    console.error("Error al iniciar sesión:", err);
                    return { success: false, message: "Error al iniciar sesión" };
                }
            },
            async profile({ token }: { token: string }) {

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