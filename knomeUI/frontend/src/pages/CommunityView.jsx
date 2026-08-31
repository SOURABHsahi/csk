import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import { apiClient } from '../utils/apiClient';
import { communitiesApi, mediaApi, resolveMediaUrl, getVideoThumbnail, getCommunityImages } from '../utils/apiService';

const ENTERPRISE_CHANNELS_SEED = {
    '1': {
        name: 'Engineering & Tech',
        type: 'Public',
        category: 'Technology & Architecture',
        adminContact: 'Loveneesh Sharma (Lead Admin)',
        description: 'Core engineering discussions, architecture standards, technical roadmaps, and code design patterns for MPOnline software systems.',
        rules: ['1. Keep discussions technical and constructive.', '2. Follow code review & architecture guidelines.', '3. Respect all engineers and peers.'],
        faq: [
            { q: 'Who can participate?', a: 'All developers, architects, and technical staff across MPOnline.' },
            { q: 'Can I share code snippets?', a: 'Yes, formatted code and architecture diagrams are highly encouraged.' }
        ]
    },
    '2': {
        name: 'HR & People Ops',
        type: 'Default (Org)',
        category: 'Human Resources & Governance',
        adminContact: 'Sourabh Sahu (HR Lead)',
        description: 'Official human resources updates, employee engagement, workplace policies, internal training, and talent development programs.',
        rules: ['1. Follow official HR communications protocol.', '2. Confidential employee queries should be routed via HR portal.', '3. Maintain constructive, professional dialogue.'],
        faq: [
            { q: 'Who is a member?', a: 'All MPOnline employees are auto-enrolled in HR & People Ops.' },
            { q: 'Where are policy documents stored?', a: 'Check the Files & Media tab for official policy handbooks.' }
        ]
    },
    '3': {
        name: 'Product Design & UX',
        type: 'Public',
        category: 'UI/UX & Design Systems',
        adminContact: 'Mayur Verma (Design Lead)',
        description: 'Design system specifications, user research findings, interactive prototypes, and UI/UX design reviews across enterprise portals.',
        rules: ['1. Share constructive design critique.', '2. Adhere to the Knome & MPOnline design system tokens.', '3. Credit design resources appropriately.'],
        faq: [
            { q: 'Can non-designers join?', a: 'Yes! Product managers, frontend engineers, and stakeholders are welcome.' }
        ]
    },
    '4': {
        name: 'AI & Data Science Lab',
        type: 'Private',
        category: 'AI Research & Data Science',
        adminContact: 'Vishendra Sharma (AI Lead)',
        description: 'Exploration of machine learning, NLP, computer vision models, agentic workflows, and predictive analytics for public services.',
        rules: ['1. Respect data privacy and security benchmarks.', '2. No production customer PII in experiment posts.', '3. Share reproducible notebook links.'],
        faq: [
            { q: 'How do I request access?', a: 'Click Request to Join; the AI Lab moderator will review your request.' }
        ]
    },
    '5': {
        name: 'Finance & Accounting',
        type: 'Default (Org)',
        category: 'Finance, Audit & Payroll',
        adminContact: 'Sourabh Sahu (Finance Admin)',
        description: 'Finance announcements, reimbursement policies, payroll schedules, and compliance audit notices for MPOnline teams.',
        rules: ['1. Official financial guidelines only.', '2. For personal payroll disputes, contact Finance directly.', '3. Comply with government audit standards.'],
        faq: [
            { q: 'When are payroll guidelines posted?', a: 'Monthly before each payment cycle.' }
        ]
    },
    '6': {
        name: 'Marketing & Brand Strategy',
        type: 'Public',
        category: 'Marketing, PR & Events',
        adminContact: 'Meghna Tiwari (Brand Lead)',
        description: 'Brand identity assets, public relations updates, social campaigns, event coverage, and outreach roadmaps.',
        rules: ['1. Align with MPOnline corporate branding guidelines.', '2. Coordinate external PR with the communications cell.'],
        faq: [
            { q: 'Where are brand logos and guidelines?', a: 'Check the Files & Media tab.' }
        ]
    },
    '7': {
        name: 'CTO Leadership Circle',
        type: 'Private',
        category: 'Executive Leadership & Strategy',
        adminContact: 'Loveneesh Sharma (Lead Admin)',
        description: 'Strategic technology direction, executive briefings, technology modernization, and enterprise architecture decisions.',
        rules: ['1. Executive confidentiality applies.', '2. Strategic alignment only.'],
        faq: [
            { q: 'Who is eligible?', a: 'Department heads, team leads, and executive architects.' }
        ]
    },
    '8': {
        name: 'General Discussion',
        type: 'Public',
        category: 'Company Open Lounge',
        adminContact: 'System Admin',
        description: 'The open lounge for cross-department networking, achievements, celebrations, and general office chatter.',
        rules: ['1. Keep it friendly, positive, and inclusive.', '2. Avoid unverified rumors.'],
        faq: [
            { q: 'What can I post here?', a: 'Team shoutouts, hackathons, book recommendations, celebrations, and informal discussions.' }
        ]
    }
};

