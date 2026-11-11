import { test, expect, type Page } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
async function init(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Любимой паре — новая история." }),
  ).toBeVisible();
}
async function role(page: Page, role: string) {
  await button(page, role).click();
}
async function route(page: Page, hash: string) {
  await page.evaluate((hash) => {
    location.hash = hash;
  }, hash);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("two pairs: independent decisions, revised consent, intake, QC, payment and return", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await init(page);
  await button(page, "Рассказать о своей паре").click();
  await page.getByLabel("Тип обуви", { exact: true }).selectOption("Кроссовки");
  await page.getByLabel("Цвет", { exact: true }).fill("Белый");
  await button(page, "Добавить пару").click();
  await page.getByLabel("Тип обуви", { exact: true }).selectOption("Ботинки");
  await page.getByLabel("Цвет", { exact: true }).fill("Чёрный");
  await button(page, "Далее").click();
  await button(page, "Правый").click();
  await page.getByLabel("Зона обуви", { exact: true }).selectOption("Носок");
  await button(page, "Повреждение").click();
  await button(page, "Сильное").click();
  await button(page, "Добавить отметку").click();
  await expect(
    page.getByText("Правый · Носок · Повреждение", { exact: true }),
  ).toBeVisible();
  await button(page, "Далее").click();
  await page.getByLabel("Желаемая дата и время").fill("2026-12-15T14:00");
  await button(page, "Далее").click();
  await button(page, "Отправить заявку").click();
  await expect(
    page.getByRole("heading", { name: "Заказ № 033" }),
  ).toBeVisible();
  const id = new URL(page.url()).hash.split("/").at(-1)!;
  await role(page, "Мастер");
  await route(page, "/workshop/orders/" + id);
  let cards = page.getByTestId("pair-card");
  for (let i = 0; i < 2; i++) {
    await cards
      .nth(i)
      .getByRole("button", { name: "Оценить пару", exact: true })
      .click();
    await button(page, "Отправить предложение").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await button(page, "Заметки мастера").click();
  await page
    .getByLabel("Внутренняя заметка")
    .fill("Только мастер видит эту запись");
  await button(page, "Сохранить заметку").click();
  await expect(
    page.getByText("Только мастер видит эту запись", { exact: true }),
  ).toBeVisible();
  await button(page, "Переписка").click();
  await page
    .getByLabel("Сообщение", { exact: true })
    .fill("Уточним особенности материала перед чисткой");
  await button(page, "Отправить").click();
  await role(page, "Клиент");
  await route(page, "/client/orders/" + id + "?tab=messages");
  await expect(
    page.getByText("Уточним особенности материала перед чисткой", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/Прочитано/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Уточним особенности материала перед чисткой", {
      exact: true,
    }),
  ).toBeVisible();
  await button(page, "Пары и оценка").click();
  cards = page.getByTestId("pair-card");
  await cards
    .nth(0)
    .getByRole("button", { name: "Согласовать", exact: true })
    .click();
  await button(page, "Подтвердить согласие").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await cards
    .nth(1)
    .getByRole("button", { name: "Отказаться", exact: true })
    .click();
  await button(page, "Отправить отказ").click();
  await expect(cards.nth(1)).toContainText("Клиент отклонил оценку");
  await cards
    .nth(1)
    .getByRole("button", { name: "Исключить пару", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Исключить пару", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await button(page, "История").click();
  await expect(
    page.getByText("Только мастер видит эту запись", { exact: true }),
  ).toHaveCount(0);
  await role(page, "Мастер");
  await route(page, "/workshop/orders/" + id);
  cards = page.getByTestId("pair-card");
  await cards
    .nth(0)
    .getByRole("button", { name: "Принять обувь", exact: true })
    .click();
  await page
    .getByLabel("Состояние при приёмке")
    .fill("Износ носка и загрязнение подошвы");
  await button(page, "Подтвердить приёмку").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await cards
    .nth(0)
    .getByRole("button", { name: "Пересмотреть оценку" })
    .click();
  await page
    .getByLabel("Причина пересмотра")
    .fill("Уточнили материал при приёмке");
  await button(page, "Отправить предложение").click();
  await expect(
    cards.nth(0).getByRole("button", { name: "Начать работу" }),
  ).toBeDisabled();
  await role(page, "Клиент");
  await route(page, "/client/orders/" + id);
  await page
    .getByTestId("pair-card")
    .nth(0)
    .getByRole("button", { name: "Согласовать", exact: true })
    .click();
  await button(page, "Подтвердить согласие").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await role(page, "Мастер");
  await route(page, "/workshop/orders/" + id);
  await button(page, "Начать работу").click();
  await button(page, "Пауза").click();
  await page.getByLabel("Причина паузы").fill("Сушка материала");
  await button(page, "Поставить на паузу").click();
  await button(page, "Возобновить").click();
  await button(page, "Передать на контроль").click();
  await button(page, "Завершить контроль").click();
  await button(page, "Нужна доработка").click();
  await page.getByLabel("Причина доработки").fill("Повторная обработка носка");
  await button(page, "Отправить на доработку").click();
  await button(page, "Передать на контроль").click();
  await button(page, "Завершить контроль").click();
  await button(page, "Пара готова").click();
  await expect(button(page, "Подтвердить возврат")).toBeDisabled();
  await role(page, "Клиент");
  await route(page, "/client/orders/" + id);
  await button(page, "Демо-оплата").click();
  await button(page, "Сымитировать отказ").click();
  await expect(button(page, "Демо-оплата")).toBeVisible();
  await button(page, "Демо-оплата").click();
  await button(page, "Оплатить в демо").click();
  await expect(page.getByText(/Оплачено в демо ·/)).toBeVisible();
  await role(page, "Мастер");
  await route(page, "/workshop/orders/" + id);
  await button(page, "Подтвердить возврат").click();
  await button(page, "Вернуть пару").click();
  await expect(page.getByTestId("order-status")).toHaveText("Завершён");
  await page.reload();
  await expect(page.getByTestId("order-status")).toHaveText("Завершён");
  await noOverflow(page);
  await role(page, "Клиент");
  await route(page, "/client/orders/" + id);
  await page.getByRole("button", { name: "Оценка 4", exact: true }).click();
  await page.getByLabel("Ваш отзыв").fill("Бережно, понятно и вовремя");
  await button(page, "Оставить отзыв").click();
  await page.reload();
  await expect(page.getByLabel("Ваш отзыв")).toHaveValue(
    "Бережно, понятно и вовремя",
  );
  await button(page, "Заказать уход снова").click();
  await expect(page.getByLabel("Тип обуви", { exact: true })).toHaveValue(
    "Кроссовки",
  );
  await expect(page.getByLabel("Цвет", { exact: true })).toHaveValue("Белый");
  expect(errors).toEqual([]);
});

test("mobile photo upload, replacement, deletion and draft recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await init(page);
  await page.screenshot({ path: "test-results/home-390.png", fullPage: true });
  await noOverflow(page);
  await button(page, "Рассказать о своей паре").click();
  await page.getByLabel("Тип обуви", { exact: true }).selectOption("Кеды");
  await page.getByLabel("Цвет", { exact: true }).fill("Синий");
  await button(page, "Далее").click();
  await page
    .getByLabel("Загрузить фотографии")
    .setInputFiles("public/images/sneakers.jpg");
  await expect(
    page.getByRole("button", {
      name: "Открыть фото: sneakers.jpg",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Цвет", { exact: true })).toHaveValue("Синий");
  await button(page, "Далее").click();
  await expect(
    page.getByRole("button", {
      name: "Открыть фото: sneakers.jpg",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Заменить фото sneakers.jpg", { exact: true })
    .setInputFiles("public/images/canvas.jpg");
  await expect(
    page.getByRole("button", { name: "Открыть фото: canvas.jpg", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Загрузить фотографии").setInputFiles({
    name: "wrong.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.getByRole("alert")).toContainText("JPEG");
  await page
    .getByRole("button", { name: "Удалить фото canvas.jpg", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить фото", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Открыть фото:/ })).toHaveCount(
    0,
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await noOverflow(page);
  await page.screenshot({
    path: "test-results/wizard-360.png",
    fullPage: true,
  });
});

test("queue search, unchanged quote snapshots, excluded pair custody and demo reset", async ({
  page,
}) => {
  await init(page);
  await role(page, "Мастер");
  await route(page, "/workshop/orders");
  await page.getByLabel("Поиск заказов").fill("030");
  await expect(page.getByTestId("queue-order")).toHaveCount(1);
  await page.getByTestId("queue-order").click();
  await expect(page.getByTestId("order-status")).toHaveText("Активен");
  await button(page, "Подтвердить возврат").click();
  await button(page, "Вернуть пару").click();
  await expect(page.getByTestId("order-status")).toHaveText("Завершён");
  await route(page, "/workshop/services");
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Комплексная чистка",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Изменить", exact: true })
    .click();
  await page.getByLabel("Базовая цена, ₽").fill("9999");
  await button(page, "Сохранить услугу").click();
  await route(page, "/workshop/orders");
  await page.getByLabel("Поиск заказов").fill("029");
  await page.getByTestId("queue-order").click();
  await expect(page.getByTestId("pair-card")).toContainText("2 400");
  await route(page, "/workshop/profile");
  await button(page, "Сбросить демо").click();
  await button(page, "Отмена").click();
  await button(page, "Сбросить демо").click();
  await button(page, "Восстановить демо").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await route(page, "/workshop/orders");
  await page.getByLabel("Поиск заказов").fill("030");
  await page.getByTestId("queue-order").click();
  await expect(page.getByTestId("order-status")).toHaveText("Активен");
});

test("installed resources and local demo work after network is disabled", async ({
  page,
  context,
}) => {
  await init(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Любимой паре — новая история." }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText("Офлайн · изменения сохраняются в этом браузере"),
  ).toBeVisible();
  await button(page, "Рассказать о своей паре").click();
  await expect(page.getByLabel("Тип обуви", { exact: true })).toBeVisible();
  await page.getByLabel("Тип обуви", { exact: true }).selectOption("Туфли");
  await page.getByLabel("Цвет", { exact: true }).fill("Бордовый");
  await expect(page.getByText("Сохранено", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Цвет", { exact: true })).toHaveValue(
    "Бордовый",
  );
  await context.setOffline(false);
});

test("five-pair forty-photo control set stays local and opens quickly", async ({
  page,
}) => {
  await init(page);
  await button(page, "Рассказать о своей паре").click();
  for (let i = 0; i < 5; i++) {
    if (i) await button(page, "Добавить пару").click();
    await page
      .getByLabel("Тип обуви", { exact: true })
      .selectOption("Кроссовки");
    await page.getByLabel("Цвет", { exact: true }).fill("Белый " + (i + 1));
  }
  await expect(
    page.getByText("В одной заявке можно добавить не больше пяти пар.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(button(page, "Добавить пару")).toHaveCount(0);
  await button(page, "Далее").click();
  for (let i = 0; i < 5; i++) {
    await page
      .getByRole("button", {
        name: new RegExp("Пара " + (i + 1) + ".*Кроссовки"),
        exact: false,
      })
      .click();
    await page
      .getByLabel("Загрузить фотографии")
      .setInputFiles(Array(8).fill("public/images/sneakers.jpg"));
    await expect(
      page.getByRole("button", {
        name: "Открыть фото: sneakers.jpg",
        exact: true,
      }),
    ).toHaveCount(8);
  }
  await page.reload();
  await button(page, "Далее").click();
  await expect(
    page.getByRole("button", {
      name: "Открыть фото: sneakers.jpg",
      exact: true,
    }),
  ).toHaveCount(8);
  await button(page, "Далее").click();
  await button(page, "Далее").click();
  await button(page, "Отправить заявку").click();
  await expect(
    page.getByRole("heading", { name: "Заказ № 033" }),
  ).toBeVisible();
  const id = new URL(page.url()).hash.split("/").at(-1)!;
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.context().setOffline(true);
  const start = Date.now();
  await role(page, "Мастер");
  await route(page, "/workshop/orders/" + id);
  await expect(page.getByTestId("pair-card")).toHaveCount(5);
  console.log(
    "CONTROL_SET",
    JSON.stringify({
      pairs: 5,
      photos: 40,
      roleAndOrderMs: Date.now() - start,
      offline: true,
    }),
  );
  await page
    .getByTestId("pair-card")
    .nth(0)
    .getByText("Описание и фотографии", { exact: false })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Открыть фото: sneakers.jpg",
      exact: true,
    }),
  ).toHaveCount(8);
  await page.setViewportSize({ width: 360, height: 800 });
  await noOverflow(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "test-results/master-order-1440.png",
    fullPage: true,
  });
  await page.context().setOffline(false);
});

test("clickable sole wish persists and reaches master on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await init(page);
  await button(page, "Рассказать о своей паре").click();
  await page.getByLabel("Тип обуви", { exact: true }).selectOption("Кеды");
  await page.getByLabel("Цвет", { exact: true }).fill("Белый");
  await button(page, "Далее").click();
  await button(page, "Вид снизу").click();
  await page
    .getByRole("button", { name: "Выбрать участок: Подошва", exact: true })
    .click();
  await expect(page.getByLabel("Комментарий к отметке")).toBeFocused();
  await button(page, "Тщательно очистить протектор").click();
  await button(page, "Добавить отметку").click();
  await page
    .getByRole("button", { name: "Открыть отметку 1: Подошва" })
    .click();
  await expect(page.getByLabel("Комментарий к отметке")).toHaveValue(
    "Тщательно очистить протектор",
  );
  await page.screenshot({
    path: "test-results/interactive-sole-mobile.png",
    fullPage: true,
  });
  await noOverflow(page);
  await expect(page.getByText("Сохранено", { exact: true })).toBeVisible();
  await page.reload();
  await button(page, "Далее").click();
  await expect(
    page.getByText(/Тщательно очистить протектор/).last(),
  ).toBeVisible();
  await button(page, "Далее").click();
  await button(page, "Далее").click();
  await button(page, "Отправить заявку").click();
  await expect(page.getByTestId("pair-card")).toHaveCount(1);
  const id = new URL(page.url()).hash.split("/").at(-1)!;
  await role(page, "Мастер");
  await route(page, "/workshop/orders/" + id);
  await page.getByText("Описание и фотографии", { exact: false }).click();
  await button(page, "Вид снизу").click();
  await page
    .getByRole("button", { name: "Открыть отметку 1: Подошва" })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Тщательно очистить протектор" }),
  ).toBeVisible();
});
