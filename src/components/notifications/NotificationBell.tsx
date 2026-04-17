"use client";

import { useState, useEffect } from "react";
import { Bell, Check, ExternalLink, BellRing } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { useTranslations } from "next-intl";

const applicationServerKey = "BPjzDI7qAH68M-u5OePn2AnmTeWOmfHu1bGpqrKRRYQ7lq0uZOQt9CF6DS1nx5churhUDK9hbUP_NJ0lMateZ2A";

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function NotificationBell() {
  const t = useTranslations("Notifications");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isPushEnabled, setIsPushEnabled] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    
    // Check if push is already enabled
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setIsPushEnabled(true);
        });
      });
    }

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.count || 0);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", id }),
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Failed to mark as read");
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert(t("pushNotSupported"));
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(applicationServerKey)
      });

      await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      setIsPushEnabled(true);
    } catch (e) {
      console.error('Failed to subscribe: ', e);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        {unreadCount > 0 && (
          <div style={{ position: "absolute", top: -2, right: -2, zIndex: 10 }}>
            <Badge variant="error" dot />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          icon={<Bell size={18} />} 
          aria-label="Notifications" 
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "120%",
          right: 0,
          width: "320px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          maxHeight: "400px"
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", fontWeight: "600", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{t("title")}</span>
            {!isPushEnabled && (
               <Button variant="ghost" size="sm" onClick={subscribeToPush} icon={<BellRing size={14} />} title={t("enablePush")} />
            )}
          </div>
          
          <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)" }}>
                 {t("noNewNotifications")}
              </div>
            ) : (
                notifications.map(notif => (
                    <div key={notif.id} style={{ 
                        display: "flex", 
                        padding: "12px 16px", 
                        borderBottom: "1px solid var(--border-color)",
                        gap: "12px"
                    }}>
                        {notif.feed?.favicon ? (
                           <img src={notif.feed.favicon} alt="" width={24} height={24} style={{ borderRadius: "4px" }} />
                        ) : (
                           <div style={{ width: 24, height: 24, borderRadius: "4px", backgroundColor: "var(--accent-color)" }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: "0 0 4px 0", fontSize: "0.875rem", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {notif.title}
                            </p>
                            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {notif.feed?.title}
                            </p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <button onClick={() => markAsRead(notif.id)} title={t("markAsRead")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                <Check size={14} />
                            </button>
                            {notif.url && (
                               <a href={notif.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-color)" }}>
                                  <ExternalLink size={14} />
                               </a>
                            )}
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
