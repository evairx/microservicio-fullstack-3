import { useRef, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { IconPhoto, IconTrashFilled, IconMessageCircle, IconShare3, IconHeart } from '@tabler/icons-preact';
import { viewImage } from "../../stores/view-image";
import type { JSX } from 'preact';

const MAX_CHARS = 280;
const CIRCUMFERENCE = 2 * Math.PI * 10;

interface Attachment {
    id: string;
    file: File;
    previewUrl: string;
    type: 'image' | 'video';
}

interface TextAreaPostProps {
    sid: string;
}

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

const formatText = (content: string): JSX.Element[] => {
    const regex = /(#\w+|https:\/\/[^\s]+|http:\/\/[^\s]+)/g;
    const parts = content.split(regex);

    return parts.map((part, i) => {
        if (part.startsWith('#') || part.startsWith('https://')) {
            return <span key={i} class="text-[#1d9bf0] font-medium">{part}</span>;
        }
        if (part.startsWith('http://')) {
            return <span key={i} class="text-red-500 line-through bg-red-500/10 rounded px-1 font-medium">{part}</span>;
        }
        return <span key={i}>{part}</span>;
    });
};

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

function FeedMediaGallery({ media, onImageClick }: { media: PostContent[], onImageClick: (e: Event, src: string) => void }) {
    if (!media || media.length === 0) return null;

    if (media.length === 1) {
        const item = media[0];
        return (
            <div class="mt-3">
                {item.type_content === "video" ? (
                    <video
                        controls
                        src={item.content}
                        class="w-full max-h-[500px] rounded-xl border border-white/10 bg-black"
                        preload="metadata"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <img
                        src={item.content}
                        onClick={(e) => onImageClick(e, item.content)}
                        class="w-full max-h-[500px] object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                        loading="lazy"
                    />
                )}
            </div>
        );
    }

    return (
        <div class={`mt-3 grid gap-0.5 rounded-xl overflow-hidden border border-white/10 ${
            media.length === 2 ? 'grid-cols-2 aspect-[2/1]' : 'grid-cols-2 grid-rows-2 aspect-[16/9] sm:aspect-[3/2]'
        }`}>
            {media.slice(0, 4).map((item, index) => {
                const isThreeLayoutFirst = media.length === 3 && index === 0;
                
                return (
                    <div 
                        key={index} 
                        class={`relative w-full h-full bg-white/5 ${isThreeLayoutFirst ? 'row-span-2' : ''}`}
                        onClick={(e) => {
                            if (item.type_content === "image") {
                                onImageClick(e, item.content);
                            } else {
                                e.stopPropagation();
                            }
                        }}
                    >
                        {item.type_content === "video" ? (
                            <video
                                controls
                                src={item.content}
                                class="absolute inset-0 w-full h-full object-cover bg-black"
                                preload="metadata"
                            />
                        ) : (
                            <img
                                src={item.content}
                                class="absolute inset-0 w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                loading="lazy"
                            />
                        )}
                        
                        {media.length > 4 && index === 3 && (
                            <div class="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-3xl font-bold cursor-pointer hover:bg-black/70 transition-colors pointer-events-none">
                                +{media.length - 4}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function TextAreaPost({ sid }: TextAreaPostProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const text = useSignal<string>('');
    const isExpanded = useSignal<boolean>(false);
    const isPublic = useSignal<boolean>(true);
    
    const attachments = useSignal<Attachment[]>([]);
    const isPublishing = useSignal<boolean>(false);
    const errorMessage = useSignal<string>('');
    
    const optimisticPosts = useSignal<PostData[]>([]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                if (text.value.length === 0 && attachments.value.length === 0) {
                    isExpanded.value = false;
                    errorMessage.value = '';
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [text.value, attachments.value]);

    const currentText = text.value;
    const hasHttp = currentText.includes('http://');
    const charsLeft = MAX_CHARS - currentText.length;
    const isOverLimit = currentText.length > MAX_CHARS;
    const isWarning = charsLeft <= 20;
    
    const hasContent = currentText.length > 0 || attachments.value.length > 0;
    const canPublish = hasContent && !hasHttp && !isOverLimit && !isPublishing.value;

    const percentage = Math.min((currentText.length / MAX_CHARS) * 100, 100);
    const strokeDashoffset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;

    let alertMessage = '';
    if (errorMessage.value) alertMessage = errorMessage.value;
    else if (hasHttp) alertMessage = 'No se permiten enlaces HTTP. Usa HTTPS por seguridad.';
    else if (isOverLimit) alertMessage = `Has superado el límite por ${Math.abs(charsLeft)} caracteres.`;

    const handleScroll = (e: Event) => {
        if (overlayRef.current) {
            overlayRef.current.scrollTop = (e.currentTarget as HTMLTextAreaElement).scrollTop;
        }
    };

    const handleFileChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        const validFiles = files.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));
        
        if (validFiles.length > 0) {
            const newAttachments: Attachment[] = validFiles.map(file => ({
                id: Math.random().toString(36).substring(7),
                file,
                previewUrl: URL.createObjectURL(file),
                type: file.type.startsWith('video/') ? 'video' : 'image'
            }));
            attachments.value = [...attachments.value, ...newAttachments];
            isExpanded.value = true;
            errorMessage.value = '';
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (e: Event, idToRemove: string) => {
        e.stopPropagation();
        const toRemove = attachments.value.find(a => a.id === idToRemove);
        if (toRemove) URL.revokeObjectURL(toRemove.previewUrl);
        attachments.value = attachments.value.filter(a => a.id !== idToRemove);
    };

    const handlePostClick = (id: string) => {
        window.location.href = `/post/${id}`;
    };

    const handleImageClick = (e: Event, src: string) => {
        e.stopPropagation();
        viewImage.set({ show: true, src: src });
    };

    const handlePost = async () => {
        if (!canPublish) return;

        isPublishing.value = true;
        errorMessage.value = '';

        try {
            const uploadedContents: { type_content: string; content: string }[] = [];

            for (const att of attachments.value) {
                const formData = new FormData();
                formData.append('file', att.file);

                const upRes = await fetch('http://localhost:3000/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${sid}` },
                    body: formData
                });

                if (!upRes.ok) {
                    throw new Error('Error al subir un archivo multimedia');
                }

                const upData = await upRes.json();
                
                if (upData.error) {
                    throw new Error(upData.error);
                }
                
                uploadedContents.push({
                    type_content: att.type,
                    content: `http://localhost:3000${upData.url}`
                });
            }

            const payload = {
                content_text: currentText,
                is_public: isPublic.value,
                contents: uploadedContents
            };

            const postRes = await fetch('http://localhost:3000/posts/add', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${sid}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!postRes.ok) {
                throw new Error('Error al publicar el post');
            }

            const resData = await postRes.json();
            const now = new Date();

            const newPost: PostData = {
                id: resData.post_id || crypto.randomUUID(),
                displayname: "Tú", 
                username: "usuario",
                avatar: "https://avataaars.io/?avatarStyle=Circle&topType=NoHair&accessoriesType=Blank&facialHairType=Blank&clotheType=ShirtCrewNeck&clotheColor=Gray01&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light",
                comment_text: currentText,
                contents: uploadedContents,
                likes: 0,
                comments: 0,
                shared: 0,
                date: now.toISOString().replace("T", " ").substring(0, 19)
            };

            optimisticPosts.value = [newPost, ...optimisticPosts.value];

            text.value = '';
            isPublic.value = true;
            attachments.value.forEach(a => URL.revokeObjectURL(a.previewUrl));
            attachments.value = [];
            isExpanded.value = false;

        } catch (err: any) {
            errorMessage.value = err.message === 'Failed to fetch' 
                ? 'Error de conexión. Verifica que el servidor esté activo.' 
                : err.message || 'Error desconocido al intentar publicar.';
        } finally {
            isPublishing.value = false;
        }
    };

    return (
        <div class="flex flex-col gap-4">
            <div 
                ref={containerRef}
                onClick={() => isExpanded.value = true}
                class={`w-full flex flex-col gap-3 rounded-xl p-4 transition-all duration-300 cursor-text
                    ${isExpanded.value 
                        ? 'bg-[#2a2a2a]/40 border-[2px] border-white/20 shadow-lg' 
                        : 'bg-[#2a2a2a]/20 border-[2px] border-transparent hover:border-white/10 hover:bg-[#2a2a2a]/30'
                    }
                `}
            >
                <div class={`relative w-full transition-all duration-300 ${isExpanded.value ? 'h-[120px]' : 'h-[60px]'}`}>
                    <div 
                        ref={overlayRef}
                        class="absolute inset-0 w-full h-full text-base text-white whitespace-pre-wrap break-words overflow-hidden pointer-events-none"
                        aria-hidden="true"
                    >
                        {formatText(currentText)}
                        {currentText.endsWith('\n') ? <br /> : null}
                    </div>

                    <textarea 
                        class="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white text-base resize-none focus:outline-none overflow-y-auto placeholder:text-white/70 placeholder:font-medium placeholder:text-base"
                        placeholder="¿Qué está pasando aquí???"
                        value={currentText}
                        onInput={(e) => text.value = (e.target as HTMLTextAreaElement).value}
                        onScroll={handleScroll}
                        spellcheck={false}
                        disabled={isPublishing.value}
                    />
                </div>

                {attachments.value.length > 0 && isExpanded.value && (
                    <div class="flex gap-3 mt-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {attachments.value.map((att) => (
                            <div key={att.id} class="relative flex-shrink-0 w-max">
                                {att.type === 'video' ? (
                                    <video src={att.previewUrl} class="h-[140px] w-auto rounded-xl object-cover border border-white/10" controls />
                                ) : (
                                    <img src={att.previewUrl} alt="Preview" class="h-[140px] w-auto rounded-xl object-cover border border-white/10" />
                                )}
                                <button 
                                    onClick={(e) => removeImage(e, att.id)}
                                    disabled={isPublishing.value}
                                    class="absolute top-2 right-2 bg-black/70 hover:bg-black p-1.5 rounded-full text-white transition-colors cursor-pointer"
                                >
                                    <IconTrashFilled size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {alertMessage && isExpanded.value && (
                    <div class="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-1 animate-in fade-in slide-in-from-top-2">
                        <span class="text-sm font-medium text-red-400">{alertMessage}</span>
                    </div>
                )}

                <div class={`flex items-center justify-between transition-all duration-300 overflow-hidden ${
                    isExpanded.value ? 'max-h-[50px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                }`}>
                    <div class="flex items-center gap-4">
                        <button 
                            type="button" 
                            onClick={(e) => {
                                e.stopPropagation();
                                isPublic.value = !isPublic.value;
                            }}
                            disabled={isPublishing.value}
                            class="flex items-center gap-2 group focus:outline-none cursor-pointer p-1 rounded-md hover:bg-white/5"
                        >
                            <div class={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isPublic.value ? 'bg-white' : 'bg-neutral-600'}`}>
                                <div class={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full transition-transform duration-200 shadow-sm ${isPublic.value ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'}`} />
                            </div>
                            <span class="text-xs font-medium text-neutral-400 group-hover:text-white transition-colors">
                                {isPublic.value ? 'Público' : 'Privado'}
                            </span>
                        </button>

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                            }}
                            disabled={isPublishing.value}
                            class="flex items-center justify-center text-white hover:bg-white/10 p-2 rounded-full transition-colors focus:outline-none cursor-pointer"
                        >
                            <IconPhoto size={22} />
                        </button>
                        <input 
                            type="file" 
                            accept="image/*,video/*" 
                            class="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            multiple
                        />
                    </div>

                    <div class="flex items-center gap-4">
                        <div class="relative flex items-center justify-center w-8 h-8">
                            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" class="stroke-neutral-700" strokeWidth="2.5" fill="none" />
                                <circle 
                                    cx="12" cy="12" r="10" 
                                    class={`transition-colors duration-300 ease-out ${
                                        isOverLimit ? 'stroke-red-500' : isWarning ? 'stroke-orange-400' : 'stroke-white'
                                    }`} 
                                    strokeWidth="2.5" 
                                    fill="none" 
                                    strokeLinecap="round"
                                    style={{
                                        strokeDasharray: CIRCUMFERENCE,
                                        strokeDashoffset: strokeDashoffset,
                                        transition: 'stroke-dashoffset 0.2s ease-out'
                                    }}
                                />
                            </svg>
                            
                            {isWarning && (
                                <span class={`absolute text-[0.65rem] font-bold ${isOverLimit ? 'text-red-500' : 'text-orange-400'}`}>
                                    {charsLeft}
                                </span>
                            )}
                        </div>

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePost();
                            }}
                            disabled={!canPublish}
                            class={`rounded-full px-5 py-2 font-medium text-sm transition-all duration-200 ${
                                canPublish 
                                    ? 'bg-white text-black hover:bg-neutral-200 active:scale-95' 
                                    : 'bg-white/20 text-white/40 cursor-not-allowed'
                            } ${isPublishing.value ? 'opacity-70 animate-pulse' : ''}`}
                        >
                            {isPublishing.value ? 'Posteando...' : 'Postear'}
                        </button>
                    </div>
                </div>
            </div>

            {optimisticPosts.value.length > 0 && (
                <div class="flex flex-col gap-4 mt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                    {optimisticPosts.value.map(post => (
                        <article 
                            key={post.id}
                            onClick={() => handlePostClick(post.id)}
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
                                                class="text-white text-[1.15rem] font-bold hover:underline"
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

                                    {post.comment_text?.trim() ? (
                                        <div class="mt-3 text-[1.10rem] text-white/90 font-normal leading-relaxed whitespace-pre-wrap break-words">
                                            <p>{formatPostText(post.comment_text)}</p>
                                        </div>
                                    ) : null}

                                    <FeedMediaGallery media={post.contents} onImageClick={handleImageClick} />

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
                    ))}
                </div>
            )}
        </div>
    );
}