import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  ShieldCheck,
  Sparkles,
  Plus,
  MessageCircle,
  Check,
  RotateCcw,
  Star,
  BookOpen,
} from "lucide-react";
import { db, createDraft, resetDemo } from "../../data/db";
import { orderStatus, pairLabel } from "../../domain/orders";
import type { Order } from "../../domain/model";
import { useApp } from "../../ui/context";
import {
  Button,
  Badge,
  PageHeading,
  Empty,
  PairThumb,
  money,
  date,
  Modal,
  Confirm,
} from "../../ui/common";
export const orderNames = {
  draft: "Черновик",
  active: "Активен",
  completed: "Завершён",
  cancelled: "Отменён",
};
export function OrderCard({
  order,
  base = "/client",
}: {
  order: Order;
  base?: string;
}) {
  const status = orderStatus(order);
  return (
    <Link
      className="order-list-card"
      to={base + "/orders/" + (order.submitted ? "" : "draft/") + order.id}
      data-testid="order-card"
    >
      <PairThumb pair={order.pairs[0]} />
      <div className="order-card-copy">
        <div className="inline-between">
          <span className="eyebrow">ЗАКАЗ № {order.number}</span>
          <Badge tone={status === "completed" ? "green" : "neutral"}>
            {orderNames[status]}
          </Badge>
        </div>
        <h3>{order.pairs.map((p) => p.type || "Новая пара").join(" + ")}</h3>
        <p>
          {order.submitted
            ? order.pairs
                .map(pairLabel)
                .filter((x, i, a) => a.indexOf(x) === i)
                .join(" · ")
            : "Продолжите, когда будет удобно"}
        </p>
        <span className="text-sm muted">
          {order.pairs.length} {order.pairs.length === 1 ? "пара" : "пары"} ·{" "}
          {date(order.createdAt)}
        </span>
      </div>
      <ArrowUpRight size={21} />
    </Link>
  );
}
export function ClientHome() {
  const { session, run } = useApp();
  const navigate = useNavigate();
  const orders =
    useLiveQuery(
      () => db.orders.where("clientId").equals(session.clientId).toArray(),
      [session.clientId],
    ) ?? [];
  const services =
    useLiveQuery(() => db.services.filter((s) => s.active).toArray()) ?? [];
  const active = orders
    .filter((o) => orderStatus(o) === "active")
    .sort((a, b) => b.number.localeCompare(a.number));
  const [how, setHow] = useState(false);
  function start() {
    void run(async () => {
      const o = await createDraft(session.clientId);
      navigate("/client/orders/draft/" + o.id);
    });
  }
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> ЛИЧНАЯ МАСТЕРСКАЯ УХОДА ЗА ОБУВЬЮ
          </span>
          <h1>
            Любимой паре —<br />
            новая история.
          </h1>
          <p>
            Бережно очистим, подберём уход и вернём удовольствие от каждой
            прогулки.
          </p>
          <Button onClick={start}>
            Рассказать о своей паре <ArrowUpRight size={20} />
          </Button>
          <button className="text-button" onClick={() => setHow(true)}>
            Как всё устроено <ArrowRight size={16} />
          </button>
          <div className="hero-trust">
            <span>
              <Leaf size={17} /> Забота о материалах
            </span>
            <span>
              <ShieldCheck size={17} /> Цена по согласованию
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="/images/sneakers.jpg"
            alt="Пара светлых кроссовок — иллюстрация сервиса ухода"
          />
          <div className="hero-stamp">
            <Sparkles size={19} />
            <span>
              КАЖДАЯ ПАРА
              <br />
              <strong>ВАЖНА</strong>
            </span>
          </div>
          <span className="hero-caption">БЕРЕЖНО. ЛИЧНО. ДЛЯ ВАШЕЙ ПАРЫ.</span>
        </div>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">МЫ УЖЕ ЗАБОТИМСЯ</p>
            <h2>Ваши пары в мастерской</h2>
          </div>
          <Link className="text-link" to="/client/orders">
            Все заказы <ArrowRight size={16} />
          </Link>
        </div>
        {active.length ? (
          <div className="home-orders">
            {active.slice(0, 2).map((o) => (
              <OrderCard order={o} key={o.id} />
            ))}
          </div>
        ) : (
          <Empty
            title="Здесь появится ваша первая пара"
            text="Расскажите о состоянии обуви — мастер поможет выбрать уход."
          >
            <Button onClick={start}>
              Создать заявку <Plus size={16} />
            </Button>
          </Empty>
        )}
      </section>
      <section className="home-section services-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ПОДБЕРЁМ ПОДХОДЯЩИЙ УХОД</p>
            <h2>
              Маленькие детали.
              <br />
              Большая разница.
            </h2>
          </div>
          <p className="muted section-note">
            Сначала изучаем вашу пару.
            <br />
            Потом выбираем метод и согласуем стоимость.
          </p>
        </div>
        <div className="service-cards">
          {services.slice(0, 3).map((s, i) => (
            <Link to="/client/services" className="service-card" key={s.id}>
              <div className="service-image">
                <img
                  src={
                    [
                      "/images/canvas.jpg",
                      "/images/shoes.jpg",
                      "/images/sneakers.jpg",
                    ][i]
                  }
                  alt=""
                />
                <span>0{i + 1}</span>
                <ArrowUpRight size={21} />
              </div>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <small>От {money(s.price)} · демонстрационный тариф</small>
            </Link>
          ))}
        </div>
      </section>
      <div className="care-banner">
        <Leaf size={28} />
        <div>
          <h3>Хорошие вещи заслуживают долгой истории.</h3>
          <p>
            Внимательный уход помогает любимой обуви оставаться с вами дольше.
          </p>
        </div>
        <Button variant="secondary" onClick={start}>
          Подобрать уход <ArrowUpRight size={17} />
        </Button>
      </div>
      {how && <Tour onClose={() => setHow(false)} />}
    </>
  );
}
export function OrdersPage() {
  const { session, run } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState("active");
  const orders =
    useLiveQuery(
      () => db.orders.where("clientId").equals(session.clientId).toArray(),
      [session.clientId],
    ) ?? [];
  const filtered = orders
    .filter((o) =>
      tab === "history"
        ? ["completed", "cancelled"].includes(orderStatus(o))
        : orderStatus(o) === tab,
    )
    .sort((a, b) => b.number.localeCompare(a.number));
  return (
    <>
      <PageHeading
        eyebrow="ВАША ИСТОРИЯ УХОДА"
        title="Мои заказы"
        text="Все пары, решения и маленькие шаги к большому результату."
      >
        <Button
          onClick={() =>
            void run(async () => {
              const o = await createDraft(session.clientId);
              navigate("/client/orders/draft/" + o.id);
            })
          }
        >
          <Plus size={17} /> Новая заявка
        </Button>
      </PageHeading>
      <div className="tabs">
        {[
          ["active", "В работе"],
          ["draft", "Черновики"],
          ["history", "История"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {filtered.length ? (
        <div className="orders-stack">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      ) : (
        <Empty
          title="Пока ничего нет"
          text="Здесь будут ваши заказы. Можно создать новую заявку или сменить демонстрационного клиента."
        />
      )}
    </>
  );
}
export function MessagesPage() {
  const { session } = useApp();
  const orders =
    useLiveQuery(
      () =>
        session.role === "master"
          ? db.orders.toArray()
          : db.orders.where("clientId").equals(session.clientId).toArray(),
      [session.role, session.clientId],
    ) ?? [];
  return (
    <>
      <PageHeading
        eyebrow="ВСЕГДА НА СВЯЗИ"
        title="Сообщения"
        text="Вопросы и уточнения по вашим заказам — в одном месте."
      />
      {orders
        .filter((o) => o.submitted)
        .map((o) => (
          <Link
            className="message-order card"
            key={o.id}
            to={
              (session.role === "master" ? "/workshop" : "/client") +
              "/orders/" +
              o.id +
              "?tab=messages"
            }
          >
            <MessageCircle size={22} />
            <div>
              <h3>Заказ № {o.number}</h3>
              <p>{o.messages.at(-1)?.text ?? "Обсудить детали с мастером"}</p>
            </div>
            <ArrowUpRight size={19} />
          </Link>
        ))}
    </>
  );
}
export function ServicesPage() {
  const services =
    useLiveQuery(() => db.services.filter((s) => s.active).toArray()) ?? [];
  return (
    <>
      <PageHeading
        eyebrow="ПРОФЕССИОНАЛЬНЫЙ УХОД"
        title="Подход к каждой паре"
        text="Окончательный состав работ и стоимость предложит мастер после оценки."
      />
      <div className="catalog-grid">
        {services.map((s, i) => (
          <div className="card catalog-card" key={s.id}>
            <span className="catalog-number">0{i + 1}</span>
            <h2>{s.name}</h2>
            <p>{s.description}</p>
            <strong>От {money(s.price)}</strong>
            <small>Демонстрационная цена</small>
            <ul>
              <li>
                <Check size={15} /> Индивидуальная оценка материала
              </li>
              <li>
                <Check size={15} /> Согласование до начала работ
              </li>
              <li>
                <Check size={15} /> Рекомендации по уходу
              </li>
            </ul>
          </div>
        ))}
      </div>
      <p className="soft-note">
        Следы естественного износа могут сохраниться. Мы честно обсудим
        возможный результат до начала чистки.
      </p>
    </>
  );
}
export function ProfilePage() {
  const { session, setSession, run, busy } = useApp();
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const client = clients.find((c) => c.id === session.clientId);
  const [reset, setReset] = useState(false),
    [tour, setTour] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="ЛИЧНОЕ ПРОСТРАНСТВО"
        title="Профиль демо"
        text="Здесь можно познакомиться с продуктом с разных сторон."
      />
      <div className="profile-grid">
        <section className="card form-card">
          <div className="profile-person">
            <span className="avatar large">{client?.initials}</span>
            <div>
              <h2>{client?.name}</h2>
              <p className="muted">Синтетический клиент · {client?.phone}</p>
            </div>
          </div>
          <label className="field">
            <span>Демонстрационный клиент</span>
            <select
              value={session.clientId}
              onChange={(e) =>
                setSession({ ...session, clientId: e.target.value })
              }
            >
              {clients.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <p className="muted text-sm">
            У каждого клиента свои заказы. Мастер видит общую рабочую очередь.
          </p>
          <Button variant="secondary" onClick={() => setTour(true)}>
            <BookOpen size={17} /> Как проверить демо
          </Button>
        </section>
        <section className="card form-card">
          <Badge tone="green">Демонстрационная версия</Badge>
          <h2>
            Настоящие сценарии.
            <br />
            Тестовые данные.
          </h2>
          <p>
            Изменения и фотографии сохраняются в этом браузере. Между
            устройствами они не синхронизируются. Платежи, SMS и курьер
            эмулируются.
          </p>
          <Button variant="ghost" onClick={() => setReset(true)}>
            <RotateCcw size={16} /> Сбросить демо
          </Button>
          <p className="field-hint">
            Сброс удалит ваши изменения и восстановит начальные примеры.
          </p>
        </section>
      </div>
      {reset && (
        <Confirm
          title="Восстановить исходное демо?"
          text="Созданные заявки, сообщения и загруженные вами фотографии будут удалены из этого браузера."
          action="Восстановить демо"
          danger
          busy={busy}
          onClose={() => setReset(false)}
          onConfirm={() =>
            void run(async () => {
              await resetDemo();
              setReset(false);
            }, "Исходные данные восстановлены")
          }
        />
      )}
      {tour && <Tour onClose={() => setTour(false)} />}
    </>
  );
}
export function Tour({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Пройдите путь вашей пары" onClose={onClose}>
      <ol className="tour-steps">
        {[
          [
            "Создайте заявку",
            "Добавьте одну или несколько пар, отметьте загрязнения и загрузите фото.",
          ],
          [
            "Станьте мастером",
            "Переключите роль вверху. Откройте заявку, задайте вопрос и предложите стоимость.",
          ],
          [
            "Согласуйте условия",
            "Вернитесь к клиенту. Для каждой пары можно согласиться, отказаться или запросить изменения.",
          ],
          [
            "Доведите до результата",
            "Мастер принимает обувь, выполняет работу и контроль. Клиент эмулирует оплату, мастер подтверждает возврат.",
          ],
        ].map(([title, text], i) => (
          <li key={title}>
            <span>{i + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="soft-note">
        Можно начать с подготовленных заказов на разных этапах. Все действия
        сохраняются только в вашем браузере.
      </div>
      <div className="modal-actions">
        <Button onClick={onClose}>
          Всё понятно <ArrowRight size={17} />
        </Button>
      </div>
    </Modal>
  );
}
