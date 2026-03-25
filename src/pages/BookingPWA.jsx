import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function BookingPWA() {
    const { codiceUrl } = useParams();

    // Wizard State
    const [step, setStep] = useState(1);

    // Data States
    const [salon, setSalon] = useState(null);
    const [services, setServices] = useState([]);
    const [barbers, setBarbers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Selection States
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedBarber, setSelectedBarber] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState(null);

    // Customer Details States
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    // Availability States
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Fetch Initial Data
    useEffect(() => {
        async function fetchSalonData() {
            try {
                const { data: salonData, error: salonError } = await supabase
                    .from('salons').select('*').eq('codice_qr_url', codiceUrl).single();

                if (salonError || !salonData) throw new Error("Salone Non Trovato");
                setSalon(salonData);

                const { data: srvData } = await supabase.from('services').select('*').eq('salone_id', salonData.id);
                setServices(srvData || []);

                const { data: brbData } = await supabase.from('barbers').select('*').eq('salone_id', salonData.id).eq('attivo', true);
                setBarbers(brbData || []);

            } catch (err) { console.error("Errore PWA: ", err); } finally { setLoading(false); }
        }
        if (codiceUrl) fetchSalonData();
    }, [codiceUrl]);

    const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.prezzo), 0);
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.durata_minuti, 0);

    // Fetch Slots when Step 3, Date or Barber changes
    useEffect(() => {
        if (step === 3 && selectedBarber && selectedDate) {
            calculateSlots();
        }
    }, [step, selectedDate, selectedBarber, totalDuration]);

    const calculateSlots = async () => {
        setLoadingSlots(true);
        try {
            const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);

            const { data: apps } = await supabase.from('appointments')
                .select('data_ora_inizio, data_ora_fine')
                .eq('barber_id', selectedBarber.id)
                .gte('data_ora_inizio', startOfDay.toISOString())
                .lte('data_ora_inizio', endOfDay.toISOString())
                .neq('stato', 'Annullato'); // Se è annullato, lo slot torna libero

            const existingAppointments = (apps || []).map(a => ({
                start: new Date(a.data_ora_inizio).getTime(),
                end: new Date(a.data_ora_fine).getTime()
            }));

            // Generate slots from 08:00 to 19:00 every 30 mins
            const slots = [];
            const now = new Date();

            for (let hour = 8; hour < 19; hour++) {
                for (let min of [0, 30]) {
                    const slotStart = new Date(selectedDate);
                    slotStart.setHours(hour, min, 0, 0);
                    const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000);

                    // If date is today, block past slots (with 15 min buffer)
                    if (slotStart.getTime() < now.getTime() + 15 * 60000) continue;

                    // Check overlaps with existing appointments
                    const overlaps = existingAppointments.some(a => {
                        return (slotStart.getTime() < a.end && slotEnd.getTime() > a.start);
                    });

                    if (!overlaps) {
                        slots.push({
                            time: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
                            dateObj: slotStart
                        });
                    }
                }
            }
            setAvailableSlots(slots);
            if (!slots.some(s => s.time === selectedTime)) setSelectedTime(null);

        } catch (error) { console.error("Errore slot:", error); } finally { setLoadingSlots(false); }
    };

    const handleConfirmBooking = async () => {
        if (!customerName || !customerPhone || !selectedTime) return alert("Completa tutti i campi obbligatori.");

        try {
            // 1. Check or Create Customer
            let customerId;
            const { data: existingCust } = await supabase.from('customers')
                .select('id').eq('salone_id', salon.id).eq('telefono', customerPhone).maybeSingle();

            if (existingCust) {
                customerId = existingCust.id;
                // Update name just in case it changed
                await supabase.from('customers').update({ nome_completo: customerName }).eq('id', customerId);
            } else {
                const { data: newCust, error: custErr } = await supabase.from('customers')
                    .insert({ salone_id: salon.id, nome_completo: customerName, telefono: customerPhone })
                    .select().single();
                if (custErr) throw custErr;
                customerId = newCust.id;
            }

            // 2. Create Appointment
            const [hour, min] = selectedTime.split(':');
            const startDateTime = new Date(selectedDate);
            startDateTime.setHours(Number(hour), Number(min), 0, 0);
            const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);

            const { data: appData, error: appErr } = await supabase.from('appointments')
                .insert({
                    salone_id: salon.id,
                    customer_id: customerId,
                    barber_id: selectedBarber.id,
                    data_ora_inizio: startDateTime.toISOString(),
                    data_ora_fine: endDateTime.toISOString(),
                    totale_da_pagare: totalPrice,
                    stato: 'Confermato'
                }).select().single();

            if (appErr) throw appErr;

            // 3. Link Services to the Appointment
            const appServices = selectedServices.map(s => ({
                appointment_id: appData.id,
                service_id: s.id,
                prezzo_bloccato: s.prezzo
            }));
            const { error: appSrvErr } = await supabase.from('appointment_services').insert(appServices);
            if (appSrvErr) throw appSrvErr;

            // 4. Show Success Ring
            setStep(5);

        } catch (error) {
            console.error("Booking err:", error);
            alert("Dettaglio Errore: " + (error.message || JSON.stringify(error)));
        }
    };

    const toggleService = (srv) => {
        setSelectedServices(prev => prev.some(p => p.id === srv.id) ? prev.filter(p => p.id !== srv.id) : [...prev, srv]);
    };

    if (loading) return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center font-sans">Caricamento Salone...</div>;
    if (!salon) return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center font-sans">Nessun Salone Trovato. Verifica il Link.</div>;

    // STEP 5: Success Screen
    if (step === 5) {
        return (
            <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center px-6 font-sans text-center">
                <div className="h-24 w-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-pulse">
                    ✓
                </div>
                <h1 className="text-3xl font-extrabold mb-4">Prenotazione Confermata!</h1>
                <p className="text-neutral-400 mb-8 max-w-sm">
                    Ti aspettiamo il <b className="text-white">{new Date(selectedDate).toLocaleDateString('it-IT')}</b> alle <b className="text-white">{selectedTime}</b><br />da {selectedBarber?.nome}.
                </p>
                <button onClick={() => window.location.reload()} className="bg-neutral-800 text-white font-bold py-3 px-8 rounded-xl hover:bg-neutral-700 transition active:scale-95">
                    Nuova Prenotazione
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neutral-900 text-gray-100 font-sans pb-32 selection:bg-amber-500/30">
            {/* Header Salone */}
            <header className="bg-black/60 backdrop-blur-md sticky top-0 z-10 px-6 py-4 border-b border-neutral-800 shadow-xl">
                <h1 className="text-xl font-bold tracking-wide text-white text-center">{salon.nome_salone}</h1>
                <p className="text-[10px] text-center text-neutral-400 mt-1 uppercase tracking-widest font-semibold">Self Booking App</p>

                <div className="flex justify-center mt-4 space-x-2">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`h-1.5 rounded-full w-12 transition-all duration-300 ${s <= step ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-neutral-800'}`} />
                    ))}
                </div>
            </header>

            <main className="px-5 py-6 max-w-md mx-auto">
                {/* STEP 1: Lista Servizi */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">Scegli i Servizi</h2>
                        <div className="space-y-3">
                            {services.length === 0 ? <p className="text-neutral-500 italic">Il listino è attualmente vuoto.</p> :
                                services.map(srv => {
                                    const isSelected = selectedServices.some(s => s.id === srv.id);
                                    return (
                                        <div key={srv.id} onClick={() => toggleService(srv)} className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex justify-between items-center group ${isSelected ? 'border-amber-500 bg-amber-500/10 shadow-[0_4px_20px_rgba(245,158,11,0.1)]' : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600 hover:bg-neutral-800'}`}>
                                            <div>
                                                <h3 className="font-semibold text-lg text-white">{srv.nome}</h3>
                                                <p className="text-sm text-neutral-400 mt-0.5">⏱ {srv.durata_minuti} min</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <p className="font-bold text-amber-500 text-lg">€ {Number(srv.prezzo).toFixed(2)}</p>
                                                <div className={`mt-2 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-neutral-700 group-hover:border-neutral-500'}`}>
                                                    {isSelected && <span className="text-black text-xs font-black">✓</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                )}

                {/* STEP 2: Scelta del Barbiere/Staff */}
                {step === 2 && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">Con chi vuoi tagliare?</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {barbers.length === 0 ? <p className="text-neutral-500 col-span-2">Nessun membro dello staff è attualmente attivo.</p> :
                                barbers.map(brb => {
                                    const isSelected = selectedBarber?.id === brb.id;
                                    return (
                                        <div key={brb.id} onClick={() => setSelectedBarber(brb)} className={`p-5 rounded-2xl border text-center cursor-pointer transition-all duration-200 ${isSelected ? 'border-amber-500 bg-amber-500/10 shadow-[0_4px_20px_rgba(245,158,11,0.1)] scale-[1.02]' : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600 hover:bg-neutral-800'}`}>
                                            <div className={`h-16 w-16 mx-auto rounded-full mb-4 flex items-center justify-center text-xl font-bold border-2 transition-colors ${isSelected ? 'border-amber-500 text-amber-500 bg-amber-500/20' : 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}>
                                                {brb.nome.charAt(0).toUpperCase()}
                                            </div>
                                            <h3 className={`font-semibold ${isSelected ? 'text-amber-500' : 'text-white'}`}>{brb.nome}</h3>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                )}

                {/* STEP 3: Calendario ed Orari */}
                {step === 3 && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">Scegli Data e Ora</h2>

                        <div className="mb-6">
                            <label className="block text-neutral-400 text-sm font-bold mb-2">Seleziona il Giorno</label>
                            <input
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 text-white font-bold rounded-xl px-4 py-4 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
                            />
                        </div>

                        <div>
                            <label className="block text-neutral-400 text-sm font-bold mb-3">Orari Disponibili</label>
                            {loadingSlots ? (
                                <div className="text-center py-8 text-amber-500 animate-pulse font-bold">Ricerca orari incrociati...</div>
                            ) : availableSlots.length === 0 ? (
                                <div className="text-center py-8 border border-dashed border-neutral-800 rounded-xl">
                                    <p className="text-neutral-500 font-semibold mb-1">Tutto pieno o chiuso al passato.</p>
                                    <p className="text-neutral-600 text-sm">Cambia data per vedere nuovi slot validi per la durata del tuo taglio ({totalDuration} min).</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-3">
                                    {availableSlots.map(slot => {
                                        const isSelected = selectedTime === slot.time;
                                        return (
                                            <button
                                                key={slot.time}
                                                onClick={() => setSelectedTime(slot.time)}
                                                className={`py-3 rounded-xl border font-bold text-center transition-all ${isSelected ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-[1.05]' : 'bg-neutral-900 border-neutral-700 text-white hover:border-amber-500/50'}`}
                                            >
                                                {slot.time}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 4: Dati Cliente (Checkout) */}
                {step === 4 && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold mb-2 text-white tracking-tight">Ultimo Step!</h2>
                        <p className="text-neutral-400 text-sm mb-6">Inserisci i tuoi dati per confermare l'appuntamento.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-neutral-400 text-sm font-bold mb-2">Nome e Cognome *</label>
                                <input
                                    type="text"
                                    placeholder="Es. Mario Rossi"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-4 outline-none focus:border-amber-500 transition-all font-bold placeholder-neutral-600"
                                />
                            </div>
                            <div>
                                <label className="block text-neutral-400 text-sm font-bold mb-2">Numero di Telefono *</label>
                                <input
                                    type="tel"
                                    placeholder="Es. 333 1234567"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-4 outline-none focus:border-amber-500 transition-all font-bold placeholder-neutral-600"
                                />
                            </div>
                        </div>

                        <div className="mt-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-inner">
                            <h3 className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-3 border-b border-neutral-800 pb-2">Riepilogo Prenotazione</h3>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-neutral-400 font-semibold text-sm">Giorno</span>
                                <span className="text-white font-bold">{new Date(selectedDate).toLocaleDateString('it-IT')}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-neutral-400 font-semibold text-sm">Orario</span>
                                <span className="text-amber-500 font-extrabold">{selectedTime}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-neutral-400 font-semibold text-sm">Barbiere</span>
                                <span className="text-white font-bold">{selectedBarber?.nome}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-400 font-semibold text-sm">Servizi</span>
                                <span className="text-white font-bold">{selectedServices.length} selezionati</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Bar Ricapitolativa & Navigazione */}
            <div className="fixed bottom-0 left-0 w-full bg-neutral-950/90 backdrop-blur-xl border-t border-neutral-800 p-4 pb-safe z-20">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-neutral-500 text-[10px] font-extrabold uppercase tracking-widest mb-0.5">Costo Finale</span>
                        <div className="flex items-baseline">
                            <span className="text-amber-500 font-black text-2xl tracking-tighter">€ {totalPrice.toFixed(2)}</span>
                            <span className="text-neutral-500 font-bold ml-2 text-xs uppercase tracking-wide">{totalDuration} min</span>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="px-5 py-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 font-bold hover:bg-neutral-800 hover:text-white transition-colors active:scale-95 flex items-center justify-center shrink-0"
                            >
                                ←
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (step === 1 && selectedServices.length === 0) return alert('Seleziona almeno un servizio.');
                                if (step === 2 && !selectedBarber) return alert('Seleziona da chi vuoi fare il taglio.');
                                if (step === 3 && !selectedTime) return alert("Devi selezionare un orario prima di proseguire.");

                                if (step === 4) {
                                    handleConfirmBooking();
                                } else {
                                    setStep(s => Math.min(s + 1, 4))
                                }
                            }}
                            className={`px-8 py-4 rounded-xl font-extrabold transition-all shadow-lg active:scale-95 flex items-center w-full justify-center ${(step === 1 && selectedServices.length > 0) || (step === 2 && selectedBarber) || (step === 3 && selectedTime) || (step === 4 && customerName && customerPhone)
                                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_4px_20px_rgba(245,158,11,0.2)]'
                                : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                                }`}
                        >
                            {step === 4 ? 'Conferma' : 'Avanti'} {step < 4 && <span className="ml-2">→</span>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
