import React from 'react';
import { Link } from 'react-router-dom';
import knomeLogo from '../../assets/knome_logo.png';
import mponlineLogo from '../../assets/mponline_logo.png';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative w-full mt-auto bg-white/75 dark:bg-[#070a13]/85 backdrop-blur-2xl text-slate-700 dark:text-slate-300 font-sans border-t border-slate-200/80 dark:border-slate-800/80 shadow-2xl transition-colors duration-300 z-10">
            
            {/* Top Luminous Ambient Accent Line */}
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 via-pink-500 to-cyan-400 to-transparent opacity-85"></div>

            {/* Ambient subtle backdrop glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-25 dark:opacity-15">
                <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-48 rounded-full blur-[100px] bg-indigo-500/20"></div>
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-48 rounded-full blur-[100px] bg-cyan-500/20"></div>
            </div>

            <div className="max-w-screen-2xl mx-auto px-6 md:px-12 py-8 md:py-10 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
                    
                    {/* COLUMN 1: Brand & Overview (7 cols) */}
                    <div className="md:col-span-7 flex flex-col gap-3.5 min-w-0">
                        <div className="flex items-center gap-3">
                            <Link to="/" className="flex items-center gap-3 group transition-transform hover:scale-[1.01] shrink-0">
                                <div className="p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm group-hover:shadow-indigo-500/20 transition-all">
                                    <img 
                                        src={knomeLogo} 
                                        alt="Knome Logo" 
                                        className="h-9 w-auto object-contain rounded-lg" 
                                    />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <span className="text-[15px] font-black tracking-tight leading-none bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-xs">
                                        KNOME PORTAL
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 leading-none tracking-tight">
                                        Connecting People & Knowledge • MPOnline Limited
                                    </span>
                                </div>
                            </Link>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-normal max-w-xl">
                            The enterprise collaboration, technical publishing, and continuous learning ecosystem for MPOnline Limited. Empowering internal teams with unified social feeds, rich WYSIWYG articles, media playlists, audio podcasts, and career opportunities.
                        </p>

                        {/* Social Links */}
                        <div className="flex items-center gap-2.5 mt-1">
                            {[
                                { href: 'https://facebook.com/mponlinelimited', title: 'Facebook', icon: 'f', isText: true, hover: 'hover:bg-blue-600 hover:border-blue-500' },
                                { href: 'https://instagram.com/mponlinelimited', title: 'Instagram', icon: 'photo_camera', isIcon: true, hover: 'hover:bg-pink-600 hover:border-pink-500' },
                                { href: 'https://youtube.com/@mponlinelimited', title: 'YouTube', icon: 'smart_display', isIcon: true, hover: 'hover:bg-red-600 hover:border-red-500' },
                                { href: 'https://linkedin.com/company/mponlinelimited', title: 'LinkedIn', icon: 'in', isText: true, hover: 'hover:bg-sky-600 hover:border-sky-500' },
                                { href: 'https://x.com/mponlinelimited', title: 'X (Twitter)', icon: '𝕏', isText: true, hover: 'hover:bg-slate-900 hover:border-slate-700' },
                            ].map((social, idx) => (
                                <a
                                    key={idx}
                                    href={social.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={social.title}
                                    className={`w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 ${social.hover} hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all duration-200 shadow-xs hover:scale-110 active:scale-95 group`}
                                >
                                    {social.isIcon ? (
                                        <span className="material-symbols-outlined text-[15px] group-hover:scale-110 transition-transform">{social.icon}</span>
                                    ) : (
                                        <span className="font-extrabold text-[11px] group-hover:scale-110 transition-transform">{social.icon}</span>
                                    )}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* COLUMN 2: Enterprise Support & Headquarters (5 cols) */}
                    <div className="md:col-span-5 flex flex-col gap-3 min-w-0 md:items-end">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-extrabold text-xs tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                            <span className="material-symbols-outlined text-[16px]">headset_mic</span>
                            <span>Enterprise Help Desk</span>
                        </div>

                        <div className="flex flex-col md:items-end gap-1.5 text-xs">
                            <div className="flex items-center gap-2 flex-wrap md:justify-end">
                                <span className="text-slate-400 dark:text-slate-500 font-medium">Customer Care:</span>
                                <a href="tel:+07556720200" className="text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-400 font-bold transition-colors">
                                    +0755-6720200
                                </a>
                                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                                <span className="text-slate-400 dark:text-slate-500 font-medium">HR Support:</span>
                                <a href="tel:+917049923881" className="text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-400 font-bold transition-colors">
                                    +91-7049923881
                                </a>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 dark:text-slate-500 font-medium">Official Desk:</span>
                                <a href="mailto:knome-support@mponline.gov.in" className="text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-400 font-bold transition-colors">
                                    knome-support@mponline.gov.in
                                </a>
                            </div>

                            <div className="text-[11.5px] text-slate-500 dark:text-slate-400 flex items-start md:items-center gap-1.5 mt-1 md:text-right">
                                <span className="material-symbols-outlined text-[15px] text-indigo-500 dark:text-cyan-400 shrink-0 mt-0.5 md:mt-0">location_on</span>
                                <span>3rd Floor State IT Park, Abbas Nagar near RGPV Gandhi Nagar, Bhopal 462033</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar with Powered By */}
            <div className="w-full bg-slate-50/90 dark:bg-[#040711]/95 border-t border-slate-200/80 dark:border-slate-800/80 py-4 px-6 relative z-10">
                <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium">
                        © {currentYear} MPOnline Limited. All rights reserved. • Enterprise Knowledge & Collaboration
                    </p>
                    <div className="flex items-center gap-3">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Powered by</span>
                        <div className="p-1 bg-white rounded-lg shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
                            <img 
                                src={mponlineLogo} 
                                alt="MPOnline Limited" 
                                className="h-7 sm:h-8 w-auto object-contain" 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
