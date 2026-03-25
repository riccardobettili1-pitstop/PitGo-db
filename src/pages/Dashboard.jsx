import React from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
    const { shop } = useAuth();

    return (
        <div className="flex h-screen bg-neutral-950 font-sans overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <header className="bg-neutral-900 border-b border-neutral-800 px-10 py-8 shadow-sm">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Benvenuto, {shop?.nome_salone || "Salone"}</h1>
                    <p className="text-neutral-400 mt-2 text-sm">Gestisci il tuo business e i tuoi clienti da questo pannello.</p>
                </header>

                <div className="p-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-neutral-900 p-8 rounded-3xl shadow-lg border border-neutral-800">
                            <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-4">Link Pubblico PWA</h3>
                            <h2 className="text-2xl font-bold text-white mb-2">Acquisisci Prenotazioni</h2>
                            <p className="text-neutral-400 text-sm mb-6">Fornisci questo link ai tuoi clienti tramite Instagram o in negozio per farli prenotare.</p>

                            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex items-center justify-center">
                                {shop?.codice_qr_url ? (
                                    <a href={`${window.location.origin}/prenota/${shop.codice_qr_url}`} target="_blank" rel="noreferrer" className="text-amber-500 font-bold hover:underline break-all">
                                        Clicca qui per aprire la tua App Clienti
                                    </a>
                                ) : <span className="text-neutral-500">In attesa di configurazione...</span>}
                            </div>
                        </div>

                        {shop?.role === 'admin' && (
                            <div className="bg-neutral-900 p-8 rounded-3xl shadow-lg border border-neutral-800">
                                <h3 className="text-[11px] font-bold text-green-500 uppercase tracking-widest mb-4">Cassa Veloce</h3>
                                <h2 className="text-2xl font-bold text-white mb-2">Incasso di Oggi</h2>
                                <div className="text-5xl font-black text-white my-4">€ 0,00</div>
                                <p className="text-neutral-500 text-sm">Nessuna transazione registrata oggi.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
