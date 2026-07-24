import React from 'react';
import { Link } from 'react-router-dom';
import knomeLogo from '../../assets/knome_logo.png';
import mponlineLogo from '../../assets/mponline_logo.png';

export default function Footer() {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="relative w-full mt-20 bg-[#070c1b] text-slate-100 font-sans shadow-2xl border-t border-slate-800">
            
            {/* Top Gradient Accent Line */}
            <div className="w-full h-1 bg-gradient-to-r from-indigo-500 via-pink-500 to-purple-600"></div>

            <div className="max-w-screen-2xl mx-auto px-6 md:px-12 py-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
                    
                    {/* COLUMN 1: About Knome Platform */}
                    <div className="flex flex-col gap-4 min-w-0 break-words">
                        <div className="flex flex-col gap-2">
                            <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-[1.01] shrink-0">
                                <img 
                                    src={knomeLogo} 
                                    alt="Knome Logo" 
                                    className="h-12 object-contain bg-white rounded-xl p-1 shadow-md" 
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
                                    <span className="text-[10px] font-extrabold text-slate-400 mt-0.5 leading-none">
                                        Connecting People & Knowledge
                                    </span>
                                </div>
                            </Link>
                            <div className="w-12 h-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full mt-2"></div>
                        </div>

                        <p className="text-sm leading-relaxed text-slate-300 font-normal">
                            Knome is the Enterprise Knowledge Management Platform for MPOnline Limited — connecting employee teams, sharing technical articles, video tutorials, audio podcasts, and internal career opportunities.
                        </p>
                        
                        {/* Social Links */}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            <a href="https://facebook.com/mponlinelimited" target="_blank" rel="noreferrer" title="Facebook" className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 flex items-center justify-center text-white transition-all shadow-md group">
                                <span className="font-bold text-sm group-hover:scale-110 transition-transform">f</span>
                            </a>
                            <a href="https://instagram.com/mponlinelimited" target="_blank" rel="noreferrer" title="Instagram" className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 flex items-center justify-center text-white transition-all shadow-md group">
                                <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">photo_camera</span>
                            </a>
                            <a href="https://youtube.com/@mponlinelimited" target="_blank" rel="noreferrer" title="YouTube" className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 flex items-center justify-center text-white transition-all shadow-md group">
                                <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">smart_display</span>
                            </a>
                            <a href="https://linkedin.com/company/mponlinelimited" target="_blank" rel="noreferrer" title="LinkedIn" className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 flex items-center justify-center text-white transition-all shadow-md group">
                                <span className="font-bold text-xs group-hover:scale-110 transition-transform">in</span>
                            </a>
                            <a href="https://x.com/mponlinelimited" target="_blank" rel="noreferrer" title="X (Twitter)" className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700 hover:bg-indigo-600 hover:border-indigo-500 flex items-center justify-center text-white transition-all shadow-md group">
                                <span className="font-bold text-xs group-hover:scale-110 transition-transform">𝕏</span>
                            </a>
                        </div>
                    </div>

                    {/* COLUMN 2: Knowledge Modules */}
                    <div className="flex flex-col gap-4 min-w-0 break-words">
                        <div>
                            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-extrabold text-sm tracking-wide shadow-sm">
                                <span className="material-symbols-outlined text-[20px] text-indigo-400">school</span>
                                <span>Knowledge Modules</span>
                            </div>
                            <div className="w-12 h-1 bg-indigo-500 rounded-full mt-2.5"></div>
                        </div>

                        <ul className="flex flex-col gap-2">
                            <li>
                                <Link to="/" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-indigo-600/20 border border-slate-700/50 hover:border-indigo-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">dashboard</span>
                                    </span>
                                    <span>Dashboard Feed</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/articles" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-indigo-600/20 border border-slate-700/50 hover:border-indigo-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">article</span>
                                    </span>
                                    <span>Articles & Technical Blogs</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/videos" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-indigo-600/20 border border-slate-700/50 hover:border-indigo-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">play_circle</span>
                                    </span>
                                    <span>Video Learning Library</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/podcasts" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-indigo-600/20 border border-slate-700/50 hover:border-indigo-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">podcasts</span>
                                    </span>
                                    <span>Audio Podcasts & Talks</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/community" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-indigo-600/20 border border-slate-700/50 hover:border-indigo-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">groups</span>
                                    </span>
                                    <span>Communities & Hubs</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/jobs" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-indigo-600/20 border border-slate-700/50 hover:border-indigo-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">work</span>
                                    </span>
                                    <span>Internal Job Postings (IJP)</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* COLUMN 3: Employee Hub */}
                    <div className="flex flex-col gap-4 min-w-0 break-words">
                        <div>
                            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 font-extrabold text-sm tracking-wide shadow-sm">
                                <span className="material-symbols-outlined text-[20px] text-purple-400">badge</span>
                                <span>Employee Hub</span>
                            </div>
                            <div className="w-12 h-1 bg-purple-500 rounded-full mt-2.5"></div>
                        </div>

                        <ul className="flex flex-col gap-2">
                            <li>
                                <Link to="/suggested-people" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-purple-600/20 border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                                    </span>
                                    <span>People & Network</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/karma-history" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-purple-600/20 border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">military_tech</span>
                                    </span>
                                    <span>Karma Points & Badges</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/saved-content" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-purple-600/20 border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">bookmark</span>
                                    </span>
                                    <span>Saved Content & Bookmarks</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/profile" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-purple-600/20 border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">account_circle</span>
                                    </span>
                                    <span>My Profile & Activity</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/hr-analytics" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-purple-600/20 border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">analytics</span>
                                    </span>
                                    <span>HR & Engagement Analytics</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/admin-console" className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-purple-600/20 border border-slate-700/50 hover:border-purple-500/50 transition-all flex items-center gap-3 text-slate-100 hover:text-white font-semibold text-sm group">
                                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                                        <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                                    </span>
                                    <span>Admin & Audit Governance</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* COLUMN 4: Enterprise Support */}
                    <div className="flex flex-col gap-4 min-w-0 break-words">
                        <div>
                            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400 font-extrabold text-sm tracking-wide shadow-sm">
                                <span className="material-symbols-outlined text-[20px] text-pink-400">headset_mic</span>
                                <span>Enterprise Support</span>
                            </div>
                            <div className="w-12 h-1 bg-pink-500 rounded-full mt-2.5"></div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-pink-500/50 transition-all flex flex-col gap-1">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">MPOnline Customer Care</p>
                                <a href="tel:+07556720200" className="flex items-center gap-2 text-slate-100 hover:text-pink-400 transition-colors font-bold text-sm">
                                    <span className="material-symbols-outlined text-[18px] text-pink-400 shrink-0">call</span>
                                    <span>+0755-6720200</span>
                                </a>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-pink-500/50 transition-all flex flex-col gap-1">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">HR & Internal Support</p>
                                <a href="tel:+917049923881" className="flex items-center gap-2 text-slate-100 hover:text-pink-400 transition-colors font-bold text-sm">
                                    <span className="material-symbols-outlined text-[18px] text-pink-400 shrink-0">call</span>
                                    <span>+91-7049923881</span>
                                </a>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-pink-500/50 transition-all flex flex-col gap-1">
                                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Email Support</p>
                                <a href="mailto:knome-support@mponline.gov.in" className="flex items-center gap-2 text-slate-100 hover:text-pink-400 transition-colors font-bold text-xs break-all">
                                    <span className="material-symbols-outlined text-[18px] text-pink-400 shrink-0">mail</span>
                                    <span>knome-support@mponline.gov.in</span>
                                </a>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-2.5 text-slate-200 text-xs leading-relaxed">
                                <span className="material-symbols-outlined text-[18px] text-pink-400 shrink-0 mt-0.5">location_on</span>
                                <span>3rd Floor State IT Park, Abbas Nagar near RGPV Gandhi Nagar, Bhopal 462033</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="w-full bg-[#040814] border-t border-slate-800 py-5 px-6 relative">
                <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    
                    {/* Left Branding */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-center sm:text-left">
                        <img 
                            src={knomeLogo} 
                            alt="Knome Logo" 
                            className="h-6 object-contain bg-white rounded p-0.5 shadow-sm" 
                        />
                        <span className="text-slate-300 text-xs font-medium">Knome v1.0 — Enterprise Knowledge Platform | Maintained by</span>
                        <img 
                            src={mponlineLogo} 
                            alt="MPOnline Limited" 
                            className="h-6 object-contain bg-white rounded px-1.5 py-0.5 shadow-sm" 
                        />
                    </div>

                    {/* Right Tag & Scroll To Top Button */}
                    <div className="flex items-center gap-4">
                        <span className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-md shadow-md tracking-wider">
                            RAMANUJAN
                        </span>
                        
                        <button
                            onClick={scrollToTop}
                            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 shrink-0"
                            title="Scroll to top"
                        >
                            <span className="material-symbols-outlined text-[20px]">keyboard_arrow_up</span>
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}




