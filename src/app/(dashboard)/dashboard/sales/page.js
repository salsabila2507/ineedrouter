"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const number = (value = 0) => new Intl.NumberFormat("id-ID").format(Number(value));
const date = (value) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const money = (value, asset = "USD") => `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 6 }).format(Number(value || 0))} ${asset}`;

export default function SalesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const load = useCallback(async () => {
    setError("");
    const response = await fetch("/api/sales", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Gagal memuat data");
    setData(payload);
  }, []);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);
  const confirmPayment = async (depositId) => {
    const txHash = window.prompt("Hash transaksi yang sudah lo cek di wallet/explorer:")?.trim();
    if (!txHash) return;
    setBusy(depositId); setError("");
    try {
      const response = await fetch("/api/sales", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deposit_id: depositId, tx_hash: txHash }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Konfirmasi gagal");
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(null); }
  };
  const customerById = useMemo(() => new Map((data?.customers || []).map((customer) => [customer.id, customer])), [data]);
  if (!data) return <main className="p-6 text-text-muted">{error || "Menyiapkan dashboard penjualan…"}</main>;
  const o = data.overview;
  const revenue = Object.entries(o.revenueByAsset || {}).map(([asset, value]) => money(value, asset)).join(" + ") || "0";

  return <main className="p-6 space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Admin / Penjualan</p>
        <h2 className="mt-2 text-3xl font-heading font-bold text-text-main">Penjualan iNeed</h2>
        <p className="mt-2 text-sm text-text-muted">Data customer, akses, penggunaan, dan pembayaran tersinkron otomatis dari iNeed.</p>
      </div>
      <button onClick={() => load().catch((e) => setError(e.message))} className="min-h-11 border-2 border-border bg-surface px-4 py-2 font-semibold text-text-main">Segarkan data</button>
    </header>
    {error && <div className="border-2 border-red-500 bg-red-50 p-3 text-red-700">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {[
        ["Customer", number(o.customers)],
        ["Key aktif", number(o.activeKeys)],
        ["Request bulan ini", number(o.monthRequests)],
        ["Token bulan ini", number(o.monthTokens)],
        ["Pembayaran terkonfirmasi", number(o.confirmedPayments)],
        ["Dukungan diterima", revenue],
      ].map(([label, value]) => <article key={label} className="border-2 border-border bg-surface p-4 shadow-[4px_4px_0_var(--color-primary)]">
        <small className="text-xs uppercase tracking-wide text-text-muted">{label}</small>
        <strong className="mt-2 block font-heading text-xl text-text-main">{value}</strong>
      </article>)}
    </section>
    <section className="border-2 border-border bg-surface p-5">
      <h3 className="font-heading text-xl font-bold text-text-main">Menunggu konfirmasi manual</h3>
      <p className="mt-2 text-sm text-text-muted">Cek transfer di wallet/explorer lo, lalu masukkan hash transaksi yang cocok.</p>
      <div className="mt-4 overflow-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b-2 border-border text-xs uppercase text-text-muted"><th className="p-2">Customer</th><th className="p-2">Akses</th><th className="p-2">Jumlah</th><th className="p-2">Kedaluwarsa</th><th className="p-2">Aksi</th></tr></thead>
      <tbody>{(data.pendingRequests || []).map((entry) => <tr key={entry.id} className="border-b border-border/50"><td className="p-2 font-semibold text-text-main">{customerById.get(entry.user_id)?.email || "—"}</td><td className="p-2 text-text-muted">{entry.target_tier}</td><td className="p-2 font-mono text-text-main">{money(entry.unique_amount, entry.asset)}</td><td className="p-2 text-text-muted">{date(entry.expires_at)}</td><td className="p-2"><button disabled={busy === entry.id} onClick={() => confirmPayment(entry.id)} className="min-h-11 border-2 border-border bg-primary px-3 py-2 font-semibold text-white">{busy === entry.id ? "Menyimpan…" : "Konfirmasi"}</button></td></tr>)}</tbody></table>{!(data.pendingRequests || []).length && <p className="py-8 text-center text-sm text-text-muted">Tidak ada permintaan yang menunggu konfirmasi.</p>}</div>
    </section>
    <section className="border-2 border-border bg-surface p-5">
      <h3 className="font-heading text-xl font-bold text-text-main">Customer</h3>
      <div className="mt-4 overflow-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead><tr className="border-b-2 border-border text-xs uppercase text-text-muted"><th className="p-2">Email</th><th className="p-2">Akses</th><th className="p-2">Key</th><th className="p-2">Request bulan ini</th><th className="p-2">Token bulan ini</th><th className="p-2">Berakhir</th><th className="p-2">Aktivitas terakhir</th></tr></thead>
          <tbody>{data.customers.map((customer) => <tr key={customer.id} className="border-b border-border/50">
            <td className="p-2 font-semibold text-text-main">{customer.email || "—"}</td>
            <td className="p-2 text-text-muted">{customer.tierDisplayName}</td>
            <td className="p-2 text-text-muted">{customer.activeKeyCount}/{customer.keyCount} aktif</td>
            <td className="p-2 text-text-muted">{number(customer.monthRequests)}</td>
            <td className="p-2 text-text-muted">{number(customer.monthTokens)}{customer.monthTokenLimit > 0 ? ` / ${number(customer.monthTokenLimit)}` : ""}</td>
            <td className="p-2 text-text-muted">{date(customer.tierExpiresAt)}</td>
            <td className="p-2 text-text-muted">{date(customer.lastActivityAt)}</td>
          </tr>)}</tbody>
        </table>
        {!data.customers.length && <p className="py-8 text-center text-sm text-text-muted">Belum ada customer.</p>}
      </div>
    </section>
    <section className="border-2 border-border bg-surface p-5">
      <h3 className="font-heading text-xl font-bold text-text-main">Pembayaran terbaru</h3>
      <div className="mt-4 overflow-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead><tr className="border-b-2 border-border text-xs uppercase text-text-muted"><th className="p-2">Customer</th><th className="p-2">Akses</th><th className="p-2">Jumlah</th><th className="p-2">Status</th><th className="p-2">Waktu</th></tr></thead>
          <tbody>{(data.payments || []).map((entry) => <tr key={entry.id} className="border-b border-border/50">
            <td className="p-2 font-semibold text-text-main">{customerById.get(entry.user_id)?.email || "—"}</td>
            <td className="p-2 text-text-muted">{entry.target_tier}</td>
            <td className="p-2 font-mono text-text-main">{money(entry.unique_amount, entry.asset)}</td>
            <td className="p-2 text-text-muted">{entry.status}</td>
            <td className="p-2 text-text-muted">{date(entry.confirmed_at || entry.created_at)}</td>
          </tr>)}</tbody>
        </table>
        {!(data.payments || []).length && <p className="py-8 text-center text-sm text-text-muted">Belum ada pembayaran terkonfirmasi.</p>}
      </div>
    </section>
    <p className="text-xs text-text-muted">Terakhir disinkronkan {date(data.generatedAt)}.</p>
  </main>;
}
