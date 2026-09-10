import React from 'react';
import { Link } from 'react-router-dom';
import knomeLogo from '../../assets/knome_logo.png';
import mponlineLogo from '../../assets/mponline_logo.png';

export default function Footer() {
    return (
        <footer className="relative w-full mt-0 bg-gradient-to-b from-[#080d1e] via-[#060a17] to-[#03060f] text-slate-100 font-sans shadow-2xl border-t border-slate-800/80 overflow-hidden">
            
            {/* Luminous Multi-stop Ambient Glow Top Border */}
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 via-purple-500 via-pink-500 via-cyan-400 to-transparent shadow-[0_0_20px_rgba(99,102,241,0.6)]"></div>

            {/* Subtle Ambient Background Gradients & Mesh Dots */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                <div className="absolute -top-10 left-1/4 w-96 h-96 rounded-full blur-[120px] bg-indigo-600/20"></div>
                <div className="absolute -top-10 right-1/4 w-96 h-96 rounded-full blur-[120px] bg-cyan-500/15"></div>
                <div className="absolute inset-0 tech-dots-pattern opacity-20"></div>
            </div>

            <div className="relative z-10 max-w-screen-2xl mx-auto px-6 md:px-12 py-8 md:py-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 items-center">
                    
                    {/* COLUMN 1: About Knome Platform */}
                    <div className="flex flex-col gap-3 min-w-0 break-words">
                        <div className="flex items-center gap-3">
                            <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-[1.02] shrink-0 group">
                                <div className="p-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md group-hover:shadow-indigo-500/30 transition-all flex items-center justify-center">
                                    <img 
                                        src={knomeLogo} 
                                        alt="Knome Logo" 
                                        className="h-9 object-contain bg-white rounded-lg p-1 shadow-sm" 
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black uppercase tracking-wider bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-xs">
                                        Knome Portal
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 leading-tight tracking-tight">
                                        Connecting People & Knowledge
                                    </span>
                                </div>
                            </Link>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-300/90 font-medium max-w-xl">
                            Enterprise Knowledge Management Platform for MPOnline Limited — connecting teams, sharing technical articles, video tutorials, audio podcasts, and career opportunities.
                        </p>
                        
                        {/* Social Links with Vibrant Hover Glow */}
                        <div className="flex flex-wrap items-center gap-2.5 mt-1">
                            {[
                                { href: 'https://facebook.com/mponlinelimited', title: 'Facebook', icon: 'f', isText: true },
                                { href: 'https://instagram.com/mponlinelimited', title: 'Instagram', icon: 'photo_camera', isMaterial: true },
                                { href: 'https://youtube.com/@mponlinelimited', title: 'YouTube', icon: 'smart_display', isMaterial: true },
                                { href: 'https://linkedin.com/company/mponlinelimited', title: 'LinkedIn', icon: 'in', isText: true },
                                { href: 'https://x.com/mponlinelimited', title: 'X (Twitter)', icon: '𝕏', isText: true },
                            ].map((s) => (
                                <a
                                    key={s.title}
                                    href={s.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={s.title}
                                    className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/80 hover:bg-gradient-to-tr hover:from-indigo-600 hover:to-pink-500 hover:border-transparent hover:shadow-[0_0_14px_rgba(99,102,241,0.5)] flex items-center justify-center text-white transition-all shadow-sm group hover:-translate-y-0.5"
                                >
                                    {s.isMaterial ? (
                                        <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">{s.icon}</span>
                                    ) : (
                                        <span className={`font-bold ${s.icon === 'in' || s.icon === '𝕏' ? 'text-[11px]' : 'text-xs'} group-hover:scale-110 transition-transform`}>{s.icon}</span>
                                    )}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* COLUMN 2: Enterprise Support Glass Card */}
                    <div className="flex flex-col gap-3 min-w-0 break-words md:items-end">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/15 to-indigo-500/10 border border-sky-500/25 text-sky-400 font-black text-xs tracking-wide">
                            <span className="material-symbols-outlined text-[17px] animate-pulse">headset_mic</span>
                            <span>Enterprise Support</span>
                        </div>

                        <div className="flex flex-wrap md:justify-end gap-2 text-xs">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-sky-500/30 transition-colors">
                                <span className="text-slate-400 font-medium">Customer Care:</span>
                                <a href="tel:+07556720200" className="text-slate-100 hover:text-sky-300 font-bold transition-colors">
                                    +0755-6720200
                                </a>
                            </div>

                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-sky-500/30 transition-colors">
                                <span className="text-slate-400 font-medium">HR Support:</span>
                                <a href="tel:+917049923881" className="text-slate-100 hover:text-sky-300 font-bold transition-colors">
                                    +91-7049923881
                                </a>
                            </div>

                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-sky-500/30 transition-colors">
                                <span className="material-symbols-outlined text-[15px] text-sky-400">mail</span>
                                <a href="mailto:knome-support@mponline.gov.in" className="text-slate-100 hover:text-sky-300 font-bold transition-colors">
                                    knome-support@mponline.gov.in
                                </a>
                            </div>
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 md:text-right mt-0.5">
                            <span className="material-symbols-outlined text-[15px] text-sky-400 shrink-0">location_on</span>
                            <span>3rd Floor State IT Park, Abbas Nagar near RGPV Gandhi Nagar, Bhopal 462033</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar with subtle gradient border */}
            <div className="w-full bg-[#03060f]/90 border-t border-white/[0.06] py-4 px-6 relative z-10">
                <div className="max-w-screen-2xl mx-auto flex items-center justify-center">
                    <div className="flex flex-wrap items-center justify-center gap-3.5 text-center">
                        <span className="text-slate-400 text-sm font-semibold tracking-wide">Powered by</span>
                        <div className="p-0.5 rounded-xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 shadow-md">
                            <img 
                                src={mponlineLogo} 
                                alt="MPOnline Limited" 
                                className="h-10 md:h-12 object-contain bg-white rounded-lg px-4 py-1 shadow-lg shadow-black/40 hover:scale-105 transition-all duration-300" 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}




