import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowUpRight,
  Search,
  Plus,
  Clock3,
  Check,
  Archive,
  SlidersHorizontal,
} from "lucide-react";
import { db } from "../../data/db";
import { uid } from "../../data/factories";
import {
  accepted,
  currentQuote,
  currentDecision,
  orderStatus,
  pairLabel,
  quoteTotal,
} from "../../domain/orders";
import type { Order, Pair, Service } from "../../domain/model";
import { useApp } from "../../ui/context";
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  PageHeading,
  PairThumb,
  money,
  date,
} from "../../ui/common";

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function overdue(p: Pair) {
  return (
    !p.excluded &&
    p.work !== "ready" &&
    !!currentQuote(p) &&
    (p.eta ?? currentQuote(p)!.deadline) < today()
  );
}
function matches(o: Order, filter: string) {
  if (!o.submitted) return false;
  const status = orderStatus(o);
  if (filter === "closed") return status !== "active";
  if (status !== "active") return filter === "all";
  return (
    filter === "all" ||
    o.pairs.some(
      (p) =>
        !p.excluded &&
        ((filter === "new" && !currentQuote(p)) ||
          (filter === "decision" &&
            !!currentQuote(p) &&
            !accepted(p) &&
            p.work === "not_started") ||
          (filter === "work" && ["in_progress", "quality"].includes(p.work)) ||
          (filter === "ready" &&
            p.work === "ready" &&
            p.custody !== "returned") ||
          (filter === "overdue" && overdue(p))),
    )
  );
}
const filters = [
  ["all", "Все"],
  ["new", "Без оценки"],
  ["decision", "Согласование"],
  ["work", "В работе"],
  ["ready", "К выдаче"],
  ["overdue", "Просрочены"],
  ["closed", "Завершённые"],
];
export function WorkshopHome() {
  const orders = useLiveQuery(() => db.orders.toArray()) ?? [];
  const active = orders.filter(
    (o) => o.submitted && orderStatus(o) === "active",
  );
  const pairs = orders.filter((o) => o.submitted).flatMap((o) => o.pairs);
  const agreed = pairs.reduce(
    (s, p) =>
      s + (!p.excluded && accepted(p) ? quoteTotal(currentQuote(p)!) : 0),
    0,
  );
  const earned = pairs
    .filter((p) => p.work === "ready" && !p.excluded && accepted(p))
    .reduce((s, p) => s + quoteTotal(currentQuote(p)!), 0);
  const paid = pairs.reduce((s, p) => s + (p.payment?.amount ?? 0), 0);
  return (
    <>
      <PageHeading
        eyebrow="ЛИЧНАЯ МАСТЕРСКАЯ · АЛЕКСЕЙ"
        title="У каждой пары свой план."
        text={
          "Согласуйте детали, сохраните результат и ничего не упустите. Активных пар: " +
          active
            .flatMap((o) => o.pairs)
            .filter(
              (p) =>
                p.custody !== "returned" &&
                (!p.excluded || p.custody === "workshop"),
            ).length
        }
      >
        <Badge tone="green">Мастер на связи</Badge>
      </PageHeading>
      <div className="stats-grid">
        {[
          ["Активных заказов", active.length, "all"],
          [
            "Ждут оценки",
            active.filter((o) => matches(o, "new")).length,
            "new",
          ],
          [
            "На согласовании",
            active.filter((o) => matches(o, "decision")).length,
            "decision",
          ],
          [
            "Готовы к выдаче",
            active.filter((o) => matches(o, "ready")).length,
            "ready",
          ],
        ].map(([label, value, filter]) => (
          <Link
            to={"/workshop/orders?filter=" + filter}
            className="stat-card card"
            key={label}
          >
            <span>{label}</span>
            <strong>{value}</strong>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">ПЛАН НА СЕГОДНЯ</p>
          <h2>Что требует внимания</h2>
        </div>
        <Link className="text-link" to="/workshop/orders">
          Вся очередь <ArrowUpRight size={17} />
        </Link>
      </div>
      <Queue
        orders={active
          .sort(
            (a, b) =>
              Number(b.pairs.some(overdue)) - Number(a.pairs.some(overdue)),
          )
          .slice(0, 5)}
      />
      <div className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ФИНАНСЫ · ВСЕГО ЗА ДЕМО</p>
            <h2>Прозрачная картина</h2>
          </div>
          <Badge>Без реальных списаний</Badge>
        </div>
        <div className="finance-grid">
          {[
            [
              "Согласовано",
              agreed,
              "Актуальные принятые предложения, включая завершённые работы",
            ],
            [
              "Работы готовы",
              earned,
              "Готовые пары по согласованной стоимости",
            ],
            [
              "Оплачено в демо",
              paid,
              "Успешные имитации платежей без повторного учёта",
            ],
          ].map(([title, value, description]) => (
            <section className="card form-card" key={title}>
              <p className="eyebrow">{title}</p>
              <strong className="finance-value">{money(Number(value))}</strong>
              <p className="muted text-sm">{description}</p>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
export function WorkshopOrders() {
  const orders = useLiveQuery(() => db.orders.toArray()) ?? [];
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const [filter, setFilter] = useState(
    () =>
      new URLSearchParams(location.hash.split("?")[1]).get("filter") ?? "all",
  );
  const [query, setQuery] = useState("");
  const filtered = orders
    .filter((o) => matches(o, filter))
    .filter((o) =>
      [
        o.number,
        clients.find((c) => c.id === o.clientId)?.name ?? "",
        ...o.pairs.map((p) => [p.type, p.brand, p.model].join(" ")),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => b.number.localeCompare(a.number));
  return (
    <>
      <PageHeading
        eyebrow="КАБИНЕТ МАСТЕРА"
        title="Рабочая очередь"
        text="Отдельная оценка и понятный следующий шаг для каждой пары."
      />
      <div className="queue-tools">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="Поиск заказов"
            placeholder="Номер, клиент или обувь"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className="muted text-sm">Найдено: {filtered.length}</span>
      </div>
      <div className="tabs filter-tabs">
        {filters.map(([key, label]) => (
          <button
            className={filter === key ? "active" : ""}
            key={key}
            onClick={() => setFilter(key)}
          >
            {label}{" "}
            <small>{orders.filter((o) => matches(o, key)).length}</small>
          </button>
        ))}
      </div>
      <Queue orders={filtered} />
    </>
  );
}
function Queue({ orders }: { orders: Order[] }) {
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  if (!orders.length)
    return (
      <Empty
        title="В этой очереди пока тихо"
        text="Смените фильтр или создайте заявку в роли клиента."
      />
    );
  return (
    <div className="queue">
      {orders.map((o) => (
        <Link
          to={"/workshop/orders/" + o.id}
          className="queue-row card"
          data-testid="queue-order"
          key={o.id}
        >
          <div className="queue-client">
            <span className="eyebrow">ЗАКАЗ № {o.number}</span>
            <h3>{clients.find((c) => c.id === o.clientId)?.name}</h3>
            <small>
              {date(o.createdAt)} · {o.pairs.length}{" "}
              {o.pairs.length === 1 ? "пара" : "пары"}
            </small>
          </div>
          <div className="queue-pairs">
            {o.pairs.map((p) => (
              <div className="queue-pair" key={p.id}>
                <PairThumb pair={p} />
                <div>
                  <strong>
                    {p.type}
                    {p.brand ? " · " + p.brand : ""}
                  </strong>
                  <small>{pairLabel(p)}</small>
                </div>
                {overdue(p) && (
                  <Badge tone="red">
                    <Clock3 size={12} /> Срок прошёл
                  </Badge>
                )}
                {currentDecision(p)?.status === "changes" && (
                  <Badge tone="amber">Нужны изменения</Badge>
                )}
              </div>
            ))}
          </div>
          <ArrowUpRight size={21} />
        </Link>
      ))}
    </div>
  );
}
export function WorkshopServices() {
  const services = useLiveQuery(() => db.services.toArray()) ?? [];
  const [editing, setEditing] = useState<Service>();
  const { run } = useApp();
  return (
    <>
      <PageHeading
        eyebrow="НАСТРОЙКИ МАСТЕРСКОЙ"
        title="Услуги и цены"
        text="Базовые тарифы помогают оценить заявку. Предложение можно скорректировать для конкретной пары."
      >
        <Button
          onClick={() =>
            setEditing({
              id: uid(),
              name: "",
              description: "",
              price: 240000,
              active: true,
            })
          }
        >
          <Plus size={17} /> Добавить услугу
        </Button>
      </PageHeading>
      <div className="service-admin-list">
        {services.map((s) => (
          <article className="card service-admin" key={s.id}>
            <span className="service-icon">
              <SlidersHorizontal size={22} />
            </span>
            <div>
              <h3>{s.name}</h3>
              <p className="muted">{s.description}</p>
              <Badge tone={s.active ? "green" : "neutral"}>
                {s.active ? "Доступна клиентам" : "В архиве"}
              </Badge>
            </div>
            <strong>{money(s.price)}</strong>
            <div className="service-admin-actions">
              <Button variant="secondary" onClick={() => setEditing(s)}>
                Изменить
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  void run(
                    () => db.services.update(s.id, { active: !s.active }),
                    s.active
                      ? "Услуга перемещена в архив"
                      : "Услуга восстановлена",
                  )
                }
              >
                {s.active ? <Archive size={16} /> : <Check size={16} />}{" "}
                {s.active ? "В архив" : "Восстановить"}
              </Button>
            </div>
          </article>
        ))}
      </div>
      <p className="soft-note">
        Изменение тарифа не переписывает уже опубликованные оценки. У каждого
        предложения хранится своя стоимость и состав работ.
      </p>
      {editing && (
        <ServiceEditor
          service={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
function ServiceEditor({
  service,
  onClose,
}: {
  service: Service;
  onClose: () => void;
}) {
  const [value, setValue] = useState(service);
  const { run, busy } = useApp();
  return (
    <Modal
      title={service.name ? "Изменить услугу" : "Новая услуга"}
      onClose={onClose}
    >
      <Field label="Название услуги">
        <input
          value={value.name}
          onChange={(e) => setValue({ ...value, name: e.target.value })}
        />
      </Field>
      <Field label="Описание услуги">
        <textarea
          value={value.description}
          onChange={(e) => setValue({ ...value, description: e.target.value })}
        />
      </Field>
      <Field label="Базовая цена, ₽">
        <input
          type="number"
          min="1"
          step="0.01"
          value={value.price / 100}
          onChange={(e) =>
            setValue({
              ...value,
              price: Math.round(Number(e.target.value) * 100),
            })
          }
        />
      </Field>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              if (
                !value.name.trim() ||
                !value.description.trim() ||
                !Number.isInteger(value.price) ||
                value.price <= 0
              )
                throw new Error(
                  "Укажите название, описание и цену больше нуля",
                );
              await db.services.put({
                ...value,
                name: value.name.trim(),
                description: value.description.trim(),
              });
              onClose();
            }, "Услуга сохранена")
          }
        >
          Сохранить услугу
        </Button>
      </div>
    </Modal>
  );
}
