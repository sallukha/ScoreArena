export const MenuLink = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-4 px-6 py-3.5 text-gray-700 hover:bg-gray-50 transition-colors group"
    >
        <Icon size={20} className="text-gray-400 group-hover:text-yellow-600 transition-colors" />
        <span className="font-medium">{label}</span>
    </button>
);
