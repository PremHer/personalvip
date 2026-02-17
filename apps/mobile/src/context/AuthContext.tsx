import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface AuthCtx {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
    user: null,
    loading: true,
    login: async () => { },
    logout: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            await api.init();
            const saved = await AsyncStorage.getItem('@gymcore_user');
            if (saved) {
                try { setUser(JSON.parse(saved)); } catch { }
            }
            setLoading(false);
        })();
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.login(email, password);
        api.setToken(res.accessToken);
        const u: User = {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            role: res.user.role,
        };
        setUser(u);
        await AsyncStorage.setItem('@gymcore_user', JSON.stringify(u));
    };

    const logout = () => {
        setUser(null);
        api.setToken(null);
        AsyncStorage.removeItem('@gymcore_user');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
