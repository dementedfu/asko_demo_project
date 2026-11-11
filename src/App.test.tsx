import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { db, initializeDemo } from "./data/db";
import * as repository from "./data/db";
beforeEach(async () => {
  localStorage.clear();
  window.location.hash = "#/client";
  await db.delete();
  await db.open();
  await initializeDemo();
});
it("shows mobile client home and persists a multi-pair draft with unknown material", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole("button", { name: "Рассказать о своей паре" }),
  );
  await user.selectOptions(
    await screen.findByLabelText("Тип обуви"),
    "Кроссовки",
  );
  await user.type(screen.getByLabelText("Цвет"), "Белый");
  await user.click(screen.getByRole("button", { name: "Добавить пару" }));
  await user.selectOptions(screen.getByLabelText("Тип обуви"), "Ботинки");
  await user.type(screen.getByLabelText("Цвет"), "Чёрный");
  await waitFor(
    async () => {
      const drafts = (await db.orders.toArray()).filter(
        (o) => !o.submitted && o.clientId === "anna",
      );
      expect(
        drafts.some(
          (d) =>
            d.pairs.length === 2 &&
            d.pairs[1].color === "Чёрный" &&
            d.pairs[0].materials.includes("Не знаю"),
        ),
      ).toBe(true);
    },
    { timeout: 5000 },
  );
});
it("allows master quote and client acceptance on same saved order", async () => {
  const o = (await db.orders.toArray()).find((o) => o.number === "024")!;
  window.location.hash = "#/workshop/orders/" + o.id;
  localStorage.setItem(
    "dp-session",
    JSON.stringify({ role: "master", clientId: "anna" }),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Оценить пару" }));
  await screen.findByLabelText("Стоимость: Комплексная чистка");
  await user.click(
    screen.getByRole("button", { name: "Отправить предложение" }),
  );
  await waitFor(async () =>
    expect((await db.orders.get(o.id))?.pairs[0].quotes.length).toBe(1),
  );
  await user.click(screen.getByRole("button", { name: "Клиент" }));
  window.location.hash = "#/client/orders/" + o.id;
  await user.click(await screen.findByRole("button", { name: "Согласовать" }));
  await user.click(
    screen.getByRole("button", { name: "Подтвердить согласие" }),
  );
  await waitFor(async () =>
    expect((await db.orders.get(o.id))?.pairs[0].decisions.at(-1)?.status).toBe(
      "accepted",
    ),
  );
});

it("keeps unsaved form open when Save and exit cannot persist it", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole("button", { name: "Рассказать о своей паре" }),
  );
  await user.type(await screen.findByLabelText("Цвет"), "Черновик");
  vi.spyOn(repository, "saveDraft").mockRejectedValue(
    new Error("Недостаточно места"),
  );
  await user.click(screen.getByRole("button", { name: "Сохранить и выйти" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Недостаточно места",
  );
  expect(screen.getByLabelText("Цвет")).toHaveValue("Черновик");
});