export default function CommunityView() {
    const { currentUser, users: contextUsers, awardRuleKarma } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    // Read community details from URL query or state
    const queryParams = new URLSearchParams(location.search);
    const communityId = queryParams.get('id');

    // Award +5 Karma Points for active community participation (Once per community per day)
    useEffect(() => {
        if (currentUser && awardRuleKarma && communityId) {
            const userId = currentUser.userId || currentUser.id;
            awardRuleKarma(userId, 'COMMUNITY_PARTICIPATION', { communityId: communityId });
        }
    }, [communityId, currentUser, awardRuleKarma]);

    const [community, setCommunity] = useState(null);
    const [activeTab, setActiveTab] = useState('feed'); // 'feed', 'members', 'admin'
    const [membershipStatus, setMembershipStatus] = useState('none');
    const [postText, setPostText] = useState('');
    const [posts, setPosts] = useState([]);
    const [joinRequests, setJoinRequests] = useState([]);
    const [membersList, setMembersList] = useState([]);
    const [subscribersList, setSubscribersList] = useState([]);
    const [suspendedMembers, setSuspendedMembers] = useState([]);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState(null); // { message, type }

    // Files & Media State
    const [filesList, setFilesList] = useState([]);
    const [fileCategoryFilter, setFileCategoryFilter] = useState('All');
    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedUploadFile, setSelectedUploadFile] = useState(null);
    const [uploadFileName, setUploadFileName] = useState('');
    const [uploadFileCategory, setUploadFileCategory] = useState('Document');
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [previewModalFile, setPreviewModalFile] = useState(null);
    const [activePdfBlobUrl, setActivePdfBlobUrl] = useState(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareTab, setShareTab] = useState('menu'); // 'menu', 'community', 'users'
    const [shareTargetCommunity, setShareTargetCommunity] = useState('');
    const [shareSelectedUsers, setShareSelectedUsers] = useState([]);
    const [shareMessageNote, setShareMessageNote] = useState('');
    const [isSharingProcess, setIsSharingProcess] = useState(false);
    const [allCommunities, setAllCommunities] = useState([]);

    const getPdfBlobUrl = (urlOrBase64) => {
        if (!urlOrBase64 || urlOrBase64 === '#') {
            urlOrBase64 = SAMPLE_PDF_DATA_URL;
        }
        if (typeof urlOrBase64 === 'string' && urlOrBase64.startsWith('data:application/pdf;base64,')) {
            try {
                const base64Data = urlOrBase64.split(',')[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                return URL.createObjectURL(blob);
            } catch (err) {
                console.warn('Failed to parse Base64 PDF to blob URL:', err);
            }
        }
        return urlOrBase64;
    };

    useEffect(() => {
        let currentBlobUrl = null;
        if (previewModalFile) {
            currentBlobUrl = getPdfBlobUrl(previewModalFile.url);
            setActivePdfBlobUrl(currentBlobUrl);
        } else {
            setActivePdfBlobUrl(null);
        }

        return () => {
            if (currentBlobUrl && typeof currentBlobUrl === 'string' && currentBlobUrl.startsWith('blob:')) {
                // Delay revocation so active iframes/objects do not throw ERR_FILE_NOT_FOUND
                setTimeout(() => {
                    try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {}
                }, 2000);
            }
        };
    }, [previewModalFile]);

    // Load all available communities for share dropdown
    const loadAllCommunities = async () => {
        try {
            const seedCommunities = [
                { id: '1', name: 'Tech Innovation Hub', emoji: '🚀' },
                { id: '2', name: 'DevOps & AI Innovation Hub', emoji: '💻' },
                { id: '3', name: 'Frontend Developers Guild', emoji: '⚛️' },
                { id: '4', name: 'Database Architects', emoji: '🗄️' },
                { id: '5', name: 'HR & General Announcements', emoji: '📢' },
                { id: '6', name: 'Culture & HR Hub', emoji: '🌟' },
            ];
            // Merge with any user-created communities from localStorage
            const customList = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
            const customMapped = customList.map(c => ({
                id: String(c.id),
                name: c.name,
                emoji: c.emoji || '🏘️'
            }));
            // Try to also load from API
            try {
                const apiRes = await communitiesApi.getAll();
                const apiData = apiRes?.data || apiRes || [];
                const apiComms = (Array.isArray(apiData) ? apiData : []).map(c => ({
                    id: String(c.communityId || c.id),
                    name: c.communityName || c.name,
                    emoji: '🏘️'
                }));
                const merged = [...apiComms];
                [...seedCommunities, ...customMapped].forEach(s => {
                    if (!merged.some(a => a.id === s.id)) merged.push(s);
                });
                setAllCommunities(merged.filter(c => String(c.id) !== String(communityId)));
                return;
            } catch (_) { /* ignore API error, fall back to local */ }

            const merged = [...seedCommunities, ...customMapped];
            const deduped = Array.from(new Map(merged.map(c => [c.id, c])).values());
            setAllCommunities(deduped.filter(c => String(c.id) !== String(communityId)));
        } catch (err) {
            console.error('Failed to load communities for share:', err);
        }
    };

    // Open Share Modal
    const handleShareCommunity = () => {
        setShareTab('menu');
        setShareTargetCommunity('');
        setShareSelectedUsers([]);
        setShareMessageNote('');
        loadAllCommunities();
        setIsShareModalOpen(true);
    };

    // Handler 1: Share to Community Feed
    const handleShareToCommunitySubmit = async (e) => {
        if (e) e.preventDefault();
        if (!shareTargetCommunity) {
            showToast('Please select a target community.', 'error');
            return;
        }
        setIsSharingProcess(true);
        try {
            const targetCommId = shareTargetCommunity;
            const savedPostsKey = `knome_community_posts_${targetCommId}`;
            const existingTargetPosts = JSON.parse(localStorage.getItem(savedPostsKey) || '[]');
            
            // Find target community name for better UX
            const targetComm = allCommunities.find(c => String(c.id) === String(targetCommId));
            const targetCommName = targetComm?.name || `Community #${targetCommId}`;

            const crosspost = {
                id: `share_${Date.now()}`,
                type: 'community_share',
                authorName: currentUser?.name || 'Sourabh Sahu',
                authorRole: currentUser?.roleName || 'Member',
                authorAvatar: currentUser?.avatar || null,
                timeAgo: 'Just now',
                sharedAt: new Date().toISOString(),
                title: `Community Recommendation: ${community?.name}`,
                content: shareMessageNote || `Check out the "${community?.name}" community!`,
                // Shared community metadata for the preview card
                sharedCommunity: {
                    id: communityId,
                    name: community?.name,
                    description: community?.description,
                    banner: community?.banner,
                    thumbnail: community?.thumbnail,
                    membersCount: community?.membersCount || membersList.length,
                    category: community?.category || 'Technology',
                    type: community?.type || 'Public',
                    url: window.location.href
                },
                likes: 0,
                comments: 0,
                isPinned: false
            };

            localStorage.setItem(savedPostsKey, JSON.stringify([crosspost, ...existingTargetPosts]));
            // Dispatch storage event so if that community page is open it auto-refreshes
            window.dispatchEvent(new StorageEvent('storage', { key: savedPostsKey }));
            setIsSharingProcess(false);
            setIsShareModalOpen(false);
            setShareTab('menu');
            setShareMessageNote('');
            showToast(`✅ Successfully shared "${community?.name}" to ${targetCommName}'s feed!`, 'success');
        } catch (err) {
            console.error('Failed to share to community:', err);
            setIsSharingProcess(false);
            showToast('Failed to share to community feed.', 'error');
        }
    };

    // Handler 2: Share with Users (Send Notification)
    const handleShareToUsersSubmit = async (e) => {
        if (e) e.preventDefault();
        if (shareSelectedUsers.length === 0) {
            showToast('Please select at least one team member.', 'error');
            return;
        }
        setIsSharingProcess(true);
        try {
            const targetCommId = community?.id || communityId || 101;
            const targetCommName = community?.name || 'Community';
            const targetLink = `/community/view?id=${targetCommId}`;

            const savedNotifs = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            const newNotifs = shareSelectedUsers.map(uId => ({
                id: Date.now() + Math.floor(Math.random() * 1000),
                targetUserId: uId,
                type: 'community_shared',
                communityId: targetCommId,
                communityName: targetCommName,
                actionLink: targetLink,
                linkUrl: targetLink,
                text: `📢 ${currentUser?.name || 'A team member'} shared community "${targetCommName}" with you: "${shareMessageNote || 'Check out this community!'}"`,
                senderName: currentUser?.name || 'Team Member',
                senderAvatar: currentUser?.avatar || null,
                time: 'Just now',
                unread: true,
                icon: 'groups',
                color: 'text-indigo-400',
                bg: 'bg-indigo-500/10'
            }));

            localStorage.setItem('knome_notifications', JSON.stringify([...newNotifs, ...savedNotifs]));
            setIsSharingProcess(false);
            setIsShareModalOpen(false);
            setShareTab('menu');
            setShareSelectedUsers([]);
            setShareMessageNote('');
            showToast(`✅ Notification sent to ${newNotifs.length} selected team member(s)!`, 'success');
        } catch (err) {
            console.error('Failed to share with users:', err);
            setIsSharingProcess(false);
            showToast('Failed to send notification to users.', 'error');
        }
    };

    const SAMPLE_PDF_DATA_URL = 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvQ291bnQgMSAvS2lkcyBbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9Db250ZW50cyA0IDAgUiAvUmVzb3VyY2VzIDw8L0ZvbnQgPDwvRjEgNSAwIFI+Pj4+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNzQ+PnN0cmVhbQpCVAovRjEgMjQgVGYKMTAwIDcwMCBUZAkKKEtub21lIC0gU3lzdGVtIEFyY2hpdGVjdHVyZSBPdmVydmlldykgVGosCjAgLTMwIFRkCihNUE9ubGluZSBMaW1pdGVkKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwvVHlwZSAvRm9udCAvU3Vic3R5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY4IDAMDAwMCBuIAowMDAwMDAwMTI1IDAMDAwMCBuIAowMDAwMDAwMjU3IDAMDAwMCBuIAowMDAwMDAwMzgwIDAMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNiAvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0NjkKJSVFT0Y=';

    const readFileAsDataUrl = (file) => {
        return new Promise((resolve) => {
            if (!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    };

    const safeSetStorage = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
            console.warn(`LocalStorage quota reached for key: ${key}. Cleaning up and sanitizing payload...`, err);
            try {
                // Free up space by removing non-essential notifications
                localStorage.removeItem('knome_notifications');

                if (Array.isArray(value)) {
                    // Sanitize heavy Base64 URLs to prevent quota crashes
                    const sanitized = value.map(item => {
                        if (item && item.url && typeof item.url === 'string' && item.url.length > 50000 && item.url.startsWith('data:')) {
                            return {
                                ...item,
                                url: item.extension === 'pdf'
                                    ? SAMPLE_PDF_DATA_URL
                                    : 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=600&h=400'
                            };
                        }
                        return item;
                    });
                    localStorage.setItem(key, JSON.stringify(sanitized.slice(0, 20)));
                } else {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            } catch (fallbackErr) {
                console.error('LocalStorage safe save fallback failed:', fallbackErr);
            }
        }
    };

    // IndexedDB helper for storing large user uploaded files cleanly without LocalStorage limits
    const saveFileBlobToIndexedDb = async (fileId, fileDataUrl) => {
        if (!fileId || !fileDataUrl) return;
        try {
            const request = indexedDB.open('KnomeCommunityFilesDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files');
                }
            };
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction('files', 'readwrite');
                tx.objectStore('files').put(fileDataUrl, String(fileId));
            };
        } catch (err) {
            console.warn('IndexedDB file save warning:', err);
        }
    };

    const getFileBlobFromIndexedDb = (fileId) => {
        return new Promise((resolve) => {
            if (!fileId) return resolve(null);
            try {
                const request = indexedDB.open('KnomeCommunityFilesDB', 1);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('files')) {
                        db.createObjectStore('files');
                    }
                };
                request.onsuccess = (e) => {
                    const db = e.target.result;
                    const tx = db.transaction('files', 'readonly');
                    const getReq = tx.objectStore('files').get(String(fileId));
                    getReq.onsuccess = () => resolve(getReq.result || null);
                    getReq.onerror = () => resolve(null);
                };
                request.onerror = () => resolve(null);
            } catch (err) {
                resolve(null);
            }
        });
    };

    useEffect(() => {
        let isMounted = true;
        const loadPreviewUrl = async () => {
            if (!previewModalFile) {
                setActivePdfBlobUrl(null);
                return;
            }
            
            let rawUrl = previewModalFile.url;

            // Try to load exact uploaded file from IndexedDB first
            const idbUrl = await getFileBlobFromIndexedDb(previewModalFile.id);
            if (idbUrl) {
                rawUrl = idbUrl;
            }

            if (isMounted) {
                const blobUrl = getPdfBlobUrl(rawUrl || SAMPLE_PDF_DATA_URL);
                setActivePdfBlobUrl(blobUrl);
            }
        };

        loadPreviewUrl();

        return () => {
            isMounted = false;
        };
    }, [previewModalFile]);

    // Smart AI File Type & Category Auto-Detector
    const detectFileTypeAndCategory = (file) => {
        if (!file || !file.name) return { category: 'Document', ext: 'pdf' };
        
        const nameParts = file.name.split('.');
        const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : '';
        const mimeType = (file.type || '').toLowerCase();

        // 1. Image
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'].includes(ext) || mimeType.startsWith('image/')) {
            return { category: 'Image', ext: ext || 'png' };
        }

        // 2. Video & Audio
        if (['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'wmv', 'flv'].includes(ext) || mimeType.startsWith('video/')) {
            return { category: 'Video', ext: ext || 'mp4' };
        }
        if (['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma'].includes(ext) || mimeType.startsWith('audio/')) {
            return { category: 'Video', ext: ext || 'mp3' };
        }

        // 3. Archive / Compressed
        if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('tar') || mimeType.includes('archive')) {
            return { category: 'Archive', ext: ext || 'zip' };
        }

        // 4. Code / Developer Script
        if (['js', 'jsx', 'ts', 'tsx', 'py', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'sql', 'java', 'go', 'rs', 'sh', 'php', 'xml', 'yaml', 'yml'].includes(ext) || mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml')) {
            return { category: 'Code', ext: ext || 'code' };
        }

        // 5. Document (PDF, Word, Excel, PowerPoint, Text)
        return { category: 'Document', ext: ext || 'pdf' };
    };

    const handleFileUploadSubmit = async (e) => {
        e.preventDefault();
        const rawName = uploadFileName.trim() || selectedUploadFile?.name || 'Shared Document';
        if (!rawName) {
            showToast('Please enter a valid file name.', 'warning');
            return;
        }

        setIsUploadingFile(true);
        try {
            const detected = detectFileTypeAndCategory(selectedUploadFile);
            const fileCategory = uploadFileCategory || detected.category;
            const fileExt = detected.ext;

            const rawSizeBytes = selectedUploadFile?.size || 45000;
            const formattedSize = rawSizeBytes > 1048576 
                ? `${(rawSizeBytes / 1048576).toFixed(1)} MB` 
                : `${Math.round(rawSizeBytes / 1024)} KB`;

            let fileDataUrl = null;
            if (selectedUploadFile) {
                fileDataUrl = await readFileAsDataUrl(selectedUploadFile);
            }

            const fileId = Date.now();
            const finalUrl = fileDataUrl || (fileExt === 'pdf' ? SAMPLE_PDF_DATA_URL : '#');

            // Save full exact user uploaded file URL to IndexedDB!
            await saveFileBlobToIndexedDb(fileId, finalUrl);

            // Light weight payload for LocalStorage
            const storedUrlForLocalStorage = (finalUrl && typeof finalUrl === 'string' && finalUrl.length > 50000 && finalUrl.startsWith('data:'))
                ? (fileExt === 'pdf' ? SAMPLE_PDF_DATA_URL : 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=600&h=400')
                : finalUrl;

            const newFileItem = {
                id: fileId,
                name: rawName,
                category: fileCategory,
                extension: fileExt,
                size: formattedSize,
                uploadedBy: currentUser?.name || 'Sourabh Sahu',
                uploadedAt: new Date().toISOString(),
                url: finalUrl, // Keep exact URL in memory state
                hasIndexedDb: true,
                downloadCount: 0
            };

            const targetId = community?.id || communityId || 101;
            const savedFilesKey = `knome_community_files_${targetId}`;

            // Save sanitized payload for LocalStorage metadata list
            const localStorageItem = { ...newFileItem, url: storedUrlForLocalStorage };
            const updatedFilesMemory = [newFileItem, ...filesList];
            const updatedFilesStorage = [localStorageItem, ...filesList.map(f => ({ ...f, url: f.url?.length > 50000 ? SAMPLE_PDF_DATA_URL : f.url }))];
            
            setFilesList(updatedFilesMemory);
            safeSetStorage(savedFilesKey, updatedFilesStorage);

            setIsUploadingFile(false);
            setIsUploadModalOpen(false);
            setUploadFileName('');
            setSelectedUploadFile(null);
            showToast(`✨ File detected as ${fileCategory} (${fileExt.toUpperCase()}) and saved successfully!`, 'success');
        } catch (err) {
            console.error('Failed to upload file:', err);
            setIsUploadingFile(false);
            showToast('Failed to upload file.', 'error');
        }
    };

    const handleDeleteFile = (fileId, fileName) => {
        const targetId = community?.id || communityId || 101;
        const savedFilesKey = `knome_community_files_${targetId}`;
        const updated = filesList.filter(f => f.id !== fileId);
        setFilesList(updated);
        safeSetStorage(savedFilesKey, updated);
        showToast(`Deleted ${fileName || 'file'}`, 'info');
    };

    // Community Creator check
    const isCreator = (community?.creatorUserId && String(community.creatorUserId) === String(currentUser?.id)) ||
                      (community?.createdBy && currentUser?.name && community.createdBy.toLowerCase().includes(currentUser.name.toLowerCase())) ||
                      (community?.adminContact && currentUser?.name && community.adminContact.toLowerCase().includes(currentUser.name.toLowerCase()));

    // Treat SYSADM, CADM, Creator, and assigned Admins/Moderators as Community Admins
    const isAdmin = ['SYSADM', 'CADM'].includes(currentUser?.role) ||
                    ['System Administrator', 'HR Administrator', 'Community Administrator', 'System Admin'].includes(currentUser?.roleName) ||
                    isCreator ||
                    membersList.some(m => String(m.userId || m.id) === String(currentUser?.id) && (m.memberType === 'Admin' || m.memberType === 'Moderator'));

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const customList = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
            const isLocalCustomCommunity = customList.some(c => String(c.id) === String(communityId)) || (Number(communityId) > 1000000);
            const isValidInt32 = communityId && !isNaN(communityId) && Number(communityId) > 0 && Number(communityId) <= 2147483647 && !isLocalCustomCommunity;

            const [commData, postsData, rawMembers] = await Promise.all([
                isValidInt32 ? communitiesApi.getById(communityId).catch(() => null) : null,
                isValidInt32 ? communitiesApi.getPosts(communityId).catch(() => []) : [],
                isValidInt32 ? communitiesApi.getMembers(communityId).catch(() => []) : []
            ]);
            
            if (commData) {
                const imgs = getCommunityImages(commData.name, commData.categoryName);
                setCommunity({
                    id: commData.communityId,
                    name: commData.name,
                    type: commData.communityType || 'Public',
                    category: commData.categoryName || 'Technology',
                    membersCount: commData.membersCount || 1,
                    adminContact: commData.createdByUserName || 'Admin',
                    banner: resolveMediaUrl(commData.bannerUrl || commData.bannerImageUrl) || imgs.banner,
                    thumbnail: resolveMediaUrl(commData.thumbnailUrl) || imgs.thumbnail,
                    description: commData.description || 'Community for MPOnline team members.',
                    rules: commData.rules ? (Array.isArray(commData.rules) ? commData.rules : commData.rules.split('\n')) : ['1. Be respectful and constructive.', '2. Keep discussions relevant.', '3. Follow company guidelines.'],
                    faq: (() => {
                        if (!commData.faq) {
                            return [
                                { q: 'Who can join?', a: 'All MPOnline employees and department members.' },
                                { q: 'How to post?', a: 'Join as a Member to write posts and participate in discussions.' }
                            ];
                        }
                        if (Array.isArray(commData.faq)) return commData.faq;
                        if (typeof commData.faq === 'string') {
                            const trimmedFaq = commData.faq.trim();
                            if (trimmedFaq.startsWith('[') || trimmedFaq.startsWith('{')) {
                                try {
                                    const parsed = JSON.parse(trimmedFaq);
                                    if (Array.isArray(parsed)) return parsed;
                                } catch (e) {
                                    // Plain text string
                                }
                            }
                            const lines = commData.faq.split('\n').map(l => l.trim()).filter(Boolean);
                            const items = [];
                            let q = '', a = '';
                            lines.forEach(l => {
                                if (/^q:/i.test(l)) {
                                    if (q) items.push({ q, a: a || 'Yes' });
                                    q = l.replace(/^q:\s*/i, '');
                                    a = '';
                                } else if (/^a:/i.test(l)) {
                                    a = l.replace(/^a:\s*/i, '');
                                } else if (q) {
                                    a += (a ? ' ' : '') + l;
                                }
                            });
                            if (q) items.push({ q, a: a || 'Yes' });
                            return items.length > 0 ? items : [{ q: 'Community FAQ', a: commData.faq }];
                        }
                        return [
                            { q: 'Who can join?', a: 'All MPOnline employees and department members.' },
                            { q: 'How to post?', a: 'Join as a Member to write posts and participate in discussions.' }
                        ];
                    })()
                });

                // Resolve Persistent Members for this Community (FR-CM-06)
                const savedMembersKey = `knome_community_members_${commData.communityId}`;
                const localMembersApi = JSON.parse(localStorage.getItem(savedMembersKey) || '[]');
                let resolvedMembers = Array.isArray(rawMembers) && rawMembers.length > 0 ? rawMembers : (localMembersApi.length > 0 ? localMembersApi : [
                    { userId: 1, fullName: 'Loveneesh Sharma', employeeId: 'MPO101', designation: 'IT Operations Manager', memberType: 'Admin', status: 'Approved' },
                    { userId: 2, fullName: 'Vishendra Sharma', employeeId: 'MPO102', designation: 'Community Experience Specialist', memberType: 'Admin', status: 'Approved' },
                    { userId: 3, fullName: 'Sourabh Sahu', employeeId: 'MPO103', designation: 'Talent Acquisition Manager', memberType: 'Moderator', status: 'Approved' },
                    { userId: 4, fullName: 'Mayur Verma', employeeId: 'MPO104', designation: 'Senior Software Engineer', memberType: 'Member', status: 'Approved' },
                    { userId: 5, fullName: 'Meghna Tiwari', employeeId: 'MPO105', designation: 'Product Designer', memberType: 'Member', status: 'Approved' },
                    { userId: 6, fullName: 'Rishikesh Ugle', employeeId: 'MPO106', designation: 'Software Engineer', memberType: 'Member', status: 'Approved' },
                ]);

                const userJoinedList = JSON.parse(localStorage.getItem(`knome_joined_communities_${currentUser?.id || 'guest'}`) || '[]');
                const localEntry = userJoinedList.find(c => String(c.id) === String(commData.communityId));
                const isDefaultOrg = (commData.communityType || '').toLowerCase().includes('default') || (commData.communityType || '').toLowerCase().includes('org');
                const isMemberInList = currentUser && resolvedMembers.some(m => 
                    String(m.userId || m.id) === String(currentUser.id) || 
                    (currentUser.name && (m.fullName || m.name || '').toLowerCase() === currentUser.name.toLowerCase()) ||
                    (currentUser.employeeId && m.employeeId === currentUser.employeeId)
                );
                const isUserJoined = !!(localEntry && localEntry.status === 'joined') || 
                                     commData.currentUserMembershipStatus?.toLowerCase() === 'joined' || 
                                     commData.currentUserMembershipStatus?.toLowerCase() === 'approved' ||
                                     isMemberInList;
                const isUserSubscribed = !!(localEntry && localEntry.status === 'subscribed') || commData.currentUserMembershipStatus?.toLowerCase() === 'subscribed';

                // FR-CM-01: Default (Org) communities auto-join all employees
                const savedRequests = JSON.parse(localStorage.getItem(`knome_join_requests_${commData.communityId}`) || '[]');
                const myRequest = savedRequests.find(r => String(r.userId || r.id) === String(currentUser?.id));
                let resolvedStatus;
                if (isUserJoined || isDefaultOrg) resolvedStatus = 'joined';
                else if (isUserSubscribed) resolvedStatus = 'subscribed';
                else if (myRequest) resolvedStatus = 'requested';
                else {
                    const apiStatus = commData.currentUserMembershipStatus?.toLowerCase();
                    resolvedStatus = (apiStatus && apiStatus !== 'none') ? apiStatus : 'none';
                }
                setMembershipStatus(resolvedStatus);

                if ((isUserJoined || isDefaultOrg) && currentUser && !resolvedMembers.some(m => String(m.userId || m.id) === String(currentUser.id))) {
                    resolvedMembers.push({
                        userId: currentUser.id,
                        fullName: currentUser.name,
                        employeeId: currentUser.employeeId || 'MPO100',
                        designation: currentUser.roleName || 'Member',
                        memberType: 'Member',
                        status: 'Approved',
                        profilePhotoUrl: currentUser.avatar
                    });
                }

                setMembersList(resolvedMembers);
                localStorage.setItem(savedMembersKey, JSON.stringify(resolvedMembers));

                // Load persisted join requests (from localStorage) and merge with any API pending
                const pendingFromMembers = resolvedMembers.filter(m => m.status === 'Pending' || m.membershipStatus === 'Pending');
                const mergedRequests = [...savedRequests];
                pendingFromMembers.forEach(m => {
                    if (!mergedRequests.some(r => String(r.id) === String(m.userId || m.id))) {
                        mergedRequests.push({ id: m.userId || m.id, userId: m.userId || m.id, name: m.fullName, fullName: m.fullName, role: m.designation, designation: m.designation, department: 'MPOnline', requestedAt: new Date().toISOString(), status: 'Pending' });
                    }
                });
                setJoinRequests(mergedRequests);

                // Load persistent subscribers and suspended members
                const savedSubs = JSON.parse(localStorage.getItem(`knome_community_subscribers_${commData.communityId}`) || '[]');
                setSubscribersList(savedSubs);
                const savedSuspended = JSON.parse(localStorage.getItem(`knome_community_suspended_${commData.communityId}`) || '[]');
                setSuspendedMembers(savedSuspended);

                // Load persistent Files & Media for this community
                const savedFilesKey2 = `knome_community_files_${commData.communityId}`;
                const localFiles = JSON.parse(localStorage.getItem(savedFilesKey2) || '[]');
                const sanitizedFiles = localFiles.map(f => {
                    if (f.extension === 'pdf' && (!f.url || f.url === '#' || f.url.includes('w3.org') || f.url.includes('localhost') || f.url.startsWith('blob:'))) {
                        return { ...f, url: SAMPLE_PDF_DATA_URL };
                    }
                    return f;
                });

                if (sanitizedFiles.length > 0) {
                    setFilesList(sanitizedFiles);
                    localStorage.setItem(savedFilesKey2, JSON.stringify(sanitizedFiles));
                } else {
                    const seedFiles = [
                        { id: 1, name: 'System_Architecture_Overview.pdf', category: 'Document', extension: 'pdf', size: '3.4 MB', uploadedBy: 'Loveneesh Sharma', uploadedAt: '2026-07-25T10:30:00.000Z', url: SAMPLE_PDF_DATA_URL, downloadCount: 14 },
                        { id: 2, name: 'API_Integration_Guild_v2.docx', category: 'Document', extension: 'docx', size: '1.2 MB', uploadedBy: 'Vishendra Sharma', uploadedAt: '2026-07-26T14:15:00.000Z', url: 'https://filesamples.com/samples/document/docx/sample3.docx', downloadCount: 9 },
                        { id: 3, name: 'Database_Schema_Architecture.png', category: 'Image', extension: 'png', size: '850 KB', uploadedBy: 'Sourabh Sahu', uploadedAt: '2026-07-27T09:45:00.000Z', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200&h=800', downloadCount: 22 },
                        { id: 4, name: 'Frontend_Boilerplate_Assets.zip', category: 'Archive', extension: 'zip', size: '14.8 MB', uploadedBy: 'Rishikesh Ugle', uploadedAt: '2026-07-28T08:00:00.000Z', url: '#', downloadCount: 7 }
                    ];
                    setFilesList(seedFiles);
                    localStorage.setItem(savedFilesKey2, JSON.stringify(seedFiles));
                }
            } else {
                // Fallback check custom created communities or seeds
                const customList = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
                const found = customList.find(c => String(c.id) === String(communityId));
                
                const targetId = communityId || 101;
                const savedMembersKey = `knome_community_members_${targetId}`;
                const localMembers = JSON.parse(localStorage.getItem(savedMembersKey) || '[]');

                const creatorName = found?.createdBy || 'Rishikesh Ugle (Community Admin)';
                let resolvedMembers = localMembers.length > 0 ? localMembers : [
                    { userId: 1, fullName: 'Loveneesh Sharma', employeeId: 'MPO101', designation: 'IT Operations Manager', memberType: 'Admin', status: 'Approved' },
                    { userId: 2, fullName: 'Vishendra Sharma', employeeId: 'MPO102', designation: 'Community Experience Specialist', memberType: 'Admin', status: 'Approved' },
                    { userId: 3, fullName: 'Sourabh Sahu', employeeId: 'MPO103', designation: 'Talent Acquisition Manager', memberType: 'Moderator', status: 'Approved' },
                    { userId: 4, fullName: 'Mayur Verma', employeeId: 'MPO104', designation: 'Senior Software Engineer', memberType: 'Member', status: 'Approved' },
                    { userId: 5, fullName: 'Meghna Tiwari', employeeId: 'MPO105', designation: 'Product Designer', memberType: 'Member', status: 'Approved' },
                    { userId: 6, fullName: 'Rishikesh Ugle', employeeId: 'MPO106', designation: 'Software Engineer', memberType: 'Member', status: 'Approved' },
                ];

                // Check if current user explicitly joined, created the community, or is in resolved members
                const userJoinedList = JSON.parse(localStorage.getItem(`knome_joined_communities_${currentUser?.id || 'guest'}`) || '[]');
                const isMemberInList = currentUser && resolvedMembers.some(m => 
                    String(m.userId || m.id) === String(currentUser.id) || 
                    (currentUser.name && (m.fullName || m.name || '').toLowerCase() === currentUser.name.toLowerCase()) ||
                    (currentUser.employeeId && m.employeeId === currentUser.employeeId)
                );
                const isUserJoined = userJoinedList.some(c => String(c.id) === String(targetId)) || 
                                     (found?.createdBy && currentUser?.name && found.createdBy.toLowerCase().includes(currentUser.name.toLowerCase())) ||
                                     isMemberInList;

                if (isUserJoined && currentUser && !resolvedMembers.some(m => String(m.userId || m.id) === String(currentUser.id))) {
                    resolvedMembers.push({
                        userId: currentUser.id,
                        fullName: currentUser.name,
                        employeeId: currentUser.employeeId || 'MPO100',
                        designation: currentUser.roleName || 'Member',
                        memberType: 'Member',
                        status: 'Approved',
                        profilePhotoUrl: currentUser.avatar
                    });
                }

                setMembersList(resolvedMembers);
                localStorage.setItem(savedMembersKey, JSON.stringify(resolvedMembers));

                // Load persisted join requests for the fallback/offline path
                const savedRequests = JSON.parse(localStorage.getItem(`knome_join_requests_${targetId}`) || '[]');
                setJoinRequests(savedRequests);

                const myRequest = savedRequests.find(r => String(r.userId || r.id) === String(currentUser?.id));
                const isDefaultOrgFallback = found ? ((found.type || '').toLowerCase().includes('default') || (found.type || '').toLowerCase().includes('org')) : false;
                const calcStatus = (isUserJoined || isDefaultOrgFallback) ? 'joined' : (myRequest ? 'requested' : 'none');

                if (found) {
                    setCommunity({
                        id: found.id,
                        name: found.name,
                        type: found.type || 'Public',
                        category: 'Technology',
                        membersCount: resolvedMembers.length,
                        adminContact: creatorName,
                        banner: found.banner || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200&h=400',
                        thumbnail: found.avatar || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200&h=200',
                        description: found.description || 'A community for collaboration.',
                        rules: ['1. Be respectful.', '2. Share knowledge.', '3. Follow company policy.'],
                        faq: [{ q: 'Purpose?', a: 'Knowledge sharing & teamwork.' }]
                    });
                    setMembershipStatus(calcStatus);
                } else {
                    const enterpriseChannel = ENTERPRISE_CHANNELS_SEED[String(targetId)];
                    if (enterpriseChannel) {
                        const imgs = getCommunityImages(enterpriseChannel.name, enterpriseChannel.category);
                        setCommunity({
                            id: targetId,
                            name: enterpriseChannel.name,
                            type: enterpriseChannel.type || 'Public',
                            category: enterpriseChannel.category,
                            membersCount: resolvedMembers.length,
                            adminContact: enterpriseChannel.adminContact,
                            banner: imgs.banner,
                            thumbnail: imgs.thumbnail,
                            description: enterpriseChannel.description,
                            rules: enterpriseChannel.rules,
                            faq: enterpriseChannel.faq
                        });
                        setMembershipStatus(calcStatus);
                    } else {
                        // Default seed community view
                        setCommunity({
                            id: targetId,
                            name: 'DotNet Developers Community',
                            type: 'Public',
                            category: 'Technology',
                            membersCount: resolvedMembers.length,
                            adminContact: 'Loveneesh Sharma (System Admin)',
                            banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200&h=400',
                            thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200&h=200',
                            description: 'The DotNet Developers Community is a place for developers, students, and technology enthusiasts to collaborate.',
                            rules: ['1. Keep discussions technical and constructive.', '2. No unverified code snippets.', '3. Respect all members.'],
                            faq: [
                                { q: 'Who can post?', a: 'Any approved Community Member can share code and technical updates.' },
                                { q: 'How are posts moderated?', a: 'Community Admins review reports and pin top discussions.' }
                            ]
                        });
                        setMembershipStatus(calcStatus);
                    }
                }
            }

            const resolvedTargetId = communityId || 101;
            const savedPostsKey = `knome_community_posts_${resolvedTargetId}`;
            const localCommunityPosts = JSON.parse(localStorage.getItem(savedPostsKey) || '[]');

            let mergedPosts = [];
            if (postsData && Array.isArray(postsData) && postsData.length > 0) {
                mergedPosts = postsData.map(p => ({
                    id: p.postId,
                    author: p.authorFullName || 'Employee',
                    role: p.authorDesignation || 'Member',
                    time: new Date(p.createdDate).toLocaleString(),
                    content: p.contentText,
                    title: p.title,
                    likes: p.reactionCount || 0,
                    comments: 0,
                    isPinned: p.isPinned
                }));
            } else {
                mergedPosts = [
                    {
                        id: 1,
                        author: 'Loveneesh Sharma',
                        role: 'System Administrator',
                        time: '2 hours ago',
                        content: 'Welcome to the community! Please feel free to introduce yourself and share any technical questions or resources here.',
                        likes: 5,
                        comments: 2,
                        isPinned: true
                    }
                ];
            }

            if (localCommunityPosts.length > 0) {
                const existingIds = new Set(mergedPosts.map(p => String(p.id)));
                const formattedLocal = localCommunityPosts.map(p => ({
                    id: p.id,
                    author: p.authorName || p.author || 'Member',
                    role: p.authorRole || p.role || 'Member',
                    avatar: p.authorAvatar || p.avatar || null,
                    time: p.timeAgo || p.time || 'Just now',
                    title: p.title,
                    content: p.content,
                    sharedCommunity: p.sharedCommunity || null,
                    likes: p.likes || 0,
                    comments: p.comments || 0,
                    isPinned: !!p.isPinned
                }));
                const freshLocal = formattedLocal.filter(p => !existingIds.has(String(p.id)));
                mergedPosts = [...freshLocal, ...mergedPosts];
            }

            setPosts(mergedPosts);
        } catch (error) {
            console.error('Failed to load community details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const handleMembersUpdated = () => {
            const targetId = communityId || community?.id || 101;
            const localMembers = JSON.parse(localStorage.getItem(`knome_community_members_${targetId}`) || '[]');
            if (localMembers && localMembers.length > 0) {
                setMembersList(localMembers);
                setCommunity(prev => prev ? { ...prev, membersCount: localMembers.length } : prev);
            }
            const savedSubs = JSON.parse(localStorage.getItem(`knome_community_subscribers_${targetId}`) || '[]');
            setSubscribersList(savedSubs);
            const savedSuspended = JSON.parse(localStorage.getItem(`knome_community_suspended_${targetId}`) || '[]');
            setSuspendedMembers(savedSuspended);
            // Also refresh join requests and files
            const savedRequests = JSON.parse(localStorage.getItem(`knome_join_requests_${targetId}`) || '[]');
            setJoinRequests(savedRequests);
            const savedFiles = JSON.parse(localStorage.getItem(`knome_community_files_${targetId}`) || '[]');
            if (savedFiles.length > 0) setFilesList(savedFiles);
        };

        window.addEventListener('community-members-updated', handleMembersUpdated);
        window.addEventListener('community-joined-change', handleMembersUpdated);
        window.addEventListener('storage', handleMembersUpdated);

        return () => {
            window.removeEventListener('community-members-updated', handleMembersUpdated);
            window.removeEventListener('community-joined-change', handleMembersUpdated);
            window.removeEventListener('storage', handleMembersUpdated);
        };
    }, [communityId]);

    if (isLoading || !community) {
        return (
            <div className="flex-1 flex items-center justify-center p-12 min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-[40px] text-indigo-500 animate-spin">progress_activity</span>
                    <p className="text-sm font-bold text-slate-500">Loading Community Details...</p>
                </div>
            </div>
        );
    }

    // Create New Post inside Community (Only for Members - FR-CM-06)
    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!postText.trim()) return;
        
        try {
            const res = await apiClient.post(`/communities/${communityId}/posts`, { contentText: postText.trim(), audienceType: 'Community' });
            const p = res?.data || res;

            if (p && (p.postId || p.id)) {
                setPosts([{
                    id: p.postId || p.id,
                    author: p.authorFullName,
                    role: p.authorDesignation || 'Member',
                    time: new Date(p.createdDate).toLocaleString(),
                    content: p.contentText,
                    likes: 0,
                    comments: 0,
                    isPinned: false
                }, ...posts]);
                setPostText('');
            }
        } catch (error) {
            console.error('Failed to create community post:', error);
        }
    };



    const handleToggleRole = (memberId, currentRole) => {
        const newRole = currentRole === 'Admin' ? 'Moderator' : (currentRole === 'Moderator' ? 'Member' : 'Moderator');
        const targetId = communityId || community?.id || 101;
        setMembersList(prev => {
            const updated = prev.map(m => {
                if (String(m.userId || m.id) === String(memberId)) {
                    return { ...m, memberType: newRole };
                }
                return m;
            });
            localStorage.setItem(`knome_community_members_${targetId}`, JSON.stringify(updated));
            localStorage.setItem(`knome_community_members_updated_${targetId}`, Date.now().toString());
            window.dispatchEvent(new CustomEvent('community-members-updated', { detail: { communityId: targetId } }));
            return updated;
        });
        alert(`Member role updated to ${newRole}. All active users will see the updated role.`);
    };

    const handleRemoveMemberByAdmin = (memberId, memberName) => {
        if (!window.confirm(`Are you sure you want to remove ${memberName} from this community?`)) return;
        const targetId = communityId || community?.id || 101;
        setMembersList(prev => {
            const updated = prev.filter(m => String(m.userId || m.id) !== String(memberId));
            localStorage.setItem(`knome_community_members_${targetId}`, JSON.stringify(updated));
            localStorage.setItem(`knome_community_members_updated_${targetId}`, Date.now().toString());
            window.dispatchEvent(new CustomEvent('community-members-updated', { detail: { communityId: targetId } }));
            window.dispatchEvent(new CustomEvent('community-joined-change'));
            return updated;
        });
        setCommunity(prev => ({ ...prev, membersCount: Math.max(1, (prev.membersCount || 1) - 1) }));
        alert(`${memberName} has been removed from this community.`);
    };

    const handleJoinAction = async () => {
        const isPrivate = community?.type === 'Private';
        const newStatus = isPrivate ? 'requested' : 'joined';
        const targetId = community?.id || communityId || 101;

        try {
            await communitiesApi.join(community.id).catch(() => null);
        } catch (err) {
            console.warn('Backend join API warning:', err);
        }

        if (newStatus === 'joined') {
            setMembershipStatus('joined');

            // FR-CM-09: Persist join to localStorage so it survives page refresh
            const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
            const existingJoined = JSON.parse(localStorage.getItem(userKey) || '[]');
            if (!existingJoined.some(c => String(c.id) === String(targetId))) {
                existingJoined.push({ id: targetId, name: community?.name, status: 'joined', joinedAt: new Date().toISOString() });
                localStorage.setItem(userKey, JSON.stringify(existingJoined));
            }

            setMembersList(prev => {
                const exists = prev.some(m => String(m.userId || m.id) === String(currentUser?.id));
                const updated = exists ? prev : [
                    ...prev,
                    {
                        userId: currentUser?.id || 99,
                        fullName: currentUser?.name || 'Current Employee',
                        employeeId: currentUser?.employeeId || 'MPO100',
                        designation: currentUser?.roleName || 'Member',
                        memberType: 'Member',
                        status: 'Approved',
                        profilePhotoUrl: currentUser?.avatar
                    }
                ];
                localStorage.setItem(`knome_community_members_${targetId}`, JSON.stringify(updated));
                localStorage.setItem(`knome_community_members_updated_${targetId}`, Date.now().toString());
                window.dispatchEvent(new CustomEvent('community-members-updated', { detail: { communityId: targetId } }));
                window.dispatchEvent(new CustomEvent('community-joined-change'));
                return updated;
            });
            setCommunity(prev => ({ ...prev, membersCount: (prev.membersCount || 0) + 1 }));
            showToast(`🎉 You have successfully joined "${community?.name}" as a Member!`);
        } else {
            // Private community — save request to localStorage so Admin can see it
            setMembershipStatus('requested');
            const newRequest = {
                id: currentUser?.id || Date.now(),
                userId: currentUser?.id || Date.now(),
                name: currentUser?.name || 'Current Employee',
                fullName: currentUser?.name || 'Current Employee',
                role: currentUser?.roleName || 'Employee',
                designation: currentUser?.roleName || 'Employee',
                department: currentUser?.departmentName || 'Engineering',
                avatar: currentUser?.avatar || null,
                requestedAt: new Date().toISOString(),
                status: 'Pending'
            };

            setJoinRequests(prev => {
                const updated = [newRequest, ...prev.filter(r => String(r.id) !== String(currentUser?.id))];
                localStorage.setItem(`knome_join_requests_${targetId}`, JSON.stringify(updated));
                return updated;
            });

            // Store a notification for community creator and admins
            try {
                const creatorId = community?.creatorUserId || community?.creatorId || 1;
                const adminNotif = {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    targetUserId: creatorId, // targets creator's user ID directly
                    targetCreatorId: creatorId,
                    communityId: targetId,
                    type: 'join_request',
                    text: `🔔 ${currentUser?.name || 'An employee'} requested to join your private community "${community?.name}". Pending your approval.`,
                    senderName: currentUser?.name || 'Employee',
                    senderAvatar: currentUser?.avatar || null,
                    time: 'Just now',
                    unread: true,
                    icon: 'person_add',
                    color: 'text-indigo-400',
                    bg: 'bg-indigo-500/10',
                    communityName: community?.name,
                    actionLink: `/community/view?id=${targetId}`,
                };
                const existing = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
                localStorage.setItem('knome_notifications', JSON.stringify([adminNotif, ...existing]));
                window.dispatchEvent(new CustomEvent('community-invite-sent', {
                    detail: { invitedUserIds: [creatorId], communityName: community?.name, senderName: currentUser?.name }
                }));
            } catch (e) { /* ignore */ }

            showToast(`📨 Join request sent to "${community?.name}" creator & admin. You'll be notified once approved.`, 'info');
        }
    };

    const handleLeaveAction = async () => {
        try {
            await communitiesApi.leave(community.id).catch(() => null);
        } catch (err) {
            console.warn('Backend leave API warning:', err);
        }

        setMembershipStatus('none');
        const targetId = community?.id || communityId || 101;

        // FR-CM-09: Remove from joined localStorage so leave persists on refresh
        const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
        const existingJoined = JSON.parse(localStorage.getItem(userKey) || '[]');
        localStorage.setItem(userKey, JSON.stringify(existingJoined.filter(c => String(c.id) !== String(targetId))));

        setMembersList(prev => {
            const updated = prev.filter(m => String(m.userId || m.id) !== String(currentUser?.id));
            localStorage.setItem(`knome_community_members_${targetId}`, JSON.stringify(updated));
            localStorage.setItem(`knome_community_members_updated_${targetId}`, Date.now().toString());
            window.dispatchEvent(new CustomEvent('community-members-updated', { detail: { communityId: targetId } }));
            window.dispatchEvent(new CustomEvent('community-joined-change'));
            return updated;
        });
        setCommunity(prev => ({ ...prev, membersCount: Math.max(1, (prev.membersCount || 1) - 1) }));
        showToast(`You have left "${community?.name}".`, 'info');
    };

    const handlePin = async (postId) => {
        const targetPost = posts.find(p => p.id === postId);
        if (!targetPost) return;
        const currentPinnedCount = posts.filter(p => p.isPinned).length;
        if (!targetPost.isPinned && currentPinnedCount >= 3) {
            alert('Maximum 3 pinned posts allowed per community (FR-CM-06).');
            return;
        }
        try {
            await communitiesApi.togglePinPost(communityId || id, postId);
            setPosts(prev => prev.map(p => {
                if (p.id === postId) return { ...p, isPinned: !p.isPinned };
                return p;
            }));
        } catch (err) {
            const errMsg = err?.response?.data?.message || err?.message || 'Failed to pin post. Maximum 3 pinned posts allowed.';
            alert(errMsg);
        }
    };

    const handleDelete = (postId) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            setPosts(prev => prev.filter(p => p.id !== postId));
        }
    };

    const handleSuspend = (memberId, memberName) => {
        if (!window.confirm(`Suspend ${memberName} from this community? They will lose access to post and view content.`)) return;
        const targetId = community?.id || communityId || 101;
        const memberToSuspend = membersList.find(m => String(m.userId || m.id) === String(memberId));
        if (!memberToSuspend) return;

        setSuspendedMembers(prev => {
            const updated = [...prev, { ...memberToSuspend, suspendedAt: new Date().toISOString(), suspendedBy: currentUser?.name }];
            localStorage.setItem(`knome_community_suspended_${targetId}`, JSON.stringify(updated));
            return updated;
        });
        setMembersList(prev => {
            const updated = prev.filter(m => String(m.userId || m.id) !== String(memberId));
            localStorage.setItem(`knome_community_members_${targetId}`, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('community-members-updated', { detail: { communityId: targetId } }));
            window.dispatchEvent(new CustomEvent('community-joined-change'));
            return updated;
        });
        setCommunity(prev => ({ ...prev, membersCount: Math.max(1, (prev.membersCount || 1) - 1) }));
        showToast(`${memberName} has been suspended from this community.`, 'warning');
    };

    const handleReinstate = (memberId, memberName) => {
        const targetId = community?.id || communityId || 101;
        const memberToReinstate = suspendedMembers.find(m => String(m.userId || m.id) === String(memberId));
        if (!memberToReinstate) return;
        const { suspendedAt, suspendedBy, ...cleanMember } = memberToReinstate;
        setSuspendedMembers(prev => {
            const updated = prev.filter(m => String(m.userId || m.id) !== String(memberId));
            localStorage.setItem(`knome_community_suspended_${targetId}`, JSON.stringify(updated));
            return updated;
        });
        setMembersList(prev => {
            const updated = [...prev, { ...cleanMember, memberType: 'Member', status: 'Approved' }];
            localStorage.setItem(`knome_community_members_${targetId}`, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('community-members-updated', { detail: { communityId: targetId } }));
            window.dispatchEvent(new CustomEvent('community-joined-change'));
            return updated;
        });
        setCommunity(prev => ({ ...prev, membersCount: (prev.membersCount || 0) + 1 }));
        showToast(`${memberName} has been reinstated as a Community Member.`, 'success');
    };

    const handleSubscribeAction = () => {
        const targetId = community?.id || communityId || 101;
        setMembershipStatus('subscribed');

        // FR-CM-06: Persist subscription to localStorage
        const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
        const existingJoined = JSON.parse(localStorage.getItem(userKey) || '[]');
        if (!existingJoined.some(c => String(c.id) === String(targetId))) {
            existingJoined.push({ id: targetId, name: community?.name, status: 'subscribed', subscribedAt: new Date().toISOString() });
            localStorage.setItem(userKey, JSON.stringify(existingJoined));
        } else {
            const updated = existingJoined.map(c => String(c.id) === String(targetId) ? { ...c, status: 'subscribed' } : c);
            localStorage.setItem(userKey, JSON.stringify(updated));
        }

        setSubscribersList(prev => {
            const exists = prev.some(s => String(s.userId) === String(currentUser?.id));
            if (exists) return prev;
            const updated = [...prev, { userId: currentUser?.id, fullName: currentUser?.name, subscribedAt: new Date().toISOString() }];
            localStorage.setItem(`knome_community_subscribers_${targetId}`, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('community-members-updated', { detail: { communityId: targetId } }));
            return updated;
        });
        showToast(`You are now subscribed to "${community?.name}" (View-Only mode).`);
    };

    const handleUnsubscribeAction = () => {
        const targetId = community?.id || communityId || 101;
        setMembershipStatus('none');

        // Remove from joined localStorage
        const userKey = `knome_joined_communities_${currentUser?.id || 'guest'}`;
        const existingJoined = JSON.parse(localStorage.getItem(userKey) || '[]');
        localStorage.setItem(userKey, JSON.stringify(existingJoined.filter(c => String(c.id) !== String(targetId))));

        setSubscribersList(prev => {
            const updated = prev.filter(s => String(s.userId) !== String(currentUser?.id));
            localStorage.setItem(`knome_community_subscribers_${targetId}`, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('community-members-updated', { detail: { communityId: targetId } }));
            return updated;
        });
        showToast(`You have unsubscribed from "${community?.name}".`, 'info');
    };

    const handleCancelRequest = async () => {
        try { await communitiesApi.leave(community.id).catch(() => null); } catch (e) { /* ignore */ }
        const targetId = community?.id || communityId || 101;
        setJoinRequests(prev => {
            const updated = prev.filter(r => String(r.id) !== String(currentUser?.id));
            localStorage.setItem(`knome_join_requests_${targetId}`, JSON.stringify(updated));
            return updated;
        });
        setMembershipStatus('none');
        showToast('Your join request has been cancelled.', 'info');
    };

    // ─────────────────────────────────────────
    // FR-CM-03: Approve a join request (Admin)
    // ─────────────────────────────────────────
    const handleApprove = async (requestId, requestName) => {
        const targetId = community?.id || communityId || 101;
        const request = joinRequests.find(r => String(r.id || r.userId) === String(requestId));

        // Try backend API
        try {
            await communitiesApi.decideMembership(targetId, requestId, 'Approved').catch(() => null);
        } catch (e) { /* fallback to localStorage */ }

        // Add to membersList
        setMembersList(prev => {
            const exists = prev.some(m => String(m.userId || m.id) === String(requestId));
            const newMember = {
                userId: request?.userId || requestId,
                fullName: request?.name || request?.fullName || requestName,
                employeeId: request?.employeeId || 'MPO100',
                designation: request?.role || request?.designation || 'Employee',
                memberType: 'Member',
                status: 'Approved',
                profilePhotoUrl: request?.avatar || null,
            };
            const updated = exists ? prev : [...prev, newMember];
            localStorage.setItem(`knome_community_members_${targetId}`, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('community-members-updated', { detail: { communityId: targetId } }));
            window.dispatchEvent(new CustomEvent('community-joined-change'));
            return updated;
        });

        // Remove from joinRequests
        setJoinRequests(prev => {
            const updated = prev.filter(r => String(r.id || r.userId) !== String(requestId));
            localStorage.setItem(`knome_join_requests_${targetId}`, JSON.stringify(updated));
            return updated;
        });

        setCommunity(prev => ({ ...prev, membersCount: (prev.membersCount || 0) + 1 }));

        // Notify the requesting user so they see it in their notification bell
        try {
            const approvalNotif = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                targetUserId: requestId,
                type: 'community_approved',
                text: `✅ Your request to join "${community?.name}" has been approved! You are now a Member.`,
                senderName: currentUser?.name || 'Community Admin',
                senderAvatar: currentUser?.avatar || null,
                time: 'Just now',
                unread: true,
                icon: 'check_circle',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                communityName: community?.name,
                communityId: targetId,
                actionLink: `/community/view?id=${targetId}`
            };
            const existing = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            // Remove admin join_request notif for this user + community
            const cleaned = existing.filter(n => !(n.type === 'join_request' && String(n.communityId) === String(targetId)));
            localStorage.setItem('knome_notifications', JSON.stringify([approvalNotif, ...cleaned]));
        } catch (e) { /* ignore */ }

        showToast(`✅ ${requestName} approved and added as a Member.`, 'success');
    };

    // ─────────────────────────────────────────
    // FR-CM-03: Reject a join request (Admin)
    // ─────────────────────────────────────────
    const handleReject = async (requestId, requestName) => {
        const targetId = community?.id || communityId || 101;

        // Try backend API
        try {
            await communitiesApi.decideMembership(targetId, requestId, 'Rejected').catch(() => null);
        } catch (e) { /* fallback */ }

        setJoinRequests(prev => {
            const updated = prev.filter(r => String(r.id || r.userId) !== String(requestId));
            localStorage.setItem(`knome_join_requests_${targetId}`, JSON.stringify(updated));
            return updated;
        });

        // Notify the requesting user of rejection
        try {
            const rejectionNotif = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                targetUserId: requestId,
                type: 'community_rejected',
                text: `❌ Your request to join "${community?.name}" was not approved at this time.`,
                senderName: currentUser?.name || 'Community Admin',
                senderAvatar: currentUser?.avatar || null,
                time: 'Just now',
                unread: true,
                icon: 'cancel',
                color: 'text-red-400',
                bg: 'bg-red-500/10',
                communityName: community?.name,
                communityId: targetId,
                actionLink: '/community'
            };
            const existing = JSON.parse(localStorage.getItem('knome_notifications') || '[]');
            const cleaned = existing.filter(n => !(n.type === 'join_request' && String(n.communityId) === String(targetId)));
            localStorage.setItem('knome_notifications', JSON.stringify([rejectionNotif, ...cleaned]));
        } catch (e) { /* ignore */ }

        showToast(`${requestName}'s join request has been rejected.`, 'warning');
    };

    const isSysAdmin = ['SYSADM', 'CADM'].includes(currentUser?.role) || ['System Administrator', 'HR Administrator', 'Community Administrator', 'System Admin'].includes(currentUser?.roleName);

    const handleDeleteCommunity = async () => {
        if (!window.confirm(`Are you sure you want to delete/remove "${community?.name}"? This action cannot be undone.`)) {
            return;
        }
        try {
            await communitiesApi.delete(communityId || community?.id);
            const customList = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
            const updatedCustom = customList.filter(c => String(c.id) !== String(communityId || community?.id));
            localStorage.setItem('knome_custom_communities', JSON.stringify(updatedCustom));
            alert(`Community "${community?.name}" has been removed.`);
            navigate('/community');
        } catch (err) {
            console.error('Failed to delete community:', err);
            const customList = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
            const updatedCustom = customList.filter(c => String(c.id) !== String(communityId || community?.id));
            localStorage.setItem('knome_custom_communities', JSON.stringify(updatedCustom));
            alert(`Community "${community?.name}" has been removed.`);
            navigate('/community');
        }
    };

    // ─────────────────────────────────────────
    // Files & Media Handlers
    // ─────────────────────────────────────────
    const handleDownloadFile = (file) => {
        setPreviewModalFile(file);
    };

    const filteredFiles = filesList.filter(f => {
        const matchesCat = fileCategoryFilter === 'All' || f.category === fileCategoryFilter;
        const matchesQuery = !fileSearchQuery.trim() || 
            f.name.toLowerCase().includes(fileSearchQuery.toLowerCase()) || 
            (f.uploadedBy && f.uploadedBy.toLowerCase().includes(fileSearchQuery.toLowerCase()));
        return matchesCat && matchesQuery;
    });

    // Sort pinned posts first (FR-CM-08)
    const resolveTargetCommunityFromPost = (p) => {
        if (p.sharedCommunity?.id) return { id: p.sharedCommunity.id, name: p.sharedCommunity.name };
        if (p.title && (p.title.toLowerCase().includes('recommendation') || p.title.toLowerCase().includes('community:'))) {
            const rawName = p.title.replace(/.*Recommendation:\s*/i, '').replace(/.*Community:\s*/i, '').trim();
            if (!rawName) return null;

            const customList = JSON.parse(localStorage.getItem('knome_custom_communities') || '[]');
            const foundCustom = customList.find(c => c.name.toLowerCase() === rawName.toLowerCase());
            if (foundCustom) return { id: foundCustom.id, name: foundCustom.name };

            const seedMap = {
                'tech innovation hub': '1',
                'devops & ai innovation hub': '2',
                'frontend developers guild': '3',
                'database architects': '4',
                'hr & general announcements': '5',
                'culture & hr hub': '6',
                'dotnet developers community': '101'
            };
            const matchedKey = Object.keys(seedMap).find(k => rawName.toLowerCase().includes(k) || k.includes(rawName.toLowerCase()));
            if (matchedKey) return { id: seedMap[matchedKey], name: rawName };
            return { id: '2', name: rawName };
        }
        return null;
    };

    const sortedPosts = [...posts].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.id - a.id;
    });

    return (
        <main className="flex-1 pb-6">

            {/* Toast Notification (FR-CM-09 user feedback) */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-4 duration-300 ${
                    toast.type === 'error' ? 'bg-red-500 text-white' :
                    toast.type === 'warning' ? 'bg-amber-500 text-white' :
                    toast.type === 'info' ? 'bg-slate-700 text-white' :
                    'bg-emerald-500 text-white'
                }`}>
                    <span className="material-symbols-outlined text-[18px]">
                        {toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : toast.type === 'info' ? 'info' : 'check_circle'}
                    </span>
                    {toast.message}
                </div>
            )}

            {/* Hero Section (FR-CM-08: Banner, Thumbnail, Member Count) */}

            <section className="relative min-h-[300px] md:min-h-[340px] w-full rounded-b-3xl overflow-hidden -mt-8 shadow-xl border-b border-slate-800">
                <img 
                    src={community.banner || getCommunityImages(community.name, community.category).banner} 
                    alt={community.name} 
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getCommunityImages(community.name, community.category).banner;
                    }}
                    className="w-full h-full object-cover absolute inset-0" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/50"></div>
                
                <div className="relative z-10 bottom-0 left-0 w-full p-6 md:p-8 flex flex-col md:flex-row items-start md:items-end gap-6 max-w-7xl mx-auto pt-16">
                    <img 
                        src={community.thumbnail || getCommunityImages(community.name, community.category).thumbnail} 
                        alt={community.name} 
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getCommunityImages(community.name, community.category).thumbnail;
                        }}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-slate-900 object-cover shadow-2xl bg-white shrink-0" 
                    />
                    
                    <div className="flex-1 text-white">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="px-2.5 py-0.5 bg-indigo-500/90 backdrop-blur-md text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md">{community.type}</span>
                            <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-md text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md">{community.category}</span>
                            {membershipStatus === 'joined' && (
                                <span className="px-2.5 py-0.5 bg-emerald-500/90 backdrop-blur-md text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                                    <span className="material-symbols-outlined text-[12px]">edit</span> Member (Can Post)
                                </span>
                            )}
                            {membershipStatus === 'subscribed' && (
                                <span className="px-2.5 py-0.5 bg-blue-500/90 backdrop-blur-md text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                                    <span className="material-symbols-outlined text-[12px]">visibility</span> Subscriber (View Only)
                                </span>
                            )}
                        </div>
                        <h1 
                            className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight mb-2 drop-shadow-2xl"
                        >
                            <span 
                                className="px-4 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-amber-400/50 shadow-2xl inline-block text-amber-300"
                                style={{ color: '#FCD34D', textShadow: '0 2px 12px rgba(0,0,0,0.95)' }}
                            >
                                {community.name}
                            </span>
                        </h1>
                        <p 
                            className="text-slate-100 font-medium text-xs md:text-sm max-w-3xl leading-relaxed bg-slate-950/75 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800/80 shadow-lg"
                            style={{ color: '#F8FAFC' }}
                        >
                            {community.description}
                        </p>
                    </div>

                    {(() => {
                        const isDefaultOrg = community?.type?.toLowerCase().includes('default') || community?.type?.toLowerCase().includes('org');
                        return (
                            <div className="flex items-center gap-4 shrink-0">
                                {isDefaultOrg ? (
                            membershipStatus === 'joined' ? (
                                <button 
                                    onClick={handleLeaveAction} 
                                    className="w-44 h-10 px-3 bg-slate-900/90 hover:bg-red-600/90 text-white font-bold rounded-xl transition-all backdrop-blur-md border border-slate-700/60 flex items-center justify-center gap-2 text-xs group cursor-pointer shrink-0 shadow-lg"
                                >
                                    <span className="material-symbols-outlined text-[18px] group-hover:hidden shrink-0">check_circle</span>
                                    <span className="material-symbols-outlined text-[18px] hidden group-hover:block shrink-0">logout</span>
                                    <span className="group-hover:hidden truncate font-bold">Joined Member</span>
                                    <span className="hidden group-hover:block truncate font-bold">Leave Community</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="h-10 px-3.5 bg-purple-500/80 backdrop-blur-md text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs border border-purple-400/40 shrink-0">
                                        <span className="material-symbols-outlined text-[16px] shrink-0">corporate_fare</span>
                                        <span className="truncate">Auto-Subscribed (Org)</span>
                                    </div>
                                    <button 
                                        onClick={handleJoinAction} 
                                        className="w-40 h-10 px-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-1.5 text-xs cursor-pointer shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-[16px] shrink-0">upgrade</span>
                                        <span className="truncate">Join as Member</span>
                                    </button>
                                </div>
                            )
                        ) : membershipStatus === 'joined' ? (
                            <button 
                                onClick={handleLeaveAction} 
                                className="w-44 h-10 px-3 bg-slate-900/90 hover:bg-red-600/90 text-white font-bold rounded-xl transition-all backdrop-blur-md border border-slate-700/60 flex items-center justify-center gap-2 text-xs group cursor-pointer shrink-0 shadow-lg"
                            >
                                <span className="material-symbols-outlined text-[18px] group-hover:hidden shrink-0">check_circle</span>
                                <span className="material-symbols-outlined text-[18px] hidden group-hover:block shrink-0">logout</span>
                                <span className="group-hover:hidden truncate font-bold">Joined Member</span>
                                <span className="hidden group-hover:block truncate font-bold">Leave Community</span>
                            </button>
                        ) : membershipStatus === 'subscribed' ? (
                            <div className="flex gap-2 shrink-0">
                                <button 
                                    onClick={handleJoinAction} 
                                    className="w-44 h-10 px-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-1.5 text-xs cursor-pointer shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[16px] shrink-0">upgrade</span>
                                    <span className="truncate">Upgrade to Member</span>
                                </button>
                                <button 
                                    onClick={handleUnsubscribeAction} 
                                    className="h-10 px-3.5 bg-white/10 hover:bg-red-500/80 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center justify-center gap-1.5 text-xs cursor-pointer shrink-0"
                                >
                                    <span className="truncate">Unsubscribe</span>
                                </button>
                            </div>
                        ) : membershipStatus === 'requested' ? (
                            <button 
                                onClick={handleCancelRequest} 
                                className="w-44 h-10 px-3 bg-white/10 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center justify-center gap-2 opacity-80 hover:bg-red-500/80 hover:opacity-100 group cursor-pointer shrink-0"
                            >
                                <span className="material-symbols-outlined text-[18px] group-hover:hidden shrink-0">schedule</span>
                                <span className="material-symbols-outlined text-[18px] hidden group-hover:block shrink-0">close</span>
                                <span className="group-hover:hidden font-black text-amber-400 truncate">Join Requested</span>
                                <span className="hidden group-hover:block font-bold truncate">Cancel Request</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 shrink-0">
                                <button 
                                    onClick={handleSubscribeAction} 
                                    className="h-10 px-3.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center justify-center gap-1.5 text-xs cursor-pointer shrink-0"
                                    title="Subscribe as View-Only (FR-CM-06)"
                                >
                                    <span className="material-symbols-outlined text-[18px] shrink-0">visibility</span>
                                    <span className="truncate">Subscribe (View Only)</span>
                                </button>
                                <button 
                                    onClick={handleJoinAction} 
                                    className="w-44 h-10 px-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-1.5 text-xs cursor-pointer shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[18px] shrink-0">group_add</span>
                                    <span className="truncate">{community.type === 'Private' ? 'Request to Join' : 'Join as Member'}</span>
                                </button>
                            </div>
                        )}

                        {/* Share Button (FR-CM-09) */}
                        <button
                            onClick={handleShareCommunity}
                            className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors backdrop-blur-md border border-white/20 flex items-center justify-center text-xs cursor-pointer shrink-0"
                            title="Share Community Link"
                        >
                            <span className="material-symbols-outlined text-[18px]">share</span>
                        </button>

                        {isSysAdmin && (
                            <button 
                                onClick={handleDeleteCommunity}
                                className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 text-xs ml-2 cursor-pointer shrink-0"
                                title="Delete / Remove Community (System Admin)"
                            >
                                <span className="material-symbols-outlined text-[18px] shrink-0">delete_forever</span>
                                <span className="truncate">Remove Community</span>
                            </button>
                        )}
                    </div>
                );
            })()}
        </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex flex-col lg:flex-row gap-8">
                
                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    
                    {/* Navigation Tabs */}
                    <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
                        <button 
                            onClick={() => setActiveTab('feed')}
                            className={`px-6 py-3 font-bold text-[14px] transition-colors relative shrink-0 ${activeTab === 'feed' ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            Community Feed
                            {activeTab === 'feed' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                        </button>
                        <button 
                            onClick={() => setActiveTab('members')}
                            className={`px-6 py-3 font-bold text-[14px] transition-colors relative flex items-center gap-2 shrink-0 ${activeTab === 'members' ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">group</span>
                            Members & Roles
                            {membersList.length > 0 && <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[11px] px-2 py-0.5 rounded-full font-bold">{membersList.length}</span>}
                            {activeTab === 'members' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                        </button>
                        <button 
                            onClick={() => setActiveTab('files')}
                            className={`px-6 py-3 font-bold text-[14px] transition-colors relative flex items-center gap-2 shrink-0 cursor-pointer ${activeTab === 'files' ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">folder_open</span>
                            Files & Media
                            {filesList.length > 0 && <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[11px] px-2 py-0.5 rounded-full font-bold">{filesList.length}</span>}
                            {activeTab === 'files' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                        </button>
                        {isAdmin && (
                            <button 
                                onClick={() => setActiveTab('admin')}
                                className={`px-6 py-3 font-bold text-[14px] transition-colors relative flex items-center gap-2 shrink-0 cursor-pointer ${activeTab === 'admin' ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            >
                                Admin Panel
                                {joinRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{joinRequests.length}</span>}
                                {activeTab === 'admin' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
                            </button>
                        )}
                    </div>

                    {activeTab === 'feed' && (
                        <div className="space-y-6">
                            
                            {/* FR-CM-06: Member Composer (Can post & comment) */}
                            {membershipStatus === 'joined' ? (
                                <form onSubmit={handleCreatePost} className="glass card-lift bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-indigo-500/20">
                                            {currentUser?.name?.charAt(0) || 'U'}
                                        </div>
                                        <input 
                                            type="text" 
                                            value={postText}
                                            onChange={(e) => setPostText(e.target.value)}
                                            placeholder={`Share an update with ${community.name}...`} 
                                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" 
                                        />
                                        <button type="submit" className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20 shrink-0">
                                            Post
                                        </button>
                                    </div>
                                </form>
                            ) : membershipStatus === 'requested' ? (
                                /* FR-CM-03: Pending approval banner for requesting user */
                                <div className="relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-5 flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-500 shrink-0">
                                        <span className="material-symbols-outlined text-[22px]">schedule</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-amber-700 dark:text-amber-400 text-sm mb-1">
                                            ⏳ Join Request Pending
                                        </h4>
                                        <p className="text-[13px] text-amber-600 dark:text-amber-500 leading-relaxed">
                                            Your request to join <strong>"{community.name}"</strong> is awaiting approval from a Community Admin.
                                            You will receive a notification once your request is reviewed.
                                        </p>
                                        <button
                                            onClick={handleCancelRequest}
                                            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                            Cancel Request
                                        </button>
                                    </div>
                                    {/* Pulsing indicator */}
                                    <div className="shrink-0 flex items-center gap-2">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                        </span>
                                        <span className="text-[11px] font-bold text-amber-500">Awaiting Review</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl text-center text-slate-500 text-xs font-bold border border-slate-200 dark:border-slate-700">
                                    🔒 You are in <span className="text-indigo-500">Subscriber Mode (View-Only)</span>. Click <strong>"Upgrade to Member"</strong> above to post and comment in this community.
                                </div>
                            )}


                            {/* FR-CM-08: Posts Feed & Pinned Content */}
                            {sortedPosts.map(post => {
                                const authorName = typeof post.author === 'string' 
                                    ? post.author 
                                    : (post.author?.name || post.author?.fullName || post.authorName || 'Member');
                                const authorRole = typeof post.author === 'object' && post.author?.role 
                                    ? post.author.role 
                                    : (post.role || post.authorRole || 'Member');
                                const rawAvatar = (typeof post.author === 'object' ? post.author?.avatar : null) || post.authorAvatar || post.avatar;
                                const authorAvatar = rawAvatar ? resolveMediaUrl(rawAvatar) : null;
                                const authorInitial = (authorName || 'M').charAt(0).toUpperCase();

                                return (
                                <div key={post.id} className={`glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 ${post.isPinned ? 'ring-2 ring-indigo-500/50 bg-indigo-50/10' : ''}`}>
                                    {post.isPinned && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-500 mb-3 uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-[15px]">push_pin</span>
                                            Pinned by Community Admin
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            {authorAvatar ? (
                                                <img 
                                                    src={authorAvatar} 
                                                    alt={authorName} 
                                                    className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 dark:border-slate-700"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366f1&color=fff&bold=true`;
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                                                    {authorInitial}
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{authorName}</h4>
                                                <p className="text-[12px] text-slate-500">{authorRole} • {post.time || 'Recently'}</p>
                                            </div>
                                        </div>
                                        
                                        {/* FR-CM-07: Moderation Controls (Pin, Delete, Suspend) */}
                                        {isAdmin && (
                                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                                <button onClick={() => handlePin(post.id)} className={`p-1.5 rounded-lg transition-colors ${post.isPinned ? 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/40' : 'text-slate-400 hover:text-indigo-500'}`} title={post.isPinned ? "Unpin Post" : "Pin Post"}>
                                                    <span className="material-symbols-outlined text-[18px]">{post.isPinned ? 'do_not_disturb_on' : 'push_pin'}</span>
                                                </button>
                                                <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Remove Post">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                                <button onClick={() => handleSuspend(authorName)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors" title="Suspend Member">
                                                    <span className="material-symbols-outlined text-[18px]">person_off</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {(() => {
                                        const targetComm = resolveTargetCommunityFromPost(post);
                                        return (
                                            <>
                                                {post.title && (
                                                    <h5 
                                                        onClick={() => targetComm && navigate(`/community/view?id=${targetComm.id}`)}
                                                        className={`font-bold text-slate-900 dark:text-white text-sm md:text-base mb-2 flex items-center gap-2 ${targetComm ? 'cursor-pointer hover:text-indigo-500 transition-colors' : ''}`}
                                                    >
                                                        <span className="material-symbols-outlined text-indigo-500 text-[20px]">campaign</span>
                                                        {post.title}
                                                    </h5>
                                                )}
                                                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                                                
                                                {/* Shared Video Player / Card inside Community Feed Post */}
                                                {(post.sharedVideo || post.type === 'video_share' || post.videoUrl || (post.content && (post.content.includes('Shared Video:') || post.content.includes('📹')))) && (
                                                    <div className="mb-4 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
                                                        {(() => {
                                                            const vidObj = post.sharedVideo || {
                                                                id: post.id || `shared_vid_${Date.now()}`,
                                                                title: post.title?.replace('📹 Shared Video: ', '').replace(/ — uploaded by.*/, '') || post.content?.replace(/^.*Shared Video: "/, '').replace(/".*/, '') || 'Shared Video',
                                                                sourceUrl: post.videoUrl || post.sourceUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                                                                thumbnail: post.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
                                                                author: post.authorName || post.author || 'MPOnline Team'
                                                            };
                                                            const vUrl = vidObj.sourceUrl || vidObj.videoUrl || post.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                                                            const isYT = vUrl && (vUrl.includes('youtube.com') || vUrl.includes('youtu.be'));

                                                            return (
                                                                <div className="flex flex-col">
                                                                    <div className="relative aspect-video w-full bg-black overflow-hidden group">
                                                                        {isYT ? (
                                                                            <iframe
                                                                                src={vUrl.includes('embed') ? vUrl : `https://www.youtube.com/embed/${(vUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))((\w|-){11})/) || [])[1] || ''}`}
                                                                                className="w-full h-full border-0"
                                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                                                                title={vidObj.title}
                                                                            />
                                                                        ) : (
                                                                            <video
                                                                                src={resolveMediaUrl(vUrl) || vUrl}
                                                                                poster={getVideoThumbnail(vidObj) || undefined}
                                                                                preload="metadata"
                                                                                controls
                                                                                controlsList="nodownload"
                                                                                className="w-full h-full object-contain"
                                                                                onError={(e) => {
                                                                                    if (e.target && !e.target.src.includes('BigBuckBunny.mp4')) {
                                                                                        e.target.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                                                                                    }
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div className="p-3.5 bg-slate-900 flex items-center justify-between gap-3 border-t border-slate-800">
                                                                        <div className="min-w-0">
                                                                            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                                                                <span className="material-symbols-outlined text-[12px]">play_circle</span>
                                                                                SHARED VIDEO
                                                                            </span>
                                                                            <h5 className="font-extrabold text-white text-xs sm:text-sm truncate mt-1">
                                                                                {vidObj.title}
                                                                            </h5>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => navigate(`/videos?id=${vidObj.id || ''}&title=${encodeURIComponent(vidObj.title || '')}&url=${encodeURIComponent(vUrl)}`)}
                                                                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                                                                            <span>Play Full Video</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                                
                                                {/* Shared Profile Card inside Community Post */}
                                                {post.sharedProfile && (
                                                    <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                                        <div className="flex items-center gap-3.5 min-w-0">
                                                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                                                                {post.sharedProfile.avatar ? (
                                                                    <img src={post.sharedProfile.avatar} alt={post.sharedProfile.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    (post.sharedProfile.name || 'U').charAt(0).toUpperCase()
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
                                                                    SHARED PROFILE
                                                                </span>
                                                                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm truncate mt-0.5">
                                                                    {post.sharedProfile.name || post.sharedProfile.fullName}
                                                                </h4>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                                    {post.sharedProfile.designation || 'Contributor'} • {post.sharedProfile.department || 'General'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => navigate('/profile', { state: { user: post.sharedProfile } })}
                                                            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                            View Profile
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {targetComm && !post.sharedVideo && post.type !== 'video_share' && (
                                                    <div 
                                                        onClick={() => navigate(`/community/view?id=${targetComm.id}`)}
                                                        className="mb-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all flex items-center justify-between gap-4 cursor-pointer group shadow-sm hover:shadow-md"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-11 h-11 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                                                                <span className="material-symbols-outlined text-[24px]">groups</span>
                                                            </div>
                                                            <div>
                                                                <h6 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-500 transition-colors flex items-center gap-2">
                                                                    {targetComm.name}
                                                                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Community</span>
                                                                </h6>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click to view community discussions, files & members</p>
                                                            </div>
                                                        </div>
                                                        <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 shrink-0 group-hover:translate-x-0.5 cursor-pointer">
                                                            <span>Visit Community</span>
                                                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                    
                                    <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                                        <button className="flex items-center gap-2 hover:text-indigo-500 transition-colors text-[13px] font-bold">
                                            <span className="material-symbols-outlined text-[18px]">thumb_up</span>
                                            {post.likes || 0} Likes
                                        </button>
                                        <button className="flex items-center gap-2 hover:text-indigo-500 transition-colors text-[13px] font-bold">
                                            <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                                            {post.comments || 0} Comments
                                        </button>
                                        <button className="flex items-center gap-2 hover:text-indigo-500 transition-colors text-[13px] font-bold">
                                            <span className="material-symbols-outlined text-[18px]">share</span>
                                            {post.shares || 0} Shares
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    )}

                    {/* Members & Roles Tab */}
                    {activeTab === 'members' && (
                        <div className="space-y-6">
                            <div className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap bg-slate-50/50 dark:bg-slate-800/50">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                            <span className="material-symbols-outlined text-indigo-500">group</span>
                                            Community Members & Roles
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">View all team members, assigned community roles, and designations.</p>
                                    </div>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                        <input 
                                            type="text" 
                                            value={memberSearchQuery}
                                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                                            placeholder="Search members..."
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {membersList
                                        .filter(m => !memberSearchQuery.trim() || (m.fullName || m.name || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) || (m.designation || '').toLowerCase().includes(memberSearchQuery.toLowerCase()))
                                        .map(m => {
                                            const avatar = resolveMediaUrl(m.profilePhotoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName || m.name || 'User')}&background=6366f1&color=fff`;
                                            const roleName = m.memberType === 'Admin' ? 'Community Administrator' : (m.memberType === 'Moderator' ? 'Community Moderator' : 'Community Member');
                                            const badgeBg = m.memberType === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800' : (m.memberType === 'Moderator' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800');

                                            return (
                                                <div key={m.userId || m.id || m.employeeId} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img 
                                                            src={avatar} 
                                                            alt={m.fullName || m.name} 
                                                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName || m.name || 'User')}&background=6366f1&color=fff`;
                                                            }}
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{m.fullName || m.name}</h4>
                                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                                                                    {roleName}
                                                                </span>
                                                            </div>
                                                            <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                                {m.designation || 'Employee'} • {m.employeeId || 'MPOnline'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                         {isAdmin && String(m.userId || m.id) !== String(currentUser?.id) && (
                                                             <>
                                                                 <button 
                                                                     onClick={() => handleToggleRole(m.userId || m.id, m.memberType)}
                                                                     className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                                     title="Promote or Demote Role"
                                                                 >
                                                                     <span className="material-symbols-outlined text-[15px]">manage_accounts</span>
                                                                     {m.memberType === 'Moderator' ? 'Set as Member' : 'Make Moderator'}
                                                                 </button>
                                                                 <button 
                                                                     onClick={() => handleRemoveMemberByAdmin(m.userId || m.id, m.fullName || m.name)}
                                                                     className="px-2.5 py-1.5 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                                     title="Remove Member from Community"
                                                                 >
                                                                     <span className="material-symbols-outlined text-[15px]">person_remove</span>
                                                                     Remove
                                                                 </button>
                                                                 <button 
                                                                     onClick={() => handleSuspend(m.userId || m.id, m.fullName || m.name)}
                                                                     className="px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                                     title="Suspend Member (FR-CM-07)"
                                                                 >
                                                                     <span className="material-symbols-outlined text-[15px]">person_off</span>
                                                                     Suspend
                                                                 </button>
                                                             </>
                                                         )}
                                                         <button 
                                                             onClick={() => navigate(`/profile?id=${m.userId || 1}`)}
                                                             className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                                                         >
                                                             <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                             View Profile
                                                         </button>
                                                     </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Files & Media Tab */}
                    {activeTab === 'files' && (
                        <div className="space-y-6">
                            {/* Filter Bar & Upload Action */}
                            <div className="glass bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                                    {['All', 'Document', 'Image', 'Archive', 'Code', 'Video'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setFileCategoryFilter(cat)}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                                fileCategoryFilter === cat
                                                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {cat === 'All' ? '📁 All Files' : cat === 'Document' ? '📄 Documents' : cat === 'Image' ? '🖼️ Images' : cat === 'Archive' ? '📦 Archives' : cat === 'Code' ? '💻 Code' : '🎬 Videos'}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1 md:w-64">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                        <input
                                            type="text"
                                            value={fileSearchQuery}
                                            onChange={(e) => setFileSearchQuery(e.target.value)}
                                            placeholder="Search files..."
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                        {fileSearchQuery && (
                                            <button onClick={() => setFileSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        )}
                                    </div>

                                    {membershipStatus === 'joined' && (
                                        <button
                                            onClick={() => setIsUploadModalOpen(true)}
                                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">upload_file</span>
                                            Upload File
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Files Grid */}
                            {filteredFiles.length === 0 ? (
                                <div className="p-12 text-center glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-sm flex flex-col items-center gap-2">
                                    <span className="material-symbols-outlined text-[36px] text-slate-400">folder_off</span>
                                    <p className="font-bold">No files found matching filter.</p>
                                    <p className="text-xs text-slate-400">Click "Upload File" above to share documents, images, or archives with this community.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {filteredFiles.map(file => (
                                        <div key={file.id} className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700/50 transition-all group">
                                            <div onClick={() => setPreviewModalFile(file)} className="cursor-pointer">
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xl shadow-inner bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500">
                                                        <span className="material-symbols-outlined text-[26px]">
                                                            {file.category === 'Image' ? 'image' : file.category === 'Archive' ? 'folder_zip' : file.category === 'Video' ? 'video_file' : file.category === 'Code' ? 'code' : 'description'}
                                                        </span>
                                                    </div>
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                        {file.category}
                                                    </span>
                                                </div>

                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-500 transition-colors mb-1" title={file.name}>
                                                    {file.name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3">
                                                    <span>{file.size}</span>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                    <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                        {(file.uploadedBy || 'U').charAt(0)}
                                                    </div>
                                                    <span className="truncate max-w-[100px]">{file.uploadedBy}</span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {(file.category === 'Video' || ['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(file.extension?.toLowerCase()) || (file.name && file.name.toLowerCase().endsWith('.mp4'))) && (
                                                        <button
                                                            onClick={() => setPreviewModalFile(file)}
                                                            className="px-2 py-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-500 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs"
                                                            title="Play Video"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">play_circle</span>
                                                            <span>Play</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setPreviewModalFile(file)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors cursor-pointer"
                                                        title="View File Preview"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                    </button>
                                                    {(isAdmin || String(file.uploadedBy) === String(currentUser?.name)) && (
                                                        <button
                                                            onClick={() => handleDeleteFile(file.id, file.name)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                                                            title="Delete File"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FR-CM-03 & FR-CM-07: Admin Tools */}
                    {activeTab === 'admin' && isAdmin && (
                        <div className="space-y-6">
                            {/* Pending Join Requests */}
                            <div className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-500">group_add</span>
                                        Pending Join Requests (FR-CM-03)
                                        {joinRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{joinRequests.length}</span>}
                                    </h3>
                                    <p className="text-[12px] text-slate-500 mt-1">Review and approve members requesting access to this community.</p>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {joinRequests.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">No pending join requests.</div>
                                    ) : (
                                        joinRequests.map(req => (
                                            <div key={req.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                        {(req.name || req.fullName || 'U').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{req.name || req.fullName}</h4>
                                                        <p className="text-[12px] text-slate-500">{req.role || req.designation} • {req.department || 'MPOnline'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleReject(req.id, req.name || req.fullName)} className="px-4 py-1.5 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                                        Reject
                                                    </button>
                                                    <button onClick={() => handleApprove(req.id, req.name || req.fullName)} className="px-4 py-1.5 rounded-lg text-[12px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors cursor-pointer">
                                                        Approve
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Suspended Members (FR-CM-07) */}
                            <div className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-900/10">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-500">person_off</span>
                                        Suspended Members (FR-CM-07)
                                        {suspendedMembers.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{suspendedMembers.length}</span>}
                                    </h3>
                                    <p className="text-[12px] text-slate-500 mt-1">Suspended members cannot post or view content. You can reinstate them at any time.</p>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {suspendedMembers.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">No suspended members.</div>
                                    ) : (
                                        suspendedMembers.map(m => (
                                            <div key={m.userId || m.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 font-bold text-sm">
                                                        {(m.fullName || m.name || 'U').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{m.fullName || m.name}</h4>
                                                        <p className="text-[11px] text-slate-500">{m.designation || 'Member'} • Suspended by {m.suspendedBy || 'Admin'}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleReinstate(m.userId || m.id, m.fullName || m.name)}
                                                    className="px-4 py-1.5 rounded-lg text-[12px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">person_add</span>
                                                    Reinstate
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar (FR-CM-08: Full stats) */}
                <div className="w-full lg:w-80 shrink-0 space-y-6">
                    {/* About */}
                    <div className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-[15px]">About Community</h3>
                        
                        <div className="space-y-3.5">
                            {/* Members count — clickable to tab */}
                            <div 
                                onClick={() => setActiveTab('members')}
                                className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:text-indigo-500 transition-colors group"
                            >
                                <span className="material-symbols-outlined text-[20px] text-indigo-500 group-hover:scale-110 transition-transform">group</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-900 dark:text-white">{membersList.length || community.membersCount}</span>
                                    <span className="text-slate-500">Members</span>
                                </div>
                            </div>

                            {/* Subscriber count */}
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px] text-blue-500">visibility</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-900 dark:text-white">{subscribersList.length}</span>
                                    <span className="text-slate-500">Subscribers (View-Only)</span>
                                </div>
                            </div>

                            {/* Online indicator */}
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="relative flex items-center justify-center w-5 h-5">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-emerald-600">{Math.max(1, Math.min(membersList.length, Math.floor(membersList.length * 0.4) || 1))}</span>
                                    <span className="text-slate-500">Online now</span>
                                </div>
                            </div>

                            {/* Category */}
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px] text-indigo-500">category</span>
                                <span className="font-medium">{community.category}</span>
                            </div>

                            {/* Type */}
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px] text-indigo-500">public</span>
                                <span className="font-medium">{community.type}</span>
                                {community.type === 'Private' && <span className="text-[10px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Approval Required</span>}
                            </div>

                            {/* Created date */}
                            {community.createdDate && (
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                    <span className="material-symbols-outlined text-[20px] text-indigo-500">calendar_today</span>
                                    <span className="text-slate-500">Created {new Date(community.createdDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                            )}

                            {/* Admin */}
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px] text-indigo-500">shield_person</span>
                                <span>Admin: <span className="font-bold text-indigo-500">{community.adminContact}</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Rules (FR-CM-08) */}
                    <div className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-[15px] flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">gavel</span>
                            Community Rules
                        </h3>
                        <ul className="space-y-3">
                            {community.rules.map((rule, idx) => (
                                <li key={idx} className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* FAQ (FR-CM-08) */}
                    <div className="glass bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-[15px] flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">help</span>
                            Frequently Asked Questions
                        </h3>
                        <div className="space-y-4">
                            {community.faq.map((item, idx) => (
                                <div key={idx}>
                                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mb-1">{item.q}</h4>
                                    <p className="text-[12px] text-slate-500 leading-relaxed">{item.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Upload File Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                <span className="material-symbols-outlined text-indigo-500">upload_file</span>
                                Upload Community File
                            </h3>
                            <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleFileUploadSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    File Title / Description *
                                </label>
                                <input
                                    type="text"
                                    value={uploadFileName}
                                    onChange={(e) => setUploadFileName(e.target.value)}
                                    placeholder="e.g. System_Architecture_v2.pdf"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Category
                                </label>
                                <select
                                    value={uploadFileCategory}
                                    onChange={(e) => setUploadFileCategory(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="Document">📄 Document (PDF, DOCX, TXT)</option>
                                    <option value="Image">🖼️ Image (PNG, JPG, SVG)</option>
                                    <option value="Archive">📦 Archive (ZIP, RAR, 7Z)</option>
                                    <option value="Code">💻 Code / Script (JS, CS, PY, SQL)</option>
                                    <option value="Video">🎬 Video / Audio</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Choose File from Disk
                                </label>
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0];
                                            setSelectedUploadFile(file);
                                            const detected = detectFileTypeAndCategory(file);
                                            setUploadFileCategory(detected.category);
                                            setUploadFileName(file.name);
                                        }
                                    }}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploadingFile}
                                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isUploadingFile ? (
                                        <>
                                            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                                            Upload Now
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Multi-Format File & Document Viewer Modal */}
            {previewModalFile && (
                <div className="fixed inset-0 z-[350] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="relative max-w-4xl w-full bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Header */}
                        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between text-white bg-slate-900/90">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                    <span className="material-symbols-outlined text-[22px]">
                                        {previewModalFile.category === 'Image' ? 'image' : 
                                         previewModalFile.extension === 'pdf' ? 'picture_as_pdf' :
                                         previewModalFile.extension === 'zip' ? 'folder_zip' : 'description'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white truncate max-w-md">{previewModalFile.name}</h3>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-400 font-bold uppercase">{previewModalFile.extension || previewModalFile.category}</span>
                                        <span>•</span>
                                        <span>{previewModalFile.size || '3.4 MB'}</span>
                                        <span>•</span>
                                        <span>Uploaded by {previewModalFile.uploadedBy || 'Team Member'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">

                                <button
                                    onClick={() => setPreviewModalFile(null)}
                                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Body / Content Renderer */}
                        <div className="p-6 flex-1 overflow-auto flex flex-col items-center justify-center bg-slate-950/60">
                            {previewModalFile.category === 'Image' || ['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(previewModalFile.extension?.toLowerCase()) ? (
                                <div className="flex flex-col items-center justify-center w-full">
                                    <img
                                        src={previewModalFile.url}
                                        alt={previewModalFile.name}
                                        className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                    <div className="hidden flex-col items-center justify-center p-12 text-center">
                                        <span className="material-symbols-outlined text-[64px] text-indigo-400 mb-3">image</span>
                                        <p className="text-slate-300 font-bold text-base">{previewModalFile.name}</p>
                                        <p className="text-slate-500 text-xs mt-1">Image Asset File ({previewModalFile.size})</p>
                                    </div>
                                </div>
                            ) : previewModalFile.extension === 'pdf' ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                    <embed
                                        src={(previewModalFile.url && (previewModalFile.url.startsWith('data:') || (previewModalFile.url.startsWith('http') && !previewModalFile.url.includes('localhost') && !previewModalFile.url.includes('w3.org')))) ? previewModalFile.url : SAMPLE_PDF_DATA_URL}
                                        type="application/pdf"
                                        className="w-full h-[70vh] rounded-2xl bg-white border border-slate-800 shadow-2xl"
                                    />
                                </div>
                            ) : previewModalFile.category === 'Video' || ['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(previewModalFile.extension?.toLowerCase()) || (previewModalFile.name && previewModalFile.name.toLowerCase().endsWith('.mp4')) ? (
                                <div className="flex flex-col items-center justify-center w-full gap-4">
                                    {previewModalFile.url && previewModalFile.url !== '#' ? (
                                        <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl">
                                            <video
                                                src={previewModalFile.url}
                                                controls
                                                controlsList="nodownload"
                                                disablePictureInPicture
                                                onContextMenu={(e) => e.preventDefault()}
                                                autoPlay
                                                playsInline
                                                className="w-full max-h-[65vh] rounded-2xl object-contain"
                                            >
                                                Your browser does not support HTML5 Video playback.
                                            </video>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-200 flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                                <span className="material-symbols-outlined text-[48px]">play_circle</span>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-white">{previewModalFile.name}</h4>
                                                <p className="text-xs text-slate-400 mt-1">MP4 Video Stream Asset ({previewModalFile.size})</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 w-full max-w-md">
                                                HTML5 Video Player Ready • Controls Active
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : previewModalFile.extension === 'zip' || previewModalFile.category === 'Archive' ? (
                                <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-left text-slate-200 max-h-[65vh] overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
                                        <span className="material-symbols-outlined text-[36px] text-amber-400">folder_zip</span>
                                        <div>
                                            <h4 className="text-lg font-bold text-white">{previewModalFile.name}</h4>
                                            <p className="text-xs text-slate-400">Compressed Archive Assets Directory ({previewModalFile.size})</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h5 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Contained Archive Files</h5>
                                        <div className="space-y-2">
                                            {[
                                                { name: 'src/components/ui/DesignSystem.tsx', size: '42 KB', type: 'TypeScript' },
                                                { name: 'src/styles/theme.config.css', size: '18 KB', type: 'CSS' },
                                                { name: 'public/assets/logos/knome_brand.svg', size: '120 KB', type: 'SVG' },
                                                { name: 'README_SETUP_GUIDE.md', size: '8 KB', type: 'Markdown' }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                                                    <span className="font-mono text-slate-300">{item.name}</span>
                                                    <span className="text-slate-500">{item.size} • {item.type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-left text-slate-200 max-h-[65vh] overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
                                        <span className="material-symbols-outlined text-[36px] text-blue-400">description</span>
                                        <div>
                                            <h4 className="text-lg font-bold text-white">{previewModalFile.name}</h4>
                                            <p className="text-xs text-slate-400">Technical Documentation File ({previewModalFile.size})</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4 text-sm leading-relaxed text-slate-300">
                                        <h5 className="font-bold text-white text-base">API Integration Guidelines & Specifications</h5>
                                        <p>Comprehensive guide detailing REST API endpoints, JWT token handling, response envelopes (`ApiResponse&lt;T&gt;`), and rate limiting guidelines for MPOnline integration developers.</p>
                                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs text-slate-400">
                                            <div className="font-bold text-indigo-400">Key Sections:</div>
                                            <div>1. Authentication Endpoints (`/api/v1/auth/login`)</div>
                                            <div>2. User & Community Management (`/api/v1/communities`)</div>
                                            <div>3. Posts & Media Channels Engine (`/api/v1/posts`)</div>
                                            <div>4. Global Search & Discovery Query Filters</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 px-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900/90">
                            <span>Document ID: #{previewModalFile.id || '101'}</span>
                            <button
                                onClick={() => setPreviewModalFile(null)}
                                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-Option Share Community Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2.5">
                                {shareTab !== 'menu' && (
                                    <button
                                        onClick={() => setShareTab('menu')}
                                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                    </button>
                                )}
                                <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                    <span className="material-symbols-outlined text-indigo-500">share</span>
                                    {shareTab === 'community' ? 'Share to Community' : shareTab === 'users' ? 'Share with Users' : `Share "${community?.name || 'Community'}"`}
                                </h3>
                            </div>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {shareTab === 'menu' && (
                                <div className="space-y-3">
                                    {/* Option 1: Share to Community */}
                                    <div
                                        onClick={() => setShareTab('community')}
                                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700/50 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-all flex items-center gap-4 cursor-pointer group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-[24px]">groups</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-cyan-600 transition-colors">
                                                Share to Community
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Post this community recommendation directly into another community's feed
                                            </p>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                                    </div>

                                    {/* Option 2: Share with Users */}
                                    <div
                                        onClick={() => setShareTab('users')}
                                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/50 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all flex items-center gap-4 cursor-pointer group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-[24px]">person_add</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-purple-600 transition-colors">
                                                Share with Users
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Send direct notifications to specific MPOnline team members & colleagues
                                            </p>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                                    </div>
                                </div>
                            )}

                            {/* Share to Community Sub-View */}
                            {shareTab === 'community' && (
                                <form onSubmit={handleShareToCommunitySubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Select Target Community *
                                        </label>
                                        <select
                                            value={shareTargetCommunity}
                                            onChange={(e) => setShareTargetCommunity(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                                        >
                                            <option value="">-- Choose Community --</option>
                                            {allCommunities.map(c => (
                                                <option key={c.id} value={c.id}>{c.emoji || '🏘️'} {c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Add Message / Recommendation Note
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={shareMessageNote}
                                            onChange={(e) => setShareMessageNote(e.target.value)}
                                            placeholder="e.g. Check out this community for DevOps engineers, ML pipelines, and Cloud Infrastructure..."
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                                        />
                                    </div>

                                    <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setShareTab('menu')}
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSharingProcess}
                                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">send</span>
                                            Share to Feed
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Share with Users Sub-View */}
                            {shareTab === 'users' && (
                                <form onSubmit={handleShareToUsersSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Select MPOnline Team Members *
                                        </label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-800">
                                             {(contextUsers || [])
                                                 .filter(u => String(u.userId || u.id) !== String(currentUser?.userId || currentUser?.id))
                                                 .map(userItem => {
                                                     const uId = userItem.id || userItem.userId;
                                                     const isSelected = shareSelectedUsers.includes(uId);
                                                     const uName = userItem.name || userItem.fullName || 'User';
                                                     const uRole = userItem.roleName || userItem.designation || userItem.role || 'Employee';
                                                     const uEmp = userItem.employeeId || '';
                                                     const uAvatar = resolveMediaUrl(userItem.avatar || userItem.profilePhotoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(uName)}&background=6366f1&color=fff&bold=true`;

                                                     return (
                                                         <div
                                                             key={uId}
                                                             onClick={() => {
                                                                 if (isSelected) {
                                                                     setShareSelectedUsers(prev => prev.filter(id => id !== uId));
                                                                 } else {
                                                                     setShareSelectedUsers(prev => [...prev, uId]);
                                                                 }
                                                             }}
                                                             className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all border ${
                                                                 isSelected 
                                                                     ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-300' 
                                                                     : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 border-transparent text-slate-700 dark:text-slate-300'
                                                             }`}
                                                         >
                                                             <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                                                 <img src={uAvatar} alt={uName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                                                                 <div className="min-w-0 flex-1">
                                                                     <div className="flex items-center gap-1.5">
                                                                         <span className="font-bold text-slate-900 dark:text-white truncate">{uName}</span>
                                                                         {uEmp && <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold">{uEmp}</span>}
                                                                     </div>
                                                                     <div className="text-[11px] text-slate-400 truncate">{uRole}</div>
                                                                 </div>
                                                             </div>

                                                             <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                                                                 isSelected 
                                                                     ? 'bg-purple-600 border-purple-600 text-white' 
                                                                     : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                                             }`}>
                                                                 {isSelected && (
                                                                     <svg className="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                                                         <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                     </svg>
                                                                 )}
                                                             </div>
                                                         </div>
                                                     );
                                                 })}
                                         </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Optional Invitation Message
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={shareMessageNote}
                                            onChange={(e) => setShareMessageNote(e.target.value)}
                                            placeholder="e.g. Hi! I think you would find this community very helpful..."
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setShareTab('menu')}
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSharingProcess}
                                            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">send</span>
                                            Send Notification ({shareSelectedUsers.length})
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Document / PDF Preview Modal */}
            {previewModalFile && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[88vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0">
                                    <span className="material-symbols-outlined text-[24px]">
                                        {previewModalFile.category === 'Image' ? 'image' : 'picture_as_pdf'}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate" title={previewModalFile.name}>
                                        {previewModalFile.name}
                                    </h3>
                                    <p className="text-[12px] text-slate-500 flex items-center gap-2">
                                        <span className="font-bold text-indigo-500 uppercase">{previewModalFile.extension || 'PDF'}</span>
                                        <span>•</span>
                                        <span>{previewModalFile.size}</span>
                                        <span>•</span>
                                        <span>Uploaded by {previewModalFile.uploadedBy || 'Loveneesh Sharma'}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                                {activePdfBlobUrl && (
                                    <a
                                        href={activePdfBlobUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-decoration-none"
                                        title="Open PDF in New Window"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                        Open Full View
                                    </a>
                                )}



                                <button
                                    onClick={() => setPreviewModalFile(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: High-Compatibility Object/Embed PDF Viewer */}
                        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-3 md:p-5 relative overflow-hidden flex items-center justify-center">
                            {previewModalFile.category === 'Image' || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(previewModalFile.extension?.toLowerCase()) ? (
                                <img
                                    src={previewModalFile.url}
                                    alt={previewModalFile.name}
                                    className="max-h-full max-w-full object-contain rounded-xl shadow-md"
                                />
                            ) : (
                                <object
                                    data={activePdfBlobUrl || SAMPLE_PDF_DATA_URL}
                                    type="application/pdf"
                                    className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner bg-white"
                                >
                                    {/* Fallback View inside object if browser PDF plugin blocks embedded view */}
                                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-2xl text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined text-[36px]">picture_as_pdf</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{previewModalFile.name}</h4>
                                        <p className="text-sm text-slate-500 max-w-md mb-6">
                                            PDF document preview is ready. You can open it in a new full view tab to view.
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <a
                                                href={activePdfBlobUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg hover:bg-indigo-600 transition-all flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                                Open Full PDF View
                                            </a>

                                        </div>
                                    </div>
                                </object>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 shrink-0">
                            <span className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[16px] text-emerald-500">verified</span>
                                MPOnline Enterprise Document Viewer
                            </span>
                            <button
                                onClick={() => setPreviewModalFile(null)}
                                className="font-bold text-indigo-500 hover:text-indigo-600 cursor-pointer"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
