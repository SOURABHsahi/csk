import React, { useState, useRef } from 'react';
import { apiClient } from '../../utils/apiClient';

export default function UploadVideoModal({ isOpen, onClose, onVideoUploaded }) {
    const [sourceTab, setSourceTab] = useState('direct');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('13'); // 13 is Training & Tutorials
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const [sourceUrlInput, setSourceUrlInput] = useState('');
    
    // File states
    const [videoFile, setVideoFile] = useState(null);
    const [videoDuration, setVideoDuration] = useState('');
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState('');

    const videoInputRef = useRef(null);
    const thumbnailInputRef = useRef(null);

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' && tagInput.trim() !== '') {
            const inputTags = tagInput.trim().split(/[\s,]+/).filter(Boolean);
            const newTags = [];
            for (let t of inputTags) {
                if (!t.startsWith('#')) t = '#' + t;
                if (!tags.includes(t) && !newTags.includes(t)) {
                    newTags.push(t);
                }
            }
            setTags([...tags, ...newTags]);
            setTagInput('');
            e.preventDefault();
        }
    };

    const handleVideoFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setVideoFile(file);
            setVideoDuration('Calculating...');
            
            // Auto-detect video duration from video file metadata
            const tempVideo = document.createElement('video');
            tempVideo.preload = 'metadata';
            const objectUrl = URL.createObjectURL(file);
            tempVideo.src = objectUrl;
            tempVideo.onloadedmetadata = () => {
                URL.revokeObjectURL(objectUrl);
                if (tempVideo.duration && !isNaN(tempVideo.duration)) {
                    const totalSeconds = Math.floor(tempVideo.duration);
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    setVideoDuration(formatted);
                    setDurationSeconds(totalSeconds);
                } else {
                    setVideoDuration('00:00');
                }
            };
            tempVideo.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                setVideoDuration('Unknown');
            };
        }
    };

    const handleThumbnailSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setThumbnailFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setThumbnailPreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!title.trim()) {
            alert("Please enter a video title.");
            return;
        }

        if (sourceTab === 'direct' && !videoFile) {
            alert("Please select a video file to upload.");
            return;
        }

        if (sourceTab !== 'direct' && !sourceUrlInput.trim()) {
            alert("Please enter the video URL.");
            return;
        }

        setIsUploading(true);

        try {
            let finalVideoUrl = sourceUrlInput;
            let fileSizeMb = null;

            // 1. Upload Video if Direct
            if (sourceTab === 'direct' && videoFile) {
                const videoResult = await apiClient.uploadFile('/Media/upload', videoFile, 'video');
                finalVideoUrl = videoResult.url;
                fileSizeMb = Math.round(videoFile.size / (1024 * 1024));
            }

            // 2. Upload Thumbnail if provided
            let finalThumbnailUrl = null;
            if (thumbnailFile) {
                const thumbResult = await apiClient.uploadFile('/Media/upload', thumbnailFile, 'image');
                finalThumbnailUrl = thumbResult.url;
            }

            // 3. Map SourceType
            let sourceType = 'LocalUpload';
            if (sourceTab === 'onedrive') sourceType = 'OneDrive';
            if (sourceTab === 'stream') sourceType = 'Stream';
            if (sourceTab === 'embed') sourceType = 'Stream'; // Map embed to Stream to pass backend validation if Embed isn't supported

            // 4. Submit to Backend
            let finalTags = [...tags];
            if (tagInput.trim()) {
                const inputTags = tagInput.trim().split(/[\s,]+/).filter(Boolean).map(t => t.startsWith('#') ? t : '#' + t);
                finalTags = [...finalTags, ...inputTags];
                // ensure unique
                finalTags = [...new Set(finalTags)];
            }

            const dto = {
                title: title.trim(),
                description: description.trim(),
                categoryId: parseInt(category) || null,
                thumbnailUrl: finalThumbnailUrl,
                sourceType: sourceType,
                sourceUrl: finalVideoUrl,
                fileSizeMb: fileSizeMb,
                durationSeconds: durationSeconds || null,
                tags: finalTags
            };

            await apiClient.post('/videos', dto);
            
            // Success
            setIsUploading(false);
            if (onVideoUploaded) onVideoUploaded();
            onClose();

            // Reset form
            setTitle('');
            setDescription('');
            setTags([]);
            setVideoFile(null);
            setVideoDuration('');
            setDurationSeconds(0);
            setThumbnailFile(null);
            setThumbnailPreview('');
            setSourceUrlInput('');
        } catch (error) {
            console.error("Video upload failed:", error);
            alert("Failed to upload video: " + (error.message || "Please try again."));
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-cyan-500">video_call</span>
                        Upload Video
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {/* Source Tabs */}
                    <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar">
                        {[
                            { id: 'direct', label: 'Direct Upload', icon: 'upload' },
                            { id: 'onedrive', label: 'OneDrive', icon: 'cloud' },
                            { id: 'stream', label: 'MS Stream', icon: 'play_circle' },
                            { id: 'embed', label: 'Embed URL', icon: 'link' }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setSourceTab(tab.id)}
                                className={`flex items-center gap-2 pb-3 font-bold text-sm transition-colors relative whitespace-nowrap ${sourceTab === tab.id ? 'text-cyan-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                {tab.label}
                                {sourceTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 rounded-t-full"></div>}
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Source Input */}
                    <div className="mb-8 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        {sourceTab === 'direct' && (
                            <>
                                <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska" ref={videoInputRef} onChange={handleVideoFileSelect} className="hidden" />
                                {videoFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-500 mb-2">
                                            <span className="material-symbols-outlined text-[32px]">check_circle</span>
                                        </div>
                                        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{videoFile.name}</h3>
                                        <p className="text-[12px] text-slate-500">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                        <button onClick={() => videoInputRef.current?.click()} className="mt-2 text-xs font-bold text-cyan-500 hover:underline">Change File</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center text-cyan-500 mb-4">
                                            <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                                        </div>
                                        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-2">Drag and drop video file</h3>
                                        <p className="text-[12px] text-slate-500 mb-4 max-w-sm">Maximum file size: 500MB. Supported formats: MP4, MOV, AVI, MKV.</p>
                                        <button onClick={() => videoInputRef.current?.click()} className="px-6 py-2 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-colors shadow-md shadow-cyan-500/20">
                                            Select File
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                        {sourceTab === 'onedrive' && (
                            <>
                                <span className="material-symbols-outlined text-[48px] text-blue-500 mb-4">cloud</span>
                                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-4">Paste OneDrive sharing link</p>
                                <input type="text" value={sourceUrlInput} onChange={e => setSourceUrlInput(e.target.value)} placeholder="https://onedrive.live.com/..." className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none" />
                            </>
                        )}
                        {sourceTab === 'stream' && (
                            <>
                                <span className="material-symbols-outlined text-[48px] text-pink-500 mb-4">play_circle</span>
                                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-4">Paste Microsoft Stream video link</p>
                                <input type="text" value={sourceUrlInput} onChange={e => setSourceUrlInput(e.target.value)} placeholder="https://web.microsoftstream.com/video/..." className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none" />
                            </>
                        )}
                        {sourceTab === 'embed' && (
                            <>
                                <span className="material-symbols-outlined text-[48px] text-slate-400 mb-4">link</span>
                                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-4">Paste Embed Code or URL</p>
                                <input type="text" value={sourceUrlInput} onChange={e => setSourceUrlInput(e.target.value)} placeholder="<iframe src=..." className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none" />
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Video Title</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter video title" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center justify-between">
                                    <span>Video Duration</span>
                                    <span className="text-[10px] text-cyan-600 font-extrabold uppercase bg-cyan-500/10 px-2 py-0.5 rounded">Auto-Detected</span>
                                </label>
                                <div className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between select-none cursor-not-allowed">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] text-cyan-500">schedule</span>
                                        <span>{videoDuration || (videoFile ? 'Calculating duration...' : 'Select a video file to auto-detect duration')}</span>
                                    </div>
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this video about?" rows="3" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white resize-none"></textarea>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white font-medium">
                                    <option value="13">Training & Tutorials</option>
                                    <option value="14">Townhalls</option>
                                    <option value="15">Engineering Tech Talks</option>
                                    <option value="16">Leadership Updates</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Tags</label>
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-cyan-500">
                                    {tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-400 px-2 py-1 rounded-md text-[11px] font-bold">
                                            {tag}
                                            <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-500"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                        </span>
                                    ))}
                                    <input 
                                        type="text" 
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        placeholder="Add tag and press Enter..."
                                        className="flex-1 min-w-[120px] bg-transparent border-none p-1 text-sm text-slate-900 dark:text-white focus:ring-0 placeholder-slate-400"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Custom Thumbnail</label>
                                <input type="file" accept="image/*" ref={thumbnailInputRef} onChange={handleThumbnailSelect} className="hidden" />
                                {thumbnailPreview ? (
                                    <div className="relative w-full h-24 rounded-xl overflow-hidden group border border-slate-200 dark:border-slate-700">
                                        <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => {setThumbnailFile(null); setThumbnailPreview('');}} className="p-1.5 bg-white/20 hover:bg-red-500 text-white rounded-full transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => thumbnailInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl py-2.5 text-[13px] font-bold text-slate-600 dark:text-slate-300 transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                                        Upload Thumbnail (Optional)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 rounded-b-2xl relative">
                    {isUploading && (
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-cyan-500">
                            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                            <span className="text-[13px] font-bold">Uploading video... Please wait</span>
                        </div>
                    )}
                    <button onClick={onClose} disabled={isUploading} className="px-6 py-2.5 text-[13px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button 
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="px-8 py-2.5 bg-cyan-500 text-white text-[13px] font-bold rounded-xl hover:bg-cyan-600 transition-colors shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2">
                        {isUploading ? 'Processing...' : 'Upload Video'}
                    </button>
                </div>
            </div>
        </div>
    );
}
