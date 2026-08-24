import React, { useEffect, useState, useRef } from 'react';
import { resolveMediaUrl } from '../../utils/apiService';

export default function DocumentViewerModal({ document: docFile, onClose }) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [zoom, setZoom] = useState(1);
    const modalRef = useRef(null);

    // Prevent background scrolling while modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Handle Escape and keyboard navigation safely without blocking gesture threads
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }
            // Block Save As (Ctrl+S, Cmd+S)
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                e.stopPropagation();
            }
            // Block Print (Ctrl+P, Cmd+P)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const fileName = docFile?.name || 'Document.pdf';
    const rawUrl = docFile?.url || docFile?.rawUrl || docFile?.fileUrl || '';
    const fileUrl = resolveMediaUrl(rawUrl);
    const isPdf = fileName.toLowerCase().endsWith('.pdf') || rawUrl.toLowerCase().includes('.pdf');
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName) || /\.(jpg|jpeg|png|gif|webp)/i.test(rawUrl);

    useEffect(() => {
        let isMounted = true;
        let createdUrl = null;
        setLoading(true);
        setHasError(false);

        if (!fileUrl || isImage) {
            setLoading(false);
            return;
        }

        // Direct HTTP/HTTPS URLs can be rendered directly by iframe without expensive/fragile blob conversion
        if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
            setBlobUrl(fileUrl);
            setLoading(false);
            return;
        }

        fetch(fileUrl)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.blob();
            })
            .then(blob => {
                if (!isMounted) return;
                const pdfBlob = new Blob([blob], { type: isPdf ? 'application/pdf' : blob.type });
                createdUrl = URL.createObjectURL(pdfBlob);
                setBlobUrl(createdUrl);
                setLoading(false);
            })
            .catch(err => {
                console.error("Document viewer blob load error", err);
                if (isMounted) {
                    setHasError(true);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
            if (createdUrl && createdUrl.startsWith('blob:')) {
                try { URL.revokeObjectURL(createdUrl); } catch (e) {}
            }
        };
    }, [fileUrl, isPdf, isImage]);

    if (!docFile) return null;

    const displayUrl = blobUrl || fileUrl;
    // Clean PDF parameters without scrollbar=0 (which caused scroll freeze / loop)
    const securePdfParams = '#toolbar=0&navpanes=0&view=FitH';

    const handleZoomIn = (e) => {
        e.stopPropagation();
        setZoom(prev => Math.min(prev + 0.25, 2.5));
    };

    const handleZoomOut = (e) => {
        e.stopPropagation();
        setZoom(prev => Math.max(prev - 0.25, 0.75));
    };

    const handleZoomReset = (e) => {
        e.stopPropagation();
        setZoom(1);
    };

    return (
        <div 
            ref={modalRef}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none"
            onClick={(e) => {
                if (e.target === modalRef.current) onClose();
            }}
        >
            {/* Modal Container */}
            <div className="relative w-full max-w-[96vw] h-[94vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden select-none overscroll-contain">
                
                {/* Modal Header */}
                <div className="px-4 sm:px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
                    {/* Left File Title & Badge */}
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isPdf ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                            <span className="material-symbols-outlined text-[20px]">
                                {isPdf ? 'picture_as_pdf' : 'description'}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md" title={fileName}>
                                {fileName}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-medium">
                                <span className="uppercase font-bold tracking-wider text-blue-400">
                                    {isPdf ? 'Protected PDF' : 'Protected Document'}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Read-Only Protected
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Zoom Controls for Images & Visual Docs */}
                        {isImage && (
                            <div className="flex items-center gap-1 bg-slate-800/90 rounded-xl p-1 border border-slate-700/60">
                                <button
                                    onClick={handleZoomOut}
                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                                    title="Zoom Out"
                                >
                                    <span className="material-symbols-outlined text-[16px]">remove</span>
                                </button>
                                <button
                                    onClick={handleZoomReset}
                                    className="px-2 py-0.5 text-[11px] font-bold text-slate-300 hover:text-white"
                                    title="Reset Zoom"
                                >
                                    {Math.round(zoom * 100)}%
                                </button>
                                <button
                                    onClick={handleZoomIn}
                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                                    title="Zoom In"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                </button>
                            </div>
                        )}

                        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400 font-medium">
                            <span className="material-symbols-outlined text-[14px] text-amber-400">lock</span>
                            <span>Save As & Download Disabled</span>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-9 h-9 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all flex items-center justify-center border border-slate-700 ml-1 cursor-pointer active:scale-95"
                            title="Close preview (Esc)"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Modal Body / Reader Viewport */}
                <div 
                    className="flex-1 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto relative select-none"
                    style={{
                        touchAction: 'pan-x pan-y',
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain'
                    }}
                >
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                            <span className="material-symbols-outlined text-[36px] animate-spin text-blue-500">progress_activity</span>
                            <p className="text-xs font-medium">Loading protected document...</p>
                        </div>
                    ) : isImage ? (
                        <div 
                            className="w-full h-full flex items-center justify-center overflow-auto select-none p-2"
                            style={{ touchAction: 'pan-x pan-y' }}
                        >
                            <img 
                                src={displayUrl} 
                                alt={fileName} 
                                className="max-w-full max-h-full object-contain rounded-lg shadow-xl select-none transition-transform duration-150"
                                style={{ transform: `scale(${zoom})` }}
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                        </div>
                    ) : hasError ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-2xl text-center max-w-md border border-slate-800">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
                                <span className="material-symbols-outlined text-[32px]">lock</span>
                            </div>
                            <h4 className="font-bold text-white text-base mb-1">{fileName}</h4>
                            <p className="text-xs text-slate-400 mb-2">
                                Knome Protected Enterprise Viewer
                            </p>
                            <p className="text-[11px] text-slate-500">
                                Direct downloading, printing, and Save As are disabled by enterprise policy.
                            </p>
                        </div>
                    ) : (
                        <div className="w-full h-full rounded-xl overflow-hidden bg-white shadow-inner">
                            <iframe 
                                src={`${displayUrl}${isPdf && !displayUrl.includes('#') ? securePdfParams : ''}`}
                                title={fileName}
                                className="w-full h-full border-0 bg-white"
                                loading="lazy"
                                allow="fullscreen"
                            />
                        </div>
                    )}
                </div>

                {/* Modal Footer Bar */}
                <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[12px] text-slate-400 shrink-0">
                    <span className="flex items-center gap-1.5 font-medium">
                        <span className="material-symbols-outlined text-[16px] text-blue-400">verified_user</span>
                        Knome Protected Enterprise Viewer
                    </span>
                    <button 
                        onClick={onClose}
                        className="hover:text-white font-medium transition-colors cursor-pointer"
                    >
                        Press Esc or Close to exit
                    </button>
                </div>

            </div>
        </div>
    );
}

