import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-5">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
        Unimart · A campus marketplace for students, by students
      </footer>
    </div>
  );
}
