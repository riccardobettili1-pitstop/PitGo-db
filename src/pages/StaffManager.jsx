import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export default function StaffManager() {
    const { shop } = useAuth();

    const [services, setServices] = useState([]);
    const [barbers, setBarbers] = useState([]);

    // Form inserimento Servizio
    const [newServiceName, setNewServiceName] = useState('');
    const [newServicePrice, setNewServicePrice] = useState('');
    const [newServiceDuration, setNewServiceDuration] = useState('30');

    // Form inserimento Barbiere
    const [newBarberName, setNewBarberName] = useState('');

    // Stato modifica Servizio
    const [editingServiceId, setEditingServiceId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editDuration, setEditDuration] = useState('');

    useEffect(() => {
        if (shop?.id) fetchData();
    }, [shop]);

    const fetchData = async () => {
        const { data: sData } = await supabase.from('services').select('*').eq('salone_id', shop.id).order('created_at', { ascending: true });
        if (sData) setServices(sData);

        const { data: bData } = await supabase.from('barbers').select('*').eq('salone_id', shop.id).order('created_at', { ascending: true });
        if (bData) setBarbers(bData);
    };

    // --- LOGICA SERVIZI ---
    const handleAddService = async (e) => {
        e.preventDefault();
        await supabase.from('services').insert({
            salone_id: shop.id,
            nome: newServiceName,
            prezzo: Number(newServicePrice),
            durata_minuti: Number(newServiceDuration)
        });
        setNewServiceName(''); setNewServicePrice(''); setNewServiceDuration('30');
        fetchData();
    };

    const handleDeleteService = async (id) => {
        if (window.confirm("Sicuro di voler eliminare questo servizio?")) {
            await supabase.from('services').delete().eq('id', id);
            fetchData();
        }
    };

    const startEditingService = (srv) => {
        setEditingServiceId(srv.id);
        setEditName(srv.nome);
        setEditPrice(srv.prezzo);
        setEditDuration(srv.durata_minuti);
    };

    const saveEditedService = async (id) => {
        await supabase.from('services').update({
            nome: editName,
            prezzo: Number(editPrice),
            durata_minuti: Number(editDuration)
        }).eq('id', id);
        setEditingServiceId(null);
        fetchData();
    };

    // --- LOGICA STAFF ---
    const handleAddBarber = async (e) => {
        e.preventDefault();
        await supabase.from('barbers').insert({ salone_id: shop.id, nome: newBarberName, attivo: true });
        setNewBarberName('');
        fetchData();
    };

    const handleDeleteBarber = async (id) => {
        if (window.confirm("Sicuro di voler rimuovere questo collaboratore?")) {
            await supabase.from('barbers').delete().eq('id', id);
            fetchData();
        }
    };

    return (
        <div className="flex h-screen bg-neutral-950 font-sans overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto flex flex-col">
                <header className="bg-neutral-900 border-b border-neutral-800 px-10 py-8 shadow-sm shrink-0">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">📋 Listini & Staff</h1>
                    <p className="text-neutral-400 mt-2 text-sm">Configura i prezzi dei tagli e aggiungi i collaboratori del tuo salone in tempo reale.</p>
                </header>

                <div className="px-10 py-8 grid grid-cols-1 xl:grid-cols-2 gap-8">

                    {/* PANNELLO LISTINO SERVIZI */}
                    <div className="bg-neutral-900 p-8 rounded-3xl shadow-lg border border-neutral-800">
                        <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
                            <h2 className="text-2xl font-bold text-white">Listino Prezzi</h2>
                        </div>

                        {/* Form Aggiunta */}
                        <form onSubmit={handleAddService} className="bg-neutral-800/40 p-5 rounded-2xl border border-neutral-700/50 mb-8">
                            <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-4">Aggiungi Nuovo Servizio</h3>
                            <div className="flex flex-col gap-3">
                                <input
                                    className="bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                                    placeholder="Es. Taglio Uomo" required
                                    value={newServiceName} onChange={e => setNewServiceName(e.target.value)}
                                />
                                <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full">
                                    <div className="flex items-center bg-neutral-900 border border-neutral-700 rounded-xl focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all flex-1 min-w-0">
                                        <span className="pl-4 pr-1 text-neutral-500 font-bold leading-none">€</span>
                                        <input
                                            className="bg-transparent text-white font-bold w-full py-3 pr-3 outline-none placeholder-neutral-600"
                                            placeholder="20.00" type="number" step="0.50" required
                                            value={newServicePrice} onChange={e => setNewServicePrice(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center bg-neutral-900 border border-neutral-700 rounded-xl focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all flex-1 min-w-0">
                                        <input
                                            className="bg-transparent text-white font-bold w-full py-3 pl-4 outline-none placeholder-neutral-600"
                                            placeholder="30" type="number" required
                                            value={newServiceDuration} onChange={e => setNewServiceDuration(e.target.value)}
                                        />
                                        <span className="pr-4 pl-1 text-[11px] text-neutral-500 font-bold uppercase leading-none">min</span>
                                    </div>
                                    <button className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase tracking-wide text-sm rounded-xl px-6 py-3 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.15)] active:scale-95 shrink-0 w-full sm:w-auto">
                                        Aggiungi
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Lista Servizi */}
                        <div className="space-y-4">
                            {services.length === 0 ? (
                                <div className="border border-dashed border-neutral-800 rounded-2xl p-6 text-center">
                                    <p className="text-neutral-500 italic">Nessun servizio nel listino.</p>
                                </div>
                            ) : (
                                services.map(s => (
                                    <div key={s.id} className="p-5 border border-neutral-800 bg-neutral-950/50 rounded-2xl hover:border-neutral-700 hover:bg-neutral-900 transition-all group">
                                        {editingServiceId === s.id ? (
                                            /* MODALITA MODIFICA */
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <input className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 w-full text-white outline-none focus:border-amber-500" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                                <div className="flex gap-2 shrink-0">
                                                    <input className="bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 w-20 text-white font-bold outline-none text-center focus:border-amber-500" type="number" step="0.50" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                                                    <input className="bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 w-20 text-white font-bold outline-none text-center focus:border-amber-500" type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button onClick={() => saveEditedService(s.id)} className="bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded-xl font-bold transition">Salva</button>
                                                    <button onClick={() => setEditingServiceId(null)} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl font-bold transition">X</button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* MODALITA LETTURA */
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div>
                                                    <span className="font-bold text-lg text-white block sm:inline">{s.nome}</span>
                                                    <span className="inline-flex items-center text-neutral-400 text-xs font-semibold bg-neutral-800 px-2.5 py-1 rounded-md mt-2 sm:mt-0 sm:ml-3">
                                                        ⏱ {s.durata_minuti} min
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-5">
                                                    <div className="font-black text-amber-500 text-2xl tracking-tight">€ {Number(s.prezzo).toFixed(2)}</div>
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => startEditingService(s)} className="text-neutral-400 hover:text-amber-500 font-semibold text-sm transition-colors">Modifica</button>
                                                        <button onClick={() => handleDeleteService(s.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-red-500/20 hover:text-red-500 transition-colors font-bold" title="Elimina Servizio">✕</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* PANNELLO COLLABORATORI */}
                    <div className="bg-neutral-900 p-8 rounded-3xl shadow-lg border border-neutral-800 h-fit">
                        <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
                            <h2 className="text-2xl font-bold text-white">Il tuo Staff</h2>
                        </div>

                        {/* Form Aggiunta */}
                        <form onSubmit={handleAddBarber} className="bg-neutral-800/40 p-5 rounded-2xl border border-neutral-700/50 mb-8">
                            <h3 className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-4">Aggiungi Collaboratore</h3>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    className="bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 rounded-xl px-4 py-3 flex-1 min-w-0 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                                    placeholder="Es. Marco o Andrea" required
                                    value={newBarberName} onChange={e => setNewBarberName(e.target.value)}
                                />
                                <button className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase tracking-wide text-sm rounded-xl px-6 py-3 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.15)] active:scale-95 shrink-0">
                                    Assumi
                                </button>
                            </div>
                        </form>

                        {/* Lista Staff */}
                        <div className="space-y-4">
                            {barbers.length === 0 ? (
                                <div className="border border-dashed border-neutral-800 rounded-2xl p-6 text-center">
                                    <p className="text-neutral-500 italic">Nessun membro dello staff inserito.</p>
                                </div>
                            ) : (
                                barbers.map(b => (
                                    <div key={b.id} className="flex items-center p-4 border border-neutral-800 bg-neutral-950/50 rounded-2xl hover:border-neutral-700 hover:bg-neutral-900 transition-all">
                                        <div className="h-12 w-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-black text-amber-500 text-xl mr-5 shadow-inner">
                                            {b.nome.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-lg text-white w-full">{b.nome}</span>
                                        <div className="flex gap-4 items-center shrink-0">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-green-500/20 bg-green-500/10">
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Attivo</span>
                                            </div>
                                            <button onClick={() => handleDeleteBarber(b.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-red-500/20 hover:text-red-500 transition-colors font-bold" title="Licenzia">
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
