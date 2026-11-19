import { useState } from 'react';
import { Utensils } from 'lucide-react';

interface DishImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function DishImage({ src, alt, className = '' }: DishImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EAF1ED] text-[#09533A] ${className}`}
        role="img"
        aria-label={alt}
      >
        <Utensils className="h-6 w-6 opacity-70" />
        <span className="mt-1 px-2 text-center text-[11px] font-medium leading-tight opacity-80 line-clamp-1">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
      loading="lazy"
    />
  );
}
