import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getKarmaBadge } from '../utils/karmaEngine';
import { karmaApi, resolveMediaUrl } from '../utils/apiService';
import { useUser } from '../components/contexts/UserContext';

export default function KarmaHistory() {
    const { currentUser } = useUser();
    const navigate = useNavigate();

    const isSysAdmin = currentUser?.role === 'SYSADM' || 
                       currentUser?.roleName === 'System Administrator' || 
                       (Array.isArray(currentUser?.roles) && (currentUser.roles.includes('SYSADM') || currentUser.roles.includes('System Administrator') || currentUser.roles.includes('SystemAdmin')));

    useEffect(() => {
        if (isSysAdmin) {
            navigate('/', { replace: true });
        }
    }, [isSysAdmin, navigate]);

    const [balance, setBalance] = useState({ 
        totalPoints: currentUser?.karmaPoints ?? currentUser?.karma ?? 0, 
        badgeLevel: 'Bronze', 
        recentTransactions: [] 
    });
    const [leaderboard, setLeaderboard] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function fetchKarmaData() {
            try {
                const [balData, lbData] = await Promise.all([
                    karmaApi.getMyBalance().catch(() => null),
                    karmaApi.getLeaderboard(10).catch(() => null)
                ]);

                if (isMounted) {
                    if (balData) {
                        setBalance(balData);
                    }
                    if (lbData && Array.isArray(lbData) && lbData.length > 0) {
                        const mappedLb = lbData.map((item, idx) => ({
                            rank: item.rank || idx + 1,
                            userId: item.userId,
                            name: item.fullName || item.userName || 'Employee',
                            role: item.designation || 'Contributor',
                            points: item.totalPoints || 0,
                            avatar: resolveMediaUrl(item.profilePhotoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || item.userName || 'Employee')}&background=6366f1&color=fff`
                        }));
                        setLeaderboard(mappedLb);
                    }
                }
            } catch (err) {
                console.error("Failed to load karma data", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        fetchKarmaData();
        return () => { isMounted = false; };
    }, []);

    if (isSysAdmin) return null;

    const realKarmaPoints = Number(balance.totalPoints ?? currentUser?.karmaPoints ?? currentUser?.karma ?? 0);
    const karmaBadge = getKarmaBadge(realKarmaPoints);
    const currentLevel = Math.max(1, Math.floor(realKarmaPoints / 100) + 1);
    const nextLevelTarget = currentLevel * 100;
    const progressPercent = realKarmaPoints % 100;

    const apiTx = (balance.recentTransactions && balance.recentTransactions.length > 0)
        ? balance.recentTransactions.map((tx, idx) => ({
            id: tx.transactionId || idx,
            date: new Date(tx.createdDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
            desc: `${tx.activityType}${tx.relatedContentType ? ' (' + tx.relatedContentType + ')' : ''}`,
            type: tx.activityType?.toLowerCase() || 'general',
            points: `+${tx.pointsAwarded}`,
            source: tx.relatedContentType || 'System',
            icon: tx.activityType?.includes('Video') ? 'videocam' : tx.activityType?.includes('Article') ? 'article' : tx.activityType?.includes('Podcast') ? 'podcasts' : tx.activityType?.includes('Comment') ? 'chat_bubble' : tx.activityType?.includes('Like') ? 'thumb_up' : 'stars',
            color: 'text-[#6366f1]',
            bg: 'bg-[#6366f1]/10'
        }))
        : [];

    const defaultMockActivities = [
        { id: 1, date: 'Recent', desc: 'Published an Article', type: 'article', points: '+10', source: 'Knowledge Hub', icon: 'article', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
        { id: 2, date: 'Recent', desc: 'Active Community Participation', type: 'community', points: '+5', source: 'Communities', icon: 'forum', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/30' },
        { id: 3, date: 'Recent', desc: 'Published a Post', type: 'post', points: '+2', source: 'Timeline', icon: 'edit_square', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' }
    ];

    const activities = apiTx.length > 0 ? apiTx : defaultMockActivities;

    const rules = [
        { activity: 'Create and publish a Post', points: '2 pts', cap: 'Max 10 pts/day from posts' },
        { activity: 'Publish an Article', points: '10 pts', cap: 'Max 30 pts/day from articles' },
        { activity: 'Upload a Video', points: '8 pts', cap: 'Max 24 pts/day from videos' },
        { activity: 'Upload a Podcast', points: '8 pts', cap: 'Max 24 pts/day from podcasts' },
        { activity: 'Receive a Like on content', points: '1 pt', cap: 'No cap' },
        { activity: 'Receive a Comment on content', points: '2 pts', cap: 'No cap' },
        { activity: 'Receive a Share on content', points: '3 pts', cap: 'No cap' },
        { activity: 'Active Community Participation', points: '5 pts/day', cap: 'Once per community per day' },
    ];

    const displayLeaderboard = leaderboard.length > 0 ? leaderboard : [
        { rank: 1, userId: 1, name: 'Sourabh Sahu', role: 'Staff Engineer', points: 6420, avatar: `https://ui-avatars.com/api/?name=Sourabh+Sahu&background=6366f1&color=fff` },
        { rank: 2, userId: 2, name: 'Vishendra Sharma', role: 'DevOps Architect', points: 4890, avatar: `https://ui-avatars.com/api/?name=Vishendra+Sharma&background=3b82f6&color=fff` },
        { rank: 3, userId: 3, name: 'Mayur Verma', role: 'Tech Lead', points: 1950, avatar: `https://ui-avatars.com/api/?name=Mayur+Verma&background=10b981&color=fff` },
        { rank: 4, userId: 4, name: 'Meghna Tiwari', role: 'Design Lead', points: 5150, avatar: `https://ui-avatars.com/api/?name=Meghna+Tiwari&background=ec4899&color=fff` },
        { rank: 5, userId: 5, name: 'Rishikesh Ugle', role: 'Product Manager', points: 3200, avatar: `https://ui-avatars.com/api/?name=Rishikesh+Ugle&background=f59e0b&color=fff` },
    ];

    return (
        <main className="flex-1 min-w-0 flex flex-col gap-6 pb-6">
            
            {/* Header / Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Score Card */}
                <div className="lg:col-span-2 glass card-lift bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <span className="material-symbols-outlined text-[160px]" style={{fontVariationSettings: "'FILL' 1"}}>military_tech</span>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-indigo-500 mb-2">
                            <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>stars</span>
                            <span className="text-[11px] font-black tracking-widest uppercase">Karma Overview</span>
                        </div>
                        <div className="flex items-baseline gap-4 mb-2">
                            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600">
                                {realKarmaPoints.toLocaleString()}
                            </h1>
                            <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg text-[12px] font-bold border border-amber-200 dark:border-amber-500/20">
                                {karmaBadge.name} Tier
                            </span>
                        </div>
                        <p className="text-[13px] font-medium text-slate-500 max-w-md leading-relaxed mb-8">
                            Karma is awarded automatically from SQL Server for sharing knowledge and engaging with the community. Your points unlock premium badges and organizational visibility.
                        </p>
                        
                        <div className="grid grid-cols-3 gap-6">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Platform Level</span>
                                <span className="text-xl font-black text-indigo-500">Level {currentLevel}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-6">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Badge Status</span>
                                <span className="text-xl font-black text-slate-900 dark:text-white truncate">{karmaBadge.name}</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-6">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Goal for Level {currentLevel + 1}</span>
                                <span className="text-xl font-black text-slate-900 dark:text-white">{nextLevelTarget.toLocaleString()} pts</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Level Progress */}
                <div className="glass card-lift rounded-3xl border border-indigo-200 dark:border-indigo-800 p-8 shadow-sm relative overflow-hidden flex flex-col justify-between"
                    style={{background: 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(168,85,247,0.9))'}}>
                    
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black text-indigo-100 tracking-widest uppercase">Current Rank</span>
                            <span className="material-symbols-outlined text-yellow-300" style={{fontVariationSettings: "'FILL' 1"}}>workspace_premium</span>
                        </div>
                        <h2 className="text-2xl font-black text-white leading-tight mb-2">{karmaBadge.name} Contributor</h2>
                        <p className="text-[13px] font-medium text-indigo-100 leading-relaxed">
                            Keep publishing posts, articles, and engaging with peers to level up!
                        </p>
                    </div>

                    <div className="relative z-10 mt-8">
                        <div className="flex justify-between mb-2 text-[12px] font-bold text-white">
                            <span>Progress to Level {currentLevel + 1}</span>
                            <span>{progressPercent}%</span>
                        </div>
                        <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                            <div 
                                className="bg-gradient-to-r from-yellow-300 to-amber-500 h-full rounded-full shadow-[0_0_10px_rgba(252,211,77,0.8)] relative overflow-hidden transition-all duration-500" 
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{transform: 'skewX(-20deg)'}}></div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Global Leaderboard */}
            <div className="glass card-lift bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-500/10 to-transparent flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500" style={{fontVariationSettings:"'FILL' 1"}}>trophy</span>
                            Global Top Contributors Leaderboard
                        </h3>
                        <p className="text-[12px] font-medium text-slate-500 mt-1">
                            The most active and helpful contributors on the platform based on real Karma points.
                        </p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 w-20 text-center">Rank</th>
                                <th className="px-6 py-4">Contributor</th>
                                <th className="px-6 py-4 text-center">Badge Tier</th>
                                <th className="px-6 py-4 text-right">Karma Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {displayLeaderboard.map((user) => {
                                const badge = getKarmaBadge(user.points);
                                const isCurrentUser = (currentUser?.userId && user.userId === currentUser.userId) || 
                                                      (currentUser?.id && user.userId === currentUser.id) ||
                                                      user.name === (currentUser?.fullName || currentUser?.name);
                                return (
                                    <tr key={user.rank} className={`transition-colors group ${isCurrentUser ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}>
                                        <td className="px-6 py-4">
                                            <div className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center font-black text-[14px] ${user.rank <= 3 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                                                #{user.rank}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                             <div className="flex items-center gap-3">
                                                 <img 
                                                     src={resolveMediaUrl(user.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`} 
                                                     onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`; }}
                                                     className="w-10 h-10 rounded-xl object-cover shadow-sm shrink-0 border border-slate-200 dark:border-slate-700" 
                                                     alt={user.name} 
                                                 />
                                                <div>
                                                    <div className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                                                        {user.name}
                                                        {isCurrentUser && <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider">You</span>}
                                                    </div>
                                                    <div className="text-[11px] font-medium text-slate-500">{user.role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${badge.bg} ${badge.color} ${badge.border}`}>
                                                <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>workspace_premium</span>
                                                <span className="text-[11px] font-bold uppercase tracking-wider">{badge.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-indigo-500 text-[16px]">
                                            {user.points.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* How to Earn & Activity Feed */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Left Column: Activity Feed */}
                <div className="xl:col-span-2 glass card-lift bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">history</span>
                            Recent Karma Ledger
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 w-[140px]">Date</th>
                                    <th className="px-6 py-4">Activity Description</th>
                                    <th className="px-6 py-4">Source</th>
                                    <th className="px-6 py-4 text-right">Points</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {activities.map((act) => (
                                    <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4 text-[12px] font-medium text-slate-400 whitespace-nowrap">
                                            {act.date}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${act.bg} ${act.color}`}>
                                                    <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings:"'FILL' 1"}}>{act.icon}</span>
                                                </div>
                                                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                                                    {act.desc}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[12px] font-medium text-slate-500">
                                            {act.source}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-amber-500 text-[14px]">
                                            {act.points}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: How to Earn Points */}
                <div className="glass card-lift bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 to-transparent">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500" style={{fontVariationSettings:"'FILL' 1"}}>help_center</span>
                            How to Earn Karma
                        </h3>
                        <p className="text-[12px] font-medium text-slate-500 mt-1">
                            Gamify your knowledge contribution.
                        </p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="flex flex-col gap-4">
                            {rules.map((rule, idx) => (
                                <div key={idx} className="flex flex-col gap-1 pb-4 border-b border-slate-100 dark:border-slate-800/50 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-tight pr-4">
                                            {rule.activity}
                                        </span>
                                        <span className="text-[13px] font-black text-amber-500 shrink-0 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-500/20">
                                            {rule.points}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400">
                                        {rule.cap}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

        </main>
    );
}
