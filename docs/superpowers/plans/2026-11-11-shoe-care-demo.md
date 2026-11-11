# Shoe-care Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать согласованное демо «Другая пара» от заявки до возврата.
**Architecture:** React PWA; одна локальная база IndexedDB для синтетических ролей. Чистые доменные команды проверяют переходы и версии; хранилище атомарно записывает изменения и историю. UI читает живое состояние базы.
**Tech Stack:** React, TypeScript, Vite, Tailwind, Dexie, Golos Text, Vitest, Playwright.
**Spec:** `specs/001-shoe-care-demo/spec.md`, `docs/superpowers/specs/2026-11-10-shoe-care-demo-design.md`.

## Global Constraints

- Вариант A, тёплый молочный/оливковый стиль; локальный Golos Text.
- Один профиль браузера; роли клиента и мастера, синтетические исходные данные.
- 1–5 пар; до восьми фото на пару отдельно в каждой стадии, исходный файл до 5 МБ; JPEG/PNG/WebP.
- Опубликованная версия оценки неизменяема; согласие только на текущую версию данной пары.
- Работа требует приёмки, записи состояния, текущего согласия; новая цена только до старта.
- Возврат по парам; реальные деньги, SMS и курьер не используются.
- Критичные операции и история сохраняются транзакционно; ошибка записи не равна успеху.

## Review Focus

1. Старая вкладка и двойное нажатие: не принимают старую цену и не создают повторные события — тесты задачи 1.
2. Частичный отказ после приёмки: сохраняется возврат, другая пара продолжает работу — задача 1.
3. Заполненная клиентская фотостадия: не блокирует фото приёмки; ошибки записи сохраняют предыдущий файл — задача 2.
4. Черновик после перезагрузки и отправка при сохранении: нет потерь и повторного заказа — задачи 3/5.
5. Прайс и внутренние заметки: не меняют старые предложения и не показываются клиенту — задачи 1/4/5.

## Task 1: Доменные правила

**Files:** `src/domain/model.ts`, `src/domain/orders.ts`, `src/domain/orders.test.ts`.
**Interfaces:** `applyCommand(order: Order, command: OrderCommand, actor: Actor, now?: string): Order`; `orderStatus(order): OrderStatus`; `pairLabel(pair): string`; `quoteTotal(quote): number`.
- [ ] Написать тесты расчёта, immutable quote, stale agreement, дублей, приёмки/старта, частичного отказа, контроля качества, оплаты и возврата.
- [ ] `npm test -- src/domain/orders.test.ts` → ожидаемый FAIL отсутствующих правил.
- [ ] Реализовать типы/команды, выполнить тот же тест → PASS.
- [ ] Commit `feat: enforce shoe order agreements and lifecycle`.

## Task 2: Локальные данные и фотографии

**Files:** `src/data/db.ts`, `src/data/seed.ts`, `src/data/photos.ts`, `src/data/db.test.ts`.
**Interfaces:** `initializeDemo(): Promise<void>`; `commitOrder(id, command, actor, expectedRevision?): Promise<Order>`; `saveDraft(order, actor): Promise<void>`; `storePhoto(input, actor): Promise<void>`; `resetDemo(): Promise<void>`.
- [ ] На fake-indexeddb сначала проверить начальную инициализацию, сохранение, две роли, транзакцию, лимиты фото по стадиям и сброс; FAIL.
- [ ] Реализовать Dexie, версионный seed и загрузку изображений; PASS.
- [ ] Commit `feat: persist demo orders and staged photos`.

## Task 3: Клиент и конструктор

**Files:** `src/App.tsx`, `src/ui/*`, `src/features/client/*`, `src/features/wizard/*`, `src/styles.css`.
**Interfaces:** общий Session actor/client; Wizard сохраняет Order, ShoeMap редактирует IssueMark[], PhotoGallery читает blobs, клиент открывает OrderView.
- [ ] Проверить UI-сценарий нескольких пар, неизвестного материала, карты/списка и восстановления черновика; FAIL.
- [ ] Реализовать оболочку, главную, заказы, 4 шага заявки, локальный шрифт и адаптивный стиль; PASS.
- [ ] Commit `feat: add mobile client and interactive shoe wizard`.

## Task 4: Мастер и общий заказ

**Files:** `src/features/orders/*`, `src/features/workshop/*`.
**Interfaces:** единый OrderView на доменных командах, RoleGuard поведения, ServiceEditor, вычисляемый Dashboard.
- [ ] Проверить публикацию и независимые решения по парам, разделение заметки/чата; FAIL.
- [ ] Реализовать мастерскую, оценку, клиентские решения, приёмку/этапы/QC/платёж/выдачу, переписку, прайс, отзыв и повтор; PASS.
- [ ] Commit `feat: deliver master quote and fulfilment workflows`.

## Task 5: Сквозные проверки, PWA и выпуск

**Files:** `tests/e2e/demo.spec.ts`, `playwright.config.ts`, `vite.config.ts`, `public/*`, `README.md`, `docs/VALIDATION.md`.
- [ ] Добавить сквозной браузерный маршрут и мобильную проверку; проверить, что они обнаруживают отсутствующее поведение.
- [ ] Завершить доступность, ошибки/пустые состояния, PWA/офлайн и подсказку демо.
- [ ] `npm test`, `npm run build`, `npm run test:e2e` → все проверки проходят; ограничения среды отделены от результатов.
- [ ] Одна независимая проверка ветки, исправление существенных находок и финальные проверки.
- [ ] Commit, загрузка в существующий GitHub-репозиторий, выпуск сайта из того же исходного состояния и проверка публикации.

## Способ исполнения

Пользователь 11 ноября подтвердил состав v1 и ранее попросил снизить накладные расходы. Повторного согласования технической декомпозиции нет: один исполнитель, значимые тесты и одна итоговая независимая проверка. Публикация в указанный репозиторий и демонстрация уже разрешены исходным запросом.
