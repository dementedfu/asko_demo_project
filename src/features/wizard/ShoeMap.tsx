import { useState, useId } from "react";
import { Plus, Trash2, PencilLine, Check } from "lucide-react";
import type { Issue } from "../../domain/model";
import { Button, Field } from "../../ui/common";
const zones = ["Верх", "Носок", "Пятка", "Подошва", "Внутри"];
const points: Record<string, [number, number]> = {
  Верх: [175, 111],
  Носок: [278, 145],
  Пятка: [72, 106],
  Подошва: [183, 161],
  Внутри: [108, 45],
};
const sides = { both: "Оба", left: "Левый", right: "Правый" };
const paths: Record<string, string> = {
  Верх: "M100 65l55-27 85 60 21 31-30 24-110-20-20-30z",
  Носок: "M245 101q36 23 63 28 24 7 17 21-25 14-82 7l-11-26z",
  Пятка: "M43 70l29-30 27 29 18 56-13 17-63-11-2-22z",
  Подошва: "M40 131l87 9 109 17 87-13-1 19-30 9-92-1-109-14-49-12z",
  Внутри: "M76 45q-8-19 20-14l59 7-47 29-18 20z",
};
export function ShoeMap({
  issues,
  onChange,
}: {
  issues: Issue[];
  onChange?: (issues: Issue[]) => void;
}) {
  const id = useId().replace(/:/g, "");
  const [zone, setZone] = useState("Носок"),
    [side, setSide] = useState<Issue["side"]>("both"),
    [category, setCategory] = useState<Issue["category"]>("dirt"),
    [severity, setSeverity] = useState<1 | 2 | 3>(2),
    [kind, setKind] = useState("Повседневное загрязнение"),
    [comment, setComment] = useState(""),
    [editing, setEditing] = useState<string>();
  function edit(issue: Issue) {
    setZone(issue.zone);
    setSide(issue.side);
    setCategory(issue.category);
    setSeverity(issue.severity);
    setKind(issue.kind);
    setComment(issue.comment);
    setEditing(issue.id);
  }
  function save() {
    if (!onChange) return;
    const mark: Issue = {
      id: editing ?? crypto.randomUUID(),
      zone,
      side,
      category,
      severity,
      kind: kind || "Не знаю",
      comment,
    };
    onChange(
      editing
        ? issues.map((i) => (i.id === editing ? mark : i))
        : [...issues, mark],
    );
    setEditing(undefined);
    setComment("");
  }
  return (
    <div className="shoe-map">
      <div className="shoe-map-top">
        <span className="eyebrow">КАРТА СОСТОЯНИЯ</span>
        <span className="muted text-sm">Каждая деталь поможет мастеру</span>
      </div>
      <div className="shoe-drawing">
        <svg
          viewBox="0 0 360 200"
          role="img"
          aria-label={"Схема обуви: " + sides[side] + ", " + zone}
        >
          <defs>
            <linearGradient id={id} x2="0.2" y2="1">
              <stop stopColor="#f4f2e9" />
              <stop offset="1" stopColor="#d0d3c4" />
            </linearGradient>
          </defs>
          <ellipse
            cx="180"
            cy="172"
            rx="145"
            ry="11"
            fill="#34482b"
            opacity=".08"
          />
          <path
            d="M40 132q-8-34 4-63l28-29q8-9 19 0l19 23 46-26q13-4 21 9l26 25 45 30q25 18 60 28 22 6 17 23l-32 17-94 1-109-13-49-12z"
            fill={"url(#" + id + ")"}
            stroke="#a7ae97"
            strokeWidth="1.5"
          />
          <path
            d="M42 135l90 9 98 14 94-12-2 18-29 10-96-2-108-14-46-13z"
            fill="#d3c6a5"
            stroke="#aa9e80"
          />
          <path
            d="M50 70l24-25 16 19 10 37-25-10-32 14zM116 96l41 19 39-3-24 17-27-1-34-19z"
            fill="#7b896a"
          />
          <path
            d="M117 61l67 48 18-20-66-43z"
            fill="#e8e8db"
            stroke="#a9b097"
          />
          <path
            d="M131 60l26-6m-16 13 26-6m-16 13 26-6m-16 13 26-6m-16 13 26-6"
            stroke="#fffdf3"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M242 111q35 24 64 26M50 121l27 6 29-3M113 133l113 20"
            fill="none"
            stroke="#a7ad99"
            strokeDasharray="3 3"
          />
          {zones.map((z) => (
            <path
              key={z}
              d={paths[z]}
              fill={z === zone ? "#6a8346" : "transparent"}
              opacity={z === zone ? 0.32 : 0.01}
              stroke={z === zone ? "#435937" : "transparent"}
              strokeWidth="2"
              onClick={() => setZone(z)}
              className={onChange ? "map-hit" : ""}
            >
              <title>{z}</title>
            </path>
          ))}
          {issues.map((issue, i) => {
            const [x, y] = points[issue.zone] ?? [180, 100];
            return (
              <g
                key={issue.id}
                transform={`translate(${x + (i % 3) * 8} ${y - (i % 2) * 9})`}
              >
                <title>
                  {sides[issue.side] + " · " + issue.zone + " · " + issue.kind}
                </title>
                <circle
                  r="10"
                  fill={issue.category === "dirt" ? "#647f43" : "#aa7150"}
                  stroke="#fffdf2"
                  strokeWidth="2"
                />
                <text y="3.5" textAnchor="middle" fill="white" fontSize="10">
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
        <span className="drawing-label">
          {sides[side]} · {zone}
        </span>
      </div>
      {onChange && (
        <>
          <div className="chips" aria-label="Сторона обуви">
            {(Object.keys(sides) as Issue["side"][]).map((s) => (
              <button
                type="button"
                key={s}
                className={"chip " + (side === s ? "selected" : "")}
                aria-pressed={side === s}
                onClick={() => setSide(s)}
              >
                {sides[s]}
              </button>
            ))}
          </div>
          <Field label="Зона обуви">
            <select value={zone} onChange={(e) => setZone(e.target.value)}>
              {zones.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </Field>
          <div className="chips" aria-label="Категория проблемы">
            {(["dirt", "damage"] as const).map((c) => (
              <button
                type="button"
                key={c}
                className={"chip " + (category === c ? "selected" : "")}
                aria-pressed={category === c}
                onClick={() => {
                  setCategory(c);
                  setKind(
                    c === "dirt" ? "Повседневное загрязнение" : "Потёртость",
                  );
                }}
              >
                {c === "dirt" ? "Загрязнение" : "Повреждение"}
              </button>
            ))}
          </div>
          <Field label="Что заметили?">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {(category === "dirt"
                ? [
                    "Повседневное загрязнение",
                    "Пыль и грязь",
                    "Следы реагентов",
                    "Жирное пятно",
                    "Запах",
                    "Другое",
                    "Не знаю",
                  ]
                : [
                    "Потёртость",
                    "Царапина",
                    "Трещина",
                    "Изменение цвета",
                    "Другое",
                    "Не знаю",
                  ]
              ).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <span className="field-label">Насколько заметно?</span>
          <div className="severity">
            {(["Лёгкое", "Заметное", "Сильное"] as const).map((label, i) => (
              <button
                type="button"
                key={label}
                className={severity === i + 1 ? "selected" : ""}
                onClick={() => setSeverity((i + 1) as 1 | 2 | 3)}
                aria-pressed={severity === i + 1}
              >
                <span
                  aria-hidden="true"
                  className={"severity-dots level-" + (i + 1)}
                >
                  ● ● ●
                </span>
                {label}
              </button>
            ))}
          </div>
          <Field label="Комментарий к отметке">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например, пятно появилось после дождя"
            />
          </Field>
          <Button variant="secondary" onClick={save}>
            {editing ? <Check size={16} /> : <Plus size={16} />}{" "}
            {editing ? "Сохранить отметку" : "Добавить отметку"}
          </Button>
        </>
      )}
      {issues.length > 0 && (
        <div className="issue-list">
          {issues.map((issue) => (
            <div className="issue-item" key={issue.id}>
              <span className={"issue-dot " + issue.category} />
              <div>
                <strong>
                  {sides[issue.side]} · {issue.zone} ·{" "}
                  {issue.category === "dirt" ? "Загрязнение" : "Повреждение"}
                </strong>
                <small>
                  {issue.kind} ·{" "}
                  {["Лёгкое", "Заметное", "Сильное"][issue.severity - 1]}
                  {issue.comment ? " · " + issue.comment : ""}
                </small>
              </div>
              {onChange && (
                <>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Редактировать отметку"
                    onClick={() => edit(issue)}
                  >
                    <PencilLine size={16} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Удалить отметку"
                    onClick={() =>
                      onChange(issues.filter((i) => i.id !== issue.id))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
