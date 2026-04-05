import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Trash2, Trophy, Target, Zap, Info } from 'lucide-react';
import { db, doc, updateDoc, deleteDoc, handleFirestoreError, OperationType } from '../firebase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'match_start' | 'wicket' | 'milestone' | 'match_end' | 'system';
  read: boolean;
  timestamp: any;
  matchId?: string;
}

export const NotificationList = ({ 
  isOpen, 
  onClose, 
  notifications,
  onNotificationClick
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  notifications: Notification[],
  onNotificationClick: (matchId: string) => void
}) => {
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match_start': return <Zap className="text-yellow-500" size={18} />;
      case 'wicket': return <Target className="text-red-500" size={18} />;
      case 'milestone': return <Trophy className="text-purple-500" size={18} />;
      case 'match_end': return <Check className="text-green-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[110] shadow-2xl flex flex-col"
          >
            <div className="p-6 bg-yellow-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={24} className="text-black" />
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-black">Notifications</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                <X size={24} className="text-black" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <Bell size={64} className="mb-4" />
                  <p className="font-bold uppercase tracking-widest text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={notif.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      notif.read ? 'bg-white border-gray-100' : 'bg-yellow-50 border-yellow-200 shadow-sm'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        notif.read ? 'bg-gray-50' : 'bg-white shadow-sm'
                      }`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className={`font-black uppercase tracking-tight text-sm truncate ${
                            notif.read ? 'text-gray-600' : 'text-gray-900'
                          }`}>
                            {notif.title}
                          </h3>
                          <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">
                            {notif.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${
                          notif.read ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-3 mt-4">
                          {notif.matchId && (
                            <button 
                              onClick={() => { onNotificationClick(notif.matchId!); onClose(); }}
                              className="text-[10px] font-black uppercase tracking-widest text-yellow-600 hover:underline"
                            >
                              View Match
                            </button>
                          )}
                          {!notif.read && (
                            <button 
                              onClick={() => markAsRead(notif.id)}
                              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-green-600"
                            >
                              Mark as read
                            </button>
                          )}
                          <button 
                            onClick={() => deleteNotification(notif.id)}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 ml-auto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
