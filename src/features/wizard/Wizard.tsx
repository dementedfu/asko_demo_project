import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Check, ArrowRight, CloudCheck } from "lucide-react";
import { db, saveDraft, commitOrder } from "../../data/db";
import { newPair } from "../../data/factories";
import type { Order, Pair } from "../../domain/model";
import { useApp } from "../../ui/context";
import {
  Button,
  Field,
  Loading,
  PageHeading,
  PairThumb,
  Confirm,
  BackLink,
  Empty,
} from "../../ui/common";
import { PhotoGallery } from "../../ui/PhotoGallery";
import { ShoeMap } from "./ShoeMap";
const materials = [
  "Кожа",
  "Замша",
  "Нубук",
  "Текстиль",
  "Синтетика",
  "Не знаю",
];
export default function Wizard() {
  const { id } = useParams();
  const source = useLiveQuery(
    async () => (await db.orders.get(id!)) ?? null,
    [id],
  );
  const { session, run, busy, notify, registerBeforeLeave } = useApp();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Order>(),
    [selected, setSelected] = useState(""),
    [step, setStep] = useState(0),
    [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved"),
    [deleting, setDeleting] = useState<string>();
  const baseRevision = useRef(0),
    queue = useRef<Promise<unknown>>(Promise.resolve());
  function persist(value: Order) {
    const job = queue.current.then(async () => {
      const saved = await saveDraft(value, session, baseRevision.current);
      baseRevision.current = saved.draftRevision ?? 0;
      return saved;
    });
    queue.current = job.catch(() => {});
    return job;
  }
  const latest = useRef<Order | undefined>(undefined),
    dirty = useRef(false),
    generation = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const unregister = registerBeforeLeave(async () => {
      if (!dirty.current || !latest.current) return;
      clearTimeout(timer.current);
      await persist(latest.current);
      dirty.current = false;
      setSaveState("saved");
    });
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      unregister();
      window.removeEventListener("beforeunload", unload);
    };
  }, [id, registerBeforeLeave]);
  useEffect(() => {
    if (source && latest.current?.id !== source.id) {
      const d = structuredClone(source);
      latest.current = d;
      setDraft(d);
      setSelected(d.pairs[0]?.id ?? "");
      baseRevision.current = d.draftRevision ?? 0;
      dirty.current = false;
    }
  }, [source]);
  useEffect(() => {
    if (!draft || !dirty.current) return;
    const version = generation.current;
    timer.current = setTimeout(() => {
      void persist(draft)
        .then(() => {
          if (version === generation.current) {
            dirty.current = false;
            setSaveState("saved");
          }
        })
        .catch((e) => {
          setSaveState("error");
          notify(e.message, true);
        });
    }, 450);
    return () => clearTimeout(timer.current);
  }, [draft, session, notify]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (dirty.current && latest.current)
        void persist(latest.current).catch((e) => notify(e.message, true));
    },
    [id],
  );
  if (source === null)
    return (
      <Empty
        title="Черновик не найден"
        text="Возможно, демо было сброшено. Вернитесь к своим заказам."
      />
    );
  if (!draft) return <Loading />;
  if (draft.clientId !== session.clientId || session.role !== "client")
    return <p>Черновик доступен его клиенту.</p>;
  if (source?.submitted)
    return (
      <div className="card">
        <h2>Заявка уже отправлена</h2>
        <Button onClick={() => navigate("/client/orders/" + id)}>
          Открыть заказ
        </Button>
      </div>
    );
  const pair = draft.pairs.find((p) => p.id === selected) ?? draft.pairs[0];
  function change(next: Order) {
    generation.current++;
    dirty.current = true;
    latest.current = next;
    setDraft(next);
    setSaveState("saving");
  }
  function patchPair(patch: Partial<Pair>) {
    change({
      ...draft!,
      pairs: draft!.pairs.map((p) =>
        p.id === pair.id ? { ...p, ...patch } : p,
      ),
    });
  }
  async function flush() {
    clearTimeout(timer.current);
    await persist(latest.current!);
    dirty.current = false;
    setSaveState("saved");
  }
  function next() {
    void run(async () => {
      if (
        step === 0 &&
        (!draft!.pairs.length ||
          draft!.pairs.some(
            (p) => !p.type || !p.color.trim() || !p.materials.length,
          ))
      )
        throw new Error(
          "Укажите тип и цвет каждой пары. Если материал неизвестен — оставьте «не знаю».",
        );
      await flush();
      setStep((s) => s + 1);
      setSelected(draft!.pairs[0]?.id ?? "");
      window.scrollTo?.({ top: 0, behavior: "smooth" });
    });
  }
  function submit() {
    void run(async () => {
      await flush();
      await commitOrder(draft!.id, { type: "submit" }, session);
      dirty.current = false;
      navigate("/client/orders/" + draft!.id);
    }, "Заявка отправлена мастеру");
  }
  return (
    <>
      <BackLink to="/client/orders">К моим заказам</BackLink>
      <PageHeading
        eyebrow={"НОВАЯ ЗАЯВКА · № " + draft.number}
        title={
          [
            "Расскажите о своей паре",
            "Что требует внимания?",
            "Как передадим обувь?",
            "Всё верно?",
          ][step]
        }
        text={
          [
            "Можно добавить несколько пар — у каждой будет своя оценка.",
            "Не нужно разбираться в материалах и пятнах. Мастер поможет уточнить.",
            "Выберите удобный способ. Время — пожелание, мастер уточнит его в переписке.",
            "Проверьте детали. Мастер изучит заявку и предложит стоимость.",
          ][step]
        }
      >
        <span className={"save-status " + saveState}>
          <CloudCheck size={15} />
          {saveState === "saved"
            ? "Сохранено"
            : saveState === "saving"
              ? "Сохраняем…"
              : "Не сохранено"}
        </span>
      </PageHeading>
      {saveState === "error" && (
        <div className="soft-note amber">
          Изменения не записаны. Проверьте доступ к хранилищу. Если черновик
          открыт в другой вкладке, сначала откройте сохранённую версию.{" "}
          <Button variant="secondary" onClick={() => location.reload()}>
            Открыть сохранённую версию
          </Button>
        </div>
      )}
      <ol className="wizard-progress">
        {["Ваша обувь", "Состояние", "Передача", "Проверка"].map((label, i) => (
          <li
            key={label}
            className={i === step ? "active" : i < step ? "done" : ""}
          >
            <span>{i < step ? <Check size={14} /> : i + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
      {(step === 0 || step === 1) && (
        <div className="pair-tabs">
          {draft.pairs.map((p, i) => (
            <button
              type="button"
              className={p.id === pair?.id ? "selected" : ""}
              key={p.id}
              onClick={() => setSelected(p.id)}
            >
              Пара {i + 1}
              <small>{p.type || "Новая пара"}</small>
            </button>
          ))}
          {step === 0 && draft.pairs.length < 5 && (
            <button
              type="button"
              className="add-pair"
              onClick={() => {
                const p = newPair();
                change({ ...draft, pairs: [...draft.pairs, p] });
                setSelected(p.id);
              }}
            >
              <Plus size={18} /> Добавить пару
            </button>
          )}
        </div>
      )}
      {step === 0 && draft.pairs.length === 5 && (
        <p className="soft-note">
          В одной заявке можно добавить не больше пяти пар. Остальные оформите
          отдельной заявкой.
        </p>
      )}
      {step === 0 && pair && (
        <div className="wizard-layout">
          <section className="card form-card">
            <div className="section-heading">
              <h2>Основные детали</h2>
              {draft.pairs.length > 1 && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Удалить пару"
                  onClick={() => setDeleting(pair.id)}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            <div className="form-grid">
              <Field label="Тип обуви">
                <select
                  value={pair.type}
                  onChange={(e) => patchPair({ type: e.target.value })}
                >
                  <option value="">Выберите тип</option>
                  {[
                    "Кроссовки",
                    "Кеды",
                    "Ботинки",
                    "Туфли",
                    "Сапоги",
                    "Другое",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Цвет">
                <input
                  value={pair.color}
                  onChange={(e) => patchPair({ color: e.target.value })}
                  placeholder="Например, молочный"
                />
              </Field>
            </div>
            <span className="field-label">Материал</span>
            <div className="chips materials">
              {materials.map((m) => (
                <button
                  type="button"
                  key={m}
                  className={
                    "chip " + (pair.materials.includes(m) ? "selected" : "")
                  }
                  aria-pressed={pair.materials.includes(m)}
                  onClick={() => {
                    const next =
                      m === "Не знаю"
                        ? ["Не знаю"]
                        : pair.materials.includes(m)
                          ? pair.materials.filter((x) => x !== m)
                          : [
                              ...pair.materials.filter((x) => x !== "Не знаю"),
                              m,
                            ];
                    patchPair({ materials: next.length ? next : ["Не знаю"] });
                  }}
                >
                  {m}
                  {pair.materials.includes(m) && <Check size={13} />}
                </button>
              ))}
            </div>
            <p className="field-hint">
              Можно выбрать несколько материалов. Если сомневаетесь — это
              нормально.
            </p>
            <div className="form-grid">
              <Field label="Бренд — необязательно">
                <input
                  value={pair.brand}
                  onChange={(e) => patchPair({ brand: e.target.value })}
                  placeholder="Если знаете"
                />
              </Field>
              <Field label="Модель — необязательно">
                <input
                  value={pair.model}
                  onChange={(e) => patchPair({ model: e.target.value })}
                  placeholder="Название или артикул"
                />
              </Field>
            </div>
            <Field label="Особенности пары">
              <input
                value={pair.features}
                onChange={(e) => patchPair({ features: e.target.value })}
                placeholder="Декор, вставки, деликатные детали"
              />
            </Field>
          </section>
          <aside className="care-aside">
            <span className="eyebrow">УХОД НАЧИНАЕТСЯ С ВНИМАНИЯ</span>
            <img src="/images/sneakers.jpg" alt="Иллюстрация ухода за обувью" />
            <h3>
              У каждой пары
              <br />
              своя история.
            </h3>
            <p>
              Мы подбираем метод после оценки материала и состояния. Стоимость
              вы согласуете с мастером заранее.
            </p>
          </aside>
        </div>
      )}
      {step === 1 && pair && (
        <div className="wizard-layout">
          <section className="card form-card">
            <ShoeMap
              issues={pair.issues}
              onChange={(issues) => patchPair({ issues })}
            />
            <Field label="Что ещё важно знать?">
              <textarea
                value={pair.condition}
                onChange={(e) => patchPair({ condition: e.target.value })}
                placeholder="Пятна, запах, следы реагентов или другие особенности"
              />
            </Field>
            <Field label="Какого результата вы ждёте?">
              <textarea
                value={pair.expectation}
                onChange={(e) => patchPair({ expectation: e.target.value })}
                placeholder="Например, освежить цвет и убрать следы прогулки"
              />
            </Field>
            <Field label="Пробовали чистить самостоятельно?">
              <input
                value={pair.previousCleaning}
                onChange={(e) =>
                  patchPair({ previousCleaning: e.target.value })
                }
                placeholder="Если да — расскажите, чем"
              />
            </Field>
          </section>
          <aside className="card form-card">
            <h2>Покажите вашу пару</h2>
            <p className="muted">
              Фотографии помогут мастеру. Если пока их нет, заявку всё равно
              можно отправить.
            </p>
            <PhotoGallery
              orderId={draft.id}
              pairId={pair.id}
              purpose="client"
              editable
            />
            <div className="soft-note">
              Опишите то, что видите. Определять причину пятна или способ чистки
              не нужно.
            </div>
          </aside>
        </div>
      )}
      {step === 2 && (
        <section className="card form-card narrow">
          <h2>Передача и возврат</h2>
          <div className="delivery-options">
            {(["self", "courier"] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                className={
                  "delivery-option " +
                  (draft.delivery.mode === mode ? "selected" : "")
                }
                onClick={() =>
                  change({ ...draft, delivery: { ...draft.delivery, mode } })
                }
              >
                <strong>
                  {mode === "self"
                    ? "Передам самостоятельно"
                    : "Демонстрационный курьер"}
                </strong>
                <span>
                  {mode === "self"
                    ? "Встречу и место уточним с мастером"
                    : "Проверим сценарий доставки без реального вызова"}
                </span>
                {draft.delivery.mode === mode && <Check size={18} />}
              </button>
            ))}
          </div>
          <Field
            label="Желаемая дата и время"
            hint="Московское время. Это пожелание, а не бронирование."
          >
            <input
              type="datetime-local"
              value={draft.delivery.window}
              onChange={(e) =>
                change({
                  ...draft,
                  delivery: { ...draft.delivery, window: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Комментарий к передаче">
            <textarea
              value={draft.delivery.note}
              onChange={(e) =>
                change({
                  ...draft,
                  delivery: { ...draft.delivery, note: e.target.value },
                })
              }
              placeholder="Когда удобнее связаться и другие пожелания"
            />
          </Field>
          <div className="soft-note">
            Доставка в этой версии эмулируется. Настоящий курьер не приедет,
            сообщения не отправляются.
          </div>
        </section>
      )}
      {step === 3 && (
        <div className="review-layout">
          <section>
            {draft.pairs.map((p, i) => (
              <div key={p.id} className="card review-pair">
                <div className="pair-summary">
                  <PairThumb pair={p} />
                  <div>
                    <span className="eyebrow">ПАРА {i + 1}</span>
                    <h2>{p.type}</h2>
                    <p className="muted">
                      {p.color} · {p.materials.join(" + ")}
                      {p.brand ? " · " + p.brand : ""}
                    </p>
                  </div>
                </div>
                <p>{p.expectation || "Пожелания уточним с мастером"}</p>
                <p className="muted text-sm">
                  {p.issues.length
                    ? `Отметок на карте: ${p.issues.length}`
                    : "Без отметок на карте"}
                  {p.condition ? " · " + p.condition : ""}
                </p>
                <PhotoGallery
                  orderId={draft.id}
                  pairId={p.id}
                  purpose="client"
                />
              </div>
            ))}
          </section>
          <aside className="card form-card review-aside">
            <h2>Что будет дальше</h2>
            <p>
              Мастер изучит вашу заявку, при необходимости задаст вопросы и
              предложит услуги, стоимость и срок для каждой пары.
            </p>
            <dl className="details-list">
              <div>
                <dt>Передача</dt>
                <dd>
                  {draft.delivery.mode === "self"
                    ? "Самостоятельно"
                    : "Демо-курьер"}
                </dd>
              </div>
              <div>
                <dt>Стоимость</dt>
                <dd>После оценки мастера</dd>
              </div>
            </dl>
            <Button disabled={busy} onClick={submit}>
              Отправить заявку <ArrowRight size={17} />
            </Button>
            <p className="field-hint">
              Отправка заявки не означает согласие на платные работы.
            </p>
          </aside>
        </div>
      )}
      <div className="wizard-bottom">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            step
              ? setStep((s) => s - 1)
              : void run(async () => {
                  await flush();
                  navigate("/client/orders");
                })
          }
        >
          {step ? "Назад" : "Сохранить и выйти"}
        </Button>
        <span className="muted text-sm">Шаг {step + 1} из 4</span>
        {step < 3 ? (
          <Button disabled={busy} onClick={next}>
            Далее <ArrowRight size={17} />
          </Button>
        ) : (
          <span />
        )}
      </div>
      {deleting && (
        <Confirm
          title="Удалить пару из черновика?"
          text="Её описание и фотографии будут удалены. Другие пары останутся."
          action="Удалить пару"
          danger
          onClose={() => setDeleting(undefined)}
          onConfirm={() => {
            const pairs = draft.pairs.filter((p) => p.id !== deleting);
            change({ ...draft, pairs });
            setSelected(pairs[0]?.id ?? "");
            setDeleting(undefined);
          }}
        />
      )}
    </>
  );
}
