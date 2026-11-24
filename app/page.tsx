"use client";

import { useState } from "react";
import { Search, ArrowUp, Play, ExternalLink, AlertCircle, Sparkles } from "lucide-react";
import type { BeforeReport } from "@/lib/types";

export default function BeforeHomePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<BeforeReport | null>(null);
  const [tab, setTab] = useState<"regret" | "youtube" | "reviews" | "price">("regret");
  const [selectedConds, setSelectedConds] = useState<Record<string, string>>({});
  const [benefits, setBenefits] = useState({ naver: true, card: true, payback: false });

  async function runAnalyze(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "분석 실패");
      setReport(data);
      const initConds: Record<string, string> = {};
      (data.conditions || []).forEach((g: any) => {
        if (g.options?.[0]) initConds[g.key] = g.options[0].value;
      });
      setSelectedConds(initConds);
      setTab("regret");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function computeSuitability() {
    if (!report) return { score: 85, warnings: [] as string[] };
    let score = report.baseScore || 85;
    const warnings: string[] = [];
    for (const g of report.conditions || []) {
      const val = selectedConds[g.key];
      const warn = g.warningMap?.[val];
      if (warn) {
        score -= warn.penalty || 10;
        warnings.push(warn.message);
      }
    }
    return { score: Math.max(30, Math.min(98, score)), warnings };
  }

  function calcEffective(basePrice: number, supportsNaver: boolean) {
    let save = 0;
    if (benefits.card) save += Math.round(basePrice * 0.05);
    if (benefits.naver && supportsNaver) save += Math.min(100000, Math.round(basePrice * 0.05));
    if (benefits.payback) save += Math.round(basePrice * 0.02);
    return { eff: Math.max(0, basePrice - save), save };
  }

  const evalResult = computeSuitability();

  return (
    <div className="max-w-[440px] mx-auto min-h-screen bg-[#F5F5F7] sm:my-5 sm:min-h-[calc(100vh-40px)] sm:rounded-[40px] sm:overflow-hidden shadow-2xl relative flex flex-col">
      {!report && !loading ? (
        /* HOME SCREEN */
        <div className="flex-1 px-5 pt-12 pb-28 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold tracking-[0.22em]">BEFORE</span>
              <span className="liquid-glass text-[10px] font-bold px-2.5 py-1 rounded-full text-emerald-700">월 0원 무료 스택</span>
            </div>
            <div className="space-y-2 pt-4">
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
                결제하기 전,<br />후회할 이유부터.
              </h1>
              <p className="text-xs text-zinc-500 leading-relaxed">
                소파·가전·헤어 왁스까지 상품명만 넣으면 유튜브 실사용·네이버 후기·최종 체감 최저가를 한 번에 검증합니다.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold text-zinc-500">바로 테스트해 보기</p>
              <div className="flex flex-wrap gap-2">
                {["자코모 에반 4인 소파", "에싸 시에르 카시미라", "다슈 매트 왁스", "로보락 S9 로봇청소기"].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setQuery(sample);
                      runAnalyze(sample);
                    }}
                    className="px-3.5 py-2 rounded-full bg-white border border-zinc-200 text-xs font-semibold hover:border-zinc-900 transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          </div>
        </div>
      ) : loading ? (
        /* AI ANALYZING SCREEN */
        <div className="flex-1 bg-[#111216] text-white px-6 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-400 p-[2px] animate-pulse">
            <div className="w-full h-full rounded-full bg-[#111216] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-400">{query}</p>
            <h2 className="text-lg font-bold">유튜브 · 네이버 · 최저가를<br />교차 검증 중입니다</h2>
          </div>
        </div>
      ) : report ? (
        /* 4-TAB LIQUID GLASS REPORT SCREEN */
        <>
          <div className="relative h-[280px] bg-zinc-900 shrink-0 overflow-hidden">
            {report.imageUrl ? (
              <img src={report.imageUrl} alt={report.productName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/45" />
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <button type="button" onClick={() => setReport(null)} className="liquid-glass rounded-full px-3 py-1.5 text-xs font-bold">
                ← 홈
              </button>
              <span className="liquid-glass rounded-full px-3 py-1.5 text-[11px] font-bold">
                {report.cached ? "캐시 히트 (0원)" : "신규 분석 완료"} · {evalResult.score}점
              </span>
            </div>
          </div>

          <main className="relative -mt-7 flex-1 glass-sheet rounded-t-[32px] px-5 pt-4 pb-28 space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500">{report.brand} · {report.category}</p>
              <h1 className="text-lg font-bold leading-snug">{report.productName}</h1>
              {report.price > 0 && (
                <p className="text-xl font-extrabold">{report.price.toLocaleString("ko-KR")}원</p>
              )}
            </div>

            {/* Dynamic Category Conditions */}
            {report.conditions.length > 0 && (
              <div className="rounded-2xl bg-[#F5F5F7] p-3 space-y-2">
                {report.conditions.map((g) => (
                  <div key={g.key} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-zinc-500 shrink-0">{g.label}</span>
                    <div className="flex gap-1 overflow-x-auto">
                      {g.options.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedConds((prev) => ({ ...prev, [g.key]: opt.value }))}
                          className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full border ${
                            selectedConds[g.key] === opt.value
                              ? "bg-[#1D1D1F] text-white border-[#1D1D1F]"
                              : "bg-white text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4 Segmented Tabs */}
            <nav className="bg-zinc-200/75 p-1 rounded-2xl grid grid-cols-4 gap-1 text-[11px] font-semibold">
              {([
                ["regret", "후회·요약"],
                ["youtube", "유튜브"],
                ["reviews", "실후기"],
                ["price", "최저·페이백"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`py-2 rounded-xl transition-all ${tab === k ? "bg-white text-[#1D1D1F] shadow-sm" : "text-zinc-500"}`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {tab === "regret" && (
              <div className="space-y-3">
                {evalResult.warnings.length > 0 && (
                  <div className="rounded-2xl bg-[#FFF5F5] border border-red-200 p-3.5 space-y-1 text-xs text-red-900">
                    <p className="font-bold flex items-center gap-1 text-red-700">
                      <AlertCircle className="w-3.5 h-3.5" /> 내 조건과 충돌 주의
                    </p>
                    {evalResult.warnings.map((w, i) => (
                      <p key={i}>• {w}</p>
                    ))}
                  </div>
                )}
                {report.regrets.map((r, i) => (
                  <div key={i} className="rounded-2xl bg-[#F5F5F7] p-4 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold">0{i + 1} {r.title}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{r.level}</span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">{r.detail}</p>
                    <p className="text-[11px] font-semibold bg-white rounded-xl px-3 py-2">💡 {r.tip}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === "youtube" && (
              <div className="space-y-2.5">
                {report.youtube.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">YOUTUBE_API_KEY 설정 후 실사용 영상이 표시됩니다.</p>
                ) : (
                  report.youtube.map((v, i) => (
                    <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl bg-[#F5F5F7] p-3.5 space-y-2">
                      <div className="flex gap-3 items-center">
                        <div className="w-16 h-12 rounded-xl bg-zinc-900 relative overflow-hidden shrink-0 flex items-center justify-center">
                          {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-cover opacity-70" />}
                          <Play className="w-4 h-4 text-white fill-white absolute" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold leading-snug line-clamp-2">{v.title}</h3>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{v.channel}</p>
                        </div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            )}

            {tab === "reviews" && (
              <div className="space-y-2.5">
                {report.reviews.map((r, i) => (
                  <div key={i} className="rounded-2xl bg-[#F5F5F7] p-3.5 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold">{r.sourceLabel}</span>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-0.5">
                        원문 <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-xs text-zinc-700 leading-relaxed">{r.summary}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === "price" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ["naver", "N플러스 +5%"],
                    ["card", "카드할인 5%"],
                    ["payback", "페이백 2%"],
                  ] as const).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setBenefits((prev) => ({ ...prev, [k]: !prev[k] }))}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border ${
                        benefits[k] ? "bg-[#1D1D1F] text-white border-[#1D1D1F]" : "bg-white text-zinc-600 border-zinc-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {report.stores.map((st, i) => {
                  const { eff, save } = calcEffective(st.basePrice, st.supportsNaver);
                  return (
                    <div key={i} className="rounded-2xl bg-[#F5F5F7] p-3.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{st.name}</p>
                        <p className="text-[10px] text-zinc-500">기본 {st.basePrice.toLocaleString("ko-KR")}원</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold">{eff.toLocaleString("ko-KR")}원</p>
                        <p className="text-[10px] text-emerald-700 font-semibold">-{save.toLocaleString("ko-KR")}원</p>
                        <a href={st.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold underline">
                          이동 ↗
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </>
      ) : null}

      {/* Floating Bottom Search Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-28px)] max-w-[408px] z-30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAnalyze(query);
          }}
          className="liquid-glass rounded-full p-1.5 pl-4 flex items-center gap-2 shadow-xl"
        >
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="아무 상품명이나 입력 (소파, 왁스, 가전...)"
            className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none"
          />
          <button type="submit" className="w-9 h-9 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center shrink-0">
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
