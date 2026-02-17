import { useMemo, useState } from "react";

type ApiResult = { ok: boolean; status: number; body: unknown };

function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null;
}

function hasItems(x: unknown): x is { items: unknown[] } {
    return isRecord(x) && Array.isArray((x as Record<string, unknown>).items);
}

function isPaged(x: unknown): x is { total: number; page: number; pageSize: number; items: unknown[] } {
    if (!isRecord(x)) return false;
    const o = x as Record<string, unknown>;
    return (
        typeof o.total === "number" &&
        typeof o.page === "number" &&
        typeof o.pageSize === "number" &&
        Array.isArray(o.items)
    );
}

async function apiFetch(path: string, init?: RequestInit): Promise<ApiResult> {
    const res = await fetch(path, {
        ...init,
        headers: {
            ...(init?.headers || {}),
        },
        credentials: "include",
    });

    let body: unknown = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) body = await res.json();
    else body = await res.text();

    return { ok: res.ok, status: res.status, body };
}

export default function App() {
    const [log, setLog] = useState<string>("");
    const [busy, setBusy] = useState(false);

    // Auth
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("");

    // Books list
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [books, setBooks] = useState<unknown[]>([]);

    // Upload
    const [files, setFiles] = useState<FileList | null>(null);

    // Process
    const [processId, setProcessId] = useState<number>(0);
    const [selectedIds, setSelectedIds] = useState<string>("");

    // Search
    const [searchQ, setSearchQ] = useState("");
    const [searchItems, setSearchItems] = useState<unknown[]>([]);

    const selectedIdList = useMemo(() => {
        return selectedIds
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n) && n > 0);
    }, [selectedIds]);

    function formatBody(body: unknown) {
        if (typeof body === "string") return body;
        try {
            return JSON.stringify(body, null, 2);
        } catch {
            return String(body);
        }
    }

    function appendLog(title: string, r: ApiResult) {
        const text = `\n=== ${title} ===\nStatus: ${r.status}\nBody:\n${formatBody(r.body)}\n`;
        setLog((prev) => text + prev);
    }

    async function run(title: string, fn: () => Promise<ApiResult>) {
        setBusy(true);
        try {
            const r = await fn();
            appendLog(title, r);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setLog((prev) => `\n=== ${title} ERROR ===\n${msg}\n` + prev);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
            <h1>Lib26 Frontend – API Test Console</h1>
            <p style={{ opacity: 0.8 }}>
                This page runs on <code>localhost:5173</code> and calls the server through Vite proxy using{" "}
                <code>fetch("/api/...")</code>.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <button disabled={busy} onClick={() => run("Health", () => apiFetch("/api/health"))}>
                    Test /api/health
                </button>

                <button disabled={busy} onClick={() => window.open("/swagger", "_blank")}>
                    Open Swagger (proxied)
                </button>

                <button disabled={busy} onClick={() => setLog("")}>
                    Clear Log
                </button>
            </div>

            <hr />

            <h2>Auth (Session)</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <input
                    placeholder="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    disabled={busy}
                    onClick={() =>
                        run("POST /api/auth/login", () =>
                            apiFetch("/api/auth/login", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ username, password }),
                            })
                        )
                    }
                >
                    Login
                </button>

                <button disabled={busy} onClick={() => run("GET /api/auth/me", () => apiFetch("/api/auth/me"))}>
                    Me
                </button>

                <button
                    disabled={busy}
                    onClick={() => run("POST /api/auth/logout", () => apiFetch("/api/auth/logout", { method: "POST" }))}
                >
                    Logout
                </button>
            </div>

            <hr />

            <h2>Books List</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input placeholder="q (search)" value={q} onChange={(e) => setQ(e.target.value)} />
                <input
                    type="number"
                    min={1}
                    value={page}
                    onChange={(e) => setPage(parseInt(e.target.value || "1", 10))}
                    style={{ width: 90 }}
                />
                <input
                    type="number"
                    min={1}
                    max={100}
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value || "20", 10))}
                    style={{ width: 90 }}
                />
                <button
                    disabled={busy}
                    onClick={() =>
                        run("GET /api/books", async () => {
                            const r = await apiFetch(`/api/books?Q=${encodeURIComponent(q)}&Page=${page}&PageSize=${pageSize}`);
                            if (r.ok && isPaged(r.body)) setBooks(r.body.items);
                            return r;
                        })
                    }
                >
                    Load Books
                </button>
            </div>

            {books.length > 0 && (
                <div style={{ marginTop: 12, border: "1px solid #3333", padding: 12, borderRadius: 8 }}>
                    <b>Books (first 10 shown)</b>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(books.slice(0, 10), null, 2)}</pre>
                </div>
            )}

            <hr />

            <h2>Upload PDFs</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input type="file" multiple accept=".pdf" onChange={(e) => setFiles(e.target.files)} />
                <button
                    disabled={busy || !files || files.length === 0}
                    onClick={() =>
                        run("POST /api/books/upload", async () => {
                            const fd = new FormData();
                            Array.from(files || []).forEach((f) => fd.append("files", f));
                            return apiFetch("/api/books/upload", { method: "POST", body: fd });
                        })
                    }
                >
                    Upload
                </button>
                <span style={{ opacity: 0.8 }}>Requires login if your API checks session.</span>
            </div>

            <hr />

            <h2>Process</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                    type="number"
                    placeholder="Book ID"
                    value={processId || ""}
                    onChange={(e) => setProcessId(parseInt(e.target.value || "0", 10))}
                    style={{ width: 140 }}
                />
                <button
                    disabled={busy || processId <= 0}
                    onClick={() =>
                        run(`POST /api/books/${processId}/process`, () =>
                            apiFetch(`/api/books/${processId}/process`, { method: "POST" })
                        )
                    }
                >
                    Process One
                </button>

                <input
                    placeholder="Selected IDs (comma separated) e.g. 1,2,3"
                    value={selectedIds}
                    onChange={(e) => setSelectedIds(e.target.value)}
                    style={{ width: 360 }}
                />
                <button
                    disabled={busy || selectedIdList.length === 0}
                    onClick={() =>
                        run("POST /api/books/process-selected", () =>
                            apiFetch("/api/books/process-selected", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ids: selectedIdList }),
                            })
                        )
                    }
                >
                    Process Selected
                </button>
            </div>

            <hr />

            <h2>Search</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                    placeholder="search query"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    style={{ width: 360 }}
                />
                <button
                    disabled={busy || searchQ.trim().length === 0}
                    onClick={() =>
                        run("GET /api/search?q=...", async () => {
                            const r = await apiFetch(`/api/search?q=${encodeURIComponent(searchQ)}`);
                            if (r.ok && hasItems(r.body)) setSearchItems(r.body.items);
                            return r;
                        })
                    }
                >
                    Search (GET)
                </button>
                <button
                    disabled={busy || searchQ.trim().length === 0}
                    onClick={() =>
                        run("POST /api/search", async () => {
                            const r = await apiFetch(`/api/search`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ q: searchQ, mode: "auto" }),
                            });
                            if (r.ok && hasItems(r.body)) setSearchItems(r.body.items);
                            return r;
                        })
                    }
                >
                    Search (POST)
                </button>
            </div>

            {searchItems.length > 0 && (
                <div style={{ marginTop: 12, border: "1px solid #3333", padding: 12, borderRadius: 8 }}>
                    <b>Search items</b>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(searchItems, null, 2)}</pre>
                </div>
            )}

            <hr />

            <h2>Stats</h2>
            <button disabled={busy} onClick={() => run("GET /api/stats/summary", () => apiFetch("/api/stats/summary"))}>
                Load Stats
            </button>

            <hr />

            <h2>Log</h2>
            <textarea
                value={log}
                readOnly
                style={{
                    width: "100%",
                    minHeight: 260,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    padding: 12,
                    borderRadius: 8,
                }}
            />
        </div>
    );
}
