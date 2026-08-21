import React, { useEffect, useState } from 'react';
import { resolveMediaUrl } from '../../utils/apiService';

export default function DocumentViewerModal({ document, onClose }) {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const fileName = document?.name || 'Document.pdf';
    const rawUrl = document?.url || document?.rawUrl || document?.fileUrl || '';
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

        // If fileUrl is already a direct valid URL, use it directly without fragile blob conversion
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
                console.error("Document blob fetch error", err);
                if (isMounted) {
                    setHasError(true);
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
            if (createdUrl && createdUrl.startsWith('blob:')) {
                setTimeout(() => {
                    try { URL.revokeObjectURL(createdUrl); } catch (e) {}
                }, 2000);
            }
        };
    }, [fileUrl, isPdf, isImage]);

    if (!document) return null;

    const displayUrl = blobUrl || fileUrl;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="relative w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
                    {/* Left File Title & Badge */}
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isPdf ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                            <span className="material-symbols-outlined text-[20px]">
                                {isPdf ? 'picture_as_pdf' : 'description'}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white truncate max-w-md" title={fileName}>
                                {fileName}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-medium">
                                <span className="uppercase font-bold tracking-wider text-indigo-400">
                                    {isPdf ? 'PDF Document' : 'Document'}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Secure Preview
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button 
                            onClick={onClose}
                            className="w-9 h-9 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all flex items-center justify-center border border-slate-700 ml-1 cursor-pointer"
                            title="Close preview (Esc)"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Modal Body / Reader Viewport */}
                <div className="flex-1 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-hidden relative select-none" onContextMenu={(e) => e.preventDefault()}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                            <span className="material-symbols-outlined text-[36px] animate-spin text-indigo-500">progress_activity</span>
                            <p className="text-xs font-medium">Loading protected document...</p>
                        </div>
                    ) : isImage ? (
                        <div className="w-full h-full flex items-center justify-center overflow-auto">
                            <img src={displayUrl} alt={fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-xl pointer-events-none" onContextMenu={(e) => e.preventDefault()} />
                        </div>
                    ) : hasError ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-2xl text-center max-w-md border border-slate-800">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
                                <span className="material-symbols-outlined text-[32px]">lock</span>
                            </div>
                            <h4 className="font-bold text-white text-base mb-1">{fileName}</h4>
                            <p className="text-xs text-slate-400 mb-2">
                                Knome Protected Enterprise Viewer
                            </p>
                            <p className="text-[11px] text-slate-500">
                                Direct downloading and external opening are disabled by security policy.
                            </p>
                        </div>
                    ) : (
                        <object
                            data={`${displayUrl}${isPdf && !displayUrl.includes('#') ? '#toolbar=0&navpanes=0&scrollbar=0' : ''}`}
                            type={isPdf ? "application/pdf" : undefined}
                            className="w-full h-full rounded-xl border border-slate-800/80 bg-white shadow-inner pointer-events-auto"
                        >
                            <iframe 
                                src={`${displayUrl}${isPdf && !displayUrl.includes('#') ? '#toolbar=0&navpanes=0&scrollbar=0' : ''}`}
                                title={fileName}
                                className="w-full h-full rounded-xl border border-slate-800/80 bg-white shadow-inner pointer-events-auto"
                            />
                        </object>
                    )}
                </div>

                {/* Modal Footer Bar */}
                <div className="px-5 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[12px] text-slate-400 shrink-0">
                    <span className="flex items-center gap-1.5 font-medium">
                        <span className="material-symbols-outlined text-[16px] text-indigo-400">verified_user</span>
                        Knome Protected Enterprise Viewer
                    </span>
                    <button 
                        onClick={onClose}
                        className="hover:text-white font-medium transition-colors cursor-pointer"
                    >
                        Press Esc to exit
                    </button>
                </div>

            </div>
        </div>
    );
}
