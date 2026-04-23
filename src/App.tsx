/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';

// Help component to auto-scale content to fit parent
const FitContainer = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !contentRef.current) return;
      
      const container = containerRef.current;
      const content = contentRef.current;
      
      const padding = 20; // Maintain margin around scaled content
      const availableWidth = container.offsetWidth - padding;
      const availableHeight = container.offsetHeight - padding;
      
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;
      
      const scaleX = availableWidth / contentWidth;
      const scaleY = availableHeight / contentHeight;
      
      const newScale = Math.min(scaleX, scaleY, 1.1); // Limit maximum scale
      setScale(newScale);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    
    // Initial calculation with a slight delay to ensure layout is ready
    const timer = setTimeout(handleResize, 50);
    
    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [children]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <div 
        ref={contentRef} 
        style={{ 
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        className="inline-block"
      >
        {children}
      </div>
    </div>
  );
};
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Map as MapIcon, 
  CheckCircle2, 
  XCircle, 
  Save, 
  FolderOpen, 
  Trash2, 
  RotateCcw,
  Plus,
  Layout,
  Sun,
  Moon,
  Download,
  Upload
} from 'lucide-react';
import { INITIAL_ROOMS } from './constants';
import { RoomLayout, Seat, SavedProposal } from './types';

export default function App() {
  const [rooms, setRooms] = useState<RoomLayout[]>(INITIAL_ROOMS);
  const [activeRoomId, setActiveRoomId] = useState<string>(INITIAL_ROOMS[0].id);
  const [proposals, setProposals] = useState<SavedProposal[]>([]);
  const [proposalName, setProposalName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Sync theme with document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load proposals from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('exam_proposals');
    if (saved) {
      setProposals(JSON.parse(saved));
    }
  }, []);

  const saveProposals = (newProposals: SavedProposal[]) => {
    setProposals(newProposals);
    localStorage.setItem('exam_proposals', JSON.stringify(newProposals));
  };

  const toggleSeat = (roomId: string, seatId: string) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        seats: room.seats.map(seat => 
          seat.id === seatId ? { ...seat, isActive: !seat.isActive } : seat
        )
      };
    }));
  };

  const setAllSeats = (roomId: string, isActive: boolean) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        seats: room.seats.map(seat => ({ ...seat, isActive }))
      };
    }));
  };

  const activeRoom = useMemo(() => 
    rooms.find(r => r.id === activeRoomId) || rooms[0],
    [rooms, activeRoomId]
  );

  const stats = useMemo(() => {
    const roomStats = rooms.map(room => ({
      id: room.id,
      name: room.name,
      total: room.seats.length,
      active: room.seats.filter(s => s.isActive).length
    }));

    const totalCapacity = roomStats.reduce((acc, curr) => acc + curr.active, 0);
    const totalPossible = roomStats.reduce((acc, curr) => acc + curr.total, 0);

    return { roomStats, totalCapacity, totalPossible };
  }, [rooms]);

  const handleSaveProposal = () => {
    if (!proposalName.trim()) return;

    const newProposal: SavedProposal = {
      id: Date.now().toString(),
      name: proposalName,
      timestamp: new Date().toLocaleString(),
      roomData: rooms.reduce((acc, room) => {
        acc[room.id] = room.seats.map(s => s.isActive);
        return acc;
      }, {} as Record<string, boolean[]>)
    };

    saveProposals([newProposal, ...proposals]);
    setProposalName('');
  };

  const loadProposal = (proposal: SavedProposal) => {
    setRooms(prevRooms => prevRooms.map(room => {
      const savedData = proposal.roomData[room.id];
      if (!savedData) return room;
      return {
        ...room,
        seats: room.seats.map((seat, index) => ({
          ...seat,
          isActive: savedData[index] ?? seat.isActive
        }))
      };
    }));
    setShowSaved(false);
  };

  const deleteProposal = (id: string) => {
    saveProposals(proposals.filter(p => p.id !== id));
  };

  const handleNewProposal = () => {
    // Reset all seats in all rooms to active
    setRooms(prevRooms => prevRooms.map(room => ({
      ...room,
      seats: room.seats.map(seat => ({ ...seat, isActive: true }))
    })));
    setProposalName('');
  };

  const exportToJson = () => {
    if (proposals.length === 0) {
      alert("Aucune proposition à exporter.");
      return;
    }
    const dataStr = JSON.stringify(proposals, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `exam-proposals-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importFromJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content === 'string') {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setProposals(prev => {
              // Filtrer pour éviter les doublons par ID si nécessaire, ou simplement concaténer
              const existingIds = new Set(prev.map(p => p.id));
              const newItems = parsed.filter(p => !existingIds.has(p.id));
              const updated = [...prev, ...newItems];
              localStorage.setItem('exam_proposals', JSON.stringify(updated));
              return updated;
            });
            alert(`${parsed.length} propositions importées avec succès.`);
          } else {
            alert("Format JSON invalide. Il doit s'agir d'une liste de propositions.");
          }
        }
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Erreur lors de la lecture du fichier JSON.");
      }
    };
    fileReader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const renderGridWithNumbers = (room: RoomLayout) => {
    const renderBlockWithNumbers = (seats: Seat[], cols: number, title?: string) => {
      const rows = Array.from(new Set(seats.map(s => s.row))).sort((a, b) => a - b);
      
      return (
        <div className="flex flex-col gap-2">
          {title && <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">{title}</div>}
          <div className="flex gap-3">
            {/* Row Numbers Column */}
            <div className="flex flex-col gap-[6px] pt-[5px]">
              {rows.map(r => (
                <div key={r} className="h-5 flex items-center text-[9px] font-mono font-bold text-slate-500 pr-1 border-r border-slate-800/50">
                  {r >= 0 ? `R${r + 1}` : ''}
                </div>
              ))}
            </div>
            {/* Seats Grid */}
            <div 
              className="grid gap-[6px]"
              style={{ 
                gridTemplateColumns: `repeat(${cols}, min-content)`,
                gridAutoRows: '1.25rem'
              }}
            >
              {seats.map(seat => (
                <SeatBox key={seat.id} seat={seat} onClick={() => toggleSeat(room.id, seat.id)} />
              ))}
            </div>
          </div>
        </div>
      );
    };

    if (room.id === 'omnisport' || room.id === 'polyvalente') {
      return (
        <div className="flex gap-10">
          <div className="seat-grid-container">
            {renderBlockWithNumbers(room.seats.filter(s => !s.isBonus), room.id === 'polyvalente' ? 4 : 6)}
          </div>
          <BonusSeats seats={room.seats.filter(s => s.isBonus)} onToggle={(id) => toggleSeat(room.id, id)} />
        </div>
      );
    }

    if (room.id === 'conference') {
      const blocks = ['bloc1', 'bloc2', 'bloc3'];
      return (
        <div className="flex gap-10">
          <div className="flex gap-6">
            {blocks.map(bid => (
              <div key={bid} className="seat-grid-container">
                {renderBlockWithNumbers(
                  room.seats.filter(s => s.blockId === bid), 
                  bid === 'bloc2' ? 11 : 6,
                  bid
                )}
              </div>
            ))}
          </div>
          <BonusSeats seats={room.seats.filter(s => s.isBonus)} onToggle={(id) => toggleSeat(room.id, id)} />
        </div>
      );
    }

    if (room.id.startsWith('amphi')) {
      const blocks = ['bloc1', 'bloc2'];
      return (
        <div className="flex gap-10">
          <div className="flex gap-8">
            {blocks.map(bid => (
              <div key={bid} className="seat-grid-container">
                {renderBlockWithNumbers(
                  room.seats.filter(s => s.blockId === bid), 
                  12,
                  bid
                )}
              </div>
            ))}
          </div>
          <BonusSeats seats={room.seats.filter(s => s.isBonus)} onToggle={(id) => toggleSeat(room.id, id)} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header & Global Stats */}
      <header className="bg-[var(--bg-header)] border-[var(--border-color)] border-b px-8 py-5 shrink-0 shadow-sm z-20 transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/30">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter text-[var(--text-primary)]">EXAMENSIM <span className="text-indigo-600 non-italic">PRO</span></h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Planning & Capacité</p>
            </div>
          </div>

          <div className="flex gap-2 inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-[var(--border-color)] shadow-sm">
            <div className="px-6 py-2 text-center rounded-xl bg-[var(--stat-card-bg)] shadow-sm border border-[var(--border-color)]/30">
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Capacité Totale</p>
              <p className="text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400 leading-none">{stats.totalPossible}</p>
            </div>
            <div className="px-6 py-2 text-center rounded-xl bg-[var(--stat-card-bg)] shadow-sm border border-[var(--border-color)]/30">
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-1">Places Actives</p>
              <p className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 leading-none">{stats.totalCapacity}</p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-slate-800 dark:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
              title={isDarkMode ? "Passer au mode clair" : "Passer au mode sombre"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-indigo-400" />}
            </button>
            <button 
              onClick={() => setShowSaved(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <FolderOpen className="w-4 h-4" /> Historique
            </button>

            <div className="flex gap-1 border-x border-[var(--border-color)] px-4 mx-2">
              <button 
                onClick={exportToJson}
                className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/5 rounded-lg transition-all"
                title="Exporter en JSON"
              >
                <Download className="w-5 h-5" />
              </button>
              <label className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/5 rounded-lg transition-all cursor-pointer" title="Importer un JSON">
                <Upload className="w-5 h-5" />
                <input type="file" accept=".json" onChange={importFromJson} className="hidden" />
              </label>
            </div>

            <button 
              onClick={handleNewProposal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" /> Nouveau
            </button>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-[var(--border-color)]">
              <input 
                type="text" 
                placeholder="Nom prop..."
                className="bg-transparent px-3 py-1.5 text-xs focus:outline-none w-32 font-medium text-[var(--text-primary)]"
                value={proposalName}
                onChange={(e) => setProposalName(e.target.value)}
              />
              <button 
                onClick={handleSaveProposal}
                disabled={!proposalName.trim()}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-30 disabled:grayscale"
              >
                Sauver
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Navigation Rail */}
        <nav className="w-72 bg-slate-900 border-slate-800 border-r p-4 flex flex-col gap-1 overflow-y-auto shrink-0 shadow-2xl z-10 scrollbar-none">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 mt-2 px-2">Salles Disponibles</p>
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setActiveRoomId(room.id)}
              className={`room-nav-btn ${
                activeRoomId === room.id ? 'room-nav-btn-active-dark' : 'room-nav-btn-inactive-dark'
              }`}
            >
              <span className="text-sm font-bold">{room.name}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/20 text-indigo-300">{room.seats.filter(s => s.isActive).length}</span>
            </button>
          ))}

          <div className="mt-8 pt-8 border-t border-slate-800/50">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 px-2">Historique Récent</p>
            <div className="space-y-2 px-2">
              {proposals.slice(0, 5).map(p => (
                <div key={p.id} className="group relative">
                  <button
                    onClick={() => loadProposal(p)}
                    className="w-full text-left p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-slate-200 truncate pr-6">{p.name}</span>
                      <span className="text-[9px] font-mono text-indigo-400 shrink-0">
                        {Object.values(p.roomData).flat().filter(v => v).length}p
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 block">{p.timestamp}</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProposal(p.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-400/10 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {proposals.length > 5 && (
                <button 
                  onClick={() => setShowSaved(true)}
                  className="w-full text-center py-2 text-[10px] font-black uppercase text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  Voir tout l'historique
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Viewport */}
        <section className="flex-1 p-8 relative flex flex-col overflow-hidden">
          <div className="max-w-[1200px] mx-auto w-full h-full flex flex-col">
            <div className="flex justify-between items-end mb-8 border-[var(--border-color)] border-b pb-8 shrink-0 transition-colors duration-300">
              <div>
                <h2 className="text-5xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] flex items-baseline gap-4 transition-colors duration-300">
                  {activeRoom.name}
                  <span className="text-base font-mono font-medium not-italic text-slate-400 tracking-normal lowercase opacity-80 decoration-indigo-500/30 underline underline-offset-4">
                    {activeRoom.seats.filter(s => s.isActive).length} / {activeRoom.seats.length} unités
                  </span>
                </h2>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setAllSeats(activeRoom.id, true)}
                  className="px-5 py-2.5 bg-[var(--btn-secondary-bg)] border border-[var(--border-color)] rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--btn-secondary-text)] hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-white hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                >
                  Tout Activer
                </button>
                <button 
                  onClick={() => setAllSeats(activeRoom.id, false)}
                  className="px-5 py-2.5 bg-[var(--btn-secondary-bg)] border border-[var(--border-color)] rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--btn-secondary-text)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-slate-700 dark:hover:text-white hover:border-red-200 transition-all shadow-sm active:scale-95"
                >
                  Tout Désactiver
                </button>
              </div>
            </div>

            <div className="flex-1 border-[var(--border-color)] bg-[var(--card-bg)] rounded-[2.5rem] p-8 flex flex-col items-center justify-center overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300 relative group">
              {/* Subtle grid background for the room container in light mode */}
              <div className="absolute inset-0 opacity-[0.03] dark:hidden pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeRoom.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.15 }}
                  className="w-full h-full"
                >
                  <FitContainer>
                    <div className="p-4">
                      {renderGridWithNumbers(activeRoom)}
                    </div>
                  </FitContainer>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>

      {/* Proposals Modal */}
      <AnimatePresence>
        {showSaved && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaved(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-colors duration-300"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[var(--bg-header)] rounded-3xl shadow-2xl border border-[var(--border-color)] overflow-hidden transition-colors duration-300"
            >
              <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="text-xl font-black uppercase italic tracking-tight text-[var(--text-primary)]">Configurations Archivées</h3>
                <button onClick={() => setShowSaved(false)} className="text-slate-500 hover:text-indigo-500 transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-6 space-y-3 bg-[var(--bg-main)] transition-colors duration-300">
                {proposals.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-[var(--bg-sidebar)] rounded-2xl border border-[var(--border-color)] border-dashed">
                    <p className="text-xs uppercase font-black tracking-widest">Aucune donnée archivée</p>
                  </div>
                ) : (
                  proposals.map(p => (
                    <div key={p.id} className="group p-4 bg-[var(--bg-header)] rounded-2xl border border-[var(--border-color)] flex items-center justify-between hover:border-indigo-500/30 transition-all">
                      <div>
                        <h4 className="font-bold text-[var(--text-primary)]">{p.name}</h4>
                        <p className="text-[10px] font-mono text-slate-500">{p.timestamp}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => loadProposal(p)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-300 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-600/40 transition-colors border border-indigo-500/20"
                        >
                          Appliquer
                        </button>
                        <button 
                          onClick={() => deleteProposal(p.id)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SeatBoxProps {
  key?: string | number;
  seat: Seat;
  onClick: () => void;
  size?: 'sm' | 'md';
}

const SeatBox = ({ seat, onClick }: SeatBoxProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`
        realistic-seat-container
        ${seat.isActive ? 'seat-active' : 'seat-inactive'}
      `}
      title={seat.id}
    >
      <div className="realistic-desk" />
      <div className="realistic-chair" />
    </motion.button>
  );
};

interface BonusSeatsProps {
  seats: Seat[];
  onToggle: (id: string) => void;
}

const BonusSeats = ({ seats, onToggle }: BonusSeatsProps) => {
  if (seats.length === 0) return null;
  return (
    <div className="flex flex-col h-full justify-start pt-4">
      <div className="seat-grid-container border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 shadow-sm">
        <p className="text-[8px] font-black uppercase text-indigo-500 dark:text-indigo-400 mb-2 tracking-widest text-center">Bonus</p>
        <div className="grid grid-cols-2 gap-1.5 px-0.5 py-0.5">
          {seats.map(seat => (
            <SeatBox key={seat.id} seat={seat} onClick={() => onToggle(seat.id)} />
          ))}
        </div>
      </div>
    </div>
  );
};
