import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const { shop, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { title: "Dashboard", path: "/", icon: "📊" },
        { title: "Calendario", path: "/calendario", icon: "📅" },
        { title: "Clienti", path: "/clienti", icon: "👥" },
    ];

    if (shop?.role === 'admin') {
        menuItems.push({ title: "Finanze e Cassa", path: "/finanze", icon: "💶" });
        menuItems.push({ title: "Listini & Staff", path: "/staff", icon: "📋" });
        menuItems.push({ title: "Impostazioni", path: "/impostazioni", icon: "⚙️" });
    } else if (shop?.role === 'staff') {
        menuItems.push({ title: "Il mio Profilo", path: "/profilo", icon: "👤" });
    }

    return (
        <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col h-screen shrink-0 font-sans">
            <div className="p-6 flex items-center justify-center border-b border-neutral-800">
                <span className="text-2xl font-extrabold text-white tracking-tight">Barber<span className="text-amber-500">App</span></span>
            </div>

            <div className="p-6 border-b border-neutral-800 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-500 font-bold text-xl shadow-inner shrink-0 leading-none">
                    {shop?.nome_salone ? shop.nome_salone.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="overflow-hidden flex-1">
                    <h4 className="text-white font-bold truncate text-sm">{shop?.nome_salone || "Il tuo Salone"}</h4>
                    <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">{shop?.role === 'admin' ? 'Amministratore' : 'Staff'}</p>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${location.pathname === item.path ? 'bg-amber-500 text-black shadow-md' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-sm">{item.title}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-neutral-800">
                <button
                    onClick={signOut}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                    🚪 Esci
                </button>
                <div className="text-center text-neutral-600 text-[10px] mt-4 font-bold uppercase tracking-widest">BarberApp © 2026</div>
            </div>
        </aside>
    );
}
