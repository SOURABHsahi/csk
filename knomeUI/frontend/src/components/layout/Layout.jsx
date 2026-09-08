import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PageLoader from './PageLoader';
import Footer from './Footer';

export default function Layout({ children }) {
    return (
        <div className="min-h-screen relative flex flex-col justify-between bg-theme-60 text-theme-30-text">
            {/* Static Clean Background (No moving/pulsing colors) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[30vw] h-[30vw] rounded-full blur-[120px] bg-indigo-500/10"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] rounded-full blur-[120px] bg-cyan-500/10"></div>
            </div>

            <Navbar />

            <div className="w-full flex-1 flex flex-col relative z-10">
                <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 pt-20 md:pt-24 pb-20 md:pb-10 flex gap-4 lg:gap-6 max-w-[1720px] mx-auto flex-1 min-w-0">
                    <Sidebar />
                    <main className="flex-1 flex flex-col min-w-0 w-full">
                        <PageLoader>
                            {children}
                        </PageLoader>
                    </main>
                </div>
            </div>

            <Footer />
        </div>
    );
}


