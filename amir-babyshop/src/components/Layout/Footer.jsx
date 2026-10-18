import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Heart } from 'lucide-react';
import Logo from '../UI/Logo';
import { useAuth } from '../../context/AuthContext';

export default function Footer() {
  const { user, isStaff, isOwner } = useAuth();

  return (
    <footer className="mt-12 bg-amir-dark text-white/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">

        {/* Brand row */}
        <div className="flex items-center sm:items-start gap-3 mb-5 sm:mb-10 sm:flex-col">
          <div className="shrink-0">
            <Logo compact />
          </div>
          <p className="text-xs sm:text-sm sm:max-w-sm leading-snug sm:leading-relaxed">
            Quality baby clothes, toys and essentials — curated with love.
          </p>
        </div>

        {/* Link columns — 3 cols mobile (no Contact), 4 cols desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 sm:gap-x-4 mb-5 sm:mb-8">
          <div>
            <h4 className="font-extrabold text-white text-[11px] sm:text-sm uppercase tracking-wider mb-2 sm:mb-3">
              Shop
            </h4>
            <ul className="space-y-1.5 sm:space-y-2.5 text-xs sm:text-sm">
              <li><Link to="/shop" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link to="/shop?cat=clothing" className="hover:text-white transition-colors">Clothing</Link></li>
              <li><Link to="/shop?cat=toys" className="hover:text-white transition-colors">Toys</Link></li>
              <li><Link to="/shop?cat=feeding" className="hover:text-white transition-colors">Feeding</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-white text-[11px] sm:text-sm uppercase tracking-wider mb-2 sm:mb-3">
              More
            </h4>
            <ul className="space-y-1.5 sm:space-y-2.5 text-xs sm:text-sm">
              <li><Link to="/shop?cat=gear" className="hover:text-white transition-colors">Gear</Link></li>
              <li><Link to="/shop?cat=bath" className="hover:text-white transition-colors">Bath</Link></li>
              <li><Link to="/cart" className="hover:text-white transition-colors">My Cart</Link></li>
              <li><Link to="/track" className="hover:text-white transition-colors">Track Order</Link></li>
              <li><Link to="/checkout" className="hover:text-white transition-colors">Checkout</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-white text-[11px] sm:text-sm uppercase tracking-wider mb-2 sm:mb-3">
              Account
            </h4>
            <ul className="space-y-1.5 sm:space-y-2.5 text-xs sm:text-sm">
              {user ? (
                <>
                  <li className="text-white font-bold truncate">{user.name}</li>
                  <li className="text-[10px] sm:text-xs text-white/50 truncate">{user.email}</li>
                  {isStaff && (
                    <li><Link to="/inventory" className="hover:text-white transition-colors">Inventory</Link></li>
                  )}
                  {isOwner && (
                    <li><Link to="/admin" className="hover:text-white transition-colors">Admin panel</Link></li>
                  )}
                </>
              ) : (
                <>
                  <li><Link to="/login" className="hover:text-white transition-colors">Sign in</Link></li>
                  <li><Link to="/shop" className="hover:text-white transition-colors">Continue as guest</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Contact — desktop only */}
          <div className="hidden sm:block">
            <h4 className="font-extrabold text-white text-[11px] sm:text-sm uppercase tracking-wider mb-2 sm:mb-3">
              Contact
            </h4>
            <ul className="space-y-1.5 sm:space-y-2.5 text-xs sm:text-sm">
              <li className="flex items-center gap-2">
                <Mail size={12} className="shrink-0 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">hello@amirbabyshop.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={12} className="shrink-0 sm:w-3.5 sm:h-3.5" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={12} className="shrink-0 sm:w-3.5 sm:h-3.5" />
                <span>123 Baby Lane</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        {/* <div className="border-t border-white/10 pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/50">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} AMIR BabyShop
          </p>
          <p className="flex items-center gap-1">
            Made with <Heart size={10} className="sm:w-3 sm:h-3 fill-rose-400 text-rose-400" /> for little ones
          </p>
        </div> */}
      </div>
    </footer>
  );
}