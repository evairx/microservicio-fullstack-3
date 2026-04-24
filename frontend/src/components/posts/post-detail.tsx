import { IconMessageCircle, IconShare3, IconHeart } from "@tabler/icons-preact";
import { viewImage } from "../../stores/view-image";

interface PostContent {
    type_content: "image" | "video" | string;
    content: string;
}

interface InteractionData<T = string> {
    count: number;
    liked_users?: T[]; 
    shared_users?: T[];
    comment_list?: any[]; 
}

interface PostData {
    id: string;
    displayname: string;
    username: string;
    avatar: string;
    comment_text: string;
    contents: PostContent[];
    date: string;
    likes: InteractionData;
    comments: InteractionData;
    shared: InteractionData;
}

function formatDetailDate(dateString: string) {
    const validDateString = dateString.replace(" ", "T");
    const date = new Date(validDateString);

    const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

    const timeString = new Intl.DateTimeFormat('es-CL', timeOptions).format(date);
    const dateStringFormatted = new Intl.DateTimeFormat('es-CL', dateOptions).format(date);

    return `${timeString} · ${dateStringFormatted}`;
}

function formatPostText(text: string) {
    const regex = /(https?:\/\/[^\s]+|#[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)/g;
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
        if (part.match(/^https?:\/\//)) {
            return (
                <a 
                    key={index} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    class="text-[#1d9bf0] font-medium hover:underline"
                >
                    {part}
                </a>
            );
        } else if (part.startsWith('#')) {
            const tag = part.slice(1);
            return (
                <a 
                    key={index} 
                    href={`/hashtag/${tag}`} 
                    class="text-[#1d9bf0] font-medium hover:underline"
                >
                    {part}
                </a>
            );
        }
        return <span key={index}>{part}</span>;
    });
}

export function PostDetail({ post }: { post: PostData }) {
    
    const handleImageClick = (src: string) => {
        viewImage.set({ show: true, src: src });
    };

    const firstImage = post.contents?.find(media => media.type_content === "image");

    return (
        <article class="p-4 sm:p-5 pb-0 text-white">

            <div class="flex items-center gap-3 mb-4">
                <a href={`/profile/${post.username}`} class="shrink-0">
                    <img
                        class="w-[48px] h-[48px] rounded-full object-cover hover:opacity-80 transition-opacity"
                        src={post.avatar}
                        alt={`Avatar de ${post.displayname}`}
                    />
                </a>
                
                <div class="flex flex-col justify-center">
                    <a 
                        href={`/profile/${post.username}`} 
                        class="text-[1.10rem] font-bold hover:underline leading-tight"
                    >
                        {post.displayname}
                    </a>
                    <a 
                        href={`/profile/${post.username}`}
                        class="text-white/50 text-[1rem] leading-tight mt-0.5"
                    >
                        @{post.username}
                    </a>
                </div>
            </div>

            <div class="text-[1.3rem] font-normal leading-relaxed whitespace-pre-wrap break-words mb-4">
                {formatPostText(post.comment_text)}
            </div>

            {firstImage && (
                <div class="mb-4">
                    <img
                        src={firstImage.content}
                        alt="Imagen adjunta al post"
                        onClick={() => handleImageClick(firstImage.content)}
                        class="w-full max-h-[600px] object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                        loading="lazy"
                    />
                </div>
            )}

            <div class="text-white/50 text-[1rem] pb-4">
                <a href={`/post/${post.id}`} class="hover:underline">
                    {formatDetailDate(post.date)}
                </a>
            </div>

            <div class="flex gap-5 py-4 border-t border-white/10 text-[1rem]">
                <span class="text-white/50 cursor-pointer hover:underline">
                    <span class="text-white font-bold">{post.shared?.count || 0}</span> Compartidos
                </span>
                <span class="text-white/50 cursor-pointer hover:underline">
                    <span class="text-white font-bold">{post.likes?.count || 0}</span> Me gusta
                </span>
            </div>

            <div class="flex justify-around py-3 border-t border-b border-white/10 mb-4">
                <button class="group flex gap-2 items-center text-white/50 hover:text-[#1d9bf0] transition-colors">
                    <div class="p-2 rounded-full group-hover:bg-[#1d9bf0]/10 transition-colors">
                        <IconMessageCircle class="w-[22px] h-[22px]" />
                    </div>
                </button>

                <button class="group flex gap-2 items-center text-white/50 hover:text-[#00ba7c] transition-colors">
                    <div class="p-2 rounded-full group-hover:bg-[#00ba7c]/10 transition-colors">
                        <IconShare3 class="w-[22px] h-[22px]" />
                    </div>
                </button>

                <button class="group flex gap-2 items-center text-white/50 hover:text-[#f91880] transition-colors">
                    <div class="p-2 rounded-full group-hover:bg-[#f91880]/10 transition-colors">
                        <IconHeart class="w-[22px] h-[22px]" />
                    </div>
                </button>
            </div>

        </article>
    );
}