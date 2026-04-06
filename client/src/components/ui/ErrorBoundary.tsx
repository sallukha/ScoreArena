import { Component, ReactNode } from 'react';
import { Bell } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            let errorMessage = 'Something went wrong.';
            try {
                const parsed = JSON.parse(this.state.error.message);
                if (parsed.error) {
                    errorMessage = `Firebase Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
                }
            } catch (e) {
                errorMessage = this.state.error.message || errorMessage;
            }

            return (
                <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                        <Bell size={40} className="text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-red-900 mb-2">Oops! An error occurred</h1>
                    <p className="text-red-700 mb-8 max-w-xs mx-auto">{errorMessage}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-transform"
                    >
                        Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
