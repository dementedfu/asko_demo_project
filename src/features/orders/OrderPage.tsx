import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Check,
  ArrowRight,
  MessageCircle,
  Send,
  Clock3,
  MapPin,
  Star,
  Pause,
  Play,
  PackageCheck,
  ClipboardCheck,
  CreditCard,
  Plus,
  ArrowUpRight,
  LockKeyhole,
} from "lucide-react";
import { db, commitOrder, repeatPair } from "../../data/db";
import {
  accepted,
  currentQuote,
  currentDecision,
  quoteTotal,
  orderStatus,
  pairLabel,
  actorKey,
} from "../../domain/orders";
import type {
  Order,
  Pair,
  OrderCommand,
  QuoteLine,
  Decision,
  Purpose,
} from "../../domain/model";
import { useApp } from "../../ui/context";
import {
  Button,
  Badge,
  Field,
  Modal,
  Confirm,
  Loading,
  PageHeading,
  BackLink,
  PairThumb,
  money,
  date,
  Empty,
} from "../../ui/common";
import { PhotoGallery } from "../../ui/PhotoGallery";
import { ShoeMap } from "../wizard/ShoeMap";
import { orderNames } from "../client/ClientPages";
type Action = {
  kind:
    | "quote"
    | "decision"
    | "intake"
    | "quality"
    | "pause"
    | "return"
    | "exclude"
    | "pay"
    | "eta";
  pairId: string;
  status?: Decision["status"];
  quoteId?: string;
};
export default function OrderPage() {
  const { id } = useParams();
  const [search, setSearch] = useSearchParams();
  const { session, run, busy } = useApp();
  const navigate = useNavigate();
  const order = useLiveQuery(
    async () => (await db.orders.get(id!)) ?? null,
    [id],
  );
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const [action, setAction] = useState<Action>();
  const tab = search.get("tab") ?? "pairs";
  const master = session.role === "master";
  const unread =
    order?.messages.filter((m) => !m.readBy.includes(actorKey(session)))
      .length ?? 0;
  useEffect(() => {
    if (order && tab === "messages" && unread)
      void commitOrder(order.id, { type: "read" }, session).catch(() => {});
  }, [order?.id, unread, tab, session.role, session.clientId]);
  if (order === undefined) return <Loading />;
  if (!order)
    return (
      <Empty
        title="Заказ не найден"
        text="Возможно, демо было сброшено. Откройте актуальный список заказов."
      />
    );
  if (!master && order.clientId !== session.clientId)
    return (
      <Empty
        title="Этот заказ недоступен"
        text="Выберите своего демонстрационного клиента в профиле."
      />
    );
  if (!order.submitted)
    return (
      <div className="card form-card">
        <h2>Это черновик</h2>
        <Button onClick={() => navigate("/client/orders/draft/" + order.id)}>
          Продолжить заявку
        </Button>
      </div>
    );
  const client = clients.find((c) => c.id === order.clientId);
  const status = orderStatus(order);
  const selected = order.pairs.find((p) => p.id === action?.pairId);
  const total = order.pairs.reduce(
    (sum, p) =>
      sum + (!p.excluded && accepted(p) ? quoteTotal(currentQuote(p)!) : 0),
    0,
  );
  function command(c: OrderCommand, message?: string) {
    return run(() => commitOrder(order!.id, c, session), message);
  }
  function open(kind: Action["kind"], pair: Pair, status?: Decision["status"]) {
    setAction({
      kind,
      pairId: pair.id,
      status,
      quoteId: currentQuote(pair)?.id,
    });
  }
  async function confirmCommand(c: OrderCommand) {
    const done = await command(c);
    if (done) setAction(undefined);
  }
  const root = master ? "/workshop" : "/client";
  return (
    <>
      <BackLink to={root + "/orders"}>
        {master ? "К очереди мастерской" : "К моим заказам"}
      </BackLink>
      <PageHeading
        eyebrow={
          master ? client?.name.toUpperCase() : "ВАША ПАРА В НАДЁЖНЫХ РУКАХ"
        }
        title={"Заказ № " + order.number}
        text={`${order.pairs.length} ${order.pairs.length === 1 ? "пара" : "пары"} · Создан ${date(order.createdAt)}`}
      >
        <span data-testid="order-status">
          <Badge
            tone={
              status === "completed"
                ? "green"
                : status === "cancelled"
                  ? "neutral"
                  : "amber"
            }
          >
            {orderNames[status]}
          </Badge>
        </span>
      </PageHeading>
      <div className="order-layout">
        <section>
          <div className="tabs order-tabs">
            {[
              ["pairs", "Пары и оценка"],
              ["messages", "Переписка"],
              ["history", "История"],
              ...(master ? [["notes", "Заметки мастера"]] : []),
            ].map(([value, label]) => (
              <button
                key={value}
                className={tab === value ? "active" : ""}
                onClick={() => setSearch({ tab: value })}
              >
                {label}
                {value === "messages" && unread > 0 && (
                  <span className="count-dot">{unread}</span>
                )}
              </button>
            ))}
          </div>
          {tab === "pairs" && (
            <>
              {order.pairs.map((pair, i) => (
                <PairCard
                  key={pair.id}
                  pair={pair}
                  order={order}
                  index={i}
                  onAction={open}
                  onCommand={command}
                  onRepeat={() =>
                    void run(async () => {
                      const next = await repeatPair(order.id, pair.id, session);
                      navigate("/client/orders/draft/" + next.id);
                    })
                  }
                />
              ))}
              {!master && status === "completed" && <Feedback order={order} />}
            </>
          )}
          {tab === "messages" && <Chat order={order} />}
          {tab === "history" && (
            <section className="card form-card">
              <h2>История заказа</h2>
              <div className="timeline">
                {order.events
                  .filter((e) => master || !e.private)
                  .slice()
                  .reverse()
                  .map((e) => (
                    <div className="timeline-item" key={e.id}>
                      <span className="timeline-dot" />
                      <div>
                        <strong>{e.text}</strong>
                        <p>
                          {e.actor === "master" ? "Мастер" : client?.name}
                          {e.pairId
                            ? " · пара " +
                              order.pairs.find((p) => p.id === e.pairId)?.number
                            : ""}
                        </p>
                        <small>{date(e.at, true)}</small>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}
          {tab === "notes" && master && <Notes order={order} />}
        </section>
        <aside className="order-sidebar">
          <section className="card form-card">
            <p className="eyebrow">СОГЛАСОВАННЫЕ РАБОТЫ</p>
            <div className="sidebar-total">{money(total)}</div>
            <p className="muted text-sm">
              Сумма актуальных предложений, которые принял клиент.
            </p>
            <div className="divider" />
            {order.pairs.map((p, i) => (
              <div className="sidebar-pair" key={p.id}>
                <span>{i + 1}</span>
                <div>
                  <strong>{p.type}</strong>
                  <small>{pairLabel(p)}</small>
                </div>
              </div>
            ))}
          </section>
          <section className="card form-card">
            <div className="section-heading">
              <h3>Передача обуви</h3>
              <MapPin size={18} />
            </div>
            <p>
              {order.delivery.mode === "self"
                ? "Самостоятельно"
                : "Демонстрационный курьер"}
            </p>
            {order.delivery.window && (
              <p className="muted text-sm">
                Желаемое время: {order.delivery.window.replace("T", " ")} · МСК
              </p>
            )}
            {order.delivery.note && (
              <p className="muted text-sm">{order.delivery.note}</p>
            )}
            <p className="field-hint">
              Время и место уточняются в переписке. Реальный курьер не
              вызывается.
            </p>
            <Button
              variant="secondary"
              onClick={() => setSearch({ tab: "messages" })}
            >
              <MessageCircle size={16} /> Обсудить детали
            </Button>
          </section>
        </aside>
      </div>
      {selected && action?.kind === "quote" && (
        <QuoteEditor
          key={selected.id}
          order={order}
          pair={selected}
          onClose={() => setAction(undefined)}
        />
      )}
      {selected && action?.kind === "intake" && (
        <IntakeEditor
          order={order}
          pair={selected}
          onClose={() => setAction(undefined)}
        />
      )}
      {selected && action?.kind === "quality" && (
        <QualityEditor
          order={order}
          pair={selected}
          onClose={() => setAction(undefined)}
        />
      )}
      {selected && action?.kind === "decision" && (
        <DecisionEditor
          order={order}
          pair={selected}
          quoteId={action.quoteId!}
          status={action.status!}
          onClose={() => setAction(undefined)}
        />
      )}
      {selected && action?.kind === "pause" && (
        <TextAction
          title="Приостановить работу"
          label="Причина паузы"
          action="Поставить на паузу"
          onClose={() => setAction(undefined)}
          onSave={(reason) =>
            confirmCommand({
              type: "pause",
              pairId: selected.id,
              paused: true,
              reason,
            })
          }
        />
      )}
      {selected && action?.kind === "eta" && (
        <EtaEditor
          pair={selected}
          onClose={() => setAction(undefined)}
          onSave={(eta, reason) =>
            confirmCommand({ type: "eta", pairId: selected.id, eta, reason })
          }
        />
      )}
      {selected && action?.kind === "exclude" && (
        <Confirm
          title="Исключить пару из заказа?"
          text={
            selected.custody === "workshop"
              ? "Работы не начнутся. Принятую обувь мастер должен будет вернуть. Другие пары останутся в заказе."
              : "Работы по этой паре не будут выполняться. Другие пары останутся в заказе."
          }
          action="Исключить пару"
          danger
          busy={busy}
          onClose={() => setAction(undefined)}
          onConfirm={() =>
            void confirmCommand({ type: "exclude", pairId: selected.id })
          }
        />
      )}
      {selected && action?.kind === "return" && (
        <Confirm
          title="Подтвердить возврат обуви?"
          text={
            "Подтвердите, что клиент получил пару " +
            selected.number +
            " и её комплектность проверена."
          }
          action="Вернуть пару"
          busy={busy}
          onClose={() => setAction(undefined)}
          onConfirm={() =>
            void confirmCommand({ type: "return", pairId: selected.id })
          }
        />
      )}
      {selected && action?.kind === "pay" && (
        <Modal
          title="Демонстрационная оплата"
          onClose={() => setAction(undefined)}
        >
          <div className="payment-amount">
            {money(quoteTotal(currentQuote(selected)!))}
          </div>
          <p className="modal-copy">
            Это проверка сценария. Деньги не списываются, данные карты вводить
            не нужно.
          </p>
          <div className="soft-note">
            {selected.type} · согласованная версия{" "}
            {currentQuote(selected)?.version}
          </div>
          <div className="modal-actions">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void confirmCommand({
                  type: "pay",
                  pairId: selected.id,
                  success: false,
                })
              }
            >
              Сымитировать отказ
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void confirmCommand({
                  type: "pay",
                  pairId: selected.id,
                  success: true,
                })
              }
            >
              <CreditCard size={17} /> Оплатить в демо
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function PairCard({
  pair,
  order,
  index,
  onAction,
  onCommand,
  onRepeat,
}: {
  pair: Pair;
  order: Order;
  index: number;
  onAction: (
    kind: Action["kind"],
    pair: Pair,
    status?: Decision["status"],
  ) => void;
  onCommand: (c: OrderCommand, message?: string) => Promise<unknown>;
  onRepeat: () => void;
}) {
  const { session, busy } = useApp();
  const master = session.role === "master";
  const q = currentQuote(pair);
  const d = currentDecision(pair);
  const [purpose, setPurpose] = useState<Purpose>("client");
  const label = pairLabel(pair);
  const canDecide =
    !master && !pair.excluded && pair.work === "not_started" && !!q;
  return (
    <article
      className={"card pair-card " + (pair.excluded ? "excluded" : "")}
      data-testid="pair-card"
    >
      <div className="pair-header">
        <PairThumb pair={pair} />
        <div>
          <span className="eyebrow">
            ПАРА {index + 1} · {pair.number}
          </span>
          <h2>
            {pair.type}
            {pair.brand ? " · " + pair.brand : ""}
          </h2>
          <p className="muted">
            {pair.color} · {pair.materials.join(" + ")}
            {pair.model ? " · " + pair.model : ""}
          </p>
        </div>
        <Badge
          tone={
            pair.work === "ready" || pair.custody === "returned"
              ? "green"
              : label.includes("соглас")
                ? "amber"
                : "neutral"
          }
        >
          {label}
        </Badge>
      </div>
      <details className="pair-details">
        <summary>
          Описание и фотографии <span>{pair.issues.length} отметок</span>
        </summary>
        <div className="pair-details-body">
          <dl className="details-list">
            <div>
              <dt>Пожелания</dt>
              <dd>{pair.expectation || "Уточним в переписке"}</dd>
            </div>
            <div>
              <dt>Состояние со слов клиента</dt>
              <dd>{pair.condition || "Не описано"}</dd>
            </div>
            {pair.previousCleaning && (
              <div>
                <dt>Предыдущая чистка</dt>
                <dd>{pair.previousCleaning}</dd>
              </div>
            )}
            {pair.features && (
              <div>
                <dt>Особенности</dt>
                <dd>{pair.features}</dd>
              </div>
            )}
          </dl>
          {pair.issues.length > 0 && <ShoeMap issues={pair.issues} />}
          <div className="small-tabs">
            {(["client", "intake", "result"] as const).map((p) => (
              <button
                key={p}
                className={purpose === p ? "active" : ""}
                onClick={() => setPurpose(p)}
              >
                {p === "client"
                  ? "Фото клиента"
                  : p === "intake"
                    ? "Приёмка"
                    : "Результат"}
              </button>
            ))}
          </div>
          <PhotoGallery
            orderId={order.id}
            pairId={pair.id}
            purpose={purpose}
            editable={
              master
                ? purpose !== "client" &&
                  !!pair.intake &&
                  pair.custody !== "returned"
                : purpose === "client" &&
                  pair.custody === "client" &&
                  !pair.excluded
            }
            removable={master || !order.submitted}
          />
          {pair.intake && (
            <div className="soft-note">
              <strong>Приёмка · {date(pair.intake.at)}</strong>
              <p>{pair.intake.condition}</p>
              <p>
                Комплектность:{" "}
                {pair.intake.accessories.join(", ") ||
                  "Без дополнительных предметов"}
              </p>
              {pair.expertNote && <p>Уточнение мастера: {pair.expertNote}</p>}
            </div>
          )}
        </div>
      </details>
      {q ? (
        <div className="quote-block">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ПРЕДЛОЖЕНИЕ МАСТЕРА</span>
              <h3>У вашей пары есть план.</h3>
            </div>
            <span className="quote-version">Версия {q.version}</span>
          </div>
          <div className="quote-lines">
            {q.lines.map((line, i) => (
              <div key={i}>
                <span>{line.name}</span>
                <strong>{money(line.price)}</strong>
              </div>
            ))}
          </div>
          <div className="quote-total">
            <span>За эту пару</span>
            <strong>{money(quoteTotal(q))}</strong>
          </div>
          <p className="quote-deadline">
            <Clock3 size={16} /> Готовность работ: {date(q.deadline)}
            {pair.eta && <span> · текущий прогноз: {date(pair.eta)}</span>}
          </p>
          {q.limitations && <p className="quote-limits">{q.limitations}</p>}
          {q.reason && (
            <div className="soft-note amber">
              <strong>Почему обновилась оценка</strong>
              <p>{q.reason}</p>
            </div>
          )}
          {accepted(pair) ? (
            <p className="agreement-label">
              <Check size={16} /> Клиент согласовал эту версию
            </p>
          ) : (
            d && (
              <p className="muted text-sm">
                {d.status === "declined"
                  ? "Клиент отклонил оценку"
                  : "Клиент попросил изменения"}
                {d.comment ? ": " + d.comment : ""}
              </p>
            )
          )}
          {canDecide && (
            <div className="pair-actions">
              {!accepted(pair) && (
                <Button
                  disabled={busy}
                  onClick={() => onAction("decision", pair, "accepted")}
                >
                  <Check size={17} /> Согласовать
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => onAction("decision", pair, "changes")}
              >
                Запросить изменения
              </Button>
              {!accepted(pair) && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onAction("decision", pair, "declined")}
                >
                  Отказаться
                </Button>
              )}
            </div>
          )}
          {pair.quotes.length > 1 && (
            <details className="quote-history">
              <summary>Предыдущие версии ({pair.quotes.length - 1})</summary>
              {pair.quotes
                .slice(0, -1)
                .reverse()
                .map((old) => (
                  <div key={old.id}>
                    <strong>
                      Версия {old.version} · {money(quoteTotal(old))}
                    </strong>
                    <p>
                      {old.lines.map((l) => l.name).join(", ")} ·{" "}
                      {date(old.deadline)}
                    </p>
                    <small>
                      {pair.decisions.filter((x) => x.quoteId === old.id).at(-1)
                        ?.status === "accepted"
                        ? "Была согласована"
                        : "Архивная оценка"}{" "}
                      · {date(old.at, true)}
                    </small>
                  </div>
                ))}
            </details>
          )}
        </div>
      ) : (
        !pair.excluded && (
          <div className="quote-pending">
            <ClipboardCheck size={23} />
            <div>
              <h3>
                {master
                  ? "Пара ждёт вашей оценки"
                  : "Мастер знакомится с вашей парой"}
              </h3>
              <p>
                Состав работ, стоимость и срок будут согласованы до начала
                чистки.
              </p>
            </div>
          </div>
        )
      )}
      {pair.work === "ready" && (
        <div className="result-note">
          <Check size={19} />
          <div>
            <strong>Пара готова</strong>
            <p>{pair.resultNote}</p>
            {pair.careNote && (
              <p className="muted">
                <strong>Уход дома:</strong> {pair.careNote}
              </p>
            )}
          </div>
        </div>
      )}
      {pair.paused && (
        <div className="soft-note amber">
          <strong>Пауза в работе</strong>
          <p>{pair.pauseReason}</p>
        </div>
      )}
      <div className="pair-actions bottom-actions">
        {master ? (
          <>
            {!pair.excluded && pair.work === "not_started" && (
              <Button
                variant={q ? "secondary" : "primary"}
                disabled={busy}
                onClick={() => onAction("quote", pair)}
              >
                {q ? "Пересмотреть оценку" : "Оценить пару"}{" "}
                <ArrowUpRight size={16} />
              </Button>
            )}
            {!pair.excluded && pair.custody === "client" && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => onAction("intake", pair)}
              >
                <PackageCheck size={16} /> Принять обувь
              </Button>
            )}
            {!pair.excluded &&
              pair.custody === "workshop" &&
              pair.work === "not_started" && (
                <Button
                  disabled={busy || !accepted(pair)}
                  title={!accepted(pair) ? "Нужно согласие клиента" : ""}
                  onClick={() =>
                    void onCommand({ type: "start", pairId: pair.id })
                  }
                >
                  <Play size={16} /> Начать работу
                </Button>
              )}
            {pair.work === "in_progress" && (
              <>
                {pair.paused ? (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      void onCommand({
                        type: "pause",
                        pairId: pair.id,
                        paused: false,
                        reason: "",
                      })
                    }
                  >
                    <Play size={16} /> Возобновить
                  </Button>
                ) : (
                  <>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void onCommand({ type: "quality", pairId: pair.id })
                      }
                    >
                      <ClipboardCheck size={16} /> Передать на контроль
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => onAction("pause", pair)}
                    >
                      <Pause size={16} /> Пауза
                    </Button>
                  </>
                )}
              </>
            )}
            {pair.work === "quality" && (
              <Button disabled={busy} onClick={() => onAction("quality", pair)}>
                Завершить контроль <Check size={17} />
              </Button>
            )}
            {["in_progress", "quality"].includes(pair.work) && (
              <Button variant="ghost" onClick={() => onAction("eta", pair)}>
                Уточнить прогноз
              </Button>
            )}
            {pair.custody === "workshop" &&
              (pair.excluded || pair.work === "ready") && (
                <Button
                  disabled={busy || (!pair.excluded && !pair.payment)}
                  onClick={() => onAction("return", pair)}
                >
                  Подтвердить возврат <ArrowRight size={17} />
                </Button>
              )}
          </>
        ) : (
          <>
            {!pair.excluded && pair.work === "ready" && !pair.payment && (
              <Button disabled={busy} onClick={() => onAction("pay", pair)}>
                <CreditCard size={17} /> Демо-оплата
              </Button>
            )}
            {!pair.excluded && pair.work === "not_started" && (
              <Button variant="ghost" onClick={() => onAction("exclude", pair)}>
                Исключить пару
              </Button>
            )}
            {pair.custody === "returned" && !pair.excluded && (
              <Button variant="secondary" disabled={busy} onClick={onRepeat}>
                Заказать уход снова <ArrowUpRight size={17} />
              </Button>
            )}
          </>
        )}
        {pair.payment && (
          <span className="agreement-label">
            <Check size={15} /> Оплачено в демо · {money(pair.payment.amount)}
          </span>
        )}
      </div>
    </article>
  );
}
function QuoteEditor({
  order,
  pair,
  onClose,
}: {
  order: Order;
  pair: Pair;
  onClose: () => void;
}) {
  const { session, run, busy } = useApp();
  const services =
    useLiveQuery(() => db.services.filter((s) => s.active).toArray()) ?? [];
  const base = useRef(currentQuote(pair)).current;
  const initialized = useRef(!!base);
  const [lines, setLines] = useState<QuoteLine[]>(
    base ? structuredClone(base.lines) : [],
  );
  const future = new Date();
  future.setDate(future.getDate() + 3);
  const [deadline, setDeadline] = useState(
      base?.deadline ?? future.toISOString().slice(0, 10),
    ),
    [limitations, setLimitations] = useState(
      base?.limitations ??
        "Следы естественного износа могут сохраниться. Результат уточним после приёмки.",
    ),
    [reason, setReason] = useState("");
  useEffect(() => {
    if (!initialized.current && services.length) {
      const s =
        services.find(
          (s) =>
            s.id === (pair.materials.includes("Замша") ? "suede" : "clean"),
        ) ?? services[0];
      setLines([{ serviceId: s.id, name: s.name, price: s.price }]);
      initialized.current = true;
    }
  }, [services, pair.materials]);
  function save() {
    void run(async () => {
      await commitOrder(
        order.id,
        {
          type: "quote",
          pairId: pair.id,
          expectedQuoteId: base?.id,
          lines,
          deadline,
          limitations,
          reason,
        },
        session,
      );
      onClose();
    }, "Предложение отправлено клиенту");
  }
  return (
    <Modal
      title={base ? "Пересмотреть оценку" : "Оценить пару"}
      onClose={onClose}
      wide
    >
      <p className="muted">
        {pair.type} · пара {pair.number}. Клиент увидит предложение после
        публикации.
      </p>
      <div className="service-choices">
        {services.map((s) => (
          <label key={s.id}>
            <input
              type="checkbox"
              checked={lines.some((l) => l.serviceId === s.id)}
              onChange={(e) =>
                setLines(
                  e.target.checked
                    ? [
                        ...lines,
                        { serviceId: s.id, name: s.name, price: s.price },
                      ]
                    : lines.filter((l) => l.serviceId !== s.id),
                )
              }
            />
            <div>
              <strong>{s.name}</strong>
              <small>{s.description}</small>
            </div>
            <span>{money(s.price)}</span>
          </label>
        ))}
      </div>
      <div className="form-grid">
        {lines.map((line, i) => (
          <Field key={line.serviceId} label={"Стоимость: " + line.name}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={line.price / 100}
              onChange={(e) =>
                setLines(
                  lines.map((l, j) =>
                    j === i
                      ? {
                          ...l,
                          price: Math.round(Number(e.target.value) * 100),
                        }
                      : l,
                  ),
                )
              }
            />
          </Field>
        ))}
      </div>
      <div className="quote-total">
        <span>Итого за пару</span>
        <strong>{money(lines.reduce((s, l) => s + l.price, 0))}</strong>
      </div>
      <Field label="Дата готовности работ">
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </Field>
      <Field label="Возможный результат и ограничения">
        <textarea
          value={limitations}
          onChange={(e) => setLimitations(e.target.value)}
        />
      </Field>
      {base && (
        <Field label="Причина пересмотра">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Что обнаружилось или изменилось?"
          />
        </Field>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button disabled={busy || !lines.length} onClick={save}>
          Отправить предложение <ArrowRight size={17} />
        </Button>
      </div>
    </Modal>
  );
}
function DecisionEditor({
  order,
  pair,
  quoteId,
  status,
  onClose,
}: {
  order: Order;
  pair: Pair;
  quoteId: string;
  status: Decision["status"];
  onClose: () => void;
}) {
  const { session, run, busy } = useApp();
  const [comment, setComment] = useState("");
  const q = pair.quotes.find((q) => q.id === quoteId)!;
  return (
    <Modal
      title={
        status === "accepted"
          ? "Согласовать предложение?"
          : status === "declined"
            ? "Отказаться от оценки"
            : "Что нужно изменить?"
      }
      onClose={onClose}
    >
      <div className="soft-note">
        <strong>
          {pair.type} · версия {q.version} · {money(quoteTotal(q))}
        </strong>
        <p>{q.lines.map((l) => l.name).join(" + ")}</p>
        <p>Готовность: {date(q.deadline)}</p>
        {q.limitations && <p>{q.limitations}</p>}
      </div>
      <Field label="Комментарий мастеру">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Необязательно"
        />
      </Field>
      <p className="field-hint">
        {status === "accepted"
          ? "Вы согласуете именно эту версию. Изменение цены потребует нового согласия."
          : "Другие пары не изменятся. Отказ от оценки не исключает пару автоматически."}
      </p>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Назад
        </Button>
        <Button
          disabled={busy}
          onClick={() =>
            void run(
              async () => {
                await commitOrder(
                  order.id,
                  {
                    type: "decision",
                    pairId: pair.id,
                    quoteId,
                    status,
                    comment,
                  },
                  session,
                );
                onClose();
              },
              status === "accepted"
                ? "Предложение согласовано"
                : "Решение отправлено мастеру",
            )
          }
        >
          {status === "accepted"
            ? "Подтвердить согласие"
            : status === "declined"
              ? "Отправить отказ"
              : "Запросить изменения"}
        </Button>
      </div>
    </Modal>
  );
}
function IntakeEditor({
  order,
  pair,
  onClose,
}: {
  order: Order;
  pair: Pair;
  onClose: () => void;
}) {
  const { session, run, busy } = useApp();
  const [condition, setCondition] = useState(pair.condition),
    [expertNote, setExpertNote] = useState(""),
    [accessories, setAccessories] = useState<string[]>(["Шнурки", "Стельки"]);
  return (
    <Modal title="Принять обувь" onClose={onClose}>
      <p className="muted">
        Фиксируем фактическое получение пары {pair.number}. Это не заменяет
        согласие на работы.
      </p>
      <Field label="Состояние при приёмке">
        <textarea
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        />
      </Field>
      <Field label="Уточнение мастера">
        <textarea
          value={expertNote}
          onChange={(e) => setExpertNote(e.target.value)}
          placeholder="Материал, особенности, обнаруженные отличия"
        />
      </Field>
      <span className="field-label">Комплектность</span>
      <div className="chips">
        {["Шнурки", "Стельки", "Коробка", "Другое"].map((a) => (
          <button
            type="button"
            key={a}
            className={"chip " + (accessories.includes(a) ? "selected" : "")}
            aria-pressed={accessories.includes(a)}
            onClick={() =>
              setAccessories(
                accessories.includes(a)
                  ? accessories.filter((x) => x !== a)
                  : [...accessories, a],
              )
            }
          >
            {a}
          </button>
        ))}
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await commitOrder(
                order.id,
                {
                  type: "intake",
                  pairId: pair.id,
                  condition,
                  accessories,
                  expertNote,
                },
                session,
              );
              onClose();
            }, "Приёмка зафиксирована")
          }
        >
          Подтвердить приёмку
        </Button>
      </div>
    </Modal>
  );
}
function QualityEditor({
  order,
  pair,
  onClose,
}: {
  order: Order;
  pair: Pair;
  onClose: () => void;
}) {
  const { session, run, busy } = useApp();
  const [pass, setPass] = useState(true),
    [note, setNote] = useState("Работы выполнены. Результат проверен."),
    [care, setCare] = useState(
      "Сушите при комнатной температуре. Не используйте батарею и агрессивные средства.",
    );
  return (
    <Modal title="Контроль качества" onClose={onClose}>
      <div className="chips">
        <button
          className={"chip " + (pass ? "selected" : "")}
          onClick={() => setPass(true)}
        >
          Всё в порядке
        </button>
        <button
          className={"chip " + (!pass ? "selected" : "")}
          onClick={() => {
            setPass(false);
            setNote("");
          }}
        >
          Нужна доработка
        </button>
      </div>
      <Field label={pass ? "Результат работы" : "Причина доработки"}>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {pass && (
        <Field label="Рекомендации по уходу">
          <textarea value={care} onChange={(e) => setCare(e.target.value)} />
        </Field>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await commitOrder(
                order.id,
                { type: "qualityResult", pairId: pair.id, pass, note, care },
                session,
              );
              onClose();
            })
          }
        >
          {pass ? "Пара готова" : "Отправить на доработку"}
        </Button>
      </div>
    </Modal>
  );
}
function TextAction({
  title,
  label,
  action,
  onClose,
  onSave,
}: {
  title: string;
  label: string;
  action: string;
  onClose: () => void;
  onSave: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const { busy } = useApp();
  return (
    <Modal title={title} onClose={onClose}>
      <Field label={label}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button disabled={busy} onClick={() => void onSave(text)}>
          {action}
        </Button>
      </div>
    </Modal>
  );
}
function EtaEditor({
  pair,
  onClose,
  onSave,
}: {
  pair: Pair;
  onClose: () => void;
  onSave: (eta: string, reason: string) => Promise<void>;
}) {
  const [eta, setEta] = useState(
      pair.eta ?? currentQuote(pair)?.deadline ?? "",
    ),
    [reason, setReason] = useState("");
  const { busy } = useApp();
  return (
    <Modal title="Обновить прогноз готовности" onClose={onClose}>
      <p className="muted">
        Изначально обещанный срок останется в истории. Клиент увидит новый
        прогноз и причину.
      </p>
      <Field label="Новый прогноз">
        <input
          type="date"
          value={eta}
          onChange={(e) => setEta(e.target.value)}
        />
      </Field>
      <Field label="Причина изменения прогноза">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="modal-actions">
        <Button disabled={busy} onClick={() => void onSave(eta, reason)}>
          Сохранить прогноз
        </Button>
      </div>
    </Modal>
  );
}
function Chat({ order }: { order: Order }) {
  const { session, run, busy } = useApp();
  const [text, setText] = useState(""),
    [pairId, setPairId] = useState("");
  return (
    <section className="card chat">
      <header>
        <MessageCircle size={20} />
        <div>
          <h2>
            {session.role === "client"
              ? "На связи с мастером"
              : "Переписка с клиентом"}
          </h2>
          <p>Сообщения сохраняются внутри этого демо</p>
        </div>
      </header>
      <div className="chat-messages">
        {order.messages.length ? (
          order.messages.map((m) => (
            <div
              className={
                "chat-bubble " + (m.actor === actorKey(session) ? "own" : "")
              }
              key={m.id}
            >
              <span>
                {m.role === "master" ? "Алексей · мастер" : "Клиент"}
                {m.pairId
                  ? " · пара " +
                    order.pairs.find((p) => p.id === m.pairId)?.number
                  : ""}
              </span>
              <p>{m.text}</p>
              <small>
                {date(m.at, true)} ·{" "}
                {m.readBy.length > 1 ? "Прочитано" : "Сохранено"}
              </small>
            </div>
          ))
        ) : (
          <Empty
            title="Начните с вопроса"
            text="Обсудите состояние обуви, состав работ или удобное время передачи."
          />
        )}
      </div>
      <form
        className="chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await commitOrder(
              order.id,
              { type: "message", text, pairId: pairId || undefined },
              session,
            );
            setText("");
          });
        }}
      >
        <Field label="Сообщение">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напишите пару слов…"
            disabled={busy}
          />
        </Field>
        <div className="inline-between">
          <select
            aria-label="Сообщение относится к"
            value={pairId}
            onChange={(e) => setPairId(e.target.value)}
          >
            <option value="">Весь заказ</option>
            {order.pairs.map((p, i) => (
              <option key={p.id} value={p.id}>
                Пара {i + 1} · {p.type}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={busy || !text.trim()}>
            Отправить <Send size={16} />
          </Button>
        </div>
      </form>
    </section>
  );
}
function Notes({ order }: { order: Order }) {
  const { session, run, busy } = useApp();
  const [text, setText] = useState("");
  return (
    <section className="card form-card">
      <div className="section-heading">
        <h2>Рабочие заметки</h2>
        <LockKeyhole size={20} />
      </div>
      <p className="muted text-sm">
        Эти записи не показываются в клиентском интерфейсе.
      </p>
      {order.notes.map((n) => (
        <div className="internal-note" key={n.id}>
          <p>{n.text}</p>
          <small>{date(n.at, true)}</small>
        </div>
      ))}
      <Field label="Внутренняя заметка">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Детали, которые важно помнить мастеру"
        />
      </Field>
      <Button
        disabled={busy || !text.trim()}
        onClick={() =>
          void run(async () => {
            await commitOrder(order.id, { type: "note", text }, session);
            setText("");
          }, "Заметка сохранена")
        }
      >
        <Plus size={16} /> Сохранить заметку
      </Button>
    </section>
  );
}
function Feedback({ order }: { order: Order }) {
  const { session, run, busy } = useApp();
  const [rating, setRating] = useState(order.feedback?.rating ?? 5),
    [text, setText] = useState(order.feedback?.text ?? "");
  return (
    <section className="card form-card feedback">
      <span className="eyebrow">СПАСИБО ЗА ДОВЕРИЕ</span>
      <h2>Как чувствует себя ваша пара?</h2>
      <p className="muted">
        Расскажите о результате — это помогает нам становиться лучше.
      </p>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            aria-label={"Оценка " + n}
            aria-pressed={rating === n}
            key={n}
            onClick={() => setRating(n)}
          >
            <Star size={28} fill={n <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <Field label="Ваш отзыв">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Что особенно понравилось?"
        />
      </Field>
      <Button
        disabled={busy}
        onClick={() =>
          void run(
            () =>
              commitOrder(
                order.id,
                { type: "feedback", rating, text },
                session,
              ),
            "Спасибо! Отзыв сохранён",
          )
        }
      >
        {order.feedback ? "Обновить отзыв" : "Оставить отзыв"}
      </Button>
    </section>
  );
}
