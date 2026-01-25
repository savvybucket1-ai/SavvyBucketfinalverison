import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-[#1e293b] text-slate-300 pt-20 pb-10 border-t border-slate-800">
            <div className="max-w-[1440px] mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand Section */}
                    <div className="space-y-6">
                        <Link to="/" className="flex items-center">
                            <span className="text-3xl font-black italic tracking-tighter text-white">
                                Savvy<span className="text-primary">Bucket</span>
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed opacity-70">
                            The ultimate destination for B2B global sourcing. Connecting quality manufacturers with reliable distributors since 2024.
                        </p>
                        <div className="flex gap-4">
                            {[
                                { Icon: Facebook, link: '#' },
                                { Icon: Twitter, link: '#' },
                                { Icon: Instagram, link: 'https://www.instagram.com/savvy_advertise?igsh=MTdpcmdlN2ZwazhmZQ==' },
                                { Icon: Youtube, link: '#' }
                            ].map(({ Icon, link }, idx) => (
                                <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-all">
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-black uppercase text-xs tracking-widest mb-8">Quick Links</h4>
                        <ul className="space-y-4">
                            {['Just Arrived', 'Bulk Inquiries'].map((item, idx) => (
                                <li key={idx}>
                                    <a href="#" className="text-sm font-bold hover:text-primary transition-colors flex items-center group">
                                        <ArrowRight size={14} className="mr-2 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-white font-black uppercase text-xs tracking-widest mb-8">Support & Legal</h4>
                        <ul className="space-y-4">
                            {[
                                { name: 'Shipping Policy', path: '/shipping-policy' },
                                { name: 'Returns & Refunds', path: '/returns-refunds' },
                                { name: 'Privacy Policy', path: '/privacy-policy' },
                                { name: 'Terms of Service', path: '/terms-conditions' },
                                { name: 'Help Center', path: '#' }
                            ].map((item, idx) => (
                                <li key={idx}>
                                    <Link to={item.path} className="text-sm font-bold hover:text-primary transition-colors">{item.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-white font-black uppercase text-xs tracking-widest mb-8">Contact Us</h4>
                        <ul className="space-y-6">
                            <li className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-primary shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <span className="block text-[10px] uppercase font-black tracking-widest opacity-50 mb-1">HQ Address</span>
                                    <p className="text-sm font-bold">FCA 90 , Uncha Gaon Rd, Yadav Colony, Ballabgarh , Faridabad , Haryana</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-primary shrink-0">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <span className="block text-[10px] uppercase font-black tracking-widest opacity-50 mb-1">Email Support</span>
                                    <p className="text-sm font-bold">savvybucket1@gmail.com</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-primary shrink-0">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <span className="block text-[10px] uppercase font-black tracking-widest opacity-50 mb-1">Hotline</span>
                                    <p className="text-sm font-bold">+91 9718924853</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-xs font-bold opacity-40">© 2024 SavvyBucket B2B Marketplace. All rights reserved.</p>
                    <div className="flex gap-4">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Visa_2021.svg/1200px-Visa_2021.svg.png" className="h-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition h-4" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mastercard_2019_logo.svg/1200px-Mastercard_2019_logo.svg.png" className="h-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition h-4" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/1200px-PayPal.svg.png" className="h-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition h-4" />
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
