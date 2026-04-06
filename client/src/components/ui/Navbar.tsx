import { LayoutDashboard, Users, History, Trophy, User } from 'lucide-react';

export const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
    const tabs = [
        { id: 'home', icon: LayoutDashboard, label: 'Home' },
        { id: 'teams', icon: Users, label: 'Teams' },
        { id: 'myCricket', icon: History, label: 'My Cricket' },
        { id: 'leaderboard', icon: Trophy, label: 'Leaders' },
        { id: 'profile', icon: User, label: 'Profile' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 py-2 flex justify-around items-end z-50">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-1 transition-all ${tab.id === 'myCricket'
                        ? activeTab === tab.id
                            ? '-mt-6 bg-yellow-500 text-black shadow-xl shadow-yellow-500/25 rounded-2xl px-3 py-3 min-w-18'
                            : '-mt-5 bg-black text-white rounded-2xl px-3 py-3 min-w-18 hover:bg-gray-900'
                        : activeTab === tab.id
                            ? 'text-yellow-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                    <span className={`font-medium uppercase tracking-wider ${tab.id === 'myCricket' ? 'text-[9px]' : 'text-[10px]'}`}>{tab.label}</span>
                </button>
            ))}
        </nav>
    );
};
