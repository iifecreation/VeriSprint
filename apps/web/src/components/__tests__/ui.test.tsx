import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, Card, PageHeader, StatCard } from "../ui";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>off track</Badge>);
    expect(screen.getByText("off track")).toBeInTheDocument();
  });

  it("applies a different class per tone so bands are visually distinct", () => {
    render(<Badge tone="danger">danger</Badge>);
    const el = screen.getByText("danger");
    expect(el.className).toContain("rose");
  });

  it("defaults to the neutral tone when none is given", () => {
    render(<Badge>neutral</Badge>);
    expect(screen.getByText("neutral").className).not.toContain("rose");
  });
});

describe("Card", () => {
  it("renders children inside the card shell", () => {
    render(<Card>card content</Card>);
    expect(screen.getByText("card content")).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("renders label, value, and optional hint", () => {
    render(<StatCard label="Merged PRs" value={42} hint="last 30 days" />);
    expect(screen.getByText("Merged PRs")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("last 30 days")).toBeInTheDocument();
  });

  it("omits the hint paragraph when none is given", () => {
    render(<StatCard label="Merged PRs" value={42} />);
    expect(screen.queryByText("last 30 days")).not.toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("renders the title as a heading and an optional subtitle", () => {
    render(<PageHeader title="Insights" subtitle="DORA metrics and more" />);
    expect(screen.getByRole("heading", { name: "Insights" })).toBeInTheDocument();
    expect(screen.getByText("DORA metrics and more")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(<PageHeader title="Insights" actions={<button>Export</button>} />);
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });
});
