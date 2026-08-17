import React from 'react';
import { Link } from 'react-router-dom';
import knomeLogo from '../../assets/knome_logo.png';
import mponlineLogo from '../../assets/mponline_logo.png';

export default function Footer() {
    return (
        <footer className="relative w-full mt-0 bg-[#070c1b] text-slate-100 font-sans shadow-2xl border-t border-slate-800">
            
            {/* Top Gradient Accent Line */}
            <div className="w-full h-0.5 bg-gradient-to-r from-indigo-500 via-pink-500 to-purple-600"></div>

            <div className="max-w-screen-2xl mx-auto px-6 md:px-12 py-6 md:py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12 items-center">
                    
                    {/* COLUMN 1: About Knome Platform */}
                    <div className="flex flex-col gap-2.5 min-w-0 break-words">
                        <div className="flex items-center gap-3">
                            <Link to="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.01] shrink-0">
                                <img 
                                    src={knomeLogo} 
                                    alt="Knome Logo" 
                                    className="h-8 object-contain bg-white rounded-lg p-0.5 shadow-sm" 
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase tracking-widest" style={{
                                        background: 'linear-gradient(135deg, #3b7fff, #00d4ff)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}>
                                        Knome Portal
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 leading-none">
                                        Connecting People & Knowledge
                                    </span>
                                </div>
                            </Link>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-300 font-normal max-w-xl">
                            Enterprise Knowledge Management Platform for MPOnline Limited — connecting teams, sharing technical articles, video tutorials, audio podcasts, and career opportunities.
                        </p>
                        
                        {/* Social Links */}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <a href="https://facebook.com/mponlinelimited" target="_blank" rel="noreferrer" title="Facebook" className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 flex items-center justify-center text-white transition-all shadow-sm group">
                                <span className="font-bold text-xs group-hover:scale-110 transition-transform">f</span>
                            </a>
                            <a href="https://instagram.com/mponlinelimited" target="_blank" rel="noreferrer" title="Instagram" className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 flex items-center justify-center text-white transition-all shadow-sm group">
                                <span className="material-symbols-outlined text-[15px] group-hover:scale-110 transition-transform">photo_camera</span>
                            </a>
                            <a href="https://youtube.com/@mponlinelimited" target="_blank" rel="noreferrer" title="YouTube" className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 flex items-center justify-center text-white transition-all shadow-sm group">
                                <span className="material-symbols-outlined text-[15px] group-hover:scale-110 transition-transform">smart_display</span>
                            </a>
                            <a href="https://linkedin.com/company/mponlinelimited" target="_blank" rel="noreferrer" title="LinkedIn" className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 flex items-center justify-center text-white transition-all shadow-sm group">
                                <span className="font-bold text-[10px] group-hover:scale-110 transition-transform">in</span>
                            </a>
                            <a href="https://x.com/mponlinelimited" target="_blank" rel="noreferrer" title="X (Twitter)" className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 flex items-center justify-center text-white transition-all shadow-sm group">
                                <span className="font-bold text-[10px] group-hover:scale-110 transition-transform">𝕏</span>
                            </a>
                        </div>
                    </div>

                    {/* COLUMN 2: Enterprise Support */}
                    <div className="flex flex-col gap-2.5 min-w-0 break-words md:items-end">
                        <div className="flex items-center gap-2 text-pink-400 font-extrabold text-xs tracking-wide">
                            <span className="material-symbols-outlined text-[18px]">headset_mic</span>
                            <span>Enterprise Support</span>
                        </div>

                        <div className="flex flex-wrap md:justify-end gap-x-5 gap-y-1.5 text-xs text-slate-300">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">Customer Care:</span>
                                <a href="tel:+07556720200" className="text-slate-100 hover:text-pink-400 font-semibold transition-colors">
                                    +0755-6720200
                                </a>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">HR Support:</span>
                                <a href="tel:+917049923881" className="text-slate-100 hover:text-pink-400 font-semibold transition-colors">
                                    +91-7049923881
                                </a>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">Email:</span>
                                <a href="mailto:knome-support@mponline.gov.in" className="text-slate-100 hover:text-pink-400 font-semibold transition-colors">
                                    knome-support@mponline.gov.in
                                </a>
                            </div>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-pink-400 shrink-0">location_on</span>
                            <span>3rd Floor State IT Park, Abbas Nagar near RGPV Gandhi Nagar, Bhopal 462033</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="w-full bg-[#040814] border-t border-slate-800/80 py-3.5 px-6 relative">
                <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-center sm:text-left">
                        <img 
                            src={knomeLogo} 
                            alt="Knome Logo" 
                            className="h-6 md:h-7 object-contain bg-white rounded-lg p-1 shadow-sm" 
                        />
                        <span className="text-slate-400 text-xs font-medium">Knome v1.0 — Enterprise Knowledge Platform | Maintained by</span>
                        <img 
                            src={mponlineLogo} 
                            alt="MPOnline Limited" 
                            className="h-8 md:h-9 object-contain bg-white rounded-lg px-2.5 py-1 shadow-md hover:scale-105 transition-transform" 
                        />
                    </div>
                </div>
            </div>
        </footer>
    );
}




