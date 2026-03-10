import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Auth.css';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Dati form
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nomeOfficina, setNomeOfficina] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            if (isLogin) {
                // LOGIN
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                // REGISTRAZIONE
                // 1. Crea l'utente auth
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (authError) throw authError;

                // 2. Crea il record in 'shops' collegato
                const { error: shopError } = await supabase.from('shops').insert([
                    {
                        auth_user_id: authData.user?.id || 'pending',
                        email: email,
                        nome_officina: nomeOfficina,
                        // Genera un QR code base
                        codice_qr_url: Math.random().toString(36).substring(2, 10),
                    }
                ]);
                if (shopError) throw shopError;

                setSuccessMsg('Registrazione completata! Controlla la tua casella email per confermare l\'account.');
            }
        } catch (error) {
            setErrorMsg(error.message || 'Si è verificato un errore');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-panel">
                <h1 className="brand-logo">
                    <span className="logo-pit">Pit</span>
                    <span className="logo-go">Go</span>
                </h1>
                <p className="subtitle">La tua officina a portata di click</p>

                <div className="auth-toggle">
                    <button
                        className={`toggle-btn ${isLogin ? 'active' : ''}`}
                        onClick={() => { setIsLogin(true); setSuccessMsg(''); setErrorMsg(''); }}
                        type="button"
                    >
                        Accedi
                    </button>
                    <button
                        className={`toggle-btn ${!isLogin ? 'active' : ''}`}
                        onClick={() => { setIsLogin(false); setSuccessMsg(''); setErrorMsg(''); }}
                        type="button"
                    >
                        Registrati
                    </button>
                </div>

                {errorMsg && <div className="error-box">{errorMsg}</div>}
                {successMsg && <div className="success-box">{successMsg}</div>}

                <form onSubmit={handleAuth} className="auth-form">
                    {!isLogin && (
                        <div className="input-group">
                            <label htmlFor="nomeOfficina">Nome Officina</label>
                            <input
                                id="nomeOfficina"
                                type="text"
                                required
                                placeholder="Es. Autofficina Rossi"
                                value={nomeOfficina}
                                onChange={(e) => setNomeOfficina(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            required
                            placeholder="La tua email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            required
                            placeholder="Almeno 6 caratteri"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className={`submit-btn ${successMsg ? 'btn-success' : ''}`}
                        disabled={loading || !!successMsg}
                    >
                        {loading
                            ? 'Caricamento...'
                            : successMsg
                                ? 'Email inviata ✓'
                                : (isLogin ? 'Entra in PitGo' : 'Crea Account Officina')
                        }
                    </button>
                </form>
            </div>
        </div>
    );
}
