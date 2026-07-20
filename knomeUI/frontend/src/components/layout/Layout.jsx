import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PageLoader from './PageLoader';
import Footer from './Footer';

export default function Layout({ children }) {
    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col justify-between" style={{background: 'var(--bg-base)', color: 'var(--text-primary)'}}>
            {/* Animated Glow Background Orbs for Energetic Vibe */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[35vw] h-[35vw] rounded-full blur-[100px] opacity-10 dark:opacity-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[35vw] h-[35vw] rounded-full blur-[100px] opacity-10 dark:opacity-20 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 animate-pulse" style={{animationDelay: '3s'}}></div>
            </div>

            <div className="w-full flex-1 flex flex-col relative z-10">
                <Navbar />
                <div className="w-full px-4 md:px-8 pt-24 pb-4 flex gap-6 max-w-screen-2xl mx-auto flex-1">
                    <Sidebar />
                    <div className="flex-1 flex gap-6 min-w-0">
                        <PageLoader>
                            {children}
                        </PageLoader>
                    </div>
                </div>
            </div>
            <div className="relative z-10">
                <Footer />
            </div>
        </div>
    );
}
