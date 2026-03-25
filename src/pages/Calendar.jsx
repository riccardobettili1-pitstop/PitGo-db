import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export default function Calendar() {
    const { shop } = useAuth();
    const [barbers, setBarbers] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [services, setServices] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [activeSlot, setActiveSlot] = useState(null); // { barber, dateObj }
    const [activeApp, setActiveApp] = useState(null);

    // Form
    const [newCustName, setNewCustName] = useState('');
    const [newCustPhone, setNewCustPhone] = useState('');
    const [selectedSrvId, setSelectedSrvId] = useState('');

    const startHour = 8;
    const endHour = 20; // fino alle 20:00
    const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
    const PIXELS_PER_HOUR = 120; // 120px = 60min -> 2px al min

    const [currentTime, setCurrentTime] = useState(new Date());

    // Update real time clock every minute to refresh past appointments status
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { if (shop?.id) fetchCalendarData(); }, [shop, selectedDate]);

    const fetchCalendarData = async () => {
        setLoading(true);
        try {
            const { data: bData } = await supabase.from('barbers').select('*').eq('salone_id', shop.id).eq('attivo', true);
            if (bData) setBarbers(bData);

            const { data: sData } = await supabase.from('services').select('*').eq('salone_id', shop.id);
            if (sData) setServices(sData);

            const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);

            const { data: appData, error } = await supabase
                .from('appointments').select(`
                    id, data_ora_inizio, data_ora_fine, stato, totale_da_pagare,
                    customer_id, barber_id, origine,
                    customers(nome_completo, telefono),
                    appointment_services(services(nome, durata_minuti))
                `)
                .eq('salone_id', shop.id)
                .gte('data_ora_inizio', startOfDay.toISOString())
                .lte('data_ora_inizio', endOfDay.toISOString());

            if (error) throw error;
            if (appData) setAppointments(appData);

        } catch (error) { console.error("Errore calendario:", error); } finally { setLoading(false); }
    };

    const handleBackgroundClick = (e, barber) => {
        if (e.target !== e.currentTarget) return; // Ignora click sugli appuntamenti

        // Calcola in base all'offsetY rispetto al contenitore della colonna (che inizia dalle 08:00)
        const y = e.nativeEvent.offsetY;
        const minutes = (y / PIXELS_PER_HOUR) * 60;
        const roundedMin = Math.floor(minutes / 15) * 15; // Snap a blocchi di 15 min per ultra precisione

        const hour = startHour + Math.floor(roundedMin / 60);
        const min = roundedMin % 60;

        const slotDate = new Date(selectedDate);
        slotDate.setHours(hour, min, 0, 0);

        // Impedisci inserimenti nel passato se data è oggi
        if (slotDate < new Date()) {
            return alert("Non puoi inserire un nuovo appuntamento nel passato!");
        }

        setActiveSlot({ barber, dateObj: slotDate });
        setNewCustName('');
        setNewCustPhone('');
        setSelectedSrvId(services.length > 0 ? services[0].id : '');
        setShowAddModal(true);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSrvId || !newCustName) return alert("Inserisci Nome Cliente e seleziona un Servizio");

        const srv = services.find(s => s.id === selectedSrvId);
        if (!srv) return;

        const endDateTime = new Date(activeSlot.dateObj.getTime() + srv.durata_minuti * 60000);

        // ANTI OVERLAP CHECK
        const hasOverlap = appointments.some(a => {
            if (a.barber_id !== activeSlot.barber.id || a.stato === 'Annullato') return false;
            const existingStart = new Date(a.data_ora_inizio).getTime();
            const existingEnd = new Date(a.data_ora_fine).getTime();
            const newStart = activeSlot.dateObj.getTime();
            const newEnd = endDateTime.getTime();

            // Si sovrappone se (Nuovo Inizio < Vecchia Fine) E (Nuova Fine > Vecchio Inizio)
            return (newStart < existingEnd && newEnd > existingStart);
        });

        if (hasOverlap) {
            return alert(`Attenzione: Impossibile inserire qui! Lo slot si sovrappone a un altro appuntamento di ${activeSlot.barber.nome}. Scegli un altro orario.`);
        }

        try {
            // Check customer
            let custId;
            const phoneSearch = newCustPhone || 'no-phone';
            const { data: exCust } = await supabase.from('customers').select('id').eq('salone_id', shop.id).eq('telefono', phoneSearch).maybeSingle();

            if (exCust && phoneSearch !== 'no-phone') {
                custId = exCust.id;
            } else {
                const { data: newC, error: cErr } = await supabase.from('customers').insert({
                    salone_id: shop.id, nome_completo: newCustName, telefono: newCustPhone
                }).select().single();
                if (cErr) throw cErr;
                custId = newC.id;
            }

            const { data: newApp, error: appErr } = await supabase.from('appointments').insert({
                salone_id: shop.id, customer_id: custId, barber_id: activeSlot.barber.id,
                data_ora_inizio: activeSlot.dateObj.toISOString(), data_ora_fine: endDateTime.toISOString(),
                totale_da_pagare: srv.prezzo, stato: 'Confermato', origine: 'Salone'
            }).select().single();
            if (appErr) throw appErr;

            await supabase.from('appointment_services').insert({
                appointment_id: newApp.id, service_id: srv.id, prezzo_bloccato: srv.prezzo
            });

            setShowAddModal(false);
            fetchCalendarData();
        } catch (error) {
            console.error(error);
            alert("Errore inserimento: " + (error.message || JSON.stringify(error)));
        }
    };

    const updateAppStatus = async (appId, newStatus) => {
        if (newStatus === 'Annullato' && !confirm("Sei sicuro di voler annullare questo appuntamento? Il blocco verrà liberato e perso per sempre.")) return;
        if (newStatus === 'Non Presentato' && !confirm("Vuoi segnare il cliente come ASSENTE? Questa operazione farà in modo che la prenotazione NON venga contata negli incassi.")) return;
        try {
            await supabase.from('appointments').update({ stato: newStatus }).eq('id', appId);
            setShowViewModal(false);
            fetchCalendarData();
        } catch (err) { alert(err.message); }
    };

    return (
        <div className="flex h-screen bg-neutral-950 font-sans overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden relative">

                {/* HEADERS */}
                <header className="bg-neutral-900 border-b border-neutral-800 px-8 py-6 flex justify-between items-center shrink-0 shadow-sm z-20">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">📅 Calendario Operativo</h1>
                        <p className="text-neutral-400 text-sm mt-1">Clicca su uno slot vuoto per inserire la prenotazione. Clicca un box colorato per le anagrafiche.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-neutral-950 border border-neutral-800 rounded-xl p-2 shadow-inner">
                        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="px-4 py-2 hover:bg-neutral-800 rounded-lg text-neutral-400 font-bold transition">Ieri</button>
                        <input
                            type="date"
                            className="bg-transparent border-none font-extrabold text-lg text-white outline-none cursor-pointer uppercase tracking-wider [&::-webkit-calendar-picker-indicator]:filter-[invert(1)] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="px-4 py-2 hover:bg-neutral-800 rounded-lg text-neutral-400 font-bold transition">Domani</button>
                    </div>
                </header>

                <div className="flex-1 overflow-auto bg-neutral-950 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-amber-500 font-bold animate-pulse text-lg z-50 bg-neutral-950/80">Sincronizzazione...</div>
                    ) : null}

                    {barbers.length === 0 && !loading ? (
                        <div className="text-center mt-20 border border-dashed border-neutral-800 p-10 rounded-3xl mx-auto max-w-lg">
                            <h2 className="text-xl font-bold text-white mb-2">Nessun Barbiere Attivo</h2>
                            <p className="text-neutral-400">Vai in Gestione Staff per aggiungere almeno un collaboratore.</p>
                        </div>
                    ) : (
                        <div className="flex w-max min-h-max p-6 gap-6 relative">

                            {/* COLONNA TIMELINE (ORARI) */}
                            <div className="w-16 shrink-0 relative pt-[60px]"> {/* Offset per testate */}
                                {hours.map(h => (
                                    <div key={h} className="absolute w-full text-right pr-3 text-neutral-500 font-extrabold text-sm" style={{ top: `${(h - startHour) * PIXELS_PER_HOUR + 60 - 10}px` }}>
                                        {h}:00
                                    </div>
                                ))}
                            </div>

                            {/* COLONNE BARBIERI (TEAMS STYLE) */}
                            {barbers.map(barber => {
                                // Elimina quelli Annullati dal render visivo
                                const barberApps = appointments.filter(a => a.barber_id === barber.id && a.stato !== 'Annullato');

                                return (
                                    <div key={barber.id} className="w-80 shrink-0 relative bg-neutral-900/40 rounded-3xl border border-neutral-800/80 shadow-2xl flex flex-col overflow-hidden">
                                        {/* Barber Header */}
                                        <div className="h-[60px] bg-neutral-900 text-white font-black text-center flex items-center justify-center border-b-4 border-amber-500 shadow-md z-20 shrink-0 text-xl tracking-wide uppercase">
                                            {barber.nome}
                                        </div>

                                        {/* Scrollable Container (Interactive Grid) */}
                                        <div className="relative w-full cursor-pointer hover:bg-neutral-900/60 transition-colors"
                                            style={{ height: `${(endHour - startHour) * PIXELS_PER_HOUR}px` }}
                                            onClick={(e) => handleBackgroundClick(e, barber)}>

                                            {/* Griglia orizzontale di sfondo ambra */}
                                            {hours.map(h => (
                                                <div key={`grid-${h}`} className="absolute w-full border-t border-amber-500/30 pointer-events-none" style={{ top: `${(h - startHour) * PIXELS_PER_HOUR}px`, height: `${PIXELS_PER_HOUR}px` }}></div>
                                            ))}
                                            {hours.map(h => (
                                                <div key={`grid-half-${h}`} className="absolute w-full border-t border-dashed border-amber-500/15 pointer-events-none" style={{ top: `${(h - startHour) * PIXELS_PER_HOUR + (PIXELS_PER_HOUR / 2)}px` }}></div>
                                            ))}

                                            {/* Appuntamenti rendering */}
                                            {barberApps.map(app => {
                                                const start = new Date(app.data_ora_inizio);
                                                const end = new Date(app.data_ora_fine);
                                                const topMinutes = (start.getHours() - startHour) * 60 + start.getMinutes();
                                                const durMinutes = (end.getTime() - start.getTime()) / 60000;

                                                const topPx = (topMinutes * PIXELS_PER_HOUR) / 60;
                                                const heightPx = Math.max((durMinutes * PIXELS_PER_HOUR) / 60, 24); // Almeno 24px visivi per sicurezza

                                                const isPast = currentTime > end;
                                                const isOngoing = currentTime >= start && currentTime <= end && start.toDateString() === currentTime.toDateString();
                                                const isShort = durMinutes <= 20;
                                                const isNoShow = app.stato === 'Non Presentato';

                                                // Stili cromatici in base allo scorrere del tempo (Automatico, senza click dell'Admin!)
                                                let bgClass = 'bg-amber-500/15 border-amber-500 hover:bg-amber-500/25';
                                                let textClass = 'text-white';
                                                let subTextClass = 'text-amber-500';

                                                if (isNoShow) {
                                                    bgClass = 'bg-red-500/10 border-red-500/50 opacity-80';
                                                    textClass = 'text-red-500 line-through';
                                                    subTextClass = 'text-red-400 line-through';
                                                } else if (isPast) {
                                                    bgClass = 'bg-neutral-800/60 border-neutral-700 opacity-60 pointer-events-auto hover:bg-neutral-800/80';
                                                    textClass = 'text-neutral-400';
                                                    subTextClass = 'text-neutral-500';
                                                } else if (isOngoing) {
                                                    bgClass = 'bg-green-500/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
                                                    textClass = 'text-green-500';
                                                    subTextClass = 'text-green-400';
                                                }

                                                return (
                                                    <div
                                                        key={app.id}
                                                        onClick={(e) => { e.stopPropagation(); setActiveApp(app); setShowViewModal(true); }}
                                                        // rimosso 'hover:-translate-y-0.5' per rimuovere effetto blur durante animazioni
                                                        className={`absolute left-2 right-2 rounded-xl shadow-lg border-l-4 overflow-hidden z-10 
                                                        ${bgClass} ${isShort ? 'flex flex-row items-center justify-between px-3 py-1' : 'flex flex-col justify-start p-2.5'}`}
                                                        style={{ top: `${topPx}px`, height: `${heightPx - 4}px` }}
                                                    >
                                                        {isShort ? (
                                                            <>
                                                                <div className={`font-bold ${textClass} text-[11px] truncate flex-1`}>{app.customers?.nome_completo || 'Cliente'}</div>
                                                                <div className={`font-bold text-[9px] ${subTextClass} truncate shrink-0 max-w-[50%]`}>{app.appointment_services?.[0]?.services?.nome}</div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="flex justify-between items-start w-full">
                                                                    <div className={`font-extrabold ${textClass} text-sm truncate pr-2`}>
                                                                        {app.customers?.nome_completo || 'Cliente'}
                                                                    </div>
                                                                    {(!isPast && heightPx >= 40) && (
                                                                        <div className="font-bold text-neutral-400 text-[10px] bg-neutral-950/50 px-1.5 py-0.5 rounded shrink-0">
                                                                            {start.getHours().toString().padStart(2, '0')}:{start.getMinutes().toString().padStart(2, '0')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className={`font-bold mt-0.5 text-xs truncate ${subTextClass}`}>
                                                                    {app.appointment_services?.[0]?.services?.nome || 'Servizio Generico'}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* MODAL AGGIUNGI APPUNTAMENTO (ADMIN) */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
                            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-neutral-500 hover:text-white font-bold text-xl">✕</button>

                            <h2 className="text-2xl font-extrabold text-white mb-1">Aggiungi Prenotazione</h2>
                            <p className="text-neutral-400 text-sm mb-6 flex items-center gap-2">
                                <span className="px-2 py-1 bg-neutral-800 rounded font-bold text-amber-500">{activeSlot.barber.nome}</span>
                                <span className="font-bold text-white">— {activeSlot.dateObj.toLocaleDateString('it-IT')} alle {activeSlot.dateObj.getHours().toString().padStart(2, '0')}:{activeSlot.dateObj.getMinutes().toString().padStart(2, '0')}</span>
                            </p>

                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider mb-2">Servizio *</label>
                                    <select
                                        className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold appearance-none cursor-pointer"
                                        value={selectedSrvId} onChange={e => setSelectedSrvId(e.target.value)} required
                                    >
                                        <option value="" disabled>Scegli dal listino...</option>
                                        {services.map(s => <option key={s.id} value={s.id}>{s.nome} - € {s.prezzo} ({s.durata_minuti} min)</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider mb-2">Nome Cliente *</label>
                                        <input type="text" className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-all font-bold placeholder-neutral-700" placeholder="Mario Rossi" value={newCustName} onChange={e => setNewCustName(e.target.value)} required />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-neutral-500 text-xs font-bold uppercase tracking-wider mb-2">Telefono</label>
                                        <input type="tel" className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition-all font-bold placeholder-neutral-700" placeholder="Opzionale (123456789)" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} />
                                    </div>
                                </div>

                                <button type="submit" className="w-full mt-6 bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-95 text-lg">
                                    Incastra Appuntamento
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL VISUALIZZAZIONE DETTAGLI APPUNTAMENTO (ADMIN) */}
                {showViewModal && activeApp && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
                            <button onClick={() => setShowViewModal(false)} className="absolute top-6 right-6 text-neutral-500 hover:text-white font-bold text-xl">✕</button>

                            <div className="text-center mb-6">
                                <div className="h-20 w-20 mx-auto rounded-full bg-neutral-800 border-2 border-amber-500 flex items-center justify-center text-3xl font-black text-amber-500 mb-4 shadow-inner">
                                    {activeApp.customers?.nome_completo.charAt(0).toUpperCase() || '?'}
                                </div>
                                <h2 className="text-3xl font-extrabold text-white truncate max-w-[250px] mx-auto">{activeApp.customers?.nome_completo}</h2>
                                {activeApp.customers?.telefono ? (
                                    <a href={`tel:${activeApp.customers.telefono}`} className="text-blue-400 hover:underline font-bold mt-1 text-lg block tracking-wide">📞 {activeApp.customers.telefono}</a>
                                ) : (
                                    <p className="text-neutral-600 font-bold mt-1 text-sm">Nessun Telefono Salvato</p>
                                )}
                            </div>

                            <div className="bg-neutral-950 rounded-2xl p-5 mb-6 border border-neutral-800">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest shrink-0">Servizio</span>
                                    <span className="text-white font-bold text-right truncate ml-4">{activeApp.appointment_services?.[0]?.services?.nome || 'Personalizzato'}</span>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Orario</span>
                                    <span className="text-amber-500 font-bold">
                                        {new Date(activeApp.data_ora_inizio).getHours().toString().padStart(2, '0')}:{new Date(activeApp.data_ora_inizio).getMinutes().toString().padStart(2, '0')} - {new Date(activeApp.data_ora_fine).getHours().toString().padStart(2, '0')}:{new Date(activeApp.data_ora_fine).getMinutes().toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Incasso Preventivato</span>
                                    <span className="text-green-500 font-extrabold text-lg">€ {Number(activeApp.totale_da_pagare).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mt-8">
                                {activeApp.stato !== 'Non Presentato' && (
                                    <button onClick={() => updateAppStatus(activeApp.id, 'Non Presentato')} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-extrabold py-3.5 rounded-xl transition-all active:scale-95">
                                        🚫 Segna come "Non Presentato" (No-Show)
                                    </button>
                                )}
                                {(new Date() < new Date(activeApp.data_ora_fine)) && activeApp.stato !== 'Annullato' && (
                                    <button onClick={() => updateAppStatus(activeApp.id, 'Annullato')} className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-extrabold py-3.5 rounded-xl transition-all active:scale-95">
                                        ✕ Annulla (Libera Slot)
                                    </button>
                                )}
                                {(new Date() >= new Date(activeApp.data_ora_fine)) && activeApp.stato !== 'Non Presentato' && (
                                    <div className="text-center font-bold text-neutral-500 text-sm p-4 border border-neutral-800 rounded-xl bg-neutral-900 pointer-events-none mt-2">
                                        Fatturato In Entrata ✔ (Tempo Scaduto)
                                    </div>
                                )}
                                {activeApp.stato === 'Non Presentato' && (
                                    <div className="text-center font-bold text-red-500 text-sm p-4 border border-red-500/20 rounded-xl bg-red-500/10 pointer-events-none mt-2">
                                        Cliente Segnato Assente. Nessun Incasso Registrato.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
