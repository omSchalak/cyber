import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { EmailComposer } from './pages/EmailComposer';
import { InteropLab } from './pages/InteropLab';
import { SmimeModule } from './pages/SmimeModule';
import { OpenPgpModule } from './pages/OpenPgpModule';
import { KeysCertificates } from './pages/KeysCertificates';
import { AuditLogs } from './pages/AuditLogs';
import { Documentation } from './pages/Documentation';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#F8F5F7] text-[#252126] font-sans selection:bg-[#79616f] selection:text-white">
        <Navbar />
        <main className="flex-1 py-8 sm:py-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/composer" element={<EmailComposer />} />
            <Route path="/interop-lab" element={<InteropLab />} />
            <Route path="/smime" element={<SmimeModule />} />
            <Route path="/openpgp" element={<OpenPgpModule />} />
            <Route path="/keys-certificates" element={<KeysCertificates />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
