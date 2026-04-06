import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { apiFetch } from '../api/http';

export const CricketNews = () => {
    const [articles, setArticles] = useState<any[]>([]);
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let intervalId: number | undefined;

        const loadNews = () => {
            apiFetch<{ enabled: boolean; articles: any[] }>('/news/cricket')
                .then((data) => {
                    if (!isMounted) return;
                    setEnabled(Boolean(data.enabled));
                    setArticles(Array.isArray(data.articles) ? data.articles : []);
                })
                .catch(() => {
                    if (!isMounted) return;
                    setEnabled(false);
                    setArticles([]);
                });
        };

        loadNews();
        intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadNews();
            }
        }, 5 * 60 * 1000);

        return () => {
            isMounted = false;
            if (intervalId) {
                window.clearInterval(intervalId);
            }
        };
    }, []);

    if (!enabled || articles.length === 0) return null;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-black italic uppercase tracking-tighter text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-6 bg-black rounded-full"></span>
                    CRICKET NEWS
                </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {articles.slice(0, 4).map((article) => (
                    <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hover:border-yellow-200 transition-colors"
                    >
                        <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                            {article.imageUrl ? (
                                <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <Trophy size={36} />
                                </div>
                            )}
                        </div>
                        <div className="p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{article.source}</p>
                            <h3 className="mt-2 text-sm font-black text-gray-900 leading-snug">{article.title}</h3>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};
