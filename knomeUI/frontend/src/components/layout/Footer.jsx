import React from 'react';
import mponlineLogo from '../../assets/mponline_logo.png';
import certificationsLogo from '../../assets/certifications_logo.png';

export default function Footer() {
    return (
        <footer className="w-full py-6 mt-6 border-t flex flex-col items-center justify-center gap-4 text-center"
            style={{
                borderColor: 'var(--border-subtle)',
                background: 'rgba(255, 255, 255, 0.01)',
                backdropFilter: 'blur(10px)'
            }}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <span className="text-[13px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                    Powered by
                </span>
                <img 
                    src={mponlineLogo} 
                    alt="MPOnline Logo" 
                    className="h-14 object-contain bg-white rounded-xl px-5 py-2"
                    style={{
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
                    }}
                />
            </div>

            {/* Certifications Logo */}
            <div className="flex justify-center items-center mt-1">
                <img 
                    src={certificationsLogo} 
                    alt="Certifications Logo" 
                    className="h-14 object-contain bg-white rounded-xl px-6 py-2.5"
                    style={{
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
                    }}
                />
            </div>

            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 leading-none mt-1">
                © {new Date().getFullYear()} Knome Portal. All rights reserved.
            </p>
        </footer>
    );
}
