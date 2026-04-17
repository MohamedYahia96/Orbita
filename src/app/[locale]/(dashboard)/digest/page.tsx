"use client";

import { useState, useEffect } from "react";
import { Loader2, Mail, ExternalLink, CalendarDays, MessageSquarePlus } from "lucide-react";
import { Card, Button, EmptyState } from "@/components/ui";
import { useTranslations } from "next-intl";

export default function SmartDigestPage() {
    const t = useTranslations("Digest");
    const tCommon = useTranslations("Common");
    const [digest, setDigest] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/digest");
                const data = await res.json();
                if (data.success) {
                    setDigest(data.digest);
                }
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const handleAddNote = async (id: string, existingNote: string | null) => {
        const note = prompt(t("notePrompt"), existingNote || "");
        if (note !== null) {
            try {
                await fetch("/api/feeds/items/note", {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ itemId: id, note })
                });
                alert(t("noteSaved"));
                // Optionally reload or update state here
            } catch(e) {
                alert(tCommon("error"));
            }
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-full max-h-full min-h-[50vh]"><Loader2 className="animate-spin text-accent" /></div>;

    if (!digest || digest.total === 0) {
        return (
            <div className="flex h-full items-center justify-center pt-24">
                <EmptyState 
                    icon={<Mail size={48} />}
                    title={t("noItems")}
                    description={t("noItemsDesc")}
                />
            </div>
        );
    }

    const renderSection = (title: string, items: any[]) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="mb-10">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-[var(--colors-border)] pb-2">
                    {title === 'videos' ? t("sections.videos") : title === 'articles' ? t("sections.articles") : t("sections.others")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map(item => (
                        <Card key={item.id} className="p-4 hover:border-accent transition-colors">
                            {item.image && (
                                <div className="w-full h-32 rounded-lg bg-[var(--colors-bg-alt)] mb-3 overflow-hidden">
                                   <img src={item.image} alt="" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="flex items-center gap-2 mb-2 text-xs opacity-70">
                                {item.feed?.favicon && <img src={item.feed.favicon} className="w-4 h-4 rounded" />}
                                <span>{item.feed?.title || t("unknownSource")}</span>
                            </div>
                            <h3 className="font-semibold text-[var(--colors-text)] mb-2 line-clamp-2 leading-tight">
                                {item.title}
                            </h3>
                            {item.content && (
                                <p className="text-sm opacity-60 line-clamp-2">
                                    {item.content.replace(/<[^>]+>/g, '')}
                                </p>
                            )}
                            <div className="mt-4 pt-4 border-t border-[var(--colors-border)] flex justify-between items-center">
                                <span className="text-xs opacity-50 flex items-center gap-1">
                                    <CalendarDays size={12} /> {new Date(item.publishedAt).toLocaleDateString()}
                                </span>
                                <div className="flex gap-3">
                                   <button 
                                      onClick={() => handleAddNote(item.id, item.note)}
                                      className="text-[var(--colors-text)] opacity-60 hover:opacity-100 flex items-center gap-1 text-sm font-medium bg-transparent border-none cursor-pointer"
                                   >
                                      <MessageSquarePlus size={14} /> {t("note")}
                                   </button>
                                   {item.url && (
                                       <a href={item.url} target="_blank" rel="noreferrer" className="text-accent hover:opacity-80 flex items-center gap-1 text-sm font-medium">
                                           {t("read")} <ExternalLink size={14} />
                                       </a>
                                   )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        )
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">{t("title")}</h1>
                <p className="opacity-70 mt-2">{t("subtitle", { count: digest.total })}</p>
            </div>
            
            {renderSection('articles', digest.articles)}
            {renderSection('videos', digest.videos)}
            {renderSection('others', digest.others)}
        </div>
    );
}
