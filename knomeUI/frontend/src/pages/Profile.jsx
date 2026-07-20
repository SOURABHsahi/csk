import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../components/contexts/UserContext';
import { getKarmaBadge } from '../utils/karmaEngine';

export default function Profile() {
    const { currentUser } = useUser();
    const location = useLocation();
    
    // Check if we are viewing someone else's profile
    const displayUser = location.state?.user ? {
        ...location.state.user,
        designation: location.state.user.role || 'Contributor',
        department: 'Product', // Default mock since author doesn't have department
        location: 'Remote'     // Default mock
    } : currentUser;

    const isOwnProfile = displayUser.name === currentUser.name;

    const [activeTab, setActiveTab] = useState('About');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Mock stats
    const stats = {
        posts: 48,
        followers: '1.2k',
        following: 342,
        mutuals: 18, // FR-PN-03
        commonCommunities: 4, // FR-PN-03
        karma: '12.8k'
    };

    const tabs = ['About', 'Posts', 'Articles', 'Videos', 'Podcasts', 'Communities', 'Network', 'Karma'];

    return (
        <main className="flex-1 min-w-0">
            {/* Profile Header & Stats */}
            <div className="relative rounded-2xl overflow-hidden mb-6 shadow-sm border border-slate-200 dark:border-slate-800 glass">
                {/* Banner Background */}
                <div className="h-48 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                    <div className="absolute inset-0 bg-black/10"></div>
                </div>
                
                {/* Profile Info */}
                <div className="px-8 pb-8 relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 -mt-16 mb-6">
                        <div className="flex items-end gap-6">
                            <div className="w-32 h-32 rounded-2xl border-4 border-white dark:border-slate-900 shadow-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-4xl font-black relative overflow-hidden group">
                                {displayUser.avatar ? (
                                    <img src={displayUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    displayUser.name.charAt(0)
                                )}
                                {/* Mock photo upload overlay */}
                                {isOwnProfile && (
                                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white" onClick={() => setIsEditModalOpen(true)}>
                                        <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                                    </div>
                                )}
                            </div>
                            <div className="pb-2">
                                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{displayUser.name}</h1>
                                <p className="text-slate-600 dark:text-slate-400 font-medium text-lg mt-1 flex items-center gap-2">
                                    {displayUser.designation} <span className="opacity-50">•</span> {displayUser.department}
                                </p>
                                <p className="text-slate-500 dark:text-slate-500 text-sm mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                                    {displayUser.location}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 w-full md:w-auto">
                            {isOwnProfile ? (
                                <button 
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="flex-1 md:flex-none px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700">
                                    Edit Profile
                                </button>
                            ) : (
                                <button className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20">
                                    Connect
                                </button>
                            )}
                            <button className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20">
                                Share Profile
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 py-6 border-t border-slate-100 dark:border-slate-800/50">
                        <div className="text-center">
                            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500">{stats.posts}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Posts</p>
                        </div>
                        <div className="text-center border-l border-slate-100 dark:border-slate-800/50">
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.followers}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Followers</p>
                        </div>
                        <div className="text-center border-l border-slate-100 dark:border-slate-800/50">
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.following}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Following</p>
                        </div>
                        <div className="text-center md:border-l border-slate-100 dark:border-slate-800/50">
                            <p className="text-2xl font-black text-teal-500 dark:text-teal-400">{stats.mutuals}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Mutuals</p>
                        </div>
                        <div className="text-center border-l border-slate-100 dark:border-slate-800/50">
                            <p className="text-2xl font-black text-pink-500 dark:text-pink-400">{stats.commonCommunities}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Groups</p>
                        </div>
                        <div className="text-center border-l border-slate-100 dark:border-slate-800/50">
                            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-500 to-amber-600">{stats.karma}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">Karma</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex items-center gap-8 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar whitespace-nowrap px-4">
                {tabs.map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative pb-4 font-bold text-sm transition-colors ${activeTab === tab ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'About' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            {/* Bio */}
                            <div className="rounded-2xl border shadow-sm p-6 glass card-lift">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">About Me</h3>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                                    I am a dedicated professional working at Knome, focused on bridging the gap between innovative technology and user needs. I spend my days strategizing, analyzing metrics, and collaborating with cross-functional teams to deliver excellence.
                                </p>
                            </div>
                            
                            {/* Skills & Interests */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="rounded-2xl border shadow-sm p-6 glass card-lift">
                                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-500">psychology</span>
                                        Core Skills
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {['Product Strategy', 'Agile Methodologies', 'Data Analysis', 'Cross-functional Leadership', 'UX Research'].map((skill, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 text-[12px] font-bold rounded-lg">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-2xl border shadow-sm p-6 glass card-lift">
                                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-pink-500">favorite</span>
                                        Interests
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {['AI & Machine Learning', 'Design Systems', 'Mentorship', 'Open Source', 'Photography'].map((interest, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-800/50 text-[12px] font-bold rounded-lg">{interest}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Rail: Expertise & Badges */}
                        <div className="flex flex-col gap-6">
                            <div className="rounded-2xl border shadow-sm p-6 glass card-lift overflow-hidden relative group">
                                <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-6">Platform Level</h3>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/50">
                                        <span className="text-xl font-black text-indigo-500">L4</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-lg">Senior Contributor</p>
                                        <p className="text-slate-500 text-xs font-semibold mt-0.5">Top 15% Platform Wide</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                        <span>Progress to L5</span>
                                        <span className="text-indigo-500">85%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 w-[85%] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Karma' && (
                    <div className="flex flex-col gap-6">
                        {/* Summary / Badge Card */}
                        <div className="rounded-2xl border shadow-sm p-8 glass card-lift bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
                            <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center shadow-lg"
                                         style={{ 
                                             borderColor: getKarmaBadge(12800).color.replace('text-', ''), 
                                             backgroundColor: 'white' 
                                         }}>
                                        <span className={`material-symbols-outlined text-[48px] ${getKarmaBadge(12800).color}`} style={{fontVariationSettings:"'FILL' 1"}}>workspace_premium</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{getKarmaBadge(12800).name} Contributor</h3>
                                        <p className="text-[13px] font-bold text-slate-500 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-amber-500">stars</span>
                                            {stats.karma} Lifetime Karma Points
                                        </p>
                                    </div>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 min-w-[200px]">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Global Rank</div>
                                    <div className="text-3xl font-black text-indigo-500">#42</div>
                                </div>
                            </div>
                        </div>

                        {/* Recent History Table */}
                        <div className="rounded-2xl border shadow-sm glass card-lift overflow-hidden bg-white dark:bg-slate-900">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-500">history</span>
                                    Recent Karma History
                                </h3>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-[12px] font-medium text-slate-400">Today, 10:42 AM</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-slate-700 dark:text-slate-300">Published an Article: "Modern UI Design Systems"</td>
                                        <td className="px-6 py-4 text-right font-black text-amber-500">+10</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-[12px] font-medium text-slate-400">Today, 09:15 AM</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-slate-700 dark:text-slate-300">Active Community Participation</td>
                                        <td className="px-6 py-4 text-right font-black text-amber-500">+5</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-[12px] font-medium text-slate-400">Yesterday, 4:30 PM</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-slate-700 dark:text-slate-300">Received a Share on your video</td>
                                        <td className="px-6 py-4 text-right font-black text-amber-500">+3</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 text-center border-t border-slate-200 dark:border-slate-800">
                                <button className="text-[12px] font-bold text-indigo-500 hover:underline">View Full Ledger</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab !== 'About' && activeTab !== 'Karma' && (
                    <div className="rounded-2xl border shadow-sm p-12 glass flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[32px] text-slate-400">inventory_2</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No {activeTab} yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">This user hasn't published any {activeTab.toLowerCase()} content yet. Check back later!</p>
                    </div>
                )}
            </div>

            {/* Edit Profile Modal (FR-UP-02, FR-UP-04, FR-UP-06) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 transform transition-all">
                        
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                            {/* Photo Upload (FR-UP-06) */}
                            <div>
                                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Profile Photo</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-500 text-2xl font-black">
                                        {currentUser.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <button className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-lg border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                                Upload Photo
                                            </button>
                                            <button className="px-4 py-2 text-slate-500 hover:text-red-500 text-sm font-bold transition-colors">
                                                Remove
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-500">JPG, GIF or PNG. Max size of 5MB. Photo will be auto-resized to 256x256.</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bio */}
                            <div>
                                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">About Me (Bio)</label>
                                <textarea 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    rows="4"
                                    defaultValue="I am a dedicated professional working at Knome, focused on bridging the gap between innovative technology and user needs."
                                ></textarea>
                            </div>
                            
                            {/* Skills & Interests */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Skills (Comma separated)</label>
                                    <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" defaultValue="Product Strategy, Agile Methodologies, Data Analysis" />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Interests (Comma separated)</label>
                                    <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" defaultValue="AI & Machine Learning, Design Systems" />
                                </div>
                            </div>
                            
                            {/* Visibility Settings (FR-UP-04) */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-[14px] font-bold text-slate-900 dark:text-white mb-4">Privacy & Visibility Settings</h3>
                                <div className="space-y-4">
                                    {['Profile Bio', 'Network Connections', 'Interests'].map((setting, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{setting}</span>
                                            <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                                                <option>Public</option>
                                                <option>Connections Only</option>
                                                <option>Private</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
