import { AnimatePresence, motion } from 'motion/react';

export const WelcomeModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
    <AnimatePresence>
        {isOpen && (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 z-200 backdrop-blur-md"
                />
                <motion.div
                    initial={{ scale: 0.92, opacity: 0, y: 32 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 24 }}
                    className="fixed inset-0 flex items-center justify-center z-210 p-6"
                >
                    <div className="bg-yellow-500 p-6 rounded-[2.5rem] shadow-2xl text-center flex flex-col items-center gap-4 max-w-[19rem] w-full border-4 border-black">

                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/60">Welcome to</p>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-black leading-none">ScoreArena</h2>
                            <p className="text-[11px] font-bold text-black/70">Live scoring, team management, player statistics, and match sharing  all in one app.</p>
                        </div>
                        <div className="bg-black/5 p-4 rounded-[1.75rem] border border-black/10 w-full">
                            <p className="text-black font-black text-[10px] uppercase tracking-[0.2em] mb-1 opacity-60">Developed by</p>
                            <p className="text-2xl font-black italic uppercase tracking-tighter text-black">Md Haris</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full bg-black text-white py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
                        >
                            Let's Play
                        </button>
                    </div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
);
