import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>
            
            {/* Modal Content */}
            <div className={`relative w-full ${maxWidth} bg-surface-container-lowest dark:bg-surface-container rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 border border-border-subtle`}>
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-surface-container/50">
                    <h2 className="font-headline-sm text-primary">{title}</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-full text-slate-gray hover:bg-surface-container-high transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
