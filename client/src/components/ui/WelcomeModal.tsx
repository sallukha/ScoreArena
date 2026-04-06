import { AnimatePresence, motion } from 'motion/react';

export const WelcomeModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
    <AnimatePresence>
        {isOpen && (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 z-[200] backdrop-blur-md"
                />
                <motion.div
                    initial={{ scale: 0.5, opacity: 0, y: 100 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.5, opacity: 0, y: 100 }}
                    className="fixed inset-0 flex items-center justify-center z-[210] p-6"
                >
                    <div className="bg-yellow-500 p-8 rounded-[3rem] shadow-2xl text-center flex flex-col items-center gap-6 max-w-xs w-full border-4 border-black">
                        <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-4 border-black shadow-2xl">
                            <img src="/haris-photo.jpeg" alt="Md Haris" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-black leading-none">ScoreArena</h2>
                            <div className="h-1 w-12 bg-black mx-auto rounded-full mt-2" />
                        </div>
                        <div className="bg-black/5 p-6 rounded-[2rem] border border-black/10 w-full">
                            <p className="text-black font-black text-[10px] uppercase tracking-[0.2em] mb-2 opacity-60">Developed by</p>
                            <p className="text-4xl font-black italic uppercase tracking-tighter text-black">Md Haris</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
                        >
                            Let's Play
                        </button>
                    </div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
);
