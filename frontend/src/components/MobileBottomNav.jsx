import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, User, Clapperboard } from 'lucide-react';

const MobileBottomNav = () => {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2 z-[100] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center max-w-sm mx-auto">
                <NavItem to="/" icon={Home} label="Home" />
                <NavItem to="/category/All Categories" icon={LayoutGrid} label="Categories" />
                <NavItem to="/profile" icon={User} label="Account" />
                <NavItem to="/reels" icon={Clapperboard} label="Reels" />
            </div>
        </div>
    );
};

const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex flex-col items-center justify-center p-1 rounded-2xl transition-all duration-300 w-16 group relative ${isActive
                ? 'text-slate-900'
                : 'text-slate-400 hover:text-slate-600'
            }`
        }
    >
        {({ isActive }) => (
            <>
                <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-slate-100 mb-1 transform -translate-y-1' : 'mb-0.5'}`}>
                    <Icon
                        size={24}
                        strokeWidth={isActive ? 2.5 : 2}
                        className={`transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                    />
                </div>
                <span className={`text-[10px] font-black tracking-wide transition-all duration-300 ${isActive ? 'transform -translate-y-1' : ''}`}>{label}</span>

                {/* Active Indicator Dot */}
                {isActive && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-slate-900 mx-auto"></span>
                )}
            </>
        )}
    </NavLink>
);

export default MobileBottomNav;
