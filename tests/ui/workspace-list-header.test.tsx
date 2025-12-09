// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

import { render, screen } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { describe, expect, it } from "vitest";

import { WorkspaceListHeader } from "@/components/workspace/list-page-header";

expect.extend(matchers);

describe("WorkspaceListHeader", () => {
  it("renders title, stats, action and helper with tone", () => {
    const action = <button type="button">Add</button>;

    render(
      <WorkspaceListHeader
        title="Clients"
        stats={[
          { label: "Всего", value: 12 },
          { label: "Новые", value: <span>3</span> },
        ]}
        action={action}
        helperText="Используйте фильтры для уточнения списка."
        helperTone="warning"
      />,
    );

    expect(screen.getByText("Всего")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Новые")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    const helper = screen.getByText("Используйте фильтры для уточнения списка.");
    expect(helper).toHaveClass("text-amber-600");

    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("скрывает опциональные блоки, если пропсы не переданы", () => {
    render(<WorkspaceListHeader title="Vehicles" />);

    expect(document.querySelector("dl")).toBeNull();
    expect(screen.queryByText(/используйте/i)).not.toBeInTheDocument();
  });
});
