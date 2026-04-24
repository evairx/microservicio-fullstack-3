import { useStore } from "@nanostores/preact";
import { viewImage } from "../stores/view-image";
import { IconX } from "@tabler/icons-preact";

export function ViewImage() {
    const { show, src } = useStore(viewImage);

    if (!show) return null;

    return (
        <div 
            class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer backdrop-blur-sm"
            onClick={() => viewImage.set({ show: false, src: '' })}
        >
            <style>
                {`
                    @keyframes popup {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}
            </style>
            
            <button 
                class="absolute top-10 right-10 text-white hover:opacity-70 transition-opacity cursor-pointer z-50"
                onClick={() => viewImage.set({ show: false, src: '' })}
            >
                <IconX class="w-[32px] h-[32px]" />
            </button>

            <div 
                class="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center cursor-default"
                style={{ animation: 'popup 0.25s ease-out forwards' }}
                onClick={(e) => e.stopPropagation()}
            >
                <img 
                    src={src} 
                    alt="Imagen ampliada" 
                    class="max-w-full max-h-[95vh] rounded-xl shadow-2xl object-contain border border-white/10" 
                />
            </div>
        </div>
    );
}