import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect } from "vitest";
import type { Issue } from "../../domain/model";
import { ShoeMap } from "./ShoeMap";
function Harness() {
  const [issues, set] = useState<Issue[]>([]);
  return <ShoeMap issues={issues} onChange={set} />;
}
it("adds a right-shoe damage mark through accessible controls and can remove it", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.selectOptions(screen.getByLabelText("Зона обуви"), "Носок");
  await user.click(screen.getByRole("button", { name: "Правый" }));
  await user.click(screen.getByRole("button", { name: "Повреждение" }));
  await user.click(screen.getByRole("button", { name: "Сильное" }));
  await user.click(screen.getByRole("button", { name: "Добавить отметку" }));
  expect(screen.getByText(/Правый · Носок · Повреждение/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Удалить отметку" }));
  expect(
    screen.queryByText(/Правый · Носок · Повреждение/),
  ).not.toBeInTheDocument();
});
it("selects the sole directly, saves a wish and reopens its marker", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Вид снизу" }));
  await user.click(
    screen.getByRole("button", { name: "Выбрать участок: Подошва" }),
  );
  expect(screen.getByLabelText("Комментарий к отметке")).toHaveFocus();
  await user.click(
    screen.getByRole("button", { name: "Тщательно очистить протектор" }),
  );
  await user.click(screen.getByRole("button", { name: "Добавить отметку" }));
  await user.click(
    screen.getByRole("button", { name: "Открыть отметку 1: Подошва" }),
  );
  expect(screen.getByLabelText("Комментарий к отметке")).toHaveValue(
    "Тщательно очистить протектор",
  );
  await user.clear(screen.getByLabelText("Комментарий к отметке"));
  await user.type(
    screen.getByLabelText("Комментарий к отметке"),
    "Уделить внимание подошве",
  );
  await user.click(screen.getByRole("button", { name: "Сохранить отметку" }));
  expect(screen.getByText(/Уделить внимание подошве/)).toBeInTheDocument();
});
