import React from 'react';
import { LayoutDashboard, Package, ShoppingCart, Users, BadgePercent, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ menuItems }) => {
    const location = useLocation();

    return (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
            <div className="p-6 border-b border-slate-100 flex items-center space-x-2">
                <div className="bg-primary p-1.5 rounded-lg">
                    <LayoutDashboard className="text-white" size={20} />
                </div>
                <span className="font-black text-slate-800 text-lg tracking-tighter italic">B2B Marketplace</span>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item, idx) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={idx}
                            to={item.path}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive
                                ? 'bg-blue-50 text-primary shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                        >
                            <item.icon size={20} className={isActive ? 'text-primary' : 'text-slate-400'} />
                            <span className="text-sm uppercase tracking-wide">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <button
                    onClick={() => { localStorage.removeItem('user'); window.location.href = '/'; }}
                    className="flex items-center space-x-3 px-4 py-3 w-full rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all font-black uppercase text-[10px]"
                >
                    <LogOut size={20} />
                    <span className="tracking-widest">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
