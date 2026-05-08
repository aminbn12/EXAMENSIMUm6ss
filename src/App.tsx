/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  XCircle,
  FolderOpen,
  Trash2,
  Plus,
  Layout,
  Sun,
  Moon,
  Download,
  Upload,
  Edit3,
  CheckSquare,
  Grid,
  Shuffle,
  Menu,
  ChevronLeft,
  ChevronRight,
  Settings,
  MoreVertical
} from 'lucide-react';
import { INITIAL_ROOMS } from './constants';
import { RoomLayout, Seat, SavedProposal } from './types';
import DEFAULT_PROPOSALS from './proposals.json';

// Help component to auto-scale content to fit parent
const FitContainer = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !contentRef.current) return;
      
      const container = containerRef.current;
      const content = contentRef.current;
      
      const padding = window.innerWidth < 768 ? 10 : 40; 
      const availableWidth = container.offsetWidth - padding;
      const availableHeight = container.offsetHeight - padding;
      
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;
      
      const scaleX = availableWidth / contentWidth;
      const scaleY = availableHeight / contentHeight;
      
      // On small screens or limited space, we prioritize width and allow vertical scroll if needed
      // but only if the vertical scale would be too aggressive (< 0.6)
      let newScale = Math.min(scaleX, scaleY, 4.0);
      
      if (newScale < 0.6 && scaleX > 0.6) {
        newScale = scaleX;
        setIsOverflowing(true);
      } else {
        setIsOverflowing(false);
      }
      
      setScale(Math.max(newScale, 0.3)); // Don't go below 0.3
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (contentRef.current) resizeObserver.observe(contentRef.current);
    
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [children]);

  return (
    <div ref={containerRef} className={`w-full h-full flex justify-center ${isOverflowing ? 'overflow-y-auto pt-10 pb-20' : 'items-center overflow-hidden'}`}>
      <div 
        ref={contentRef} 
        style={{ 
          transform: `scale(${scale})`,
          transformOrigin: isOverflowing ? 'top center' : 'center center',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        className="inline-block"
      >
        {children}
      </div>
    </div>
  );
};

// Simple Toast notification component
const Toast = ({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) => {
  const colors = {
    success: 'bg-emerald-600 border-emerald-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-indigo-600 border-indigo-500',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl border text-white text-sm font-bold shadow-2xl ${colors[type]}`}
    >
      {message}
    </motion.div>
  );
};

export default function App() {
  const [rooms, setRooms] = useState<RoomLayout[]>(() => {
    try {
      const saved = localStorage.getItem('exam_rooms_def');
      if (saved) {
        const parsed: RoomLayout[] = JSON.parse(saved);
        // Force remove old bonus seats from local storage
        return parsed.map(r => ({
          ...r,
          seats: r.seats.filter(s => !(s as any).isBonus)
        }));
      }
    } catch {}
    return INITIAL_ROOMS;
  });
  const [activeRoomId, setActiveRoomId] = useState<string>(() => rooms[0]?.id || INITIAL_ROOMS[0].id);
  const [isEditMode, setIsEditMode] = useState(false);
  const [proposals, setProposals] = useState<SavedProposal[]>([]);
  const [proposalName, setProposalName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isAlternating, setIsAlternating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [showMobileActions, setShowMobileActions] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Change cursor when magnifier is enabled
  useEffect(() => {
    if (!magnifierEnabled) {
      document.body.style.cursor = '';
      return;
    }
    
    const cursorUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='none' stroke='%234f46e5' stroke-width='2'/%3E%3C/svg%3E";
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Check if over seat area - if not, show normal cursor
      const element = document.elementFromPoint(e.clientX, e.clientY);
      const isOverSeatArea = element?.closest('.seat-grid-container, .realistic-seat-container') !== null;
      
      if (!isOverSeatArea) {
        document.body.style.cursor = '';
      } else {
        document.body.style.cursor = `url("${cursorUrl}"), auto`;
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.style.cursor = '';
    };
  }, [magnifierEnabled]);

  // Sync theme with document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load proposals from localStorage and merge with defaults on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('exam_proposals');
      let currentProposals: SavedProposal[] = [];
      if (saved) {
        currentProposals = JSON.parse(saved);
      }
      
      // Filter defaults to only include those not already in currentProposals
      const existingIds = new Set(currentProposals.map(p => p.id));
      const newFromDefaults = (DEFAULT_PROPOSALS as SavedProposal[]).filter(p => !existingIds.has(p.id));
      
      if (newFromDefaults.length > 0) {
        // We put defaults first if they are new, or merge them
        const merged = [...newFromDefaults, ...currentProposals];
        setProposals(merged);
        localStorage.setItem('exam_proposals', JSON.stringify(merged));
      } else {
        setProposals(currentProposals);
      }
    } catch (err) {
      console.error('Failed to load proposals:', err);
      setProposals(DEFAULT_PROPOSALS as SavedProposal[]);
    }
  }, []);

  // Save room definitions on change
  useEffect(() => {
    localStorage.setItem('exam_rooms_def', JSON.stringify(rooms));
  }, [rooms]);

  const saveProposals = (newProposals: SavedProposal[]) => {
    setProposals(newProposals);
    localStorage.setItem('exam_proposals', JSON.stringify(newProposals));
  };

  const toggleSeat = (roomId: string, seatId: string) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        seats: room.seats.map(seat => {
          if (seat.id === seatId) {
            if (isEditMode) {
              return { ...seat, isHidden: !seat.isHidden };
            }
            return { ...seat, isActive: !seat.isActive };
          }
          return seat;
        })
      };
    }));
  };

  const toggleRow = (roomId: string, blockId: string, row: number) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      const blockSeats = room.seats
        .filter(s => s.blockId === blockId && s.row === row && !s.isHidden)
        .sort((a, b) => a.col - b.col);
      
      if (isAlternating) {
        const alreadyPattern1 = blockSeats.every((s, i) => s.isActive === (i % 2 === 0));
        return {
          ...room,
          seats: room.seats.map(seat => {
            if (seat.blockId === blockId && seat.row === row && !seat.isHidden) {
              const idx = blockSeats.findIndex(s => s.id === seat.id);
              return { ...seat, isActive: alreadyPattern1 ? (idx % 2 !== 0) : (idx % 2 === 0) };
            }
            return seat;
          })
        };
      }

      const allActive = blockSeats.every(s => s.isActive);
      return {
        ...room,
        seats: room.seats.map(seat => {
          if (seat.blockId === blockId && seat.row === row && !seat.isHidden) {
            return { ...seat, isActive: !allActive };
          }
          return seat;
        })
      };
    }));
  };

  const toggleCol = (roomId: string, blockId: string, col: number) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      const blockSeats = room.seats
        .filter(s => s.blockId === blockId && s.col === col && !s.isHidden)
        .sort((a, b) => a.row - b.row);

      if (isAlternating) {
        const alreadyPattern1 = blockSeats.every((s, i) => s.isActive === (i % 2 === 0));
        return {
          ...room,
          seats: room.seats.map(seat => {
            if (seat.blockId === blockId && seat.col === col && !seat.isHidden) {
              const idx = blockSeats.findIndex(s => s.id === seat.id);
              return { ...seat, isActive: alreadyPattern1 ? (idx % 2 !== 0) : (idx % 2 === 0) };
            }
            return seat;
          })
        };
      }

      const allActive = blockSeats.every(s => s.isActive);
      return {
        ...room,
        seats: room.seats.map(seat => {
          if (seat.blockId === blockId && seat.col === col && !seat.isHidden) {
            return { ...seat, isActive: !allActive };
          }
          return seat;
        })
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

  const addBlock = (roomId: string) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      const newBlockId = `bloc${Date.now()}`;
      const newSeats: Seat[] = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          newSeats.push({
            id: `${room.id}-${newBlockId}-${r}-${c}`,
            row: r,
            col: c,
            isActive: true,
            blockId: newBlockId
          });
        }
      }
      return { ...room, seats: [...room.seats, ...newSeats] };
    }));
  };

  const removeBlock = (roomId: string, blockId: string) => {
    if (!window.confirm("Supprimer ce bloc entier ?")) return;
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      return { ...room, seats: room.seats.filter(s => s.blockId !== blockId) };
    }));
  };

  const rotateBlock = (roomId: string, blockId: string) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      const blockSeats = room.seats.filter(s => s.blockId === blockId);
      if (blockSeats.length === 0) return room;
      
      const maxRow = Math.max(...blockSeats.map(s => s.row));
      
      return {
        ...room,
        seats: room.seats.map(seat => {
          if (seat.blockId === blockId) {
            // Rotate 90 degrees clockwise
            return {
              ...seat,
              row: seat.col,
              col: maxRow - seat.row
            };
          }
          return seat;
        })
      };
    }));
  };

  const updateBlockName = (roomId: string, blockId: string, newName: string) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        blockNames: {
          ...(room.blockNames || {}),
          [blockId]: newName
        }
      };
    }));
  };

  const moveBlock = (roomId: string, blockId: string, direction: 'left' | 'right') => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      
      const currentBlocks = new Set(room.seats.map(s => s.blockId || 'default'));
      const order = room.blockOrder || Array.from(currentBlocks).sort();
      
      // Ensure all current blocks are in order array
      currentBlocks.forEach(b => {
        if (!order.includes(b)) order.push(b);
      });
      
      const currentIndex = order.indexOf(blockId);
      if (currentIndex === -1) return room;
      
      if (direction === 'left' && currentIndex > 0) {
        const newOrder = [...order];
        [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]];
        return { ...room, blockOrder: newOrder };
      }
      
      if (direction === 'right' && currentIndex < order.length - 1) {
        const newOrder = [...order];
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
        return { ...room, blockOrder: newOrder };
      }
      
      return room;
    }));
  };

  const addRow = (roomId: string, blockId: string) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      const blockSeats = room.seats.filter(s => s.blockId === blockId);
      const cols = blockSeats.length > 0 ? Math.max(...blockSeats.map(s => s.col)) + 1 : 4;
      const newRowIdx = blockSeats.length > 0 ? Math.max(...blockSeats.map(s => s.row)) + 1 : 0;
      
      const newSeats: Seat[] = [];
      for (let c = 0; c < cols; c++) {
        newSeats.push({
          id: `${room.id}-${blockId}-${newRowIdx}-${c}-${Date.now()}`,
          row: newRowIdx,
          col: c,
          isActive: true,
          blockId
        });
      }
      return { ...room, seats: [...room.seats, ...newSeats] };
    }));
  };

  const removeRow = (roomId: string, blockId: string) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      const blockSeats = room.seats.filter(s => s.blockId === blockId);
      const maxRow = Math.max(...blockSeats.map(s => s.row));
      if (maxRow < 0) return room;
      return { ...room, seats: room.seats.filter(s => !(s.blockId === blockId && s.row === maxRow)) };
    }));
  };

  const addCol = (roomId: string, blockId: string) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      const blockSeats = room.seats.filter(s => s.blockId === blockId);
      const rows = blockSeats.length > 0 ? Math.max(...blockSeats.map(s => s.row)) + 1 : 4;
      const newColIdx = blockSeats.length > 0 ? Math.max(...blockSeats.map(s => s.col)) + 1 : 0;
      
      const newSeats: Seat[] = [];
      for (let r = 0; r < rows; r++) {
        newSeats.push({
          id: `${room.id}-${blockId}-${r}-${newColIdx}-${Date.now()}`,
          row: r,
          col: newColIdx,
          isActive: true,
          blockId
        });
      }
      return { ...room, seats: [...room.seats, ...newSeats] };
    }));
  };

  const removeCol = (roomId: string, blockId: string) => {
    setRooms(prevRooms => prevRooms.map(room => {
      if (room.id !== roomId) return room;
      const blockSeats = room.seats.filter(s => s.blockId === blockId);
      const maxCol = Math.max(...blockSeats.map(s => s.col));
      if (maxCol < 0) return room;
      return { ...room, seats: room.seats.filter(s => !(s.blockId === blockId && s.col === maxCol)) };
    }));
  };

  const addRoom = () => {
    const newRoomName = window.prompt("Nom de la nouvelle salle :");
    if (!newRoomName) return;
    const newRoomId = `room-${Date.now()}`;
    const newRoom: RoomLayout = {
      id: newRoomId,
      name: newRoomName,
      seats: []
    };
    setRooms(prev => [...prev, newRoom]);
    setActiveRoomId(newRoomId);
    setIsEditMode(true);
  };

  const removeRoom = (roomId: string) => {
    if (!window.confirm("Supprimer cette salle ?")) return;
    setRooms(prev => prev.filter(r => r.id !== roomId));
    if (activeRoomId === roomId) {
      setActiveRoomId(rooms[0]?.id || '');
    }
  };

  const activeRoom = useMemo(() => 
    rooms.find(r => r.id === activeRoomId) || rooms[0],
    [rooms, activeRoomId]
  );

  const stats = useMemo(() => {
    const roomStats = rooms.map(room => ({
      id: room.id,
      name: room.name,
      total: room.seats.filter(s => !s.isHidden).length,
      active: room.seats.filter(s => s.isActive && !s.isHidden).length
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
      showToast('Aucune proposition à exporter.', 'info');
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
            showToast(`${parsed.length} propositions importées avec succès.`, 'success');
          } else {
            showToast("Format JSON invalide. Il doit s'agir d'une liste de propositions.", 'error');
          }
        }
      } catch (err) {
        console.error('Failed to parse JSON', err);
        showToast('Erreur lors de la lecture du fichier JSON.', 'error');
      }
    };
    fileReader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const renderGridWithNumbers = (room: RoomLayout) => {
    let globalOffset = 0;
    
    for (const r of rooms) {
      if (r.id === room.id) break;
      globalOffset += r.seats.filter(s => s.isActive && !s.isHidden).length;
    }
    
    const seatNumbers = new Map<string, number>();
    let counter = globalOffset;
    
    room.seats.forEach(seat => {
      if (seat.isActive && !seat.isHidden) {
        counter++;
        seatNumbers.set(seat.id, counter);
      }
    });
    
    const renderBlockWithNumbers = (seats: Seat[], cols: number, title?: string, blockId?: string) => {
      const rows = Array.from(new Set(seats.map(s => s.row))).sort((a, b) => a - b);
      const maxCol = seats.length > 0 ? Math.max(0, ...seats.map(s => s.col)) + 1 : cols;
      
      return (
        <div className="flex flex-col gap-2 relative group/block">
          {isEditMode && blockId && (
            <div className="absolute -top-6 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity z-50">
               <button onClick={() => moveBlock(room.id, blockId, 'left')} className="px-1.5 py-0.5 bg-indigo-500 text-white text-[8px] font-bold rounded shadow-sm">⬅</button>
               <button onClick={() => moveBlock(room.id, blockId, 'right')} className="px-1.5 py-0.5 bg-indigo-500 text-white text-[8px] font-bold rounded shadow-sm">➡</button>
               <button onClick={() => rotateBlock(room.id, blockId)} className="px-1.5 py-0.5 bg-indigo-500 text-white text-[8px] font-bold rounded shadow-sm">⟳ Pivoter</button>
               <button onClick={() => addCol(room.id, blockId)} className="px-1.5 py-0.5 bg-indigo-500 text-white text-[8px] font-bold rounded shadow-sm">+Col</button>
               <button onClick={() => removeCol(room.id, blockId)} className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded shadow-sm">-Col</button>
               <button onClick={() => addRow(room.id, blockId)} className="px-1.5 py-0.5 bg-indigo-500 text-white text-[8px] font-bold rounded shadow-sm">+Lig</button>
               <button onClick={() => removeRow(room.id, blockId)} className="px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded shadow-sm">-Lig</button>
               <button onClick={() => removeBlock(room.id, blockId)} className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded shadow-sm">Suppr</button>
            </div>
          )}
          {(blockId && (isEditMode || room.blockNames?.[blockId] || title)) && (
            isEditMode ? (
              <input
                type="text"
                value={room.blockNames?.[blockId] || ''}
                onChange={(e) => updateBlockName(room.id, blockId, e.target.value)}
                placeholder={title || "Nom du bloc..."}
                className="text-[10px] font-black text-center mb-1 bg-transparent border-b border-indigo-500/30 hover:border-indigo-500/60 focus:outline-none focus:border-indigo-500 uppercase tracking-widest w-full text-[var(--text-secondary)] transition-colors"
              />
            ) : (
              <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest text-center mb-1">
                {room.blockNames?.[blockId] || title}
              </div>
            )
          )}
          <div 
            className="grid gap-x-[10px] gap-y-[6px] items-center"
            style={{ 
              gridTemplateColumns: `min-content repeat(${Math.max(cols, maxCol)}, min-content)`,
            }}
          >
            {/* Column Toggle Buttons */}
            {isBatchMode && blockId && (
              <>
                <div /> {/* Top-left corner */}
                {Array.from({ length: Math.max(cols, maxCol) }).map((_, c) => (
                  <div key={`col-toggle-${c}`} className="flex justify-center">
                    <button
                      onClick={() => toggleCol(room.id, blockId, c)}
                      className="w-5 h-4 rounded bg-emerald-500/20 hover:bg-emerald-500 text-[10px] flex items-center justify-center text-white transition-colors"
                      title="Sélectionner colonne"
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Row Headers (Labels + Toggles) */}
            {rows.map((r, rowIndex) => (
              <div 
                key={`row-header-${r}`} 
                className="flex items-center gap-2 pr-2 border-r border-[var(--border-color)] h-5"
                style={{ 
                  gridColumn: 1, 
                  gridRow: rowIndex + (isBatchMode ? 2 : 1) 
                }}
              >
                {isBatchMode && blockId && (
                  <button 
                    onClick={() => toggleRow(room.id, blockId, r)}
                    className="w-4 h-4 rounded bg-indigo-500/20 hover:bg-indigo-500 text-[10px] flex items-center justify-center text-white transition-colors shrink-0"
                    title="Sélectionner ligne"
                  >
                    ✓
                  </button>
                )}
                <span className="text-[9px] font-mono font-bold text-[var(--text-secondary)] whitespace-nowrap">
                  {r >= 0 ? `R${r + 1}` : ''}
                </span>
              </div>
            ))}

            {/* Seats */}
            {seats.map(seat => {
              if (seat.isHidden && !isEditMode) return null;
              const seatNumber = (!seat.isHidden && seat.isActive) ? seatNumbers.get(seat.id) : undefined;
              const rowIndex = rows.indexOf(seat.row);
              return (
                <div 
                  key={seat.id} 
                  className={`relative ${seat.isHidden ? 'opacity-30 grayscale scale-90' : ''}`}
                  style={{ 
                    gridColumn: seat.col + 2, 
                    gridRow: rowIndex + (isBatchMode ? 2 : 1) 
                  }}
                  data-seat-number={seatNumber ?? undefined}
                >
                  {seatNumber && (
                    <span className="absolute -top-1 -left-1 text-[8px] font-mono font-black text-white bg-indigo-600 rounded-full w-4 h-4 flex items-center justify-center shadow shadow-indigo-500/40 z-10">
                      {seatNumber}
                    </span>
                  )}
                  <SeatBox seat={seat} onClick={() => toggleSeat(room.id, seat.id)} />
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const regularSeats = room.seats;
    
    const blocksMap = new Map<string, Seat[]>();
    regularSeats.forEach(s => {
      const bid = s.blockId || 'default';
      if (!blocksMap.has(bid)) blocksMap.set(bid, []);
      blocksMap.get(bid)!.push(s);
    });
    
    const blockIds = Array.from(blocksMap.keys());
    if (room.blockOrder) {
      blockIds.sort((a, b) => {
        const indexA = room.blockOrder!.indexOf(a);
        const indexB = room.blockOrder!.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    } else {
      blockIds.sort();
    }

    return (
      <div className="flex gap-10">
        <div className="flex gap-8 flex-wrap justify-center items-start">
          {blockIds.map((bid, index) => {
            const blockSeats = blocksMap.get(bid)!;
            const maxCol = blockSeats.length > 0 ? Math.max(...blockSeats.map(s => s.col)) + 1 : 0;
            const title = blockIds.length > 1 ? `Bloc ${index + 1}` : undefined;
            return (
              <div key={bid} className="seat-grid-container relative">
                {renderBlockWithNumbers(blockSeats, maxCol, title, bid)}
              </div>
            );
          })}
          {isEditMode && (
             <div 
               className="flex items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 hover:bg-[var(--card-bg)] hover:border-indigo-500/50 cursor-pointer transition-colors" 
               onClick={() => addBlock(room.id)}
             >
               <span className="text-[var(--text-secondary)] font-bold uppercase tracking-widest text-xs">+ Nouveau Bloc</span>
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header & Global Stats */}
      <header className="bg-[var(--bg-header)] border-[var(--nav-border)] border-b px-4 sm:px-8 py-4 sm:py-5 shrink-0 shadow-sm z-30 transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center justify-between w-full lg:w-auto gap-5">
            <div className="flex items-center gap-3 sm:gap-5">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] drop-shadow-[0_0_5px_rgba(99,102,241,0.5)] transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="bg-indigo-600 p-2 sm:p-3 rounded-xl sm:2xl shadow-lg shadow-indigo-500/30">
                <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:2xl font-black italic tracking-tighter text-[var(--nav-text-primary)]">EXAMENSIM <span className="text-indigo-600 non-italic">PRO</span></h1>
                <p className="text-[8px] sm:text-[10px] text-[var(--nav-text-secondary)] font-black uppercase tracking-widest mt-0.5">Planning & Capacité</p>
              </div>
            </div>

            <div className="lg:hidden flex gap-2">
              <button 
                onClick={() => setShowMobileActions(!showMobileActions)}
                className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] drop-shadow-[0_0_5px_rgba(99,102,241,0.5)] transition-all"
                title="Options"
              >
                <Settings className={`w-5 h-5 transition-transform duration-500 ${showMobileActions ? 'rotate-90' : ''}`} />
              </button>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl bg-[var(--nav-btn-bg)] border border-[var(--nav-border)] text-[var(--nav-text-secondary)] hover:text-white transition-all"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 inline-flex bg-[var(--nav-btn-bg)] p-1 rounded-2xl border border-[var(--nav-border)] shadow-sm">
            <div className="px-4 sm:px-6 py-1.5 sm:py-2 text-center rounded-xl bg-[var(--nav-card-bg)] shadow-sm border border-[var(--nav-border)]/30">
              <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-[var(--nav-text-secondary)] font-bold mb-1">Total</p>
              <p className="text-xl sm:text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400 leading-none">{stats.totalPossible}</p>
            </div>
            <div className="px-4 sm:px-6 py-1.5 sm:py-2 text-center rounded-xl bg-[var(--nav-card-bg)] shadow-sm border border-[var(--nav-border)]/30">
              <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-[var(--nav-text-secondary)] font-bold mb-1">Actives</p>
              <p className="text-xl sm:text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 leading-none">{stats.totalCapacity}</p>
            </div>
          </div>

          <div className="hidden lg:flex gap-3 items-center">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-[var(--nav-btn-bg)] border border-[var(--nav-border)] text-[var(--nav-text-secondary)] hover:text-white transition-all"
              title={isDarkMode ? "Passer au mode clair" : "Passer au mode sombre"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${isEditMode ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-[var(--nav-btn-bg)] border-[var(--nav-border)] text-[var(--nav-text-secondary)] hover:text-white'}`}
            >
              <Edit3 className="w-4 h-4" /> {isEditMode ? 'Terminer' : 'Éditer'}
            </button>
            
            <button 
              onClick={() => setShowSaved(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-[var(--nav-text-secondary)] hover:text-white transition-colors"
            >
              <FolderOpen className="w-4 h-4" /> Historique
            </button>

            <div className="flex gap-1 border-x border-[var(--nav-border)] px-4 mx-2">
              <button 
                onClick={exportToJson}
                className="p-2 text-[var(--nav-text-secondary)] hover:text-indigo-400 hover:bg-white/10 rounded-lg transition-all"
                title="Exporter en JSON"
              >
                <Download className="w-5 h-5" />
              </button>
              <label className="p-2 text-[var(--nav-text-secondary)] hover:text-emerald-400 hover:bg-white/10 rounded-lg transition-all cursor-pointer" title="Importer un JSON">
                <Upload className="w-5 h-5" />
                <input type="file" accept=".json" onChange={importFromJson} className="hidden" />
              </label>
            </div>

            <button 
              onClick={handleNewProposal}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-white border border-indigo-500/20 bg-indigo-500/10 rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" /> Nouveau
            </button>
            <div className="flex bg-[var(--nav-btn-bg)] p-1 rounded-xl border border-[var(--nav-border)]">
              <input 
                type="text" 
                placeholder="Nom prop..."
                className="bg-transparent px-3 py-1.5 text-xs focus:outline-none w-32 font-medium text-[var(--nav-text-primary)] placeholder-[var(--nav-text-secondary)]"
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
            
            <div className="flex items-center gap-2 px-3 py-1.5 border border-[var(--nav-border)] rounded-lg bg-[var(--nav-btn-bg)]">
              <input
                type="checkbox"
                id="magnifier-toggle"
                checked={magnifierEnabled}
                onChange={(e) => setMagnifierEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="magnifier-toggle" className="text-xs font-bold text-[var(--nav-text-secondary)] cursor-pointer select-none hover:text-white transition-colors">
                Loupe
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Actions Dropdown */}
      <AnimatePresence>
        {showMobileActions && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileActions(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-20 right-4 w-72 bg-[var(--bg-header)] border border-[var(--nav-border)] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 z-50"
            >
              <p className="text-[10px] font-black text-[var(--nav-text-secondary)] uppercase tracking-[0.2em] px-2 mb-1">Actions & Paramètres</p>
              
              <button 
                onClick={() => { setIsEditMode(!isEditMode); setShowMobileActions(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${isEditMode ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-[var(--nav-btn-bg)] border-[var(--nav-border)] text-[var(--nav-text-secondary)] hover:text-white'}`}
              >
                <Edit3 className="w-4 h-4" /> {isEditMode ? 'Terminer' : 'Éditer'}
              </button>

              <button 
                onClick={() => { setShowSaved(true); setShowMobileActions(false); }}
                className="flex items-center gap-3 px-4 py-3 bg-[var(--nav-btn-bg)] border border-[var(--nav-border)] rounded-xl text-xs font-black uppercase tracking-widest text-[var(--nav-text-secondary)] hover:text-white transition-colors"
              >
                <FolderOpen className="w-4 h-4" /> Historique
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { exportToJson(); setShowMobileActions(false); }}
                  className="flex items-center justify-center gap-2 py-3 bg-[var(--nav-btn-bg)] border border-[var(--nav-border)] rounded-xl text-[10px] font-black uppercase text-[var(--nav-text-secondary)] hover:text-indigo-400 transition-all"
                >
                  <Download className="w-4 h-4" /> Exporter
                </button>
                <label className="flex items-center justify-center gap-2 py-3 bg-[var(--nav-btn-bg)] border border-[var(--nav-border)] rounded-xl text-[10px] font-black uppercase text-[var(--nav-text-secondary)] hover:text-emerald-400 transition-all cursor-pointer">
                  <Upload className="w-4 h-4" /> Importer
                  <input type="file" accept=".json" onChange={importFromJson} className="hidden" />
                </label>
              </div>

              <div className="h-px bg-[var(--nav-border)] my-1" />

              <div className="flex flex-col gap-2">
                <div className="flex bg-[var(--nav-btn-bg)] p-1 rounded-xl border border-[var(--nav-border)]">
                  <input 
                    type="text" 
                    placeholder="Nom prop..."
                    className="bg-transparent px-3 py-2 text-xs focus:outline-none flex-1 font-medium text-[var(--nav-text-primary)] placeholder-[var(--nav-text-secondary)]"
                    value={proposalName}
                    onChange={(e) => setProposalName(e.target.value)}
                  />
                  <button 
                    onClick={() => { handleSaveProposal(); setShowMobileActions(false); }}
                    disabled={!proposalName.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all disabled:opacity-30"
                  >
                    OK
                  </button>
                </div>
                <button 
                  onClick={() => { handleNewProposal(); setShowMobileActions(false); }}
                  className="w-full py-3 text-xs font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 rounded-xl transition-all"
                >
                  + Nouveau Planning
                </button>
              </div>

              <div className="flex items-center justify-between px-3 py-3 border border-[var(--nav-border)] rounded-xl bg-[var(--nav-btn-bg)] mt-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="magnifier-toggle-mobile"
                    checked={magnifierEnabled}
                    onChange={(e) => setMagnifierEnabled(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="magnifier-toggle-mobile" className="text-xs font-bold text-[var(--nav-text-secondary)]">
                    Activer Loupe
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Navigation Rail */}
        <nav className={`
          ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-20'} 
          fixed lg:relative h-full bg-[var(--bg-sidebar)] border-[var(--nav-border)] border-r p-4 flex flex-col gap-1 overflow-y-auto shrink-0 shadow-2xl z-40 transition-all duration-300 scrollbar-none
        `}>
          <div className="flex items-center justify-between mb-4 mt-2 px-2">
            <p className={`text-[10px] font-black text-[var(--nav-text-secondary)] uppercase tracking-[0.3em] ${!isSidebarOpen && 'lg:hidden'}`}>Salles</p>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] drop-shadow-[0_0_5px_rgba(99,102,241,0.5)] hover:bg-indigo-500/20 hover:text-indigo-300 transition-all"
            >
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg bg-[var(--nav-btn-bg)] border border-[var(--nav-border)] text-[var(--nav-text-secondary)] hover:text-white transition-all"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => {
                setActiveRoomId(room.id);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={`room-nav-btn ${
                activeRoomId === room.id ? 'room-nav-btn-active' : 'room-nav-btn-inactive'
              } ${!isSidebarOpen && 'lg:px-0 lg:justify-center'}`}
              title={!isSidebarOpen ? room.name : ''}
            >
              <span className={`text-sm font-bold truncate ${!isSidebarOpen && 'lg:hidden'}`}>{room.name}</span>
              {isSidebarOpen ? (
                <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 ml-2 shrink-0">{room.seats.filter(s => s.isActive && !s.isHidden).length}</span>
              ) : (
                <span className="hidden lg:flex text-[10px] font-mono font-black">{room.name.substring(0, 2).toUpperCase()}</span>
              )}
            </button>
          ))}
          
          {isEditMode && (
            <button 
              onClick={addRoom}
              className={`mt-2 w-full text-center py-3 border border-dashed border-[var(--nav-border)] rounded-xl text-[10px] font-black uppercase text-[var(--nav-text-secondary)] hover:bg-[var(--nav-btn-bg)] hover:text-white transition-all ${!isSidebarOpen && 'lg:px-0'}`}
            >
              {isSidebarOpen ? '+ Nouvelle Salle' : '+'}
            </button>
          )}

          <div className="mt-8 pt-8 border-t border-[var(--nav-border)]">
            <p className={`text-[10px] font-black text-[var(--nav-text-secondary)] uppercase tracking-[0.3em] mb-4 px-2 ${!isSidebarOpen && 'lg:hidden'}`}>Historique</p>
            <div className="space-y-2 px-2">
              {proposals.slice(0, 5).map(p => (
                <div key={p.id} className="group relative">
                  <button
                    onClick={() => {
                      loadProposal(p);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`w-full text-left p-3 bg-[var(--nav-card-bg)] rounded-xl border border-[var(--nav-border)] hover:border-indigo-500/50 transition-all ${!isSidebarOpen && 'lg:p-2 lg:flex lg:justify-center'}`}
                    title={!isSidebarOpen ? p.name : ''}
                  >
                    {isSidebarOpen ? (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-[var(--nav-text-primary)] truncate pr-6">{p.name}</span>
                          <span className="text-[9px] font-mono font-bold text-indigo-400 shrink-0">
                            {Object.values(p.roomData).flat().filter(v => v).length}p
                          </span>
                        </div>
                        <span className="text-[9px] text-[var(--nav-text-secondary)] block">{p.timestamp}</span>
                      </>
                    ) : (
                      <FolderOpen className="w-4 h-4 text-indigo-400" />
                    )}
                  </button>
                  {isSidebarOpen && (
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
                  )}
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* Backdrop for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Viewport */}
        <section className="flex-1 p-2 sm:p-6 relative flex flex-col overflow-hidden bg-[var(--bg-main)]">
          <div className="w-full h-full flex flex-col mx-auto max-w-[1600px]">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-4 border-[var(--border-color)] border-b pb-4 shrink-0 transition-colors duration-300 gap-4">
              <div>
                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter italic text-[var(--text-primary)] flex items-baseline flex-wrap gap-2 sm:gap-4 transition-colors duration-300">
                  {activeRoom.name}
                  <span className="text-xs sm:text-base font-mono font-black not-italic tracking-normal lowercase underline decoration-indigo-500/30 underline-offset-4">
                    <span className="text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_3px_rgba(16,185,129,0.5)] dark:drop-shadow-[0_0_5px_rgba(52,211,153,0.6)]">
                      {activeRoom.seats.filter(s => s.isActive && !s.isHidden).length}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_3px_rgba(99,102,241,0.5)] dark:drop-shadow-[0_0_5px_rgba(129,140,248,0.6)]">
                      {" "}/ {activeRoom.seats.filter(s => !s.isHidden).length} unités
                    </span>
                  </span>
                  {isEditMode && rooms.length > 1 && (
                    <button onClick={() => removeRoom(activeRoom.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2 mb-1">
                <button 
                  onClick={() => setIsBatchMode(!isBatchMode)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${isBatchMode ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-[var(--btn-secondary-bg)] border-[var(--border-color)] text-[var(--btn-secondary-text)] hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-700 dark:hover:text-white'}`}
                >
                  <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {isBatchMode ? 'Batch: On' : 'Batch: Off'}
                </button>

                {isBatchMode && (
                  <button 
                    onClick={() => setIsAlternating(!isAlternating)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${isAlternating ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20' : 'bg-[var(--btn-secondary-bg)] border-[var(--border-color)] text-[var(--btn-secondary-text)] hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-slate-700 dark:hover:text-white'}`}
                  >
                    <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {isAlternating ? 'Saut: On' : 'Saut: Off'}
                  </button>
                )}

                <div className="hidden sm:block w-px h-10 bg-[var(--border-color)] mx-2 opacity-30" />
                <button 
                  onClick={() => setAllSeats(activeRoom.id, true)}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[var(--btn-secondary-bg)] border border-[var(--border-color)] rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--btn-secondary-text)] hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-white hover:border-indigo-200 transition-all shadow-sm active:scale-95"
                >
                  Activer Tout
                </button>
                <button 
                  onClick={() => setAllSeats(activeRoom.id, false)}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[var(--btn-secondary-bg)] border border-[var(--border-color)] rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--btn-secondary-text)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-slate-700 dark:hover:text-white hover:border-red-200 transition-all shadow-sm active:scale-95"
                >
                  Désactiver Tout
                </button>
              </div>
            </div>

            <div className="flex-1 border-[var(--border-color)] bg-[var(--card-bg)] rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 flex flex-col items-center justify-center overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300 relative group">
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

        {/* Magnifier Overlay */}
        <Magnifier 
          enabled={magnifierEnabled} 
          mousePosition={mousePosition}
        />
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
              className="relative w-full max-w-2xl bg-[var(--card-bg)] rounded-3xl shadow-2xl border border-[var(--border-color)] overflow-hidden transition-colors duration-300"
            >
              <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="text-xl font-black uppercase italic tracking-tight text-[var(--text-primary)]">Configurations Archivées</h3>
                <button onClick={() => setShowSaved(false)} className="text-slate-500 hover:text-indigo-500 transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-6 space-y-3 bg-[var(--bg-main)] transition-colors duration-300">
                {proposals.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)] border-dashed">
                    <p className="text-xs uppercase font-black tracking-widest">Aucune donnée archivée</p>
                  </div>
                ) : (
                  proposals.map(p => (
                    <div key={p.id} className="group p-4 bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] flex items-center justify-between hover:border-indigo-500/30 transition-all shadow-sm">
                      <div>
                        <h4 className="font-bold text-[var(--text-primary)]">{p.name}</h4>
                        <p className="text-[10px] font-mono text-[var(--text-secondary)]">{p.timestamp}</p>
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

      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
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

interface MagnifierProps {
  enabled: boolean;
  mousePosition: { x: number; y: number };
}

/**
 * Magnifier — zooms the hovered seat-grid-container (avoids Framer Motion conflicts)
 * and shows the seat number inside a floating lens circle.
 */
const Magnifier = ({ enabled, mousePosition }: MagnifierProps) => {
  const ZOOM = 2.2;
  const LENS_R = 88; // lens radius in px

  const [isOverSeats, setIsOverSeats] = useState(false);
  const [seatLabel, setSeatLabel] = useState<string | null>(null);
  // Track the currently zoomed container so we can reset it
  const activeContainerRef = useRef<HTMLElement | null>(null);

  const resetContainer = (el: HTMLElement) => {
    el.style.transform = '';
    el.style.transformOrigin = '';
    el.style.transition = '';
    el.style.zIndex = '';
  };

  useEffect(() => {
    if (!enabled) {
      if (activeContainerRef.current) {
        resetContainer(activeContainerRef.current);
        activeContainerRef.current = null;
      }
      setIsOverSeats(false);
      setSeatLabel(null);
      return;
    }

    const { x, y } = mousePosition;
    const el = document.elementFromPoint(x, y);
    const container = el?.closest('.seat-grid-container') as HTMLElement | null;

    // Reset previous container if we moved to a different one
    if (activeContainerRef.current && activeContainerRef.current !== container) {
      resetContainer(activeContainerRef.current);
      activeContainerRef.current = null;
    }

    if (!container) {
      setIsOverSeats(false);
      setSeatLabel(null);
      return;
    }

    setIsOverSeats(true);
    activeContainerRef.current = container;

    // Zoom centered on cursor position relative to the container
    const rect = container.getBoundingClientRect();
    const relX = ((x - rect.left) / rect.width) * 100;
    const relY = ((y - rect.top) / rect.height) * 100;
    container.style.transform = `scale(${ZOOM})`;
    container.style.transformOrigin = `${relX}% ${relY}%`;
    container.style.transition = 'transform 0.1s ease-out';
    container.style.zIndex = '50';

    // Read seat number from nearest data-seat-number ancestor
    const seatWrapper = el?.closest('[data-seat-number]');
    setSeatLabel(seatWrapper?.getAttribute('data-seat-number') ?? null);
  }, [enabled, mousePosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeContainerRef.current) {
        resetContainer(activeContainerRef.current);
      }
    };
  }, []);

  if (!enabled || !isOverSeats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.12 }}
      className="fixed pointer-events-none z-[9999] flex items-center justify-center"
      style={{
        left: mousePosition.x - LENS_R,
        top: mousePosition.y - LENS_R,
        width: LENS_R * 2,
        height: LENS_R * 2,
      }}
    >
      {/* Outer ring */}
      <div
        className="w-full h-full rounded-full flex items-center justify-center relative"
        style={{
          border: '2.5px solid rgba(99,102,241,0.75)',
          background: 'rgba(99,102,241,0.04)',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px rgba(99,102,241,0.12)',
        }}
      >
        {/* Crosshair lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-full h-px bg-indigo-400/25" />
          <div className="absolute h-full w-px bg-indigo-400/25" />
        </div>
        {/* Center dot */}
        <div className="absolute w-2 h-2 rounded-full bg-indigo-500/40" />
        {/* Seat label */}
        {seatLabel ? (
          <div
            className="absolute bottom-5 px-3 py-1 rounded-full text-xs font-black font-mono text-indigo-600 dark:text-indigo-300"
            style={{
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(99,102,241,0.3)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            #{seatLabel}
          </div>
        ) : (
          <span className="absolute bottom-5 text-[10px] font-mono text-indigo-400/60">{ZOOM}x</span>
        )}
      </div>
    </motion.div>
  );
};


