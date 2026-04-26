/**
 * App.jsx - Main React app with router and notifications
 */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import RFQListPage from './pages/RFQListPage';
import CreateRFQPage from './pages/CreateRFQPage';
import RFQDetailPage from './pages/RFQDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <main>
          <Routes>
            <Route path="/"           element={<RFQListPage />} />
            <Route path="/create"     element={<CreateRFQPage />} />
            <Route path="/rfq/:id"    element={<RFQDetailPage />} />
            <Route path="*"           element={
              <div className="text-center py-24 text-slate-500">
                404 – Page not found <br />
                <a href="/" className="underline text-indigo-400 text-sm">Go home</a>
              </div>
            } />
          </Routes>
        </main>
        <Toast />
      </div>
    </BrowserRouter>
  );
}
