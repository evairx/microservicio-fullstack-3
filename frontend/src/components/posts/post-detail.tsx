import { IconMessageCircle, IconShare3, IconHeart, IconPhoto, IconTrashFilled } from "@tabler/icons-preact";
import { viewImage } from "../../stores/view-image";
import { useRef, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import type { JSX } from 'preact';

interface PostContent {
    type_content: "image" | "video" | string;
    content: string;
}

interface CommentData {
    id: string;
    displayname: string;
    username: string;
    avatar: string;
    comment_text: string;
    date: string;
    contents: PostContent[];
}

interface InteractionData<T = string> {
    count: number;
    liked_users?: T[]; 
    shared_users?: T[];
    comment_list?: CommentData[]; 
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

const MAX_CHARS = 280;
const CIRCUMFERENCE = 2 * Math.PI * 10;

interface Attachment {
    id: string;
    file: File;
    previewUrl: string;
    type: 'image' | 'video';
}

interface TextAreaCommentProps {
    sid: string;
    postId: string;
    onCommentAdded: (comment: CommentData) => void;
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
            return <a key={index} href={part} target="_blank" rel="noopener noreferrer" class="text-[#1d9bf0] font-medium hover:underline">{part}</a>;
        } else if (part.startsWith('#')) {
            const tag = part.slice(1);
            return <a key={index} href={`/hashtag/${tag}`} class="text-[#1d9bf0] font-medium hover:underline">{part}</a>;
        }
        return <span key={index}>{part}</span>;
    });
}

