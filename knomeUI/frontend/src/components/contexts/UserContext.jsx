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
    'Pending Role Assignment': 'PENDING',
    'PENDING': 'PENDING',
};

// Static employee roster for demo login (matches HrmsService.cs mock data)
// This is the seed — the live state is managed inside UserProvider via useState.
export const INITIAL_USERS = [
    { id: 1, employeeId: 'MPO101', name: 'Loveneesh Sharma', role: 'SYSADM', roleName: 'System Administrator', designation: 'IT Operations Manager', department: 'IT Operations', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/40.jpg', isActive: true },
    { id: 2, employeeId: 'MPO102', name: 'Vishendra Sharma', role: 'CADM', roleName: 'Community Administrator', designation: 'Community Experience Specialist', department: 'Employee Experience', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/11.jpg', isActive: true },
    { id: 3, employeeId: 'MPO103', name: 'Sourabh Sahu', role: 'HRADM', roleName: 'HR Administrator', designation: 'Talent Acquisition Manager', department: 'Human Resources', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/22.jpg', isActive: true },
    { id: 4, employeeId: 'MPO104', name: 'Rishikesh Ugle', role: 'EMP', roleName: 'Employee', designation: 'Software Engineer', department: 'Product Design', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/33.jpg', isActive: true },
    { id: 5, employeeId: 'MPO105', name: 'Meghna Tiwari', role: 'EMP', roleName: 'Employee', designation: 'Business Analyst', department: 'Product Design', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', isActive: true },
    { id: 6, employeeId: 'MPO106', name: 'Mayur Verma', role: 'EMP', roleName: 'Employee', designation: 'UI Designer', department: 'Engineering', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/55.jpg', isActive: true },
    { id: 7, employeeId: 'MPO107', name: 'Vilash Deshmukh', role: 'SYSADM', roleName: 'System Administrator', designation: 'TL', department: 'Development', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/66.jpg', isActive: true },
    { id: 8, employeeId: 'MPO112', name: 'Rajesh Kumar', role: 'CADM', roleName: 'Community Administrator', designation: 'Senior Software Engineer', department: 'Development', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/72.jpg', isActive: true },
    { id: 9, employeeId: 'MPO108', name: 'Pooja Sharma', role: 'HRADM', roleName: 'HR Administrator', designation: 'Frontend Engineer', department: 'Development', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/women/68.jpg', isActive: true },
    { id: 10, employeeId: 'MPO115', name: 'Sourabh Sahu', role: 'EMP', roleName: 'Employee', designation: 'Software Engineer', department: 'Development', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/75.jpg', isActive: true },
    { id: 11, employeeId: 'MPO116', name: 'Sourabh Sahu', role: 'EMP', roleName: 'Employee', designation: 'Software Engineer', department: 'Development', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/76.jpg', isActive: true },
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

        const roleCodeMap = {
            'System Administrator': 'SYSADM',
            'HR Administrator': 'HRADM',
            'Community Admin': 'CADM',
            'Community Administrator': 'CADM',
            'Employee': 'EMP'
        };

        let derivedRole = localUser.role || 'EMP';
        let derivedRoleName = localUser.roleName || 'Employee';

        if (Array.isArray(profile.roles) && profile.roles.length > 0) {
            const rolePriority = ['System Administrator', 'HR Administrator', 'Community Admin', 'Community Administrator', 'Employee'];
            const highestRole = rolePriority.find(r => profile.roles.includes(r)) || profile.roles[0];
            derivedRoleName = highestRole;
            derivedRole = roleCodeMap[highestRole] || 'EMP';
        } else if (Array.isArray(profile.roles) && profile.roles.length === 0) {
            derivedRole = 'PENDING';
            derivedRoleName = 'Pending Role Assignment';
        }

        const resolvedName = profile.fullName || localUser.name;
        const resolvedEmpId = profile.employeeId || localUser.employeeId;

        setUsersList(prev => {
            const exists = prev.some(u => u.employeeId?.toUpperCase() === resolvedEmpId?.toUpperCase());
            if (exists) {
                return prev.map(u => 
                    u.employeeId?.toUpperCase() === resolvedEmpId?.toUpperCase()
                        ? { ...u, role: derivedRole, roleName: derivedRoleName, name: resolvedName, fullName: resolvedName }
                        : u
                );
            }
            return [...prev, {
                ...localUser,
                employeeId: resolvedEmpId,
                name: resolvedName,
                fullName: resolvedName,
                role: derivedRole,
                roleName: derivedRoleName,
                designation: profile.designation || localUser.designation,
                department: profile.departmentName || localUser.department,
            }];
        });

        return {
            ...localUser,
            employeeId: resolvedEmpId,
            // Override with backend data where available
            name: resolvedName,
            fullName: resolvedName,
            role: derivedRole,
            roleName: derivedRoleName,
            roles: profile.roles && profile.roles.length > 0 ? profile.roles : [derivedRoleName],
            designation: profile.designation || localUser.designation,
            department: profile.departmentName || localUser.department,
            location: profile.location || localUser.location,
            avatar: (profile.profilePhotoUrl ? resolveMediaUrl(profile.profilePhotoUrl) : null) || localUser.avatar,
            bio: profile.bio || '',
            skills: profile.skills || [],
            interests: profile.interests || [],
            karma: profile.karmaPoints || 0,
            karmaPoints: profile.karmaPoints || 0,
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
    /**
     * Authenticate via backend and set currentUser.
     * Strictly verifies credentials with backend.
     */
    const authenticateUser = useCallback(async (localUser) => {
        setIsAuthLoading(true);
        try {
            // 1. Get JWT from backend
            const data = await authApi.login(localUser.employeeId);
            if (data?.token) {
                localStorage.setItem('knome_jwt', data.token);
                localStorage.setItem('knome_employeeId', localUser.employeeId);
                if (data.refreshToken) {
                    localStorage.setItem('knome_refresh', data.refreshToken);
                }
            }

            const returnedUser = data?.user || data?.data?.user;
            const enrichedLocal = {
                ...localUser,
                name: returnedUser?.fullName || localUser.name,
                fullName: returnedUser?.fullName || localUser.name,
                designation: returnedUser?.designation || localUser.designation,
                department: returnedUser?.department || localUser.department,
            };

            // 2. Fetch real profile from backend
            try {
                const profile = await profileApi.getMe();
                setCurrentUser(mergeProfile(enrichedLocal, profile));
            } catch {
                setCurrentUser(mergeProfile(enrichedLocal, returnedUser));
            }

            setIsAuthenticated(true);
        } catch (error) {
            localStorage.removeItem('knome_jwt');
            localStorage.removeItem('knome_refresh');
            localStorage.removeItem('knome_employeeId');
            setCurrentUser(null);
            setIsAuthenticated(false);
            const errMsg = (error?.message || '').toLowerCase();
            if (errMsg.includes('suspended') || errMsg.includes('inactive')) {
                throw new Error(error.message || 'This account has been suspended by System Administrator. Please contact HR.');
            }
            throw new Error(error.message || 'Invalid Employee ID or credentials.');
        } finally {
            setIsAuthLoading(false);
        }
    }, [mergeProfile]);

    /**
     * On mount: check if a valid JWT exists, or if redirected from Employee Hub SSO, and restore session.
     */
    useEffect(() => {
        const restoreSession = async () => {
            // Check for incoming SSO query parameters from Employee Hub
            const urlParams = new URLSearchParams(window.location.search);
            const ssoToken = urlParams.get('sso_token') || urlParams.get('token');
            const ssoEmpId = urlParams.get('employeeId') || urlParams.get('employee_id');

            if (ssoEmpId) {
                const tokenToStore = ssoToken || `sso_token_${ssoEmpId}_${Date.now()}`;
                localStorage.setItem('knome_jwt', tokenToStore);
                localStorage.setItem('knome_employeeId', ssoEmpId);
                // Clean URL query parameters cleanly from address bar
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);

                let localUser = usersList.find(u => u.employeeId?.toUpperCase() === ssoEmpId.toUpperCase());
                if (!localUser) {
                    localUser = {
                        id: Date.now(),
                        employeeId: ssoEmpId.toUpperCase(),
                        name: ssoEmpId,
                        role: 'EMP',
                        roleName: 'Employee',
                        designation: 'Staff',
                        department: 'Development',
                        location: 'Bhopal',
                        avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
                        isActive: true,
                    };
                }

                try {
                    await authenticateUser(localUser);
                } catch (err) {
                    console.error('SSO authentication failed:', err?.message || err);
                    localStorage.removeItem('knome_jwt');
                    localStorage.removeItem('knome_employeeId');
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                    setIsAuthLoading(false);
                }
                return;
            }

            const existingToken = localStorage.getItem('knome_jwt');
            const savedEmployeeId = localStorage.getItem('knome_employeeId');

            if (savedEmployeeId) {
                let localUser = usersList.find(u => u.employeeId?.toUpperCase() === savedEmployeeId.toUpperCase());
                if (!localUser) {
                    localUser = {
                        id: Date.now(),
                        employeeId: savedEmployeeId.toUpperCase(),
                        name: savedEmployeeId,
                        role: 'EMP',
                        roleName: 'Employee',
                        designation: 'Staff',
                        department: 'Development',
                        location: 'Bhopal',
                        avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
                        isActive: true,
                    };
                }

                if (localUser.isActive === false) {
                    localStorage.removeItem('knome_jwt');
                    localStorage.removeItem('knome_refresh');
                    localStorage.removeItem('knome_employeeId');
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                    setIsAuthLoading(false);
                    return;
                }

                // If existing token is valid, verify it with getMe; otherwise re-authenticate
                if (existingToken) {
                    try {
                        const profile = await profileApi.getMe();
                        if (profile && (profile.employeeId?.toUpperCase() === savedEmployeeId.toUpperCase() || !profile.employeeId)) {
                            setCurrentUser(mergeProfile(localUser, profile));
                            setIsAuthenticated(true);
                            setIsAuthLoading(false);
                            return;
                        }
                    } catch {
                        console.info('Refreshing session token with backend...');
                    }
                }

                // Re-authenticate with backend to get fresh JWT token
                try {
                    await authenticateUser(localUser);
                    return;
                } catch (err) {
                    console.warn('Session verification failed:', err?.message || err);
                    localStorage.removeItem('knome_jwt');
                    localStorage.removeItem('knome_employeeId');
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                    setIsAuthLoading(false);
                    return;
                }
            }

            // No active session — do not auto-authenticate
            setIsAuthLoading(false);
            setIsAuthenticated(false);
            setCurrentUser(null);
        };

        restoreSession();
        // Only run on mount — usersList intentionally excluded to avoid infinite loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticateUser, mergeProfile]);

    // ── Real-time Role Assignment Poller (Instantly removes Pending banner/modal when Admin assigns role) ──
    useEffect(() => {
        if (!currentUser || currentUser.role !== 'PENDING') return;

        const intervalId = setInterval(async () => {
            try {
                const profile = await profileApi.getMe();
                if (profile && Array.isArray(profile.roles) && profile.roles.length > 0) {
                    const localUser = usersList.find(u => u.employeeId === currentUser.employeeId) || currentUser;
                    setCurrentUser(mergeProfile(localUser, profile));
                }
            } catch {
                // Ignore transient network errors
            }
        }, 3000);

        return () => clearInterval(intervalId);
    }, [currentUser?.role, currentUser?.employeeId, mergeProfile, usersList]);

    /**
     * Login with a specific local user (used from Login page or user-switcher).
     */
    const login = useCallback(async (employeeId) => {
        let localUser = usersList.find(u => 
            u.employeeId?.toUpperCase() === employeeId?.toUpperCase() ||
            u.email?.toLowerCase() === employeeId?.toLowerCase()
        );
        if (!localUser) {
            localUser = {
                id: Date.now(),
                employeeId: employeeId.toUpperCase(),
                name: employeeId,
                role: 'EMP',
                roleName: 'Employee',
                designation: 'Staff',
                department: 'Development',
                location: 'Bhopal',
                avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
                isActive: true,
            };
        }
        if (localUser.isActive === false) {
            throw new Error(`Your account (${localUser.name}) has been suspended by System Administrator. Please contact HR for compliance clearance.`);
        }
        localStorage.setItem('knome_employeeId', localUser.employeeId);
        await authenticateUser(localUser);
    }, [authenticateUser, usersList]);

    const logout = useCallback(async () => {
        const refreshToken = localStorage.getItem('knome_refresh');
        try {
            if (refreshToken) await authApi.logout(refreshToken);
        } catch { /* ignore logout errors */ }
        localStorage.removeItem('knome_jwt');
        localStorage.removeItem('knome_refresh');
        localStorage.removeItem('knome_employeeId');
        
        const host = window.location.hostname || 'localhost';
        const isIis = window.location.port === '8080';
        const ehPort = isIis ? '8081' : '5001';
        const knomePort = window.location.port || (isIis ? '8080' : '5173');
        const ehBase = `http://${host}:${ehPort}`;
        const knomeBase = `http://${host}:${knomePort}`;
        
        window.location.href = `${ehBase}/?logout=true&client_id=knome-web-portal&redirect_uri=${encodeURIComponent(knomeBase)}`;
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
    const updateUserRoleInList = useCallback((targetIdentifier, newRoleParam) => {
        const rolesArray = Array.isArray(newRoleParam) ? newRoleParam : [newRoleParam];
        const primaryRoleName = rolesArray.find(r => r !== 'Employee') || rolesArray[0] || 'Employee';
        const newRoleCode = roleNameToCode[primaryRoleName] || (primaryRoleName === 'Pending Role Assignment' ? 'PENDING' : 'EMP');

        // 1. Update the reactive usersList (Navbar Switch User list)
        setUsersList(prev => prev.map(u => {
            const matchById = u.userId && String(u.userId) === String(targetIdentifier);
            const matchBySeedId = u.id && String(u.id) === String(targetIdentifier);
            const matchByEmpId = u.employeeId && u.employeeId.toUpperCase() === String(targetIdentifier).toUpperCase();
            if (matchById || matchBySeedId || matchByEmpId) {
                return { ...u, role: newRoleCode, roleName: primaryRoleName, roles: rolesArray };
            }
            return u;
        }));

        // 2. If this is the currently logged-in user, update currentUser too
        setCurrentUser(prev => {
            if (!prev) return prev;
            const matchById = prev.userId && String(prev.userId) === String(targetIdentifier);
            const matchBySeedId = prev.id && String(prev.id) === String(targetIdentifier);
            const matchByEmpId = prev.employeeId && prev.employeeId.toUpperCase() === String(targetIdentifier).toUpperCase();
            if (matchById || matchBySeedId || matchByEmpId) {
                return { ...prev, role: newRoleCode, roleName: primaryRoleName, roles: rolesArray };
            }
            return prev;
        });
    }, []);

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
