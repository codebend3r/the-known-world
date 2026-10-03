import { afterEach, describe, expect, it, jest } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  useSearchIndex,
  type SearchIndexCollection,
} from "@/lib/useSearchIndex";
import { stubGlobal, unstubAllGlobals } from "@/test/stubs";

function Probe({ collection }: { collection: SearchIndexCollection }) {
  const { items, load } = useSearchIndex(collection);
  return (
    <>
      <button type="button" onClick={load}>
        load
      </button>
      <output>{items.map((item) => item.name).join(",")}</output>
    </>
  );
}

const stark = { slug: "stark", name: "Stark", detail: null, aliases: [] };

afterEach(() => {
  unstubAllGlobals();
});

describe("useSearchIndex", () => {
  it("fetches nothing until asked, then fetches the collection once", async () => {
    const fetchIndex = jest.fn(async () => Response.json([stark]));
    stubGlobal({ name: "fetch", value: fetchIndex });
    render(<Probe collection="characters" />);
    expect(fetchIndex).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("load"));
    fireEvent.click(screen.getByText("load"));

    await waitFor(() => expect(screen.getByText("Stark")).toBeDefined());
    expect(fetchIndex).toHaveBeenCalledTimes(1);
    expect(fetchIndex).toHaveBeenCalledWith("/search-index/characters.json");
  });

  it("re-arms after a failed fetch so the next intent retries", async () => {
    const fetchIndex = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response("down", { status: 503 }))
      .mockResolvedValueOnce(Response.json([stark]));
    stubGlobal({ name: "fetch", value: fetchIndex });
    render(<Probe collection="houses" />);

    fireEvent.click(screen.getByText("load"));
    await waitFor(() => expect(fetchIndex).toHaveBeenCalledTimes(1));
    // Let the rejection settle and re-arm the hook before asking again.
    await waitFor(() => {
      fireEvent.click(screen.getByText("load"));
      expect(fetchIndex).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => expect(screen.getByText("Stark")).toBeDefined());
  });
});
