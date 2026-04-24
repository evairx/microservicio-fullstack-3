import { IconMessageCircle, IconShare3, IconHeart } from "@tabler/icons-preact";

interface PostContent {
    type_content: "image" | "video" | string;
    content: string;
}

interface PostData {
    id: string;
    displayname: string;
    username: string;
    avatar: string;
    comment_text: string;
    contents: PostContent[];
    likes: number;
    comments: number;
    shared: number;
    date: string;
}

// Función para formatear la fecha estilo Twitter/Bluesky
function formatTimeAgo(dateString: string) {
    const postDate = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return `${Math.max(0, diffInSeconds)}s`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays <= 7) return `${diffInDays}d`;

    // Si es más de 7 días, usamos formato "Día Mes" o "Día Mes Año"
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const day = postDate.getDate();
    const month = months[postDate.getMonth()];
    const year = postDate.getFullYear();

    if (year === now.getFullYear()) {
        return `${day} ${month}`; // Ej: "22 Mayo"
    }
    
    return `${day} ${month} ${year}`; // Ej: "11 Abril 2025"
}

export function Post({ post }: { post: PostData }) {
    return (
        <article class="p-5 sm:p-6 border border-white/4 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer">
            <div class="flex items-start gap-4">
                <img
                    class="w-[50px] h-[50px] rounded-full mt-1 object-cover"
                    src={post.avatar}
                    alt={`Avatar de ${post.displayname}`}
                />
                <div class="w-full">
                    <div>
                        <p class="text-white text-[1.15rem] font-medium">
                            {post.displayname}
                        </p>
                        {/* Aquí agregamos el punto y la fecha formateada */}
                        <p class="text-white/50 text-[.95rem] leading-none mt-1">
                            @{post.username} <span class="mx-1">·</span> {formatTimeAgo(post.date)}
                        </p>
                    </div>

                    {/* Agregado: whitespace-pre-wrap para respetar los saltos de línea (\n) */}
                    <div class="mt-3 text-[1.10rem] text-white/90 font-normal leading-relaxed whitespace-pre-wrap break-words">
                        <p>{post.comment_text}</p>
                    </div>

                    {/* Agregado: Renderizado de la imagen sin romper tu diseño */}
                    {post.contents && post.contents.length > 0 && (
                        <div class="mt-4">
                            {post.contents.map((media, index) => {
                                if (media.type_content === "image") {
                                    return (
                                        <img
                                            key={index}
                                            src={media.content}
                                            alt="Contenido del post"
                                            class="w-full max-h-[500px] object-cover rounded-xl border border-white/10"
                                            loading="lazy"
                                        />
                                    );
                                }
                                return null;
                            })}
                        </div>
                    )}

                    <div class="w-full mt-5 flex gap-8">
                        <button class="flex gap-2 items-center text-white/50 text-[.95rem] hover:text-white transition-colors">
                            <IconMessageCircle class="w-[20px] h-[20px]" />
                            {post.comments}
                        </button>
                        <button class="flex gap-2 items-center text-white/50 text-[.95rem] hover:text-white transition-colors">
                            <IconShare3 class="w-[20px] h-[20px]" />
                            {post.shared}
                        </button>
                        <button class="flex gap-2 items-center text-white/50 text-[.95rem] hover:text-white transition-colors">
                            <IconHeart class="w-[20px] h-[20px]" />
                            {post.likes}
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}