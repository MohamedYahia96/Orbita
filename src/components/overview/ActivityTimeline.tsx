"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';

type TimelineItem = {
    id: string;
    title: string;
    createdAt: string;
    feed?: {
        title?: string | null;
        favicon?: string | null;
    } | null;
};

type TimelineResponse = {
    success: boolean;
    timeline?: TimelineItem[];
};

export function ActivityTimeline() {
    const t = useTranslations("Overview");
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/timeline')
            .then(res => res.json())
            .then((data: TimelineResponse) => {
                if (data.success) setTimeline(data.timeline || []);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>;
    
    if (timeline.length === 0) return null;

    return (
        <div className="flex flex-col gap-4 mt-8">
            <h3 className="font-bold text-xl flex items-center gap-2"><Activity size={20} className="text-accent" /> {t("recentActivity")}</h3>
            <div className="flex flex-col gap-6 mt-4 relative before:absolute before:inset-0 before:left-2.75 before:w-px before:bg-(--colors-border) pl-8">
               {timeline.map((item) => (
                  <div key={item.id} className="relative group">
                     <div className="absolute -left-8.75 w-6 h-6 rounded-full border-2 border-(--bg-card) bg-accent flex justify-center items-center overflow-hidden shrink-0 z-10">
                         {item.feed?.favicon ? <Image src={item.feed.favicon} className="w-4 h-4 bg-white" alt={item.feed?.title || "Feed icon"} width={16} height={16} unoptimized /> : <div className="w-2 h-2 rounded-full bg-white" />}
                     </div>
                     <div className="bg-(--colors-bg-alt) border border-(--colors-border) p-4 rounded-lg text-sm shadow-sm transition-colors group-hover:border-accent">
                         <span className="opacity-60 text-xs font-mono">{new Date(item.createdAt).toLocaleString()}</span>
                         <p className="font-semibold text-base mt-2 leading-tight">{item.title}</p>
                                 <p className="opacity-70 text-xs mt-2 uppercase tracking-wider font-semibold">{t("from", { source: item.feed?.title || "Unknown" })}</p>
                     </div>
                  </div>
               ))}
            </div>
        </div>
    )
}
