import React, { useState, useEffect } from 'react';

export default function UploadPodcastModal({ isOpen, onClose }) {
    const [tab, setTab] = useState('upload');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleToggleRecording = () => {
        if (!isRecording && recordingTime > 0) {
            setRecordingTime(0); // reset if starting new
        }
        setIsRecording(!isRecording);
    };

    const handleUpload = () => {
        setIsUploading(true);
        setTimeout(() => {
            setIsUploading(false);
            onClose();
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-pink-500">mic</span>
                        Publish Podcast Episode
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {/* Source Tabs */}
                    <div className="flex gap-6 mb-6 border-b border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={() => setTab('upload')}
                            className={`flex items-center gap-2 pb-3 font-bold text-sm transition-colors relative ${tab === 'upload' ? 'text-pink-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">upload_file</span>
                            Upload Audio File
                            {tab === 'upload' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500 rounded-t-full"></div>}
                        </button>
                        <button 
                            onClick={() => setTab('record')}
                            className={`flex items-center gap-2 pb-3 font-bold text-sm transition-colors relative ${tab === 'record' ? 'text-pink-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">mic</span>
                            Record in Browser
                            {tab === 'record' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500 rounded-t-full"></div>}
                        </button>
                    </div>

                    {/* Input Area */}
                    <div className="mb-8 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-center min-h-[200px]">
                        {tab === 'upload' ? (
                            <>
                                <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center text-pink-500 mb-4">
                                    <span className="material-symbols-outlined text-[32px]">audio_file</span>
                                </div>
                                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-2">Drag and drop audio file</h3>
                                <p className="text-[12px] text-slate-500 mb-4 max-w-sm">Maximum file size: 100MB. Supported formats: MP3, WAV, AAC, OGG.</p>
                                <button className="px-6 py-2 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors shadow-md shadow-pink-500/20">
                                    Select File
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="mb-6 flex flex-col items-center">
                                    <div className="text-4xl font-black text-slate-800 dark:text-slate-200 mb-4 font-mono">
                                        {formatTime(recordingTime)}
                                    </div>
                                    {isRecording && (
                                        <div className="flex items-center gap-1 h-8">
                                            {[1,2,3,4,5,4,3,2,1].map((bar, i) => (
                                                <div key={i} className="w-1.5 bg-pink-500 rounded-full animate-pulse" style={{ height: `${bar * 6}px`, animationDelay: `${i * 0.1}s` }}></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <button 
                                    onClick={handleToggleRecording}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording ? 'bg-slate-800 text-red-500 animate-pulse ring-4 ring-red-500/30' : 'bg-red-500 text-white hover:scale-105'}`}
                                >
                                    <span className="material-symbols-outlined text-[32px]">{isRecording ? 'stop' : 'mic'}</span>
                                </button>
                                <p className="text-[12px] font-bold text-slate-500 mt-4">
                                    {isRecording ? 'Recording in progress...' : recordingTime > 0 ? 'Recording stopped. Ready to publish.' : 'Click to start recording'}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Episode Title</label>
                                <input type="text" placeholder="Enter episode title" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Description</label>
                                <textarea placeholder="What is this episode about?" rows="3" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none text-slate-900 dark:text-white resize-none"></textarea>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Category / Series</label>
                                    <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none text-slate-900 dark:text-white font-medium">
                                        <option>The Quantum Leap</option>
                                        <option>Leadership Uncut</option>
                                        <option>Culture & Karma</option>
                                        <option>Standalone Episode</option>
                                    </select>
                                </div>
                                <div className="w-24 shrink-0">
                                    <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Duration</label>
                                    <input type="text" placeholder="e.g. 45:00" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none text-slate-900 dark:text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Cover Image</label>
                                <button className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl py-2.5 text-[13px] font-bold text-slate-600 dark:text-slate-300 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                                    Upload Cover Art
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2.5 text-[13px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleUpload}
                        disabled={isUploading || isRecording}
                        className="px-8 py-2.5 bg-pink-500 text-white text-[13px] font-bold rounded-xl hover:bg-pink-600 transition-colors shadow-md shadow-pink-500/20 disabled:opacity-50">
                        {isUploading ? 'Publishing...' : 'Publish Episode'}
                    </button>
                </div>
            </div>
        </div>
    );
}
