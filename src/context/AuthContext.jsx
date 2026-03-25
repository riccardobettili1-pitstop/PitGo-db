import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [shop, setShop] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Controlla la sessione attuale
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchShopDetails(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Ascolta i cambiamenti di stato (login, logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchShopDetails(session.user.id);
                } else {
                    setShop(null);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const fetchShopDetails = async (userId) => {
        try {
            // First check if user is Admin (Owner in salons)
            const { data: adminData } = await supabase
                .from('salons')
                .select('*')
                .eq('auth_user_id', userId)
                .maybeSingle();

            if (adminData) {
                setShop({ ...adminData, role: 'admin' });
                return;
            }

            // If not admin, check if user is Staff in barbers
            const { data: staffData } = await supabase
                .from('barbers')
                .select('*, salons(*)')
                .eq('auth_user_id', userId)
                .maybeSingle();

            if (staffData && staffData.salons) {
                setShop({ ...staffData.salons, role: 'staff', barberDetails: staffData });
            } else {
                setShop(null); // No shop found for this user
            }
        } catch (error) {
            console.error('Errore recupero dettagli salone:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, shop, loading, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
