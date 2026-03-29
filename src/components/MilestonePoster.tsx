import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Download, Trophy, Star, Target } from 'lucide-react';
import html2canvas from 'html2canvas';

interface MilestonePosterProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    name: string;
    team: string;
  };
  milestone: {
    type: 'runs' | 'wickets';
    value: number;
    matchInfo: string;
  };
}

export const MilestonePoster = ({ isOpen, onClose, player, milestone }: MilestonePosterProps) => {
  const posterRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    const canvas = await html2canvas(posterRef.current, {
      scale: 2,
      backgroundColor: '#EAB308', // yellow-500
    });
    const link = document.createElement('a');
    link.download = `${player.name}_${milestone.value}_${milestone.type}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    if (!posterRef.current) return;
    try {
      const canvas = await html2canvas(posterRef.current, { scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'milestone.png', { type: 'image/png' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Cricket Milestone!',
            text: `Check out ${player.name}'s amazing performance: ${milestone.value} ${milestone.type}!`,
          });
        } else {
          // Fallback: download
          handleDownload();
        }
      });
    } catch (err) {
      console.error('Error sharing:', err);
      handleDownload();
    }
  };

  if (!isOpen) return null;

  const milestoneText = milestone.type === 'runs' 
    ? (milestone.value >= 100 ? 'CENTURY' : 'HALF CENTURY')
    : `${milestone.value} WICKETS`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-sm"
        >
          <button 
            onClick={onClose}
            className="absolute -top-12 right-0 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>

          {/* Poster Content */}
          <div 
            ref={posterRef}
            style={{ backgroundColor: '#eab308', borderColor: '#ffffff' }}
            className="aspect-[4/5] rounded-[2.5rem] p-8 flex flex-col items-center justify-between text-black relative overflow-hidden shadow-2xl border-8"
          >
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-10 left-10 rotate-12"><Trophy size={120} /></div>
              <div className="absolute bottom-10 right-10 -rotate-12"><Star size={120} /></div>
            </div>

            <div className="text-center z-10 w-full">
              <div className="flex justify-center mb-4">
                <div 
                  style={{ backgroundColor: '#000000', color: '#eab308' }}
                  className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  Congratulations
                </div>
              </div>
              <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-2">
                {milestoneText}
              </h2>
              <div style={{ backgroundColor: '#000000' }} className="h-1 w-20 mx-auto mb-6" />
            </div>

            <div className="text-center z-10 w-full">
              <div 
                style={{ backgroundColor: '#000000', borderColor: '#ffffff' }}
                className="w-24 h-24 rounded-[2rem] mx-auto mb-4 flex items-center justify-center border-4 shadow-xl"
              >
                {milestone.type === 'runs' ? <Star size={48} style={{ color: '#eab308' }} /> : <Target size={48} style={{ color: '#eab308' }} />}
              </div>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-1">
                {player.name}
              </h3>
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">
                {player.team}
              </p>
            </div>

            <div className="text-center z-10 w-full">
              <div 
                style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                className="rounded-2xl p-4 backdrop-blur-sm border border-black/5"
              >
                <p className="text-4xl font-black italic">
                  {milestone.value}
                  <span className="text-sm uppercase tracking-widest ml-1">{milestone.type}</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">
                  {milestone.matchInfo}
                </p>
              </div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] mt-6 opacity-40">
                Generated by Score Wala
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleShare}
              className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform"
            >
              <Share2 size={18} /> Share
            </button>
            <button
              onClick={handleDownload}
              className="bg-white/10 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-transform"
            >
              <Download size={18} />
            </button>
          </div>

          <div className="mt-4 flex justify-center gap-6">
            <a 
              href={`https://wa.me/?text=Check out this amazing performance! ${player.name} scored ${milestone.value} ${milestone.type}!`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">WhatsApp</span>
            </a>
            <a 
              href="https://www.facebook.com/sharer/sharer.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">Facebook</span>
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
