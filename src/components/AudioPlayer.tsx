import { useRef, type ChangeEvent, useEffect } from 'react';

interface AudioPlayerProps {
  onAudioSelected: (file: File) => void;
  onAudioElement: (element: HTMLAudioElement) => void;
  src: string | null;
}

export function AudioPlayer({ onAudioSelected, onAudioElement, src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      onAudioElement(audioRef.current);
    }
  }, [onAudioElement]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAudioSelected(file);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 flex items-center justify-between gap-4 z-50">
       <div className="flex items-center gap-4">
         <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Upload Song
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />
         </label>
         {src && <span className="text-sm text-slate-300">Now Playing</span>}
       </div>
       
       <audio 
         ref={audioRef}
         controls 
         src={src || undefined} 
         className="w-full max-w-2xl accent-blue-500"
         crossOrigin="anonymous"
       />
    </div>
  );
}
