import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield,
  Menu,
  X,
  Mail,
  KeyRound,
  FileText,
  Activity,
  Layers,
  FileCode,
  ScrollText,
  Info
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StatusBadge } from './StatusBadge';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiHealth, setApiHealth] = useState<'healthy' | 'error' | 'loading'>('loading');
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    apiClient.getHealth()
      .then((res) => {
        if (mounted) setApiHealth(res.status === 'healthy' ? 'healthy' : 'error');
      })
      .catch(() => {
        if (mounted) setApiHealth('error');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const navLinks = [
    { to: '/', label: 'Home', icon: Shield },
    { to: '/dashboard', label: 'Dashboard', icon: Activity },
    { to: '/composer', label: 'Email Composer', icon: Mail },
    { to: '/interop-lab', label: 'Interop Lab', icon: Layers },
    { to: '/smime', label: 'S/MIME', icon: FileCode },
    { to: '/openpgp', label: 'OpenPGP', icon: KeyRound },
    { to: '/keys-certificates', label: 'Keys & Certs', icon: KeyRound },
    { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { to: '/documentation', label: 'Docs', icon: FileText },
    { to: '/about', label: 'About', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#79616f] text-white border-b-4 border-[#51404B] shadow-brutal select-none">
      {/* Top micro bar */}
      <div className="bg-[#51404B] px-4 py-1 flex items-center justify-between text-[11px] font-mono tracking-wider text-[#E9DFE5] border-b border-[#79616f]">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white uppercase">ACADEMIC PROJECT DEMONSTRATION</span>
          <span className="hidden sm:inline opacity-70">|</span>
          <span className="hidden sm:inline">Designer: <strong className="text-white">Mansi Chalak</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-70 hidden md:inline">GATEWAY API:</span>
          {apiHealth === 'loading' ? (
            <span className="text-[10px] bg-[#79616f] px-1.5 py-0.2 rounded font-mono">CHECKING...</span>
          ) : (
            <StatusBadge status={apiHealth} text={apiHealth === 'healthy' ? 'API ONLINE' : 'API OFFLINE'} size="sm" />
          )}
        </div>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 bg-white text-[#51404B] border-2 border-[#51404B] rounded-sm flex items-center justify-center font-bold shadow-brutal-sm group-hover:rotate-3 transition-transform">
            <Shield className="w-6 h-6 text-[#79616f]" />
          </div>
          <div>
            <div className="font-sans font-black text-lg sm:text-xl tracking-tight leading-none uppercase">
              SECURE MAIL GATEWAY
            </div>
            <div className="font-mono text-[10px] text-[#E9DFE5] tracking-widest uppercase">
              S/MIME & OPENPGP INTEROP
            </div>
          </div>
        </Link>

        {/* Desktop links */}
        <nav className="hidden xl:flex items-center gap-1">
          {navLinks.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-2.5 py-1.5 rounded-sm text-xs font-mono font-bold uppercase transition-all duration-150 border-2 ${
                  isActive
                    ? 'bg-white text-[#51404B] border-[#51404B] shadow-brutal-sm -translate-y-0.5'
                    : 'text-[#E9DFE5] border-transparent hover:bg-[#51404B] hover:text-white hover:border-[#51404B]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="xl:hidden p-2 rounded-sm bg-[#51404B] border-2 border-[#252126] text-white shadow-brutal-sm hover:bg-[#3f313a] transition"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#51404B] border-t-2 border-[#252126] px-4 py-3 shadow-brutal">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-mono font-bold uppercase rounded-sm border-2 ${
                    isActive
                      ? 'bg-white text-[#51404B] border-white shadow-brutal-sm'
                      : 'text-[#E9DFE5] border-[#79616f] hover:bg-[#79616f] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
