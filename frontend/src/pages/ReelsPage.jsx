import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, ShoppingBag, ArrowLeft, MoreVertical, Volume2, VolumeX } from 'lucide-react';
import API_BASE_URL from '../config';

const ReelsPage = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);
    const [muted, setMuted] = useState(true); // Start muted for autoplay policies
    const navigate = useNavigate();

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/influencer-videos/list`);
                setVideos(res.data);
            } catch (err) {
                console.error("Error fetching reels:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchVideos();
    }, []);

    // Intersection Observer to handle Play/Pause on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const video = entry.target;
                    if (entry.isIntersecting) {
                        video.play().catch(e => console.log("Autoplay prevented", e));
                    } else {
                        video.pause();
                        video.currentTime = 0; // Reset when scrolling away
                    }
                });
            },
            { threshold: 0.6 } // Play when 60% visible
        );

        const videoElements = document.querySelectorAll('video');
        videoElements.forEach((el) => observer.observe(el));

        return () => {
            videoElements.forEach((el) => observer.unobserve(el));
        };
    }, [videos]);

    const toggleMute = () => {
        setMuted(!muted);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
                <h2 className="text-xl font-bold mb-2">No Reels Yet</h2>
                <p className="text-gray-400 text-center">Check back later for trending product videos!</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="h-[calc(100vh-60px)] md:h-[calc(100vh-80px)] w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        >
            {videos.map((item) => (
                <div key={item._id} className="w-full h-full snap-start relative flex items-center justify-center bg-gray-900 border-b border-gray-800/50">

                    {/* Video Player */}
                    <video
                        src={item.videoUrl}
                        className="w-full h-full object-cover md:max-w-md aspect-[9/16]"
                        loop
                        playsInline
                        muted={muted}
                        onClick={toggleMute}
                    />

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none md:max-w-md md:mx-auto"></div>

                    {/* Top Controls */}
                    <div className="absolute top-4 w-full md:max-w-md px-4 flex justify-between items-center z-20">
                        <ArrowLeft className="text-white drop-shadow-md cursor-pointer" onClick={() => navigate(-1)} />
                        <h2 className="text-white font-bold drop-shadow-md text-sm uppercase tracking-wide">Reels</h2>

                        <button onClick={toggleMute} className="p-2 -mr-2 text-white/90 hover:text-white transition">
                            {muted ? <VolumeX size={20} className="drop-shadow-md" /> : <Volume2 size={20} className="drop-shadow-md" />}
                        </button>
                    </div>

                    {/* Content & Actions */}
                    <div className="absolute bottom-20 md:bottom-10 left-0 right-0 px-4 md:max-w-md md:mx-auto z-20 flex flex-col gap-4">

                        {/* Product Tag / Shop Button */}
                        {item.productId && (
                            <div
                                onClick={() => navigate(`/product/${item.productId._id}`)}
                                className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white/20 transition-all"
                            >
                                <img
                                    src={item.productId.imageUrls?.[0] || '/placeholder.png'}
                                    alt="Product"
                                    className="w-10 h-10 rounded-lg object-cover bg-white"
                                />
                                <div className="flex-1">
                                    <h3 className="text-white text-xs font-bold line-clamp-1">{item.productId.title}</h3>
                                    <p className="text-gray-200 text-[10px] items-center flex gap-1">
                                        ₹{item.productId.sellerPrice || item.productId.tierPricing?.[0]?.price}
                                        <span className="bg-primary text-white px-1.5 py-0.5 rounded text-[8px] font-bold">SHOP NOW</span>
                                    </p>
                                </div>
                                <div className="bg-primary p-2 rounded-full text-white">
                                    <ShoppingBag size={16} />
                                </div>
                            </div>
                        )}


                    </div>



                </div>
            ))}
        </div>
    );
};

export default ReelsPage;
