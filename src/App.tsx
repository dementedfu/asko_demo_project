import { useEffect, useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Home,
  Layers3,
  MessageCircle,
  UserRound,
  LayoutDashboard,
  SlidersHorizontal,
  WifiOff,
  Download,
  ArrowUpRight,
} from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { db, initializeDemo } from "./data/db";
import { AppProvider, useApp } from "./ui/context";
import { Loading, Button } from "./ui/common";
import {
  ClientHome,
  OrdersPage,
  MessagesPage,
  ServicesPage,
  ProfilePage,
} from "./features/client/ClientPages";
import {
  WorkshopHome,
  WorkshopOrders,
  WorkshopServices,
} from "./features/workshop/WorkshopPages";
import Wizard from "./features/wizard/Wizard";
import OrderPage from "./features/orders/OrderPage";

export default function App() {
  const [state, setState] = useState("loading");
  useEffect(() => {
    initializeDemo()
      .then(() => setState("ready"))
      .catch(() => setState("error"));
  }, []);
  if (state === "loading") return <Loading />;
  if (state === "error")
    return (
      <div className="startup-error">
        <h1>Не удалось открыть хранилище</h1>
        <p>
          Для демо нужен браузер с доступом к IndexedDB. Попробуйте обычную
          вкладку или освободите место.
        </p>
        <Button onClick={() => location.reload()}>Повторить</Button>
      </div>
    );
  return (
    <AppProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppProvider>
  );
}
function Shell() {
  const { session, setSession, leave } = useApp();
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const client = clients.find((c) => c.id === session.clientId);
  const navigate = useNavigate();
  const location = useLocation();
  const master = session.role === "master";
  const root = master ? "/workshop" : "/client";
  const [online, setOnline] = useState(navigator.onLine);
  const [update, setUpdate] = useState<() => Promise<void>>();
  const [install, setInstall] = useState<any>();
  useEffect(() => {
    const updater = registerSW({
      onNeedRefresh() {
        setUpdate(() => () => updater(true));
      },
    });
    const on = () => setOnline(navigator.onLine);
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    window.addEventListener("beforeinstallprompt", prompt);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [location.pathname]);
  const nav = master
    ? [
        { to: root, label: "Обзор", Icon: LayoutDashboard },
        { to: root + "/orders", label: "Заказы", Icon: Layers3 },
        { to: root + "/messages", label: "Сообщения", Icon: MessageCircle },
        { to: root + "/services", label: "Услуги", Icon: SlidersHorizontal },
      ]
    : [
        { to: root, label: "Главная", Icon: Home },
        { to: root + "/orders", label: "Мои заказы", Icon: Layers3 },
        { to: root + "/messages", label: "Сообщения", Icon: MessageCircle },
        { to: root + "/profile", label: "Профиль", Icon: UserRound },
      ];
  async function switchRole(role: "client" | "master") {
    if (!(await leave())) return;
    setSession({ ...session, role });
    navigate(role === "master" ? "/workshop" : "/client");
  }
  return (
    <div
      onClickCapture={(event) => {
        if (
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
          'a[href^="#/"]',
        );
        if (!link) return;
        event.preventDefault();
        const target = link.getAttribute("href")!.slice(1);
        void leave().then((saved) => {
          if (saved) navigate(target);
        });
      }}
    >
      <div className="demo-bar">
        <div className="demo-bar-inner">
          <span>
            <i /> ДЕМО · тестовые данные
          </span>
          <div className="role-switch" aria-label="Демонстрационная роль">
            <button
              className={!master ? "active" : ""}
              onClick={() => switchRole("client")}
            >
              Клиент
            </button>
            <button
              className={master ? "active" : ""}
              onClick={() => switchRole("master")}
            >
              Мастер
            </button>
          </div>
          <Link to={root + "/profile"} className="demo-settings">
            Настроить демо
          </Link>
        </div>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to={root}>
            <span className="brand-mark">
              дп
              <span>
                <ArrowUpRight size={12} />
              </span>
            </span>
            <span>
              другая пара
              <small>{master ? "КАБИНЕТ МАСТЕРА" : "ЛИЧНАЯ МАСТЕРСКАЯ"}</small>
            </span>
          </Link>
          <nav className="desktop-nav">
            {nav.slice(0, master ? 4 : 3).map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === root}>
                {label}
              </NavLink>
            ))}
          </nav>
          <Link className="header-profile" to={root + "/profile"}>
            <span className="avatar">{master ? "АМ" : client?.initials}</span>
            <span>
              {master ? "Алексей · мастер" : client?.name.split(" ")[0]}
              <small>{master ? "Ваш рабочий день" : "Рады видеть вас"}</small>
            </span>
          </Link>
        </div>
      </header>
      {!online && (
        <div className="connection-note">
          <WifiOff size={16} /> Офлайн · изменения сохраняются в этом браузере
        </div>
      )}
      {update && (
        <div className="connection-note">
          Доступна новая версия{" "}
          <Button variant="ghost" onClick={() => void update()}>
            Обновить приложение
          </Button>
        </div>
      )}
      {install && (
        <div className="install-note">
          <Download size={16} /> Мастерская всегда под рукой{" "}
          <button
            onClick={async () => {
              await install.prompt();
              setInstall(undefined);
            }}
          >
            Установить
          </button>
          <button
            aria-label="Скрыть предложение установки"
            onClick={() => setInstall(undefined)}
          >
            ×
          </button>
        </div>
      )}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to={root} replace />} />
          <Route path="/client" element={<ClientHome />} />
          <Route path="/client/orders" element={<OrdersPage />} />
          <Route path="/client/orders/draft/:id" element={<Wizard />} />
          <Route path="/client/orders/:id" element={<OrderPage />} />
          <Route path="/client/messages" element={<MessagesPage />} />
          <Route path="/client/services" element={<ServicesPage />} />
          <Route path="/client/profile" element={<ProfilePage />} />
          <Route
            path="/workshop"
            element={
              master ? <WorkshopHome /> : <Navigate to="/client" replace />
            }
          />
          <Route
            path="/workshop/orders"
            element={
              master ? <WorkshopOrders /> : <Navigate to="/client" replace />
            }
          />
          <Route
            path="/workshop/orders/:id"
            element={master ? <OrderPage /> : <Navigate to="/client" replace />}
          />
          <Route
            path="/workshop/messages"
            element={
              master ? <MessagesPage /> : <Navigate to="/client" replace />
            }
          />
          <Route
            path="/workshop/services"
            element={
              master ? <WorkshopServices /> : <Navigate to="/client" replace />
            }
          />
          <Route path="/workshop/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to={root} replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <Link className="footer-brand" to={root}>
          другая пара <ArrowUpRight size={14} />
        </Link>
        <span>Бережный уход. Внимание к деталям.</span>
        <span>Демонстрация · данные в вашем браузере</span>
      </footer>
      <nav className="mobile-nav" aria-label="Основная навигация">
        {nav.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === root}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
