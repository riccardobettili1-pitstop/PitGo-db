import React from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import './Dashboard.css';

export default function Dashboard() {
    const { user, shop, signOut } = useAuth();

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="header-greeting">
                        <h1>Benvenuto, {shop?.nome_officina || "Officina"}</h1>
                        <p>Gestisci i tuoi appuntamenti e i clienti da qui.</p>
                    </div>
                </header>

                <div className="dashboard-content">
                    {/* Pannello Dati Officina temporaneo (da spostare poi in Impostazioni) */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h3>Il tuo Link Clienti</h3>
                            <p className="qr-hint">I clienti possono registrarsi scannerizzando questo QR</p>
                            <div className="qr-box">
                                {shop?.codice_qr_url ? (
                                    <a href={`https://pitgo.app/registrati?officina=${shop.codice_qr_url}`} target="_blank" rel="noreferrer" className="qr-link">
                                        pitgo.app/registrati?officina={shop.codice_qr_url}
                                    </a>
                                ) : "Generazione in corso..."}
                            </div>
                        </div>
                    </div>

                    {/* Placeholder per i prossimi sviluppi */}
                    <div className="placeholder-workarea">
                        <h2>Seleziona una voce dal menu</h2>
                    </div>
                </div>
            </main>
        </div>
    );
}
