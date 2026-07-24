import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getKarmaBadge } from '../utils/karmaEngine';
import { karmaApi } from '../utils/apiService';
import { useUser } from '../components/contexts/UserContext';

export default function KarmaHistory() {
    const { currentUser } = useUser();
    const [balance, setBalance] = useState({ totalPoints: 1250, badgeLevel: 'Gold', recentTransactions: [] });
    const [leaderboard, setLeaderboard] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchKarmaData() {
            try {
                const [balData, lbData] = await Promise.all([
                    karmaApi.getMyBalance().catch(() => null),
                    karmaApi.getLeaderboard(10).catch(() => null)
                ]);

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
                        avatar: item.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || 'User')}&background=6366f1&color=fff`
                    }));
                    setLeaderboard(mappedLb);
                }
            } catch (err) {
                console.error("Failed to load karma data", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchKarmaData();
    }, []);

    const activities = (balance.recentTransactions && balance.recentTransactions.length > 0)
        ? balance.recentTransactions.map((tx, idx) => ({
            id: tx.transactionId || idx,
            date: new Date(tx.createdDate).toLocaleString(),
            desc: `${tx.activityType}: ${tx.relatedContentType ? tx.relatedContentType + ' #' + tx.relatedContentId : 'Activity'}`,
            type: tx.activityType?.toLowerCase() || 'general',
            points: `+${tx.pointsAwarded}`,
            source: tx.relatedContentType || 'System',
            icon: tx.activityType?.includes('Video') ? 'videocam' : tx.activityType?.includes('Article') ? 'article' : tx.activityType?.includes('Podcast') ? 'podcasts' : tx.activityType?.includes('Comment') ? 'chat_bubble' : tx.activityType?.includes('Like') ? 'thumb_up' : 'stars',
            color: 'text-[#6366f1]',
            bg: 'bg-[#6366f1]/10'
        }))
        : [
            { id: 1, date: 'Today, 10:42 AM', desc: 'Published an Article: "Modern UI Design Systems"', type: 'article', points: '+10', source: 'Design Excellence', icon: 'article', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
            { id: 2, date: 'Today, 09:15 AM', desc: 'Active Community Participation (Daily)', type: 'community', points: '+5', source: 'Engineering Hub', icon: 'forum', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/30' },
            { id: 3, date: 'Yesterday, 4:30 PM', desc: 'Received a Share on your video', type: 'share', points: '+3', source: 'Timeline', icon: 'share', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/30' },
            { id: 4, date: 'Yesterday, 2:10 PM', desc: 'Received a Comment on your post', type: 'comment', points: '+2', source: 'Frontend Masters', icon: 'chat_bubble', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
            { id: 5, date: 'Yesterday, 1:00 PM', desc: 'Received a Like on your post', type: 'like', points: '+1', source: 'Frontend Masters', icon: 'thumb_up', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/30' },
            { id: 6, date: 'Oct 24, 11:00 AM', desc: 'Uploaded a Video: "Quarterly Review"', type: 'video', points: '+8', source: 'All Company', icon: 'videocam', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30' },
            { id: 7, date: 'Oct 23, 03:22 PM', desc: 'Published a Post', type: 'post', points: '+2', source: 'Timeline', icon: 'edit_square', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { id: 8, date: 'Oct 23, 10:00 AM', desc: 'Uploaded a Podcast Episode', type: 'podcast', points: '+8', source: 'Tech Talks', icon: 'podcasts', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/30' },
        ];

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
        { rank: 1, userId: 1, name: 'Sourabh Sahu', role: 'Staff Engineer', points: 6420, avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
        { rank: 2, userId: 2, name: 'Meghna Tiwari', role: 'Design Lead', points: 5150, avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
        { rank: 3, userId: 3, name: 'Vishendra Sharma', role: 'DevOps Architect', points: 4890, avatar: 'https://randomuser.me/api/portraits/men/11.jpg' },
        { rank: 4, userId: 4, name: 'Rishikesh Ugle', role: 'Product Manager', points: 3200, avatar: 'https://randomuser.me/api/portraits/men/33.jpg' },
        { rank: 5, userId: 5, name: 'Loveneesh Sharma', role: 'System Admin', points: 2800, avatar: 'https://randomuser.me/api/portraits/men/55.jpg' },
        { rank: 6, userId: 6, name: 'Mayur Verma', role: 'Tech Lead', points: 1950, avatar: 'https://randomuser.me/api/portraits/men/66.jpg' },
        { rank: 7, userId: 7, name: 'Aditi Sharma', role: 'HR Specialist', points: 1250, avatar: 'https://randomuser.me/api/portraits/women/12.jpg' },
        { rank: 8, userId: 8, name: 'Rahul Kumar', role: 'Developer', points: 890, avatar: 'https://randomuser.me/api/portraits/men/82.jpg' },
        { rank: 9, userId: 9, name: 'Priya Singh', role: 'Security', points: 600, avatar: 'https://randomuser.me/api/portraits/women/33.jpg' },
        { rank: 10, userId: 10, name: 'Amit Patel', role: 'Data Scientist', points: 150, avatar: 'https://randomuser.me/api/portraits/men/91.jpg' },
    ];

    return (
        <main className="flex-1 min-w-0 flex flex-col gap-6 pb-32">
            
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
                            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600">{(balance.totalPoints || 0).toLocaleString()}</h1>
                            <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-[12px] font-bold border border-emerald-200 dark:border-emerald-500/20">
                                +42 this week
                            </span>
                        </div>
                        <p className="text-[13px] font-medium text-slate-500 max-w-md leading-relaxed mb-8">
                            Karma is awarded for sharing knowledge and engaging with the community. Your points unlock premium badges and organizational visibility.
                        </p>
                        
                        <div className="grid grid-cols-3 gap-6">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Global Rank</span>
                                <span className="text-xl font-black text-slate-900 dark:text-white">#422</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-6">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Top Category</span>
                                <span className="text-xl font-black text-slate-900 dark:text-white truncate">Knowledge Sharing</span>
                            </div>
                            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-6">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Next Level</span>
                                <span className="text-xl font-black text-slate-900 dark:text-white">1,500</span>
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
                        <h2 className="text-2xl font-black text-white leading-tight mb-2">Elite Contributor</h2>
                        <p className="text-[13px] font-medium text-indigo-100 leading-relaxed">
                            You are in the top 5% of knowledge creators this quarter. Keep pushing!
                        </p>
                    </div>

                    <div className="relative z-10 mt-8">
                        <div className="flex justify-between mb-2 text-[12px] font-bold text-white">
                            <span>Progress to Master</span>
                            <span>83%</span>
                        </div>
                        <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                            <div className="bg-gradient-to-r from-yellow-300 to-amber-500 h-full rounded-full w-[83%] shadow-[0_0_10px_rgba(252,211,77,0.8)] relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{transform: 'skewX(-20deg)'}}></div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Global Leaderboard (FR-KP-02) */}
            <div className="glass card-lift bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-500/10 to-transparent flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500" style={{fontVariationSettings:"'FILL' 1"}}>trophy</span>
                            Global Top 10 Leaderboard
                        </h3>
                        <p className="text-[12px] font-medium text-slate-500 mt-1">
                            The most active and helpful contributors on the platform.
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
                                const isCurrentUser = user.userId === currentUser.id || user.name === currentUser.name;
                                return (
                                    <tr key={user.rank} className={`transition-colors group ${isCurrentUser ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}>
                                        <td className="px-6 py-4">
                                            <div className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center font-black text-[14px] ${user.rank <= 3 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                                                #{user.rank}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover shadow-sm" alt={user.name} />
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

            {/* How to Earn (FR-KP logic table) & Activity Feed */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Left Column: Activity Feed */}
                <div className="xl:col-span-2 glass card-lift bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">history</span>
                            Recent Activity
                        </h3>
                        <button className="text-[12px] font-bold text-slate-500 hover:text-indigo-500 transition-colors flex items-center gap-1">
                            Filter <span className="material-symbols-outlined text-[16px]">filter_list</span>
                        </button>
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
                    
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                        <button className="text-[12px] font-bold text-indigo-500 hover:underline">Load More History</button>
                    </div>
                </div>

                {/* Right Column: How to Earn Points (PRD Rules) */}
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
