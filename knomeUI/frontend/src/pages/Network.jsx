import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../components/contexts/UserContext';
import { useToast } from '../components/contexts/ToastContext';
import { useConfirm } from '../components/contexts/ConfirmDialogContext';
import { userApi, searchApi, resolveMediaUrl } from '../utils/apiService';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Network() {
    const { currentUser } = useUser();
    const { addToast } = useToast();
    const confirm = useConfirm();
    const location = useLocation();
    
    const [activeTab, setActiveTab] = useState('Suggestions'); // Suggestions | Requests | Connections
    const [suggestions, setSuggestions] = useState([]);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [connectionsList, setConnectionsList] = useState([]);
    const [directory, setDirectory] = useState([]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [fullDirectory, setFullDirectory] = useState([]);
    const acceptedIdsRef = useRef(new Set());
    const pendingReceivedCount = receivedRequests.filter(r => r.connectionStatus === 'PendingReceived' && !r.isAccepted).length;

    // Check URL parameters for active tab (?tab=Requests, ?tab=Connections)
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const tab = searchParams.get('tab');
        if (tab) {
            const lowerTab = tab.toLowerCase();
            if (lowerTab === 'requests' || lowerTab === 'received' || lowerTab === 'invitations') {
                setActiveTab('Requests');
            } else if (lowerTab === 'connections') {
                setActiveTab('Connections');
            } else if (lowerTab === 'suggestions') {
                setActiveTab('Suggestions');
            }
        }
    }, [location.search]);

    // Live update when connection requests are sent, accepted, or received
    useEffect(() => {
        const handleNetworkUpdate = () => {
            fetchAllNetworkData(true);
        };
        window.addEventListener('network-updated', handleNetworkUpdate);
        window.addEventListener('knome_notification_received', handleNetworkUpdate);
        window.addEventListener('storage', handleNetworkUpdate);
        return () => {
            window.removeEventListener('network-updated', handleNetworkUpdate);
            window.removeEventListener('knome_notification_received', handleNetworkUpdate);
            window.removeEventListener('storage', handleNetworkUpdate);
        };
    }, []);

    const mapUserItem = (item) => {
        const name = item.name || item.fullName || item.title || 'User';
        const rawPhotoUrl = item.avatar || item.profilePhotoUrl || item.authorProfilePhotoUrl;
        const avatar = resolveMediaUrl(rawPhotoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;

        return {
            id: item.id || item.userId,
            name,
            role: item.role || item.designation || 'Employee',
            department: item.department || item.departmentName || 'General',
            avatar,
            mutualConnections: item.mutualConnections || item.mutualConnectionsCount || 0,
            mutualConnectionAvatars: (item.mutualConnectionAvatars || []).map(url => resolveMediaUrl(url)),
            commonCommunities: item.commonCommunities || 0,
            reason: item.reason || '',
            connectionStatus: item.connectionStatus || 'NotConnected',
            requestId: item.requestId || null
        };
    };

    const fetchAllNetworkData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [sugRes, reqRes, connRes, searchRes] = await Promise.all([
                userApi.getSuggestions().catch(() => []),
                userApi.getPendingRequests().catch(() => ({})),
                currentUser?.userId ? userApi.getConnections(currentUser.userId).catch(() => []) : Promise.resolve([]),
                searchApi.searchUsers('', 100).catch(() => [])
            ]);

            const sugArray = Array.isArray(sugRes) ? sugRes : (sugRes?.data || []);
            const reqData = reqRes?.data || reqRes || {};
            const receivedArray = reqData.received || [];
            const sentArray = reqData.sent || [];
            const connArray = Array.isArray(connRes) ? connRes : (connRes?.data || []);
            const searchArray = Array.isArray(searchRes) ? searchRes : (searchRes?.data || searchRes?.items || []);

            const connIds = new Set(connArray.map(u => String(u.id || u.userId)));
            const sentIds = new Set(sentArray.map(u => String(u.id || u.userId)));
            const receivedIds = new Set(receivedArray.map(u => String(u.id || u.userId)));

            const deriveStatus = (item) => {
                const id = String(item.id || item.userId);
                if (connIds.has(id)) return 'Connected';
                if (sentIds.has(id)) return 'PendingSent';
                if (receivedIds.has(id)) return 'PendingReceived';
                return item.connectionStatus || 'NotConnected';
            };

            const deduplicateUsers = (list) => {
                const seenNames = new Set();
                const seenIds = new Set();
                const result = [];
                for (const item of list) {
                    if (!item) continue;
                    const id = String(item.id || item.userId || '');
                    const normName = (item.name || item.fullName || '').trim().toLowerCase();
                    if (id && seenIds.has(id)) continue;
                    if (normName && seenNames.has(normName)) continue;
                    if (id) seenIds.add(id);
                    if (normName) seenNames.add(normName);
                    result.push(item);
                }
                return result;
            };

            const mappedSug = deduplicateUsers(
                sugArray
                    .filter(u => String(u.id || u.userId) !== String(currentUser?.userId))
                    .map(u => mapUserItem({ ...u, connectionStatus: deriveStatus(u) }))
            );
            const mappedRec = deduplicateUsers(
                receivedArray.map(u => {
                    const idStr = String(u.id || u.userId);
                    const isAcc = acceptedIdsRef.current.has(idStr);
                    return mapUserItem({
                        ...u,
                        connectionStatus: isAcc ? 'Accepted' : 'PendingReceived',
                        isAccepted: isAcc
                    });
                })
            );
            const mappedSent = deduplicateUsers(
                sentArray.map(u => mapUserItem({ ...u, connectionStatus: 'PendingSent' }))
            );
            const mappedConn = deduplicateUsers(
                connArray.map(u => mapUserItem({ ...u, connectionStatus: 'Connected' }))
            );
            const mappedDir = deduplicateUsers(
                searchArray
                    .filter(u => String(u.id || u.userId) !== String(currentUser?.userId))
                    .map(u => mapUserItem({ ...u, connectionStatus: deriveStatus(u) }))
            );

            setSuggestions(mappedSug);
            setReceivedRequests(prev => {
                const acceptedCards = prev.filter(p => p.isAccepted || p.connectionStatus === 'Accepted');
                const acceptedCardIds = new Set(acceptedCards.map(p => String(p.id)));
                const freshNonAccepted = mappedRec.filter(p => !acceptedCardIds.has(String(p.id)));
                return [...acceptedCards, ...freshNonAccepted];
            });
            setSentRequests(mappedSent);
            setConnectionsList(mappedConn);
            setFullDirectory(mappedDir);

            if (!searchQuery.trim()) {
                setDirectory(mappedDir);
            }
        } catch (err) {
            console.error("Error fetching network data:", err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.userId) {
            fetchAllNetworkData(false);
        }
    }, [currentUser]);

    // Live Directory Search (Smooth background filtering without double page load/spinner)
    useEffect(() => {
        if (!searchQuery.trim()) {
            if (fullDirectory.length > 0) {
                setDirectory(fullDirectory);
            }
            return;
        }

        const search = async () => {
            try {
                const res = await searchApi.searchUsers(searchQuery, 100);
                const userItems = Array.isArray(res) ? res : (res?.data || res?.items || []);
                const filtered = userItems.filter(u => String(u.id || u.userId) !== String(currentUser?.userId));
                
                const connIds = new Set(connectionsList.map(u => String(u.id)));
                const sentIds = new Set(sentRequests.map(u => String(u.id)));
                const receivedIds = new Set(receivedRequests.map(u => String(u.id)));

                const deriveStatus = (item) => {
                    const id = String(item.id || item.userId);
                    if (connIds.has(id)) return 'Connected';
                    if (sentIds.has(id)) return 'PendingSent';
                    if (receivedIds.has(id)) return 'PendingReceived';
                    return item.connectionStatus || 'NotConnected';
                };

                const deduplicateUsers = (list) => {
                    const seenNames = new Set();
                    const seenIds = new Set();
                    const result = [];
                    for (const item of list) {
                        if (!item) continue;
                        const id = String(item.id || item.userId || '');
                        const normName = (item.name || item.fullName || '').trim().toLowerCase();
                        if (id && seenIds.has(id)) continue;
                        if (normName && seenNames.has(normName)) continue;
                        if (id) seenIds.add(id);
                        if (normName) seenNames.add(normName);
                        result.push(item);
                    }
                    return result;
                };

                setDirectory(deduplicateUsers(filtered.map(u => mapUserItem({ ...u, connectionStatus: deriveStatus(u) }))));
            } catch (err) {
                console.error("Error searching users:", err);
            }
        };

        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, currentUser]);

    const updatePersonStatus = (id, newStatus) => {
        setSuggestions(prev => prev.map(p => p.id === id ? { ...p, connectionStatus: newStatus } : p));
        setDirectory(prev => prev.map(p => p.id === id ? { ...p, connectionStatus: newStatus } : p));
        setFullDirectory(prev => prev.map(p => p.id === id ? { ...p, connectionStatus: newStatus } : p));
        setConnectionsList(prev => prev.map(p => p.id === id ? { ...p, connectionStatus: newStatus } : p));
        setReceivedRequests(prev => prev.map(p => p.id === id ? { ...p, connectionStatus: newStatus, isAccepted: (newStatus === 'Accepted' || newStatus === 'Connected') } : p));
    };

    // Action Handlers
    const handleConnect = async (person) => {
        try {
            updatePersonStatus(person.id, 'PendingSent');
            await userApi.connect(person.id);
            addToast && addToast(`✅ Connection request sent to ${person.name}!`, 'success');
            fetchAllNetworkData(true);
        } catch (err) {
            const msg = err?.message || '';
            if (msg.includes('Already connected') || msg.includes('already connected')) {
                updatePersonStatus(person.id, 'Connected');
                addToast && addToast(`You are already connected with ${person.name}.`, 'info');
            } else if (msg.includes('pending') || msg.includes('Pending')) {
                updatePersonStatus(person.id, 'PendingSent');
                addToast && addToast(`Connection request to ${person.name} is already pending.`, 'info');
            } else {
                addToast && addToast(`Notice: ${msg || 'Connection status updated'}`, 'info');
            }
            fetchAllNetworkData(true);
        }
    };

    const handleCancelRequest = async (person) => {
        try {
            updatePersonStatus(person.id, 'NotConnected');
            await userApi.cancelConnection(person.id);
            addToast && addToast(`Connection request to ${person.name} canceled.`, 'info');
            fetchAllNetworkData(true);
        } catch (err) {
            fetchAllNetworkData(true);
        }
    };

    const handleAcceptRequest = async (person) => {
        try {
            const personIdStr = String(person.id);
            acceptedIdsRef.current.add(personIdStr);

            // Immediately update the card to Accepted right on this UI!
            setReceivedRequests(prev => prev.map(p => 
                String(p.id) === personIdStr 
                    ? { ...p, connectionStatus: 'Accepted', isAccepted: true } 
                    : p
            ));
            updatePersonStatus(person.id, 'Accepted');

            if (person.requestId) {
                await userApi.acceptConnection(person.requestId);
            } else {
                await userApi.connect(person.id);
            }
            addToast && addToast(`🎉 You are now connected with ${person.name}!`, 'success');
            fetchAllNetworkData(true);
            window.dispatchEvent(new CustomEvent('network-updated'));
        } catch (err) {
            console.error("Failed to accept connection:", err);
            fetchAllNetworkData(true);
        }
    };

    const handleRejectRequest = async (person) => {
        try {
            const personIdStr = String(person.id);
            setReceivedRequests(prev => prev.filter(p => String(p.id) !== personIdStr));
            updatePersonStatus(person.id, 'NotConnected');
            if (person.requestId) {
                await userApi.rejectConnection(person.requestId);
            }
            addToast && addToast(`Connection request from ${person.name} ignored.`, 'info');
            fetchAllNetworkData(true);
        } catch (err) {
            fetchAllNetworkData(true);
        }
    };

    const handleRemoveConnection = async (person) => {
        const ok = await confirm({
            title: 'Remove Connection',
            message: `Are you sure you want to remove your 1st-degree connection with ${person.name}?`,
            confirmText: 'Remove Connection',
            cancelText: 'Cancel',
            variant: 'warning'
        });
        if (!ok) return;
        try {
            updatePersonStatus(person.id, 'NotConnected');
            await userApi.removeConnection(person.id);
            addToast && addToast(`Removed ${person.name} from 1st-degree connections.`, 'info');
            fetchAllNetworkData();
            window.dispatchEvent(new CustomEvent('network-updated'));
        } catch (err) {
            fetchAllNetworkData();
        }
    };

    return (
        <main className="flex-1 flex flex-col gap-8 pb-6 min-w-0 font-sans">
            
            {/* Hero Header */}
            <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between text-left px-6 py-8 md:px-10 md:py-8 gap-6">
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-32 bg-blue-500/10 dark:bg-blue-500/15 blur-[80px] pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-start max-w-3xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[11px] font-bold mb-3 backdrop-blur-md uppercase tracking-wider">
                        ✨ LinkedIn-Style Professional Network
                    </div>
                    <h1 className="text-3xl md:text-4xl lg:text-[40px] font-black tracking-tight mb-3 text-slate-900 dark:text-white" style={{ lineHeight: '1.2' }}>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 dark:from-blue-400 dark:via-sky-400 dark:to-cyan-400">
                            People Network & Connections
                        </span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm md:text-[15px] font-medium leading-relaxed max-w-2xl">
                        Manage 1st-degree connections, respond to pending connection requests, and discover colleagues across MPOnline Limited.
                    </p>
                </div>
                
                <div className="relative z-10 shrink-0 w-full md:w-72 mt-4 md:mt-0">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search colleagues..."
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Network Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-2">
                <button
                    onClick={() => setActiveTab('Suggestions')}
                    className={`px-6 py-4 font-bold text-sm transition-colors relative flex items-center gap-2 ${
                        activeTab === 'Suggestions' ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    Suggestions & Discovery
                    {activeTab === 'Suggestions' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-cyan-400 rounded-t-full"></div>}
                </button>

                <button
                    onClick={() => setActiveTab('Requests')}
                    className={`px-6 py-4 font-bold text-sm transition-colors relative flex items-center gap-2 ${
                        activeTab === 'Requests' ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">mark_email_unread</span>
                    Connection Requests
                    {pendingReceivedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-pink-500 text-white font-black animate-pulse">
                            {pendingReceivedCount}
                        </span>
                    )}
                    {activeTab === 'Requests' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-cyan-400 rounded-t-full"></div>}
                </button>

                <button
                    onClick={() => setActiveTab('Connections')}
                    className={`px-6 py-4 font-bold text-sm transition-colors relative flex items-center gap-2 ${
                        activeTab === 'Connections' ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    My 1st-Degree Connections ({connectionsList.length})
                    {activeTab === 'Connections' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-cyan-400 rounded-t-full"></div>}
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-500">
                    <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="font-medium text-sm animate-pulse">Loading connections...</p>
                </div>
            ) : (
                <>
                    {/* TAB 1: SUGGESTIONS & DIRECTORY */}
                    {activeTab === 'Suggestions' && (
                        <div className="space-y-10">
                            {!searchQuery && suggestions.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="material-symbols-outlined text-amber-500 text-[24px]">magic_button</span>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white">People You May Know</h2>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {suggestions.map(person => (
                                            <PersonCard 
                                                key={`sug-${person.id}`} 
                                                person={person} 
                                                onConnect={() => handleConnect(person)}
                                                onCancel={() => handleCancelRequest(person)}
                                                onAccept={() => handleAcceptRequest(person)}
                                                onReject={() => handleRejectRequest(person)}
                                                onRemove={() => handleRemoveConnection(person)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section>
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="material-symbols-outlined text-blue-500 text-[24px]">contacts</span>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Directory</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {(() => {
                                        const visibleDirectory = (!searchQuery.trim() && suggestions.length > 0)
                                            ? directory.filter(d => !suggestions.some(s => 
                                                String(s.id) === String(d.id) || 
                                                (s.name && d.name && s.name.trim().toLowerCase() === d.name.trim().toLowerCase())
                                              ))
                                            : directory;

                                        return (
                                            <>
                                                {visibleDirectory.map(person => (
                                                    <PersonCard 
                                                        key={`dir-${person.id}`} 
                                                        person={person} 
                                                        onConnect={() => handleConnect(person)}
                                                        onCancel={() => handleCancelRequest(person)}
                                                        onAccept={() => handleAcceptRequest(person)}
                                                        onReject={() => handleRejectRequest(person)}
                                                        onRemove={() => handleRemoveConnection(person)}
                                                    />
                                                ))}
                                                {visibleDirectory.length === 0 && (
                                                    <div className="col-span-full py-12 text-center text-slate-500 font-medium">
                                                        {searchQuery.trim() ? `No colleagues found matching "${searchQuery}"` : "All discovered colleagues are shown in suggestions above."}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* TAB 2: CONNECTION REQUESTS */}
                    {activeTab === 'Requests' && (
                        <div className="space-y-8">
                            <section>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-pink-500">inbox</span>
                                    Received Connection Requests ({receivedRequests.length})
                                </h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {receivedRequests.map(person => (
                                        <PersonCard 
                                            key={`req-${person.id}`} 
                                            person={person} 
                                            onAccept={() => handleAcceptRequest(person)}
                                            onReject={() => handleRejectRequest(person)}
                                        />
                                    ))}
                                    {receivedRequests.length === 0 && (
                                        <div className="col-span-full p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-500 font-medium">
                                            No pending received connection requests.
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400">outbox</span>
                                    Sent Connection Requests Pending ({sentRequests.length})
                                </h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {sentRequests.map(person => (
                                        <PersonCard 
                                            key={`sent-${person.id}`} 
                                            person={person} 
                                            onCancel={() => handleCancelRequest(person)}
                                        />
                                    ))}
                                    {sentRequests.length === 0 && (
                                        <div className="col-span-full p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-500 font-medium">
                                            No pending sent requests.
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* TAB 3: MY CONNECTIONS */}
                    {activeTab === 'Connections' && (
                        <section>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6">
                                Your 1st-Degree Network ({connectionsList.length})
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {connectionsList.map(person => (
                                    <PersonCard 
                                        key={`conn-${person.id}`} 
                                        person={person} 
                                        onRemove={() => handleRemoveConnection(person)}
                                    />
                                ))}
                                {connectionsList.length === 0 && (
                                    <div className="col-span-full py-16 text-center text-slate-500 font-medium">
                                        You don't have any 1st-degree connections yet. Explore suggestions above to start building your network!
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </>
            )}
        </main>
    );
}

function NetworkAvatar({ avatar, name, size = 'w-20 h-20', textSize = 'text-xl' }) {
    const [imgFailed, setImgFailed] = useState(false);
    const resolved = resolveMediaUrl(avatar);

    const getInitials = (n) => {
        if (!n) return 'U';
        const parts = n.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const colors = [
        'bg-gradient-to-tr from-blue-600 to-indigo-600',
        'bg-gradient-to-tr from-indigo-600 to-purple-600',
        'bg-gradient-to-tr from-purple-600 to-pink-600',
        'bg-gradient-to-tr from-pink-600 to-rose-600',
        'bg-gradient-to-tr from-teal-600 to-emerald-600',
        'bg-gradient-to-tr from-sky-600 to-blue-600'
    ];
    let hash = 0;
    const str = name || '';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const colorClass = colors[Math.abs(hash) % colors.length];

    if (!resolved || imgFailed) {
        return (
            <div 
                className={`${size} rounded-full ${colorClass} text-white font-black ${textSize} flex items-center justify-center shrink-0 shadow-md border-2 border-slate-100 dark:border-slate-800 tracking-tight uppercase select-none`}
            >
                {getInitials(name)}
            </div>
        );
    }

    return (
        <img 
            src={resolved} 
            alt="" 
            onError={() => setImgFailed(true)}
            className={`${size} rounded-full object-cover shrink-0 border-2 border-slate-100 dark:border-slate-800 shadow-md`} 
        />
    );
}

function PersonCard({ person, onConnect, onCancel, onAccept, onReject, onRemove }) {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const status = person.connectionStatus || 'NotConnected';

    const handleOpenProfile = (e) => {
        if (e) e.preventDefault();
        const userObj = {
            userId: person.id || person.userId,
            id: person.id || person.userId,
            name: person.name || person.fullName,
            fullName: person.fullName || person.name,
            avatar: person.avatar || person.profilePhotoUrl,
            role: person.role || person.designation,
            designation: person.role || person.designation,
            department: person.department
        };
        navigate(`/profile/${person.id}`, { state: { user: userObj } });
    };

    return (
        <div className="group glass card-lift bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center text-center shadow-sm relative w-full">
            
            {/* Avatar & Profile Link */}
            <div 
                onClick={handleOpenProfile} 
                className="mb-3 block relative hover:scale-105 transition-transform cursor-pointer"
            >
                <NetworkAvatar avatar={person.avatar} name={person.name} />
            </div>
            
            <button 
                onClick={handleOpenProfile} 
                className="font-bold text-[16px] text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors leading-tight mb-1 truncate max-w-full cursor-pointer hover:underline"
            >
                {person.name}
            </button>
            <p className="text-[12px] font-bold text-slate-500 mb-0.5 truncate max-w-full">{person.role}</p>
            <p className="text-[11px] text-slate-400 mb-3 truncate max-w-full">{person.department}</p>

            {/* Mutual Connections Stack */}
            {person.mutualConnections > 0 && (
                <div className="flex items-center gap-2 mb-4 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                    {person.mutualConnectionAvatars && person.mutualConnectionAvatars.length > 0 && (
                        <div className="flex -space-x-1.5 overflow-hidden">
                            {person.mutualConnectionAvatars.map((url, i) => (
                                <img key={i} src={url} className="inline-block h-4 w-4 rounded-full ring-1 ring-white dark:ring-slate-900 object-cover" alt="Mutual" />
                            ))}
                        </div>
                    )}
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {person.mutualConnections} Mutual{person.mutualConnections > 1 ? 's' : ''}
                    </span>
                </div>
            )}

            {/* Action Buttons Workflow */}
            <div className="w-full mt-auto pt-2">
                {status === 'PendingReceived' && !person.isAccepted ? (
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={onAccept}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            Accept
                        </button>
                        <button
                            onClick={onReject}
                            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                            Ignore
                        </button>
                    </div>
                ) : (status === 'Accepted' || person.isAccepted) ? (
                    <div className="w-full py-2.5 rounded-xl font-bold text-[13px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center gap-2 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>Accepted</span>
                    </div>
                ) : status === 'PendingSent' ? (
                    <button
                        onClick={onCancel}
                        className="w-full py-2.5 rounded-xl font-bold text-[13px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                        title="Click to cancel pending connection request"
                    >
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        Pending • Cancel
                    </button>
                ) : status === 'Connected' ? (
                    <div className="relative w-full">
                        <div className="flex gap-2">
                            <button
                                onClick={handleOpenProfile}
                                className="flex-1 py-2.5 rounded-xl font-bold text-[13px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                                Connected
                            </button>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="w-10 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>
                        </div>

                        {showMenu && (
                            <div className="absolute right-0 bottom-12 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-20 text-left animate-in fade-in zoom-in-95 duration-150">
                                <button
                                    onClick={handleOpenProfile}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">account_circle</span>
                                    View Profile
                                </button>
                                <button
                                    onClick={() => {
                                        setShowMenu(false);
                                        onRemove();
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">person_remove</span>
                                    Remove Connection
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button 
                        onClick={onConnect}
                        className="w-full py-2.5 rounded-xl font-bold text-[13px] bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        Connect
                    </button>
                )}
            </div>
        </div>
    );
}
