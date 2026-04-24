import { IconMessageCircle, IconShare3, IconHeart } from "@tabler/icons-preact";
import { viewImage } from "../../stores/view-image"; 

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

function formatTimeAgo(dateString: string) {
    const validDateString = dateString.replace(" ", "T");
    const postDate = new Date(validDateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

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
                    onClick={(e) => e.stopPropagation()} 
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
                    onClick={(e) => e.stopPropagation()}
                    class="text-[#1d9bf0] font-medium hover:underline"
                >
                    {part}
                </a>
            );
        }
        return <span key={index}>{part}</span>;
    });
}

function FeedImageGallery({ images, onImageClick }: { images: PostContent[], onImageClick: (e: Event, src: string) => void }) {
    if (!images || images.length === 0) return null;

    if (images.length === 1) {
        return (
            <div class="mt-3">
                <img
                    src={images[0].content}
                    onClick={(e) => onImageClick(e, images[0].content)}
                    class="w-full max-h-[500px] object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                    loading="lazy"
                />
            </div>
        );
    }

    return (
        <div class={`mt-3 grid gap-0.5 rounded-xl overflow-hidden border border-white/10 ${
            images.length === 2 ? 'grid-cols-2 aspect-[2/1]' : 'grid-cols-2 grid-rows-2 aspect-[16/9] sm:aspect-[3/2]'
        }`}>
            {images.slice(0, 4).map((img, index) => {
                const isThreeLayoutFirst = images.length === 3 && index === 0;
                
                return (
                    <div 
                        key={index} 
                        class={`relative w-full h-full bg-white/5 ${isThreeLayoutFirst ? 'row-span-2' : ''}`}
                        onClick={(e) => onImageClick(e, img.content)}
                    >
                        <img
                            src={img.content}
                            class="absolute inset-0 w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            loading="lazy"
                        />
                        
                        {images.length > 4 && index === 3 && (
                            <div class="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-3xl font-bold cursor-pointer hover:bg-black/70 transition-colors">
                                +{images.length - 4}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function Post({ post }: { post: PostData }) {
    const handlePostClick = () => {
        window.location.href = `/post/${post.id}`;
    };

    const handleImageClick = (e: Event, src: string) => {
        e.stopPropagation(); 
        viewImage.set({ show: true, src: src });
    };

    const images = post.contents?.filter(media => media.type_content === "image") || [];

    return (
        <article 
            onClick={handlePostClick}
            class="p-5 sm:p-6 border border-white/4 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
            <div class="flex items-start gap-4">
                <a href={`/profile/${post.username}`} onClick={(e) => e.stopPropagation()} class="shrink-0">
                    <img
                        class="w-[50px] h-[50px] rounded-full mt-1 object-cover hover:opacity-80 transition-opacity"
                        src={post.avatar}
                        alt={`Avatar de ${post.displayname}`}
                    />
                </a>
                
                <div class="w-full min-w-0">
                    <div>
                        <div class="flex flex-wrap items-center gap-x-2">
                            <a 
                                href={`/profile/${post.username}`} 
                                onClick={(e) => e.stopPropagation()}
                                class="text-white text-[1.15rem] font-medium hover:underline"
                            >
                                {post.displayname}
                            </a>
                            
                            <span class="text-white/50 text-[.95rem]">·</span>
                            
                            <span class="text-white/50 text-[.95rem]">
                                {formatTimeAgo(post.date)}
                            </span>
                        </div>
                        <p class="text-white/50 text-[.95rem] leading-none mt-1">
                            @{post.username}
                        </p>
                    </div>

                    <div class="mt-3 text-[1.10rem] text-white/90 font-normal leading-relaxed whitespace-pre-wrap break-words">
                        <p>{formatPostText(post.comment_text)}</p>
                    </div>

                    <FeedImageGallery images={images} onImageClick={handleImageClick} />

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