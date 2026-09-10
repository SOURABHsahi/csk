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

// Static employee roster for demo login (matches live SQL Server database roster)
// This is the seed — the live state is managed inside UserProvider via useState.
export const INITIAL_USERS = [
    { id: 1, userId: 1, employeeId: 'MP0108', email: 'loveneesh.sharma@mponline.gov.in', name: 'Loveneesh Sharma', fullName: 'Loveneesh Sharma', role: 'SYSADM', roleName: 'System Administrator', designation: 'TPM', department: 'Higher Education', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 2, userId: 2, employeeId: 'MPO102', email: 'vishendra.sharma@mponline.gov.in', name: 'Vishendra Sharma', fullName: 'Vishendra Sharma', role: 'CADM', roleName: 'Community Administrator', designation: 'Community Experience Specialist', department: 'Employee Experience', location: 'Bhopal HQ', avatar: null, karmaPoints: 225, karma: 225, isActive: true },
    { id: 3, userId: 3, employeeId: 'MPO103', email: 'sourabh.sahu@mponline.gov.in', name: 'Sourabh Sahu', fullName: 'Sourabh Sahu', role: 'HRADM', roleName: 'HR Administrator', designation: 'Talent Acquisition Manager', department: 'Human Resources', location: 'Bhopal HQ', avatar: null, karmaPoints: 306, karma: 306, isActive: true },
    { id: 4, userId: 4, employeeId: 'MPO104', email: 'rishikesh.ugle@mponline.gov.in', name: 'Rishikesh Ugle', fullName: 'Rishikesh Ugle', role: 'EMP', roleName: 'Employee', designation: 'Software Engineer', department: 'Product Design', location: 'Bhopal HQ', avatar: null, karmaPoints: 170, karma: 170, isActive: true },
    { id: 5, userId: 5, employeeId: 'MPO105', email: 'meghna.tiwari@mponline.gov.in', name: 'Meghna Tiwari', fullName: 'Meghna Tiwari', role: 'EMP', roleName: 'Employee', designation: 'Business Analyst', department: 'Product Design', location: 'Bhopal HQ', avatar: null, karmaPoints: 123, karma: 123, isActive: true },
    { id: 6, userId: 6, employeeId: 'MPO106', email: 'mayur.verma@mponline.gov.in', name: 'Mayur Verma', fullName: 'Mayur Verma', role: 'EMP', roleName: 'Employee', designation: 'UI Designer', department: 'Engineering', location: 'Bhopal HQ', avatar: null, karmaPoints: 142, karma: 142, isActive: true },
    { id: 17, userId: 17, employeeId: 'MPO107', email: 'mpo107.temp@mponline.gov.in', name: 'Vilash Deshmukh (Old)', fullName: 'Vilash Deshmukh', role: 'SYSADM', roleName: 'System Administrator', designation: 'TL', department: 'Development', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 19, userId: 19, employeeId: 'MPO108', email: 'pooja.sharma@mponline.gov.in', name: 'Pooja Sharma', fullName: 'Pooja Sharma', role: 'HRADM', roleName: 'HR Administrator', designation: 'Frontend Engineer', department: 'Development', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1034, userId: 1034, employeeId: 'MPO109', email: 'suresh.verma@mponline.gov.in', name: 'Suresh verma', fullName: 'Suresh verma', role: 'CADM', roleName: 'Community Administrator', designation: 'software developer', department: 'Technology', location: 'Bhopal HQ', avatar: null, karmaPoints: 17, karma: 17, isActive: true },
    { id: 1035, userId: 1035, employeeId: 'MPO110', email: 'kabir.singh@mponline.gov.in', name: 'Kabir singh', fullName: 'Kabir singh', role: 'CADM', roleName: 'Community Administrator', designation: 'software developer', department: 'Technology', location: 'Bhopal HQ', avatar: null, karmaPoints: 21, karma: 21, isActive: true },
    { id: 1036, userId: 1036, employeeId: 'MPO111', email: 'mayur.bansal@mponline.gov.in', name: 'Mayur bansal', fullName: 'Mayur bansal', role: 'EMP', roleName: 'Employee', designation: 'software developer', department: 'Technology', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1037, userId: 1037, employeeId: 'MPO112', email: 'anup@mponline.gov.in', name: 'Anup', fullName: 'Anup', role: 'EMP', roleName: 'Employee', designation: 'software developer', department: 'Technology', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1039, userId: 1039, employeeId: 'MPO113', email: 'mahesh.sharma@mponline.gov.in', name: 'Mahesh sharma', fullName: 'Mahesh sharma', role: 'HRADM', roleName: 'HR Administrator', designation: 'Hr', department: 'Human Resources', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1041, userId: 1041, employeeId: 'MPO114', email: 'ramesh.sharma@mponline.gov.in', name: 'Ramesh sharma', fullName: 'Ramesh sharma', role: 'EMP', roleName: 'Employee', designation: 'software developer', department: 'Technology', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1043, userId: 1043, employeeId: 'MPO115', email: 'aishwary@mponline.gov.in', name: 'Aishwary', fullName: 'Aishwary', role: 'CADM', roleName: 'Community Administrator', designation: 'Software Engineer', department: 'Technology', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1047, userId: 1047, employeeId: 'MPO116', email: 'meghna@mponline.gov.in', name: 'Meghna', fullName: 'Meghna', role: 'HRADM', roleName: 'HR Administrator', designation: 'Software Engineer', department: 'HR', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1050, userId: 1050, employeeId: 'MPO089', email: 'vilash.deshmukh@mponline.gov.in', name: 'Vilash Deshmukh', fullName: 'Vilash Deshmukh', role: 'SYSADM', roleName: 'System Administrator', designation: 'Associate Consultant', department: 'HR', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1052, userId: 1052, employeeId: 'MPO118', email: 'raman.kumar@mponline.gov.in', name: 'Raman Kumar', fullName: 'Raman Kumar', role: 'CADM', roleName: 'Community Administrator', designation: 'Software Engineer', department: 'HR', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1053, userId: 1053, employeeId: 'MPO119', email: 'rishabh.pandey@mponline.gov.in', name: 'Rishabh Pandey', fullName: 'Rishabh Pandey', role: 'CADM', roleName: 'Community Administrator', designation: 'Software Engineer', department: 'Information Technology', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1054, userId: 1054, employeeId: 'MPO120', email: 'krisha.dabhi@mponline.gov.in', name: 'krisha dabhi', fullName: 'krisha dabhi', role: 'CADM', roleName: 'Community Administrator', designation: 'Software Engineer', department: 'Information Technology', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1055, userId: 1055, employeeId: 'MPO121', email: 'mahi.rathore@mponline.gov.in', name: 'Mahi Rathore', fullName: 'Mahi Rathore', role: 'EMP', roleName: 'Employee', designation: 'Software Engineer', department: 'HR', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1056, userId: 1056, employeeId: 'MPO122', email: 'satendra.singh@mponline.gov.in', name: 'Satendra Singh', fullName: 'Satendra Singh', role: 'EMP', roleName: 'Employee', designation: 'Software Engineer', department: 'Information Technology', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1057, userId: 1057, employeeId: 'mpo652', email: 'deepak.simrodia@mponline.gov.in', name: 'Deepak Simrodia', fullName: 'Deepak Simrodia', role: 'EMP', roleName: 'Employee', designation: 'Software Developer', department: 'University', location: 'Bhopal HQ', avatar: null, karmaPoints: 0, karma: 0, isActive: true },
    { id: 1063, userId: 1063, employeeId: 'EMP001', email: 'EMP001@mponline.gov.in', name: 'Aarav Sharma', fullName: 'Aarav Sharma', role: 'EMP', roleName: 'Employee', designation: 'Senior Software Engineer', department: 'HR', location: 'Bhopal HQ', avatar: null, karmaPoints: 50, karma: 50, isActive: true },
    { id: 1064, userId: 1064, employeeId: 'EMP002', email: 'EMP002@mponline.gov.in', name: 'Priya Patel', fullName: 'Priya Patel', role: 'CADM', roleName: 'Community Admin', designation: 'Quality Assurance Lead', department: 'HR', location: 'Bhopal HQ', avatar: null, karmaPoints: 60, karma: 60, isActive: true },
    { id: 1065, userId: 1065, employeeId: 'EMP003', email: 'EMP003@mponline.gov.in', name: 'Rohan Verma', fullName: 'Rohan Verma', role: 'HRADM', roleName: 'HR Administrator', designation: 'HR Specialist', department: 'HR', location: 'Bhopal HQ', avatar: null, karmaPoints: 75, karma: 75, isActive: true },
    { id: 1066, userId: 1066, employeeId: 'EMP004', email: 'EMP004@mponline.gov.in', name: 'Neha Gupta', fullName: 'Neha Gupta', role: 'SYSADM', roleName: 'System Administrator', designation: 'DevOps Lead', department: 'HR', location: 'Bhopal HQ', avatar: null, karmaPoints: 90, karma: 90, isActive: true },
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
        } else {
            // New user from EmployeeHub gets default Employee role with full access
            derivedRole = 'EMP';
            derivedRoleName = 'Employee';
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
            avatar: (profile.profilePhotoUrl ? resolveMediaUrl(profile.profilePhotoUrl) : null) || localUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=6366f1&color=fff&size=256&bold=true`,
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
            // Helper: sync users list from backend (only called after token is confirmed present)
            const syncUsersList = async (userRoles = null) => {
                try {
                    const rolesToCheck = userRoles 
                        ? (Array.isArray(userRoles) ? userRoles : [userRoles]) 
                        : (currentUser?.roles || [currentUser?.role, currentUser?.roleName].filter(Boolean));
                    const isAdmin = rolesToCheck.some(r => ['SYSADM', 'HRADM', 'CADM', 'System Administrator', 'HR Administrator', 'Community Administrator', 'Community Admin'].includes(r));

                    const res = isAdmin 
                        ? await apiClient.get('/users?pageNumber=1&pageSize=100').catch(() => null)
                        : await apiClient.get('/users/suggestions').catch(() => null);

                    if (res) {
                        const apiItems = Array.isArray(res) ? res : (res.items || res.data || []);
                        if (apiItems.length > 0) {
                            const mappedApiUsers = apiItems.map(u => {
                                const empId = u.employeeId || u.EmployeeId || `MPO${u.userId || u.UserId || u.id}`;
                                const name = u.fullName || u.FullName || u.name || 'Employee';
                                const roles = Array.isArray(u.roles) ? u.roles : [u.roleName || 'Employee'];
                                const primaryRole = roles.find(r => r !== 'Employee') || roles[0] || 'Employee';
                                const roleCode = roleNameToCode[primaryRole] || 'EMP';
                                const karma = typeof u.karmaPoints === 'number' ? u.karmaPoints : (typeof u.karma === 'number' ? u.karma : 0);
                                const isSuspended = u.isSuspended === true || u.isPermanentlySuspended === true || u.isActive === false;
                                return {
                                    id: u.userId || u.UserId || u.id,
                                    userId: u.userId || u.UserId || u.id,
                                    employeeId: empId,
                                    name: name,
                                    fullName: name,
                                    role: roleCode,
                                    roleName: primaryRole,
                                    roles: roles,
                                    designation: u.designation || u.Designation || 'Staff Member',
                                    department: u.departmentName || u.DepartmentName || u.department || 'General',
                                    location: u.location || 'Bhopal HQ',
                                    avatar: u.profilePhotoUrl || u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true`,
                                    karmaPoints: karma,
                                    karma: karma,
                                    isActive: !isSuspended,
                                    isSuspended: isSuspended,
                                };
                            });
                            setUsersList(mappedApiUsers);
                        }
                    }
                } catch (e) { /* ignore */ }
            };

            // ── STEP 1: Check for incoming SSO parameters (Query string & Hash fragment) FIRST
            const searchParams = new URLSearchParams(window.location.search);
            const hashString = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
            const hashParams = new URLSearchParams(hashString);

            // Combined param lookup (checks search params first, then hash params)
            const getParam = (key) => searchParams.get(key) || hashParams.get(key);

            // DEBUG: Log received SSO parameters
            if (window.location.search || window.location.hash) {
                console.info('[SSO Debug] Search params:', Object.fromEntries(searchParams.entries()));
                console.info('[SSO Debug] Hash params:', Object.fromEntries(hashParams.entries()));
                console.info('[SSO Debug] Full URL:', window.location.href);
            }

            const ssoToken = getParam('token') || getParam('access_token') || getParam('sso_token') || getParam('id_token') || getParam('code');
            let ssoEmpId = getParam('employeeId') || getParam('employee_id') || getParam('empId') || getParam('emp_id') || getParam('email') || getParam('user') || getParam('username') || getParam('sub');

            // If token is present, decode JWT claims (email / employeeId / sub)
            if (ssoToken && !ssoEmpId) {
                try {
                    const parts = ssoToken.split('.');
                    if (parts.length >= 2) {
                        const base64Url = parts[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
                        const payload = JSON.parse(jsonPayload);
                        console.info('[SSO Debug] Decoded JWT Claims:', payload);

                        // Priority 1: Specific employee ID claims
                        const extractedEmpId = payload.employeeId || 
                                               payload.employee_id || 
                                               payload.empId;

                        // Priority 2: Specific email / username claims (including XML namespaces from Employee Hub / OpenIddict)
                        const extractedEmail = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || 
                                               payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
                                               payload.email || 
                                               payload.preferred_username || 
                                               payload.unique_name || 
                                               payload.upn || 
                                               payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn'];

                        // Priority 3: Meaningful sub (ignore raw GUIDs if email is available)
                        const isGuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
                        const cleanSub = payload.sub && !isGuid(payload.sub) ? payload.sub : null;

                        ssoEmpId = extractedEmpId || extractedEmail || cleanSub || payload.sub;
                    }
                } catch (e) {
                    console.warn('[SSO Debug] JWT decode note:', e?.message || e);
                }
            }

            if (ssoToken || ssoEmpId) {
                const tokenToStore = ssoToken || `sso_token_${ssoEmpId}_${Date.now()}`;
                localStorage.setItem('knome_jwt', tokenToStore);
                localStorage.setItem('accessToken', tokenToStore);
                if (ssoEmpId) localStorage.setItem('knome_employeeId', ssoEmpId);
                
                // Restore the page user was trying to visit before SSO redirect (or default to '/')
                const ssoReturnUrl = sessionStorage.getItem('knome_sso_return_url') || '/';
                sessionStorage.removeItem('knome_sso_return_url');

                // Clean URL query parameters cleanly from address bar
                window.history.replaceState({}, document.title, ssoReturnUrl);

                // SSO token from Employee Hub: authenticate with Knome backend using resolved identity
                if (ssoEmpId) {
                    if (ssoEmpId.toUpperCase() === 'MPO101') {
                        ssoEmpId = 'MP0108';
                    }
                    let localUser = INITIAL_USERS.find(u => 
                        (u.employeeId && u.employeeId.toUpperCase() === ssoEmpId.toUpperCase()) ||
                        (u.email && u.email.toLowerCase() === ssoEmpId.toLowerCase())
                    );
                    if (!localUser) {
                        localUser = {
                            id: Date.now(),
                            employeeId: ssoEmpId,
                            email: ssoEmpId.includes('@') ? ssoEmpId.toLowerCase() : undefined,
                            name: ssoEmpId.includes('@') ? ssoEmpId.split('@')[0] : ssoEmpId,
                            role: 'EMP',
                            roleName: 'Employee',
                            designation: 'Staff',
                            department: 'Development',
                            location: 'Bhopal',
                            avatar: null,
                            isActive: true,
                        };
                    }

                    try {
                        // Remove the SSO token before authenticating — Knome backend will issue its own JWT
                        localStorage.removeItem('knome_jwt');
                        localStorage.removeItem('accessToken');
                        await authenticateUser(localUser);
                        // Sync users list now that we have a valid Knome JWT
                        syncUsersList();
                        
                        // Force browser navigation to the return URL so React Router initializes properly on it
                        window.location.href = ssoReturnUrl;
                    } catch (err) {
                        console.error('SSO authentication failed:', err?.message || err);
                        localStorage.removeItem('knome_jwt');
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('knome_employeeId');
                        setCurrentUser(null);
                        setIsAuthenticated(false);
                        setIsAuthLoading(false);
                        window.history.replaceState({}, document.title, '/login');
                        window.location.href = '/login?error=' + encodeURIComponent(err?.message || ('SSO authentication failed for user: ' + ssoEmpId));
                    }
                } else {
                    // No employeeId in SSO params — cannot authenticate
                    console.warn('SSO redirect received but no employeeId could be extracted from token. Token:', ssoToken);
                    localStorage.removeItem('knome_jwt');
                    localStorage.removeItem('accessToken');
                    setIsAuthLoading(false);
                    setIsAuthenticated(false);
                    window.history.replaceState({}, document.title, '/login');
                    window.location.href = '/login?error=' + encodeURIComponent('SSO token received but no user identity could be extracted.');
                }
                return;
            }

            const existingToken = localStorage.getItem('knome_jwt');
            const savedEmployeeId = localStorage.getItem('knome_employeeId');

            if (savedEmployeeId) {
                let localUser = usersList.find(u => 
                    u.employeeId?.toUpperCase() === savedEmployeeId.toUpperCase() ||
                    u.email?.toLowerCase() === savedEmployeeId.toLowerCase()
                );
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
                        avatar: null,
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
                            const resolvedRoles = profile.roles && profile.roles.length > 0 ? profile.roles : [profile.roleName || localUser.roleName];
                            syncUsersList(resolvedRoles); // background sync after session confirmed
                            return;
                        }
                    } catch {
                        console.info('Refreshing session token with backend...');
                    }
                }

                // Re-authenticate with backend to get fresh JWT token
                try {
                    await authenticateUser(localUser);
                    syncUsersList(localUser.roles || [localUser.roleName]); // background sync after fresh auth
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

            // If no active session, auto-authenticate with default user Loveneesh Sharma (MP0108)
            // so Knome opens immediately without getting blocked
            const defaultUser = INITIAL_USERS.find(u => u.employeeId === 'MP0108' || u.employeeId === 'MPO101') || INITIAL_USERS[0];
            try {
                localStorage.setItem('knome_employeeId', defaultUser.employeeId);
                await authenticateUser(defaultUser);
                syncUsersList(defaultUser.roles || [defaultUser.roleName]);
            } catch (fallbackErr) {
                console.warn('Default auto-login fallback:', fallbackErr);
                setCurrentUser(defaultUser);
                setIsAuthenticated(true);
                setIsAuthLoading(false);
            }
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
        let normalizedId = employeeId?.trim()?.toUpperCase() || 'MP0108';
        if (normalizedId === 'MPO101') normalizedId = 'MP0108';

        let localUser = usersList.find(u => 
            u.employeeId?.toUpperCase() === normalizedId ||
            u.email?.toLowerCase() === employeeId?.toLowerCase()
        );
        if (!localUser) {
            localUser = {
                id: Date.now(),
                employeeId: normalizedId,
                name: normalizedId,
                role: 'EMP',
                roleName: 'Employee',
                designation: 'Staff',
                department: 'Development',
                location: 'Bhopal',
                avatar: null,
                isActive: true,
            };
        }
        if (localUser.isActive === false) {
            throw new Error(`Your account (${localUser.name}) has been suspended by System Administrator. Please contact HR for compliance clearance.`);
        }
        localStorage.setItem('knome_employeeId', localUser.employeeId);
        try {
            await authenticateUser(localUser);
        } catch (apiErr) {
            console.warn('Backend login fallback to local session:', apiErr);
            setCurrentUser(localUser);
            setIsAuthenticated(true);
            setIsAuthLoading(false);
        }
    }, [authenticateUser, usersList]);

    const logout = useCallback(async (customRedirectUrl) => {
        const refreshToken = localStorage.getItem('knome_refresh');
        try {
            if (refreshToken) await authApi.logout(refreshToken);
        } catch { /* ignore logout errors */ }
        localStorage.removeItem('knome_jwt');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('knome_refresh');
        localStorage.removeItem('knome_employeeId');
        setCurrentUser(null);
        setIsAuthenticated(false);
        const targetUrl = customRedirectUrl || 'https://counselling-1.mponline.demo.gov.in:3001/applications';
        window.location.href = targetUrl;
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
