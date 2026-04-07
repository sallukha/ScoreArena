import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary as ErrorBoundaryUI } from '../components/ui/ErrorBoundary';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            retry: 1,
        },
    },
});

export default function AppRoot() {
    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundaryUI>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ErrorBoundaryUI>
        </QueryClientProvider>
    );
}
