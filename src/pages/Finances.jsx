import React from 'react';
import Sidebar from '../components/Sidebar';

export default function Finances() {
    return (
        <div className="flex h-screen bg-neutral-950 font-sans overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto flex flex-col">
                <header className="bg-neutral-900 border-b border-neutral-800 px-10 py-8 shadow-sm shrink-0">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">💶 Finanze e Cassa</h1>
                    <p className="text-neutral-400 mt-2 text-sm">Analizza gli incassi totali, sottrai le spese e guarda i margini netti del Salone.</p>
                </header>
                <div className="p-10 flex-1 flex">
                    <div className="border border-dashed border-neutral-800 rounded-3xl p-16 text-center bg-neutral-900/50 w-full flex flex-col items-center justify-center shadow-lg">
                        <div className="text-6xl mb-8 -mt-10">📈</div>
                        <h2 className="text-3xl font-extrabold text-white mb-4">Modulo Cassa in Sviluppo...</h2>
                        <p className="text-neutral-400 max-w-xl mx-auto text-lg leading-relaxed">Questa enorme area sarà il cuore economico del tuo Salone. Conterrà il Registratore di Cassa virtuale (con mega-bottoni in stile tablet per battere i tagli) e l'interfaccia analitica delle Spese (affitto, prodotti, bollette).</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
