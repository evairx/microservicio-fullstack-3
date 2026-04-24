import { IconMessageCircle, IconShare3, IconHeart } from "@tabler/icons-preact";
import { viewImage } from "../../stores/view-image"; // Asegúrate de que la ruta sea la correcta

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

// 1. Corrección y formato de la fecha
function formatTimeAgo(dateString: string) {
    // Reemplazamos el espacio por una "T" para que sea un estándar ISO válido en todos los navegadores
    const validDateString = dateString.replace(" ", "T");
    const postDate = new Date(validDateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    // Si hay un desajuste de reloj y da negativo, o si acaba de publicarse (0s)
    if (diffInSeconds <= 0) return "1s";
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays <= 7) return `${diffInDays}d`;

    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const day = postDate.getDate();
    const month = months[postDate.getMonth()];
    const year = postDate.getFullYear();

    if (year === now.getFullYear()) {
        return `${day} ${month}`; 
    }
    
    return `${day} ${month} ${year}`;
}

// 5 y 6. Función para parsear URLs y Hashtags
function formatPostText(text: string) {
    // Esta expresión regular captura tanto URLs (http/https) como Hashtags (#)
    const regex = /(https?:\/\/[^\s]+|#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)/g;
    
    // Al hacer split con grupos de captura (), los separadores también se incluyen en el array resultante
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
        if (part.match(/^https?:\/\//)) {
            return (
                <a 
                    key={index} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()} // Evita que se abra el post completo
                    class="text-[#1d9bf0] font-medium hover:underline"
                >
                    {part}
                </a>
            );
        } else if (part.startsWith('#')) {
            const tag = part.slice(1); // Quitamos el '#' para la URL
            return (
                <a 
                    key={index} 
                    href={`/hashtag/${tag}`} 
                    onClick={(e) => e.stopPropagation()}
                    class="text-[#1d9bf0] font-medium hover:underline"
                >
                    {part}
                </a>
            );
        }
        // Retornamos el texto normal
        return <span key={index}>{part}</span>;
    });
}

export function Post({ post }: { post: PostData }) {
    
    // 2. Navegación al post completo
    const handlePostClick = () => {
        window.location.href = `/post/${post.id}`;
    };

    // 4. Integración del Nanostore al dar click a la imagen
    const handleImageClick = (e: Event, src: string) => {
        e.stopPropagation(); // Evitamos ir a la vista del post si dimos click a la imagen
        viewImage.set({ show: true, src: src });
    };

    // Solo extraemos la primera imagen para cumplir con tu regla de "no a varias"
    const firstImage = post.contents?.find(media => media.type_content === "image");

    return (
        <article 
            onClick={handlePostClick}
            class="p-5 sm:p-6 border border-white/4 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
            <div class="flex items-start gap-4">
                {/* 3. Click en el avatar para ir al perfil (opcional, pero buena práctica) */}
                <a href={`/profile/${post.username}`} onClick={(e) => e.stopPropagation()} class="shrink-0">
                    <img
                        class="w-[50px] h-[50px] rounded-full mt-1 object-cover hover:opacity-80 transition-opacity"
                        src={post.avatar}
                        alt={`Avatar de ${post.displayname}`}
                    />
                </a>
                
                <div class="w-full min-w-0">
                    {/* Cabecera del usuario y fecha */}
                    <div>
                        <div class="flex flex-wrap items-center gap-x-2">
                            {/* 3. Click en el nombre para ir al perfil */}
                            <a 
                                href={`/profile/${post.username}`} 
                                onClick={(e) => e.stopPropagation()}
                                class="text-white text-[1.15rem] font-medium hover:underline"
                            >
                                {post.displayname}
                            </a>
                            
                            <span class="text-white/50 text-[.95rem]">·</span>
                            
                            {/* 1. Fecha al lado del displayname */}
                            <span class="text-white/50 text-[.95rem]">
                                {formatTimeAgo(post.date)}
                            </span>
                        </div>
                        <p class="text-white/50 text-[.95rem] leading-none mt-1">
                            @{post.username}
                        </p>
                    </div>

                    {/* Texto formateado con menciones y urls (mantiene el whitespace-pre-wrap para los saltos de linea) */}
                    <div class="mt-3 text-[1.10rem] text-white/90 font-normal leading-relaxed whitespace-pre-wrap break-words">
                        <p>{formatPostText(post.comment_text)}</p>
                    </div>

                    {/* 4. Renderizamos únicamente la primera imagen, si existe */}
                    {firstImage && (
                        <div class="mt-4">
                            <img
                                src={firstImage.content}
                                alt="Imagen adjunta al post"
                                onClick={(e) => handleImageClick(e, firstImage.content)}
                                class="w-full max-h-[500px] object-cover rounded-xl border border-white/10 hover:opacity-90 transition-opacity"
                                loading="lazy"
                            />
                        </div>
                    )}

                    {/* Botones de interacción con stopPropagation() para que no abran el post */}
                    <div class="w-full mt-5 flex gap-8">
                        <button 
                            onClick={(e) => e.stopPropagation()} 
                            class="flex gap-2 items-center text-white/50 text-[.95rem] hover:text-[#1d9bf0] transition-colors"
                        >
                            <IconMessageCircle class="w-[20px] h-[20px]" />
                            {post.comments}
                        </button>
                        <button 
                            onClick={(e) => e.stopPropagation()} 
                            class="flex gap-2 items-center text-white/50 text-[.95rem] hover:text-[#00ba7c] transition-colors"
                        >
                            <IconShare3 class="w-[20px] h-[20px]" />
                            {post.shared}
                        </button>
                        <button 
                            onClick={(e) => e.stopPropagation()} 
                            class="flex gap-2 items-center text-white/50 text-[.95rem] hover:text-[#f91880] transition-colors"
                        >
                            <IconHeart class="w-[20px] h-[20px]" />
                            {post.likes}
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}