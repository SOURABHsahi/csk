import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiClient } from '../../utils/apiClient';
import { authApi, profileApi } from '../../utils/apiService';

// Static employee roster for demo login (matches HrmsService.cs mock data)
export const users = [
    { id: 1, employeeId: 'MPO101', name: 'Loveneesh Sharma', role: 'SYSADM', roleName: 'System Administrator', designation: 'System Administrator', department: 'IT Operations', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/40.jpg' },
    { id: 2, employeeId: 'MPO102', name: 'Vishendra Sharma', role: 'CADM', roleName: 'Community Administrator', designation: 'Community Administrator', department: 'Employee Experience', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/11.jpg' },
    { id: 3, employeeId: 'MPO103', name: 'Sourabh Sahu', role: 'HRADM', roleName: 'HR Administrator', designation: 'HR Administrator', department: 'Human Resources', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
    { id: 4, employeeId: 'MPO104', name: 'Rishikesh Ugle', role: 'EMP', roleName: 'Employee', designation: 'Software Engineer', department: 'Product Design', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/33.jpg' },
    { id: 5, employeeId: 'MPO105', name: 'Meghna Tiwari', role: 'EMP', roleName: 'Employee', designation: 'Business Analyst', department: 'Product Design', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { id: 6, employeeId: 'MPO106', name: 'Mayur Verma', role: 'EMP', roleName: 'Employee', designation: 'UI Designer', department: 'Engineering', location: 'Bhopal', avatar: 'https://randomuser.me/api/portraits/men/55.jpg' },
];

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

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
            avatar: profile.avatarUrl || localUser.avatar,
            bio: profile.bio || '',
            skills: profile.skills || [],
            interests: profile.interests || [],
            karma: profile.karmaPoints || 0,
            followersCount: profile.followersCount || 0,
            followingCount: profile.followingCount || 0,
            postsCount: profile.postsCount || 0,
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
            console.warn('API unavailable — running in demo mode:', error.message);
            // Demo fallback: still allow app to work without backend
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
                const localUser = users.find(u => u.employeeId === savedEmployeeId);
                if (localUser) {
                    try {
                        const profile = await profileApi.getMe();
                        setCurrentUser(mergeProfile(localUser, profile));
                        setIsAuthenticated(true);
                        setIsAuthLoading(false);
                        return;
                    } catch {
                        // Token may be expired — clear and show login
                        localStorage.removeItem('knome_jwt');
                        localStorage.removeItem('knome_refresh');
                        localStorage.removeItem('knome_employeeId');
                    }
                }
            }

            // No valid session — show login page
            setIsAuthenticated(false);
            setIsAuthLoading(false);
        };

        restoreSession();
    }, [mergeProfile]);

    /**
     * Login with a specific local user (used from Login page or user-switcher).
     */
    const login = useCallback(async (employeeId) => {
        const localUser = users.find(u => u.employeeId === employeeId);
        if (!localUser) throw new Error(`No user found for employee ID: ${employeeId}`);
        localStorage.setItem('knome_employeeId', employeeId);
        await authenticateUser(localUser);
    }, [authenticateUser]);

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
            const localUser = users.find(u => u.employeeId === currentUser.employeeId) || currentUser;
            setCurrentUser(mergeProfile(localUser, profile));
        } catch { /* keep existing */ }
    }, [currentUser, mergeProfile]);

    return (
        <UserContext.Provider value={{
            currentUser,
            setCurrentUser: switchUser,
            users,
            isAuthLoading,
            isAuthenticated,
            login,
            logout,
            refreshCurrentUser,
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
