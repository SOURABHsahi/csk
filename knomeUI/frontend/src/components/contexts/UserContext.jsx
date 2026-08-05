import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiClient } from '../../utils/apiClient';
import { authApi, profileApi } from '../../utils/apiService';

/**
 * Maps a human-readable roleName (from Admin UI dropdown) to the short role code
 * used throughout the app for permission checks (currentUser.role).
 */
export const roleNameToCode = {
    'Employee': 'EMP',
    'Community Admin': 'CADM',
    'Community Administrator': 'CADM',
    'HR Administrator': 'HRADM',
    'HR Admin': 'HRADM',
    'System Administrator': 'SYSADM',
    'System Admin': 'SYSADM',
};

// Static employee roster for demo login (matches HrmsService.cs mock data)
// This is the seed — the live state is managed inside UserProvider via useState.
export const INITIAL_USERS = [
    { id: 1, employeeId: 'MPO101', name: 'Loveneesh Sharma', role: 'SYSADM', roleName: 'System Administrator', designation: 'IT Operations Manager', department: 'IT Operations', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/40.jpg' },
    { id: 2, employeeId: 'MPO102', name: 'Vishendra Sharma', role: 'CADM', roleName: 'Community Administrator', designation: 'Community Experience Specialist', department: 'Employee Experience', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/11.jpg' },
    { id: 3, employeeId: 'MPO103', name: 'Sourabh Sahu', role: 'HRADM', roleName: 'HR Administrator', designation: 'Talent Acquisition Manager', department: 'Human Resources', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
    { id: 4, employeeId: 'MPO104', name: 'Rishikesh Ugle', role: 'EMP', roleName: 'Employee', designation: 'Software Engineer', department: 'Product Design', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/33.jpg' },
    { id: 5, employeeId: 'MPO105', name: 'Meghna Tiwari', role: 'EMP', roleName: 'Employee', designation: 'Business Analyst', department: 'Product Design', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { id: 6, employeeId: 'MPO106', name: 'Mayur Verma', role: 'EMP', roleName: 'Employee', designation: 'UI Designer', department: 'Engineering', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/55.jpg' },
];

// Keep the named export `users` for any legacy imports
export const users = INITIAL_USERS;

const UserContext = createContext({
    currentUser: null,
    setCurrentUser: () => {},
    users: INITIAL_USERS,
    isAuthLoading: false,
    isAuthenticated: false,
    login: async () => {},
    logout: async () => {},
    refreshCurrentUser: async () => {},
    updateCurrentUserRole: () => {},
    updateUserRoleInList: () => {},
});

export const UserProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // ── Reactive users list — changes here cause Navbar Switch User to re-render ──
    const [usersList, setUsersList] = useState(INITIAL_USERS);

    // Merge backend profile data on top of local user shape
    const mergeProfile = useCallback((localUser, profile) => {
        if (!profile) return localUser;
        return {
            ...localUser,
            // Override with backend data where available
            name: profile.fullName || localUser.name,
            designation: profile.designation || localUser.designation,
            department: profile.departmentName || localUser.department,
            location: profile.location || localUser.location,
            avatar: (profile.profilePhotoUrl ? (profile.profilePhotoUrl.startsWith('http') ? profile.profilePhotoUrl : `http://localhost:5095${profile.profilePhotoUrl.startsWith('/') ? '' : '/'}${profile.profilePhotoUrl}`) : null) || localUser.avatar,
            bio: profile.bio || '',
            skills: profile.skills || [],
            interests: profile.interests || [],
            karma: profile.karmaPoints || 0,
            followersCount: profile.followersCount || 0,
            followingCount: profile.followingCount || 0,
            postsCount: profile.postsCount || 0,
            mutualConnectionsCount: profile.mutualConnectionsCount || 0,
            commonCommunitiesCount: profile.commonCommunitiesCount || 0,
            // Backend userId for API calls
            userId: profile.userId,
        };
    }, []);

    /**
     * Authenticate via backend and set currentUser.
     * Falls back gracefully if API is unreachable (demo mode).
     */
    const authenticateUser = useCallback(async (localUser) => {
        setIsAuthLoading(true);
        try {
            // 1. Get JWT from backend
            const data = await authApi.login(localUser.employeeId);
            if (data?.token) {
                localStorage.setItem('knome_jwt', data.token);
                if (data.refreshToken) {
                    localStorage.setItem('knome_refresh', data.refreshToken);
                }
            }

            // 2. Fetch real profile from backend
            try {
                const profile = await profileApi.getMe();
                setCurrentUser(mergeProfile(localUser, profile));
            } catch {
                setCurrentUser(localUser);
            }

            setIsAuthenticated(true);
        } catch (error) {
            const errMsg = (error?.message || '').toLowerCase();
            if (errMsg.includes('suspended') || errMsg.includes('inactive')) {
                setCurrentUser(null);
                setIsAuthenticated(false);
                throw new Error(error.message || 'This account has been suspended by System Administrator. Please contact HR.');
            }
            console.warn('API unavailable — running in demo mode:', error.message);
            // Demo fallback: still allow app to work without backend for active non-suspended users
            setCurrentUser(localUser);
            setIsAuthenticated(true);
        } finally {
            setIsAuthLoading(false);
        }
    }, [mergeProfile]);

    /**
     * On mount: check if a valid JWT exists and restore session.
     */
    useEffect(() => {
        const restoreSession = async () => {
            const existingToken = localStorage.getItem('knome_jwt');
            const savedEmployeeId = localStorage.getItem('knome_employeeId');

            if (existingToken && savedEmployeeId) {
                // Try to restore from stored employee ID
                const localUser = usersList.find(u => u.employeeId === savedEmployeeId);
                if (localUser) {
                    if (localUser.isActive === false) {
                        console.warn('Suspended user session blocked');
                        localStorage.removeItem('knome_jwt');
                        localStorage.removeItem('knome_refresh');
                        localStorage.removeItem('knome_employeeId');
                        setCurrentUser(null);
                        setIsAuthenticated(false);
                        setIsAuthLoading(false);
                        return;
                    }
                    try {
                        const profile = await profileApi.getMe();
                        setCurrentUser(mergeProfile(localUser, profile));
                        setIsAuthenticated(true);
                        setIsAuthLoading(false);
                        return;
                    } catch (err) {
                        console.warn('Session expired or token invalid — resetting session:', err?.message || err);
                        // Token expired or 401 — clear stored session
                        localStorage.removeItem('knome_jwt');
                        localStorage.removeItem('knome_refresh');
                        localStorage.removeItem('knome_employeeId');
                        setCurrentUser(null);
                        setIsAuthenticated(false);
                        setIsAuthLoading(false);
                        return;
                    }
                }
            }

            // No valid session — show login page
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsAuthLoading(false);
        };

        restoreSession();
        // Only run on mount — usersList intentionally excluded to avoid infinite loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mergeProfile]);

    /**
     * Login with a specific local user (used from Login page or user-switcher).
     */
    const login = useCallback(async (employeeId) => {
        const localUser = usersList.find(u => u.employeeId === employeeId);
        if (!localUser) throw new Error(`No user found for employee ID: ${employeeId}`);
        if (localUser.isActive === false) {
            throw new Error(`Your account (${localUser.name}) has been suspended by System Administrator. Please contact HR for compliance clearance.`);
        }
        localStorage.setItem('knome_employeeId', employeeId);
        await authenticateUser(localUser);
    }, [authenticateUser, usersList]);

    /**
     * Logout — clear tokens and reset state.
     */
    const logout = useCallback(async () => {
        const refreshToken = localStorage.getItem('knome_refresh');
        try {
            if (refreshToken) await authApi.logout(refreshToken);
        } catch { /* ignore logout errors */ }
        localStorage.removeItem('knome_jwt');
        localStorage.removeItem('knome_refresh');
        localStorage.removeItem('knome_employeeId');
        setCurrentUser(null);
        setIsAuthenticated(false);
    }, []);

    /**
     * Switch user (dev/demo shortcut — kept for the user switcher in Navbar).
     */
    const switchUser = useCallback(async (user) => {
        localStorage.setItem('knome_employeeId', user.employeeId);
        await authenticateUser(user);
    }, [authenticateUser]);

    /**
     * Update local currentUser state after profile edits (without re-auth).
     */
    const refreshCurrentUser = useCallback(async () => {
        if (!currentUser) return;
        try {
            const profile = await profileApi.getMe();
            const localUser = usersList.find(u => u.employeeId === currentUser.employeeId) || currentUser;
            setCurrentUser(mergeProfile(localUser, profile));
        } catch { /* keep existing */ }
    }, [currentUser, mergeProfile, usersList]);

    /**
     * Update the role of ANY user by their backend userId.
     * - Updates `usersList` state → Navbar Switch User dropdown re-renders instantly.
     * - If the updated user is the currently logged-in user, also updates `currentUser`
     *   so Navbar role guard, Sidebar nav items, and all role-protected pages update.
     *
     * @param {string|number} userId   - backend userId of the target user
     * @param {string}        newRoleName - e.g. "HR Administrator"
     */
    const updateUserRoleInList = useCallback((userId, newRoleName) => {
        const newRoleCode = roleNameToCode[newRoleName] || 'EMP';

        // 1. Update the reactive usersList (Navbar Switch User list)
        setUsersList(prev => prev.map(u => {
            // Match by backend userId (stored after login) OR by id (initial seed id)
            const matchById = u.userId && String(u.userId) === String(userId);
            const matchBySeedId = u.id && String(u.id) === String(userId);
            if (matchById || matchBySeedId) {
                return { ...u, role: newRoleCode, roleName: newRoleName };
            }
            return u;
        }));

        // 2. If this is the currently logged-in user, update currentUser too
        setCurrentUser(prev => {
            if (!prev) return prev;
            const matchById = prev.userId && String(prev.userId) === String(userId);
            const matchBySeedId = prev.id && String(prev.id) === String(userId);
            if (matchById || matchBySeedId) {
                return { ...prev, role: newRoleCode, roleName: newRoleName };
            }
            return prev;
        });
    }, []);

    /**
     * Award Karma Points specifically to a target user (e.g. after Admin approves their video/podcast).
     * @param {string|number} userId - backend userId or seed id of the target user
     * @param {number} points - number of karma points to award (e.g. +50)
     * @param {string} reason - description of the earned karma
     */
    /**
     * Award Karma Points according to official MPOnline Enterprise Karma Rules & Daily Caps
     * @param {string|number} userId - Target user ID
     * @param {string} ruleKey - 'POST' | 'ARTICLE' | 'VIDEO' | 'PODCAST' | 'LIKE_RECEIVED' | 'COMMENT_RECEIVED' | 'SHARE_RECEIVED' | 'COMMUNITY_PARTICIPATION'
     * @param {object} options - { communityId, customTitle, overridePoints }
     */
    const awardRuleKarma = useCallback((userId, ruleKey, options = {}) => {
        if (!userId) return false;
        
        const ruleMap = {
            POST: { points: 2, maxDailyPoints: 10, title: 'Create and publish a Post', category: 'Post' },
            ARTICLE: { points: 10, maxDailyPoints: 30, title: 'Publish an Article', category: 'Article' },
            VIDEO: { points: 8, maxDailyPoints: 24, title: 'Upload a Video (Approved)', category: 'Video' },
            PODCAST: { points: 8, maxDailyPoints: 24, title: 'Upload a Podcast (Approved)', category: 'Podcast' },
            LIKE_RECEIVED: { points: 1, maxDailyPoints: Infinity, title: 'Receive a Like on content', category: 'Engagement' },
            COMMENT_RECEIVED: { points: 2, maxDailyPoints: Infinity, title: 'Receive a Comment on content', category: 'Engagement' },
            SHARE_RECEIVED: { points: 3, maxDailyPoints: Infinity, title: 'Receive a Share on content', category: 'Engagement' },
            COMMUNITY_PARTICIPATION: { points: 5, maxDailyPoints: 5, title: 'Active Community Participation', category: 'Community' }
        };

        const rule = ruleMap[ruleKey] || { points: options.overridePoints || 5, maxDailyPoints: Infinity, title: options.customTitle || 'Karma Earned', category: 'General' };
        const todayStr = new Date().toISOString().slice(0, 10);
        const dailyTrackerKey = `knome_karma_daily_${userId}_${todayStr}`;
        let dailyData = {};
        
        try {
            dailyData = JSON.parse(localStorage.getItem(dailyTrackerKey) || '{}');
        } catch { dailyData = {}; }

        // Community participation rule: once per community per day
        if (ruleKey === 'COMMUNITY_PARTICIPATION' && options.communityId) {
            const commKey = `COMMUNITY_${options.communityId}`;
            if (dailyData[commKey]) return false; // Already earned for this community today
            dailyData[commKey] = true;
        }

        const currentEarnedToday = dailyData[ruleKey] || 0;
        if (currentEarnedToday >= rule.maxDailyPoints) {
            return false; // Daily cap reached
        }

        const pointsToAward = Math.min(rule.points, rule.maxDailyPoints - currentEarnedToday);
        if (pointsToAward <= 0) return false;

        dailyData[ruleKey] = currentEarnedToday + pointsToAward;
        try { localStorage.setItem(dailyTrackerKey, JSON.stringify(dailyData)); } catch (e) {}

        const actionTitle = options.customTitle || rule.title;

        // 1. Update karmaPoints in usersList state
        setUsersList(prev => prev.map(u => {
            const matchById = u.userId && String(u.userId) === String(userId);
            const matchBySeedId = u.id && String(u.id) === String(userId);
            if (matchById || matchBySeedId) {
                const currentVal = u.karmaPoints || u.karma || 0;
                const newVal = currentVal + pointsToAward;
                try { localStorage.setItem(`knome_user_karma_${userId}`, String(newVal)); } catch (e) {}
                return { ...u, karmaPoints: newVal, karma: newVal };
            }
            return u;
        }));

        // 2. If target user is currently logged in, update currentUser state
        setCurrentUser(prev => {
            if (!prev) return prev;
            const matchById = prev.userId && String(prev.userId) === String(userId);
            const matchBySeedId = prev.id && String(prev.id) === String(userId);
            if (matchById || matchBySeedId) {
                const currentVal = prev.karmaPoints || prev.karma || 0;
                const newVal = currentVal + pointsToAward;
                try { localStorage.setItem(`knome_user_karma_${userId}`, String(newVal)); } catch (e) {}
                return { ...prev, karmaPoints: newVal, karma: newVal };
            }
            return prev;
        });

        // 3. Save to Karma History
        try {
            const historyKey = `knome_karma_history_${userId}`;
            const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
            const newTx = {
                id: `karma_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                transactionId: Date.now(),
                pointsAwarded: pointsToAward,
                points: `+${pointsToAward}`,
                activityType: actionTitle,
                title: actionTitle,
                createdDate: new Date().toISOString(),
                date: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                category: rule.category
            };
            localStorage.setItem(historyKey, JSON.stringify([newTx, ...existingHistory]));
        } catch (e) {
            console.warn("Failed to store karma history log", e);
        }

        return pointsToAward;
    }, []);

    const addKarmaPointsToUser = useCallback((userId, points = 50, reason = 'Media Upload Approved') => {
        return awardRuleKarma(userId, 'CUSTOM', { overridePoints: points, customTitle: reason });
    }, [awardRuleKarma]);

    const toggleUserActiveStatus = useCallback((userId, isActive) => {
        setUsersList(prev => prev.map(u => {
            const matchById = u.userId && String(u.userId) === String(userId);
            const matchBySeedId = u.id && String(u.id) === String(userId);
            if (matchById || matchBySeedId) {
                return { ...u, isActive: isActive };
            }
            return u;
        }));

        setCurrentUser(prev => {
            if (!prev) return prev;
            const matchById = prev.userId && String(prev.userId) === String(userId);
            const matchBySeedId = prev.id && String(prev.id) === String(userId);
            if (matchById || matchBySeedId) {
                if (!isActive) {
                    localStorage.removeItem('knome_jwt');
                    localStorage.removeItem('knome_refresh');
                    localStorage.removeItem('knome_employeeId');
                    setIsAuthenticated(false);
                    return null;
                }
                return { ...prev, isActive: isActive };
            }
            return prev;
        });
    }, []);

    /**
     * Convenience wrapper — update the CURRENT logged-in user's role only.
     * (Kept for backward compatibility; prefer updateUserRoleInList when userId is known.)
     */
    const updateCurrentUserRole = useCallback((newRoleName) => {
        if (!currentUser) return;
        const targetId = currentUser.userId || currentUser.id;
        updateUserRoleInList(targetId, newRoleName);
    }, [currentUser, updateUserRoleInList]);

    return (
        <UserContext.Provider value={{
            currentUser,
            setCurrentUser: switchUser,
            users: usersList,           // ← reactive list, not the static constant
            isAuthLoading,
            isAuthenticated,
            login,
            logout,
            refreshCurrentUser,
            updateCurrentUserRole,
            updateUserRoleInList,
            toggleUserActiveStatus,
            addKarmaPointsToUser,
            awardRuleKarma,
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        return {
            currentUser: null,
            setCurrentUser: () => {},
            users: [],
            isAuthLoading: false,
            isAuthenticated: false,
            login: async () => {},
            logout: async () => {},
            refreshCurrentUser: async () => {},
            updateCurrentUserRole: () => {},
            updateUserRoleInList: () => {},
        };
    }
    return context;
};
