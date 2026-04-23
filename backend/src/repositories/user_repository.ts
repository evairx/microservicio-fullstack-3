import { createClient } from "@libsql/client";
import bcrypt from "bcrypt";

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
                )`,
                {
                    sql: `INSERT OR IGNORE INTO users (avatar, name, email, password) VALUES (?, ?, ?, ?)`,
                    args: [randomGenAvatar(), "Pepito", "pepito@gmail.com", await bcrypt.hash("password123", salt)],
                }
            ],
            "write",
        )

        return {
            async createUser() {

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