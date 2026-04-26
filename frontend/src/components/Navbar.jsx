/**
 * components/Navbar.jsx
 * Top navigation bar
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold">
            ⚡
          </div>
          <span className="font-bold text-white tracking-tight">
            BritAuction <span className="text-indigo-400 font-normal text-sm">RFQ</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${pathname === '/'
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            Auctions
          </Link>
          <Link
            to="/create"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${pathname === '/create'
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            ➕ New RFQ
          </Link>
        </nav>
      </div>
    </header>
  );
}
