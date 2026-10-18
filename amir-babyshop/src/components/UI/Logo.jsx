import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link to="/" className="flex items-center group shrink-0">
      <img
        src="/logo3.png"
        alt="AMIR BabyShop"
        className="h-11 sm:h-14 w-auto max-w-[140px] sm:max-w-[200px] object-contain group-hover:scale-105 transition-transform"
      />
    </Link>
  );
}