function MediaGallery({ media, onImageClick }: { media: PostContent[], onImageClick: (src: string) => void }) {
    if (!media || media.length === 0) return null;

    if (media.length === 1) {
        const item = media[0];
        return (
            <div class="mb-4 mt-3">
                {item.type_content === "video" ? (
                    <video
                        controls
                        src={item.content}
                        class="w-full max-h-[600px] rounded-xl border border-white/10 bg-black"
                        preload="metadata"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <img
                        src={item.content}
                        onClick={(e) => { e.stopPropagation(); onImageClick(item.content); }}
                        class="w-full max-h-[600px] object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                        loading="lazy"
                    />
                )}
            </div>
        );
    }

    return (
        <div class={`mb-4 mt-3 grid gap-0.5 rounded-xl overflow-hidden border border-white/10 ${
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
                                e.stopPropagation(); 
                                onImageClick(item.content);
                            }
                        }}
                    >
                        {item.type_content === "video" ? (
                            <video
                                controls
                                src={item.content}
                                class="absolute inset-0 w-full h-full object-cover bg-black"
                                preload="metadata"
                                onClick={(e) => e.stopPropagation()}
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

export function TextAreaComment({ sid, postId, onCommentAdded }: TextAreaCommentProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const text = useSignal<string>('');
    const isExpanded = useSignal<boolean>(false);
    const attachments = useSignal<Attachment[]>([]);
    const isPublishing = useSignal<boolean>(false);
    const errorMessage = useSignal<string>('');

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
                comment_text: currentText,
                contents: uploadedContents
            };

            const postRes = await fetch(`http://localhost:3000/posts/${postId}/comment`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${sid}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!postRes.ok) {
                const errorData = await postRes.json().catch(() => null);
                throw new Error(errorData?.error || 'Error al publicar el comentario');
            }

            const resData = await postRes.json();

            // Magia Reactiva: Fabricamos el comentario para renderizarlo inmediatamente
            // Nota: Al no tener tus datos de usuario aquí, pongo "Tú" por ahora. 
            // Cuando recargues, la DB pondrá tus datos reales automáticamente.
            const now = new Date();
            const optimisticComment: CommentData = {
                id: resData.comment_id || crypto.randomUUID(),
                displayname: "Tú", 
                username: "usuario",
                avatar: "https://avataaars.io/?avatarStyle=Circle&topType=NoHair&accessoriesType=Blank&facialHairType=Blank&clotheType=ShirtCrewNeck&clotheColor=Gray01&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light",
                comment_text: currentText,
                date: now.toISOString().replace("T", " ").substring(0, 19),
                contents: uploadedContents
            };

            // Notificamos al componente padre (PostDetail)
            onCommentAdded(optimisticComment);

            text.value = '';
            attachments.value.forEach(a => URL.revokeObjectURL(a.previewUrl));
            attachments.value = [];
            isExpanded.value = false;

        } catch (err: any) {
            errorMessage.value = err.message === 'Failed to fetch' 
                ? 'Error de conexión. Verifica que el servidor esté activo.' 
                : err.message || 'Error desconocido al intentar comentar.';
        } finally {
            isPublishing.value = false;
        }
    };

    return (
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
                    placeholder="Escribe una respuesta..."
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
                        {isPublishing.value ? 'Comentando...' : 'Comentar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CommentItem({ comment, onImageClick }: { comment: CommentData, onImageClick: (src: string) => void }) {
    const media = comment.contents || [];

    return (
        <article class="py-4 border-b border-white/10 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <a href={`/profile/${comment.username}`} class="shrink-0" onClick={(e) => e.stopPropagation()}>
                <img
                    class="w-[40px] h-[40px] rounded-full object-cover hover:opacity-80 transition-opacity"
                    src={comment.avatar}
                    alt={`Avatar de ${comment.displayname}`}
                />
            </a>
            
            <div class="w-full min-w-0">
                <div class="flex flex-wrap items-center gap-x-1.5">
                    <a 
                        href={`/profile/${comment.username}`} 
                        onClick={(e) => e.stopPropagation()}
                        class="text-white text-[1rem] font-bold hover:underline"
                    >
                        {comment.displayname}
                    </a>
                    
                    <span class="text-white/50 text-[.95rem]">
                        @{comment.username}
                    </span>
                    
                    <span class="text-white/50 text-[.95rem]">·</span>
                    
                    <span class="text-white/50 text-[.95rem]">
                        {formatTimeAgo(comment.date)}
                    </span>
                </div>

                {comment.comment_text?.trim() ? (
                    <div class="mt-1 text-[1.05rem] text-white/90 font-normal leading-relaxed whitespace-pre-wrap break-words">
                        {formatPostText(comment.comment_text)}
                    </div>
                ) : null}

                <MediaGallery media={media} onImageClick={onImageClick} />
            </div>
        </article>
    );
}

export  function PostDetail({ post, sid }: { post: PostData; sid: string | null }) {

    const localComments = useSignal<CommentData[]>(post.comments?.comment_list || []);
    const commentsCount = useSignal<number>(post.comments?.count || 0);

    const handleImageClick = (src: string) => {
        viewImage.set({ show: true, src: src });
    };

    // 2. Función mágica: Agrega el comentario arriba del todo sin recargar
    const handleCommentAdded = (newComment: CommentData) => {
        localComments.value = [newComment, ...localComments.value];
        commentsCount.value += 1;
    };

    const media = post.contents || [];

    return (
        <div class="text-white">
            <article class="p-4 sm:p-5 pb-0">
                <div class="flex items-center gap-3 mb-4">
                    <a href={`/profile/${post.username}`} class="shrink-0">
                        <img
                            class="w-[48px] h-[48px] rounded-full object-cover hover:opacity-80 transition-opacity"
                            src={post.avatar}
                            alt={`Avatar de ${post.displayname}`}
                        />
                    </a>
                    
                    <div class="flex flex-col justify-center">
                        <a href={`/profile/${post.username}`} class="text-[1.10rem] font-bold hover:underline leading-tight">
                            {post.displayname}
                        </a>
                        <a href={`/profile/${post.username}`} class="text-white/50 text-[1rem] leading-tight mt-0.5">
                            @{post.username}
                        </a>
                    </div>
                </div>

                {post.comment_text?.trim() ? (
                    <div class="text-[1.3rem] font-normal leading-relaxed whitespace-pre-wrap break-words">
                        {formatPostText(post.comment_text)}
                    </div>
                ) : null}

                <MediaGallery media={media} onImageClick={handleImageClick} />

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
                        {/* El número de comentarios ahora es reactivo! */}
                        {commentsCount.value > 0 && <span class="text-[1rem]">{commentsCount.value}</span>}
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

                {sid && (
                    <div class="mt-2 pb-4">
                        {/* 3. Le pasamos el trigger al textarea */}
                        <TextAreaComment 
                            sid={sid} 
                            postId={post.id} 
                            onCommentAdded={handleCommentAdded} 
                        />
                    </div>
                )}
            </article>

            {/* 4. Renderizamos usando el Signal en lugar del JSON estático */}
            {localComments.value.length > 0 && (
                <div class="border-t border-white/10 px-4 sm:px-5">
                    {localComments.value.map(comment => (
                        <CommentItem 
                            key={comment.id} 
                            comment={comment} 
                            onImageClick={handleImageClick} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}