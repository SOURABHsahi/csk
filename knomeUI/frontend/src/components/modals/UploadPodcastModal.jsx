import React, { useState, useEffect, useRef } from 'react';
import { mediaApi, podcastsApi } from '../../utils/apiService';
import { useUser } from '../contexts/UserContext';
import { checkRestrictedContent } from '../../utils/restrictedWords';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (FR-PD-05)
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.webm'];

export default function UploadPodcastModal({ isOpen, onClose }) {
    const { currentUser } = useUser();
    const isCurrentUserAdmin = ['SYSADM', 'CADM', 'HRADM'].includes(currentUser?.role) ||
        ['System Administrator', 'HR Administrator', 'Community Administrator', 'System Admin'].includes(currentUser?.roleName);

    const [tab, setTab] = useState('upload');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState('');
    const [seriesId, setSeriesId] = useState('');
    const [categoryName, setCategoryName] = useState('General');
    
    const [audioFile, setAudioFile] = useState(null);
    const [coverImageFile, setCoverImageFile] = useState(null);

    const [seriesList, setSeriesList] = useState([]);
    const [isCreatingSeries, setIsCreatingSeries] = useState(false);
    const [newSeriesTitle, setNewSeriesTitle] = useState('');
    const [newSeriesDesc, setNewSeriesDesc] = useState('');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioInputRef = useRef(null);
    const coverInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchSeries();
            resetForm();
        }
    }, [isOpen]);

    const fetchSeries = async () => {
        try {
            const response = await podcastsApi.getAllSeries();
            if (response) {
                setSeriesList(Array.isArray(response) ? response : []);
            }
        } catch (error) {
            console.error('Failed to fetch series:', error);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDuration('');
        setSeriesId('');
        setAudioFile(null);
        setCoverImageFile(null);
        setTab('upload');
        setRecordingTime(0);
        setIsRecording(false);
        setIsCreatingSeries(false);
        setNewSeriesTitle('');
        setNewSeriesDesc('');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    // Timer effect during recording
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

    const parseDuration = (str) => {
        if (!str) return null;
        const parts = str.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        return parseInt(str) || null;
    };

    // In-Browser Recording Toggle (FR-PD-01)
    const handleToggleRecording = async () => {
        if (isRecording) {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioChunksRef.current = [];
                const mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const file = new File([audioBlob], `recorded_podcast_${Date.now()}.webm`, { type: 'audio/webm' });
                    setAudioFile(file);
                    setDuration(formatTime(recordingTime));
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorderRef.current = mediaRecorder;
                mediaRecorder.start();
                setRecordingTime(0);
                setIsRecording(true);
            } catch (err) {
                console.error("Microphone access error:", err);
                alert("Microphone permission denied or unavailable in this browser.");
            }
        }
    };

    // File Validation & Handling (FR-PD-05)
    const handleAudioFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (file.size > MAX_FILE_SIZE) {
                alert(`File size exceeds the 100MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
                e.target.value = '';
                return;
            }

            const fileName = file.name.toLowerCase();
            const isValid = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
            if (!isValid) {
                alert(`Unsupported audio format. Supported formats: ${ALLOWED_EXTENSIONS.join(', ')}.`);
                e.target.value = '';
                return;
            }

            setAudioFile(file);
            
            // Auto detect duration if possible
            const audioObj = new Audio(URL.createObjectURL(file));
            audioObj.onloadedmetadata = () => {
                if (audioObj.duration && !isNaN(audioObj.duration)) {
                    setDuration(formatTime(Math.floor(audioObj.duration)));
                }
            };
        }
    };

    const handleCoverFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setCoverImageFile(e.target.files[0]);
        }
    };

    // Series Creation Workflow (FR-PD-03)
    const handleCreateSeries = async () => {
        if (!newSeriesTitle.trim()) {
            alert('Series title is required.');
            return;
        }
        try {
            const res = await podcastsApi.createSeries({
                title: newSeriesTitle.trim(),
                description: newSeriesDesc.trim()
            });
            const created = res?.data || res;
            alert(`Series "${newSeriesTitle}" created successfully!`);
            await fetchSeries();
            if (created && created.seriesId) {
                setSeriesId(created.seriesId.toString());
            }
            setIsCreatingSeries(false);
            setNewSeriesTitle('');
            setNewSeriesDesc('');
        } catch (err) {
            console.error('Failed to create series:', err);
            alert('Failed to create series.');
        }
    };

    const handleUpload = async () => {
        if (!title.trim()) {
            alert('Episode title is required.');
            return;
        }

        const textToScan = `${title} ${description} ${categoryName}`;
        const foundKeyword = checkRestrictedContent(textToScan);
        if (foundKeyword) {
            alert(`Podcast episode cannot be uploaded. It contains the restricted term: "${foundKeyword}".`);
            return;
        }

        if (!audioFile) {
            alert('Please upload an audio file or record audio in-browser before publishing.');
            return;
        }

        setIsUploading(true);

        try {
            let audioUrl = '';
            let coverImageUrl = '';

            if (audioFile) {
                const audioResponse = await mediaApi.uploadFile(audioFile, 'podcast');
                if (audioResponse && audioResponse.url) {
                    audioUrl = audioResponse.url;
                }
            }

            if (coverImageFile) {
                const coverResponse = await mediaApi.uploadFile(coverImageFile, 'image');
                if (coverResponse && coverResponse.url) {
                    coverImageUrl = coverResponse.url;
                }
            }

            const podcastData = {
                title: title.trim(),
                description: description.trim(),
                audioUrl: audioUrl || null,
                coverImageUrl: coverImageUrl || null,
                durationSeconds: parseDuration(duration),
                seriesId: seriesId ? parseInt(seriesId) : null,
                categoryName: categoryName || 'General',
                categoryId: null
            };

            if (isCurrentUserAdmin) {
                await podcastsApi.create(podcastData);
                alert("Podcast episode published successfully!");
                window.dispatchEvent(new CustomEvent('podcast-published'));
            } else {
                const pendingItem = {
                    id: `pending_podcast_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    mediaType: 'Podcast',
                    title: title.trim(),
                    description: description.trim(),
                    thumbnail: coverImageUrl || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=90&w=1600&h=900',
                    audioUrl: audioUrl,
                    duration: duration || 'Podcast',
                    category: categoryName || 'General',
                    authorName: currentUser?.name || 'Employee',
                    authorId: currentUser?.id,
                    authorAvatar: currentUser?.avatar,
                    submittedDate: new Date().toISOString(),
                    status: 'PendingApproval',
                    podcastData: podcastData
                };

                const existingPending = JSON.parse(localStorage.getItem('knome_pending_media_approvals') || '[]');
                localStorage.setItem('knome_pending_media_approvals', JSON.stringify([pendingItem, ...existingPending]));

                const adminNotif = {
                    id: `notif_approval_${Date.now()}`,
                    type: 'media_approval',
                    category: 'System',
                    text: `${currentUser?.name || 'Employee'} uploaded podcast "${title.trim()}" awaiting your admin approval.`,
                    senderName: currentUser?.name || 'Employee',
                    senderAvatar: currentUser?.avatar,
                    targetUserId: 'admin',
                    targetUrl: '/admin-console',
                    time: 'Just now',
                    unread: true,
                    mediaType: 'Podcast',
                    pendingId: pendingItem.id
                };
                const existingNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
                localStorage.setItem('knome_notifications', JSON.stringify([adminNotif, ...existingNotifs]));

                alert(`Podcast episode "${title.trim()}" submitted successfully! It has been sent to the Admin for approval before going live.`);
            }
            
            setIsUploading(false);
            onClose();
        } catch (error) {
            console.error('Failed to publish podcast:', error);
            alert('Failed to publish podcast. Please try again.');
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 z-10">
                
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
                            Upload Audio File (Max 100MB)
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
                                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-2">
                                    {audioFile ? audioFile.name : 'Select or drag & drop audio file'}
                                </h3>
                                <p className="text-[12px] text-slate-500 mb-4 max-w-sm">Maximum upload size: 100MB. Supported formats: MP3, WAV, AAC, OGG, M4A, WEBM.</p>
                                <input 
                                    type="file" 
                                    accept="audio/*" 
                                    ref={audioInputRef} 
                                    className="hidden" 
                                    onChange={handleAudioFileChange} 
                                />
                                <button 
                                    onClick={() => audioInputRef.current?.click()}
                                    className="px-6 py-2 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors shadow-md shadow-pink-500/20"
                                >
                                    {audioFile ? 'Change Audio File' : 'Select Audio File'}
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
                                    {isRecording ? 'Recording in progress... Click stop when finished.' : audioFile ? 'Recording saved! Ready to publish.' : 'Click mic to start browser recording'}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Episode Title *</label>
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter episode title" 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none text-slate-900 dark:text-white font-medium" 
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this episode about?" 
                                    rows="3" 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none text-slate-900 dark:text-white resize-none"
                                ></textarea>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Podcast Series Grouping</label>
                                <select 
                                    value={seriesId}
                                    onChange={(e) => setSeriesId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none text-slate-900 dark:text-white font-medium"
                                >
                                    <option value="">Standalone Episode</option>
                                    {seriesList.map(s => (
                                        <option key={s.seriesId} value={s.seriesId}>{s.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Podcast Category *</label>
                                <select 
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 outline-none text-slate-900 dark:text-white font-medium cursor-pointer"
                                >
                                    <option value="General">General</option>
                                    <option value="Tech">Tech</option>
                                    <option value="Leadership">Leadership</option>
                                    <option value="Engineering">Engineering</option>
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center justify-between">
                                        <span>Duration</span>
                                        <span className="text-[10px] text-pink-600 font-extrabold uppercase bg-pink-500/10 px-2 py-0.5 rounded">Auto</span>
                                    </label>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between select-none cursor-not-allowed">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-pink-500">schedule</span>
                                            <span>{duration || (audioFile ? 'Calculating...' : 'Auto-detected on upload')}</span>
                                        </div>
                                        <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Cover Art Image</label>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        ref={coverInputRef} 
                                        className="hidden" 
                                        onChange={handleCoverFileChange} 
                                    />
                                    <button 
                                        onClick={() => coverInputRef.current?.click()}
                                        className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl py-2.5 text-[12px] font-bold text-slate-600 dark:text-slate-300 transition-colors truncate"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                                        {coverImageFile ? coverImageFile.name : 'Upload Cover'}
                                    </button>
                                </div>
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
