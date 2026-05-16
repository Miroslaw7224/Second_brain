import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";

import { KnowledgeChatPanel } from "@/features/knowledge/KnowledgeChatPanel";

// jsdom does not implement scrollIntoView; mock it to prevent unhandled errors
// from the component's scrollToBottom setTimeout callback.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

function makeApiFetch(responses: Record<string, unknown>) {
  return vi.fn().mockImplementation((url: string) => {
    const data = responses[url] ?? {};
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    });
  });
}

afterEach(() => cleanup());

describe("KnowledgeChatPanel", () => {
  it("renders input textarea and send button", () => {
    render(<KnowledgeChatPanel apiFetch={vi.fn()} lang="pl" />);
    // The textarea is accessible as role="textbox"
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    // The send button uses a Send icon (no visible text), so we look for any button
    // adjacent to the textarea — there should be exactly one button in the input area
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows placeholder text based on lang prop", () => {
    render(<KnowledgeChatPanel apiFetch={vi.fn()} lang="pl" />);
    expect(
      screen.getByPlaceholderText("Wpisz wiedzę do zapisania lub zadaj pytanie...")
    ).toBeInTheDocument();
  });

  it("adds user message to chat on Enter key", async () => {
    const user = userEvent.setup();
    const apiFetch = makeApiFetch({
      "/api/chat": { text: "Odpowiedź AI", sources: [] },
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "Kiedy deadline projektu?");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Kiedy deadline projektu?")).toBeInTheDocument();
  });

  it("displays AI response after sending a chat message", async () => {
    const user = userEvent.setup();
    const apiFetch = makeApiFetch({
      "/api/chat": { text: "Deadline to 20 maja.", sources: ["Projekt X"] },
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "Kiedy deadline?");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Deadline to 20 maja.")).toBeInTheDocument();
    });
  });

  it("displays AI response sources when provided", async () => {
    const user = userEvent.setup();
    const apiFetch = makeApiFetch({
      "/api/chat": { text: "Oto odpowiedź.", sources: ["Projekt X", "Notatka Y"] },
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "Pytanie o projekt");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Projekt X, Notatka Y")).toBeInTheDocument();
    });
  });

  it("routes save command 'zapamiętaj' to /api/knowledge/extract and shows pending nodes", async () => {
    const user = userEvent.setup();
    const apiFetch = makeApiFetch({
      "/api/knowledge/extract": {
        nodes: [
          {
            type: "resource",
            title: "Vercel",
            content: "Platforma deploy",
            tags: [],
            sources: [],
          },
        ],
      },
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "zapamiętaj https://vercel.com");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Vercel")).toBeInTheDocument();
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/knowledge/extract",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("routes bare URL to /api/knowledge/extract", async () => {
    const user = userEvent.setup();
    const apiFetch = makeApiFetch({
      "/api/knowledge/extract": {
        nodes: [
          {
            type: "resource",
            title: "Example",
            content: "Strona główna",
            tags: [],
            sources: [],
          },
        ],
      },
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "https://example.com");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Example")).toBeInTheDocument();
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/knowledge/extract",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows Zapisz button and Anuluj button when pending nodes are displayed", async () => {
    const user = userEvent.setup();
    const apiFetch = makeApiFetch({
      "/api/knowledge/extract": {
        nodes: [
          {
            type: "note",
            title: "Moja notatka",
            content: "Treść notatki",
            tags: [],
            sources: [],
          },
        ],
      },
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "zapamiętaj to");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Zapisz/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Anuluj" })).toBeInTheDocument();
  });

  it("shows error message when chat API call fails", async () => {
    const user = userEvent.setup();
    const apiFetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "Pytanie");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Wystąpił błąd. Spróbuj ponownie.")).toBeInTheDocument();
    });
  });

  it("shows English error message when lang=en and API fails", async () => {
    const user = userEvent.setup();
    const apiFetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="en" />);
    await user.type(screen.getByRole("textbox"), "A question");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("An error occurred. Please try again.")).toBeInTheDocument();
    });
  });

  it("shows clear chat button only after a message is sent", async () => {
    const user = userEvent.setup();
    const apiFetch = makeApiFetch({
      "/api/chat": { text: "Odpowiedź", sources: [] },
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);

    // Clear button should not exist before any messages
    expect(screen.queryByLabelText("Wyczyść czat")).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox"), "Pytanie");
    await user.keyboard("{Enter}");

    // After message sent, clear button should appear
    await waitFor(() => {
      expect(screen.getByLabelText("Wyczyść czat")).toBeInTheDocument();
    });
  });

  it("clears chat when clear button is clicked", async () => {
    const user = userEvent.setup();
    const apiFetch = makeApiFetch({
      "/api/chat": { text: "Odpowiedź", sources: [] },
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "Pytanie");
    await user.keyboard("{Enter}");

    await waitFor(() => screen.getByText("Odpowiedź"));

    const clearBtn = screen.getByLabelText("Wyczyść czat");
    await user.click(clearBtn);

    expect(screen.queryByText("Odpowiedź")).not.toBeInTheDocument();
    expect(screen.queryByText("Pytanie")).not.toBeInTheDocument();
  });

  it("discards pending nodes when Anuluj is clicked", async () => {
    const user = userEvent.setup();
    const apiFetch = makeApiFetch({
      "/api/knowledge/extract": {
        nodes: [
          {
            type: "note",
            title: "Odrzucona notatka",
            content: "Treść",
            tags: [],
            sources: [],
          },
        ],
      },
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "zapamiętaj to");
    await user.keyboard("{Enter}");

    await waitFor(() => screen.getByDisplayValue("Odrzucona notatka"));

    await user.click(screen.getByRole("button", { name: "Anuluj" }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Odrzucona notatka")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Pominięto.")).toBeInTheDocument();
  });

  it("sends message on button click (not just Enter)", async () => {
    const user = userEvent.setup();
    const apiFetch = makeApiFetch({
      "/api/chat": { text: "Kliknięcie działa", sources: [] },
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "Pytanie przyciskiem");

    await user.click(screen.getByTestId("chat-send-button"));

    await waitFor(() => {
      expect(screen.getByText("Kliknięcie działa")).toBeInTheDocument();
    });
  });

  it("does not submit empty input", async () => {
    const user = userEvent.setup();
    const apiFetch = vi.fn();

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.keyboard("{Enter}");

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("calls /api/knowledge/nodes when confirm save is clicked", async () => {
    const user = userEvent.setup();
    const apiFetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/knowledge/extract") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              nodes: [
                {
                  type: "note",
                  title: "Nowa notatka",
                  content: "Treść",
                  tags: [],
                  sources: [],
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<KnowledgeChatPanel apiFetch={apiFetch} lang="pl" />);
    await user.type(screen.getByRole("textbox"), "zapamiętaj to");
    await user.keyboard("{Enter}");

    await waitFor(() => screen.getByDisplayValue("Nowa notatka"));

    await user.click(screen.getByRole("button", { name: /Zapisz/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/knowledge/nodes",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
