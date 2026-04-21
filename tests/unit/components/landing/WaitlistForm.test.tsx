import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WaitlistForm from "@/src/components/landing/WaitlistForm";

describe("WaitlistForm", () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("submits email and shows success message", async () => {
    const user = userEvent.setup();
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Zapisano na liście." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(<WaitlistForm />);
    await user.type(screen.getByLabelText(/Adres e-mail do listy/i), "join@example.com");
    await user.click(screen.getByRole("button", { name: /Dołącz do listy/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Zapisano na liście.");
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/waitlist",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "join@example.com" }),
      })
    );
  });

  it("shows API error message when request fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Już zapisany." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );

    render(<WaitlistForm />);
    await user.type(screen.getByLabelText(/Adres e-mail do listy/i), "dup@example.com");
    await user.click(screen.getByRole("button", { name: /Dołącz do listy/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Już zapisany.");
    });
  });
});
