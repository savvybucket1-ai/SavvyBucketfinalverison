import React from 'react';
import { Clapperboard, Play } from 'lucide-react';

const ReelsPage = () => {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white">
            <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                <Clapperboard size={48} className="text-slate-600" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">Reels Coming Soon</h1>
            <p className="text-slate-400 text-center max-w-xs mb-8">Experimenting with short-form video content to showcase products better.</p>
            <button className="px-6 py-3 bg-white text-black rounded-full font-bold text-sm tracking-wide hover:scale-105 transition-transform">
                Notify Me
            </button>
        </div>
    );
};

export default ReelsPage;
