import { Star } from 'lucide-react';

export default function Rating({ value = 0, reviews, size = 14 }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={size}
            className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500 font-semibold">
        {value}{reviews !== undefined ? ` (${reviews})` : ''}
      </span>
    </div>
  );
}