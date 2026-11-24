import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCachedReport, normalizeQueryKey, saveCachedReport } from "@/lib/cache";
import type { BeforeReport } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawQuery = String(body?.query || "").trim();
    if (!rawQuery) {
      return NextResponse.json({ error: "상품명 또는 URL을 입력해 주세요." }, { status: 400 });
    }

    const queryKey = normalizeQueryKey(rawQuery);

    // 1. 0원 캐시 우선 조회 (히트 시 API 호출 0회)
    const cached = await getCachedReport(queryKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Vercel 환경변수에 GEMINI_API_KEY를 먼저 입력해 주세요." },
        { status: 500 }
      );
    }

    // 2. Gemini API + 실시간 Google Search Grounding (키 1개로 유튜브·네이버·구글·최저가 통합 검색)
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `
당신은 한국 소비자의 구매 전 실패를 막아주는 AI 퍼스널 쇼퍼 'BEFORE'입니다.
반드시 Google 검색 도구를 사용해 "${rawQuery}"의 최신 한국 판매가, 유튜브 실사용 영상, 네이버 블로그/카페/커뮤니티 실사용 후기, 그리고 소비자들이 가장 많이 후회하는 단점 TOP 3를 조사하세요.

확인된 실제 검색 결과만 바탕으로 아래 순수 JSON 형식으로만 응답하세요 (코드블록 \`\`\`json 금지, 순수 JSON만 출력):
{
  "category": "카테고리명 (예: 헤어 왁스, 소파, 로봇청소기, 노트북)",
  "brand": "브랜드명",
  "productName": "정확한 상품명",
  "price": 25000,
  "officialUrl": "확인된 공식몰 또는 대표 판매처 URL",
  "baseScore": 84,
  "conditions": [
    {
      "key": "cond1",
      "label": "이 카테고리의 핵심 조건 1 (예: 모발 굵기, 반려동물)",
      "options": [{"value": "opt1", "label": "옵션1"}, {"value": "opt2", "label": "옵션2"}],
      "warningMap": { "opt1": { "penalty": 15, "message": "이 조건일 때 주의할 이유 1줄" } }
    },
    {
      "key": "cond2",
      "label": "이 카테고리의 핵심 조건 2 (예: 세정력 중시, 사용 자세)",
      "options": [{"value": "opt1", "label": "옵션1"}, {"value": "opt2", "label": "옵션2"}],
      "warningMap": { "opt1": { "penalty": 10, "message": "이 조건일 때 주의할 이유 1줄" } }
    }
  ],
  "regrets": [
    {"level": "높음", "title": "후회 요인 1", "detail": "구체적 실사용 단점", "tip": "결제 전 확인 팁"},
    {"level": "주의", "title": "후회 요인 2", "detail": "구체적 실사용 단점", "tip": "결제 전 확인 팁"},
    {"level": "주의", "title": "후회 요인 3", "detail": "구체적 실사용 단점", "tip": "결제 전 확인 팁"}
  ],
  "pros": ["검증된 장점 1", "검증된 장점 2", "검증된 장점 3"],
  "alternatives": [
    {"name": "대체 상품명", "price": "예상 가격", "reason": "어떤 조건일 때 이 대안이 더 나은지 1줄"}
  ],
  "youtube": [
    {"title": "검색된 실제 유튜브 리뷰 제목", "channel": "채널명", "thumbnail": "", "summary": "영상 핵심 실사용 요약 1줄", "url": "https://www.youtube.com/watch?v=..."}
  ],
  "reviews": [
    {"sourceType": "naver", "sourceLabel": "네이버/블로그/커뮤니티 출처", "sentiment": "장단점", "summary": "실사용 후기 요약", "url": "실제 검색된 URL"}
  ],
  "stores": [
    {"name": "판매처명 (예: 공식몰 / 네이버 스토어 / 쿠팡)", "basePrice": 25000, "supportsNaver": true, "supportsCard": true, "supportsPayback": true, "note": "할인/배송 조건", "url": "실제 검색된 URL"}
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = (response.text || "").trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const report: BeforeReport = {
      queryKey,
      cached: false,
      category: parsed.category || "일반 상품",
      brand: parsed.brand || "브랜드",
      productName: parsed.productName || rawQuery,
      price: typeof parsed.price === "number" ? parsed.price : 0,
      imageUrl: "",
      officialUrl: parsed.officialUrl || `https://www.google.com/search?q=${encodeURIComponent(rawQuery)}`,
      baseScore: typeof parsed.baseScore === "number" ? parsed.baseScore : 82,
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
      regrets: Array.isArray(parsed.regrets) ? parsed.regrets : [],
      pros: Array.isArray(parsed.pros) ? parsed.pros : [],
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
      youtube: Array.isArray(parsed.youtube) ? parsed.youtube : [],
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      stores: Array.isArray(parsed.stores) ? parsed.stores : [],
      analyzedAt: new Date().toISOString(),
    };

    await saveCachedReport(report);
    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
