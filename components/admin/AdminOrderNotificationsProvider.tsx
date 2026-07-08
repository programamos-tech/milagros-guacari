"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AdminNewWebSaleModal } from "@/components/admin/AdminNewWebSaleModal";
import {
  type AdminWebOrderNotification,
  loadPersistedNotificationIds,
  persistNotificationIds,
  rowToWebOrderNotification,
} from "@/lib/admin-web-order-notifications";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Ctx = {
  notifications: AdminWebOrderNotification[];
  unreadCount: number;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const AdminOrderNotificationsContext = createContext<Ctx | null>(null);

export function useAdminOrderNotifications() {
  const ctx = useContext(AdminOrderNotificationsContext);
  if (!ctx) {
    throw new Error("useAdminOrderNotifications debe usarse dentro del provider");
  }
  return ctx;
}

const POLL_MS = 30_000;

export function AdminOrderNotificationsProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<AdminWebOrderNotification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [modalOrder, setModalOrder] = useState<AdminWebOrderNotification | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const modalQueueRef = useRef<AdminWebOrderNotification[]>([]);
  const bootstrappedRef = useRef(false);
  const allowModalRef = useRef(false);

  const pushNotification = useCallback((item: AdminWebOrderNotification, showModal: boolean) => {
    const isNew = !seenIdsRef.current.has(item.id);
    if (isNew) {
      seenIdsRef.current.add(item.id);
      persistNotificationIds(seenIdsRef.current);
    }

    setNotifications((prev) => {
      if (prev.some((n) => n.id === item.id)) {
        return prev.map((n) => (n.id === item.id ? { ...n, ...item } : n));
      }
      return [{ ...item, read: false }, ...prev].slice(0, 30);
    });

    if (!showModal || !isNew) return;

    setModalOrder((current) => {
      if (!current) return item;
      modalQueueRef.current.push(item);
      return current;
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalOrder((current) => {
      if (current) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === current.id ? { ...n, read: true } : n)),
        );
      }
      const next = modalQueueRef.current.shift() ?? null;
      return next;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    seenIdsRef.current = loadPersistedNotificationIds();
    const supabase = createSupabaseBrowserClient();

    const bootstrap = async () => {
      if (bootstrappedRef.current) return;
      bootstrappedRef.current = true;
      const { data } = await supabase
        .from("orders")
        .select(
          "id, status, customer_name, customer_email, total_cents, created_at, checkout_payment_method, wompi_reference",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(8);

      const items = (data ?? [])
        .map((row) => rowToWebOrderNotification(row as Record<string, unknown>))
        .filter((n): n is AdminWebOrderNotification => n != null)
        .map((n) => ({
          ...n,
          read: seenIdsRef.current.has(n.id),
        }));

      setNotifications(items);
      allowModalRef.current = true;
    };

    void bootstrap();

    const channel = supabase
      .channel("admin-web-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const item = rowToWebOrderNotification(
            payload.new as Record<string, unknown>,
          );
          if (item) pushNotification(item, allowModalRef.current);
        },
      )
      .subscribe();

    const poll = window.setInterval(() => {
      void (async () => {
        const { data } = await supabase
          .from("orders")
          .select(
            "id, status, customer_name, customer_email, total_cents, created_at, checkout_payment_method, wompi_reference",
          )
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(3);
        for (const row of data ?? []) {
          const item = rowToWebOrderNotification(row as Record<string, unknown>);
          if (item) pushNotification(item, allowModalRef.current);
        }
      })();
    }, POLL_MS);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [enabled, pushNotification]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      panelOpen,
      setPanelOpen,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, panelOpen, markRead, markAllRead],
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <AdminOrderNotificationsContext.Provider value={value}>
      {children}
      {modalOrder ? <AdminNewWebSaleModal order={modalOrder} onClose={closeModal} /> : null}
    </AdminOrderNotificationsContext.Provider>
  );
}
