import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
    const { shop, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Menu logic
    const menuItems = [
        { title: "Dashboard", path: "/", icon: "📊" },
        { title: "Calendario", path: "/calendario", icon: "📅" },
        { title: "Clienti e Veicoli", path: "/clienti", icon: "🚘" },
        { title: "Impostazioni", path: "/impostazioni", icon: "⚙️" },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <span className="logo-pit">Pit</span>
                <span className="logo-go">Go</span>
            </div>

            <div className="shop-info">
                <div className="shop-avatar">
                    {shop?.nome_officina ? shop.nome_officina.charAt(0).toUpperCase() : 'O'}
                </div>
                <div className="shop-details">
                    <h4>{shop?.nome_officina || "La tua Officina"}</h4>
                    <p>Area Meccanici</p>
                </div>
            </div>

            <nav className="sidebar-menu">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        className={`menu-btn ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <span className="menu-icon">{item.icon}</span>
                        <span className="menu-text">{item.title}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={signOut}>
                    🚪 Esci
                </button>
                <div className="version-txt">PITGO © 2026</div>
            </div>
        </aside>
    );
}
