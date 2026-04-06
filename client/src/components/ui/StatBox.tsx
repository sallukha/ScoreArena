export const StatBox = ({ label, value }: { label: string, value: string }) => (
    <div className="text-center">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-gray-900 italic">{value}</p>
    </div>
);
