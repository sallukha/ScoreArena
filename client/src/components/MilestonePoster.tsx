import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Download, Trophy, Star, Target, Link2, Copy } from 'lucide-react';
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
  shareUrl?: string;
}

export const MilestonePoster = ({ isOpen, onClose, player, milestone, shareUrl }: MilestonePosterProps) => {
  const posterRef = useRef<HTMLDivElement>(null);

  const shareMessage = `Check out ${player.name}'s performance: ${milestone.value} ${milestone.type}!${shareUrl ? `\n\nWatch match: ${shareUrl}` : ''}`;

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
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        backgroundColor: '#EAB308',
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'milestone.png', { type: 'image/png' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Cricket Milestone!',
            text: shareMessage,
            url: shareUrl,
          });
        } else if (navigator.share) {
          await navigator.share({
            title: 'Cricket Milestone!',
            text: shareMessage,
            url: shareUrl,
          });
        } else {
          await handleCopyLink();
          handleDownload();
        }
      });
    } catch (err) {
      console.error('Error sharing:', err);
      handleDownload();
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.error('Failed to copy share link:', error);
    }
  };

  if (!isOpen) return null;

  const milestoneText = milestone.type === 'runs' 
    ? (milestone.value >= 100 ? 'CENTURY' : 'HALF CENTURY')
    : `${milestone.value} WICKETS`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-200 bg-black/80 backdrop-blur-sm">
        <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-4">
        <motion.div
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-4xl bg-neutral-950/40 p-1"
        >
          <button 
            onClick={onClose}
            className="absolute right-3 top-3 z-10 p-2 bg-white/15 text-white rounded-full hover:bg-white/25 transition-colors"
          >
            <X size={20} />
          </button>

          <div 
            ref={posterRef}
            style={{ backgroundColor: '#eab308', borderColor: '#ffffff' }}
            className="rounded-4xl px-5 pb-5 pt-12 sm:px-8 sm:pb-8 sm:pt-14 flex flex-col items-center justify-between text-black relative overflow-hidden shadow-2xl border-4 sm:border-8 min-h-135 sm:min-h-155"
          >
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-8 left-4 rotate-12 sm:left-10"><Trophy size={96} /></div>
              <div className="absolute bottom-8 right-4 -rotate-12 sm:right-10"><Star size={96} /></div>
            </div>

            <div className="text-center z-10 w-full">
              <div className="flex justify-center mb-4">
                <div 
                  style={{ backgroundColor: '#000000', color: '#eab308' }}
                  className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  Congratulations
                </div>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter leading-none mb-2 wrap-break-word">
                {milestoneText}
              </h2>
              <div style={{ backgroundColor: '#000000' }} className="h-1 w-20 mx-auto mb-6" />
            </div>

            <div className="text-center z-10 w-full">
              <div 
                style={{ backgroundColor: '#000000', borderColor: '#ffffff' }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.75rem] mx-auto mb-4 flex items-center justify-center border-4 shadow-xl"
              >
                {milestone.type === 'runs' ? <Star size={48} style={{ color: '#eab308' }} /> : <Target size={48} style={{ color: '#eab308' }} />}
              </div>
              <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter leading-none mb-1 wrap-break-word">
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
                <p className="text-3xl sm:text-4xl font-black italic">
                  {milestone.value}
                  <span className="text-sm uppercase tracking-widest ml-1">{milestone.type}</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-2 leading-relaxed wrap-break-word">
                  {milestone.matchInfo}
                </p>
              </div>
              {shareUrl && (
                <div className="mt-4 rounded-2xl bg-black/10 border border-black/10 px-3 py-3 text-left">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-70">
                    <Link2 size={12} />
                    Shareable Match Link
                  </div>
                  <p className="mt-2 text-[11px] font-bold break-all leading-relaxed opacity-80">
                    {shareUrl}
                  </p>
                </div>
              )}
              <p className="text-[8px] font-black uppercase tracking-[0.3em] mt-6 opacity-40">
                Generated by ScoreArena
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={handleShare}
              className="col-span-2 bg-white text-black py-3.5 rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform"
            >
              <Share2 size={18} /> Share
            </button>
            <button
              onClick={handleDownload}
              className="bg-white/10 text-white p-3.5 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center"
            >
              <Download size={18} />
            </button>
          </div>

          {shareUrl && (
            <button
              onClick={handleCopyLink}
              className="mt-3 w-full rounded-2xl bg-white/10 text-white py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform"
            >
              <Copy size={16} /> Copy Match Link
            </button>
          )}
        </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
