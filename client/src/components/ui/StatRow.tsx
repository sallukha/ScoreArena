export const StatRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
);
