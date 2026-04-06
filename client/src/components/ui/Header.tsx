import { Menu, Search, Bell } from 'lucide-react';

export const Header = ({
    title,
    onMenuClick,
    onSearchClick,
    onNotificationClick,
    unreadCount
}: {
    title: string,
    onMenuClick: () => void,
    onSearchClick: () => void,
    onNotificationClick: () => void,
    unreadCount: number
}) => {
    return (
        <header className="sticky top-0 bg-yellow-500 text-black px-4 py-3 flex justify-between items-center z-40 shadow-md">
            <div className="flex items-center gap-3">
                <button onClick={onMenuClick} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
                    <Menu size={24} />
                </button>
                <h1 className="text-xl font-bold tracking-tight italic uppercase">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={onSearchClick} className="p-1 hover:bg-yellow-600 rounded-full transition-colors">
                    <Search size={22} />
                </button>
                <button
                    onClick={onNotificationClick}
                    className="p-1 hover:bg-yellow-600 rounded-full transition-colors relative"
                >
                    <Bell size={22} />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[8px] font-black flex items-center justify-center rounded-full border border-yellow-500">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
};
