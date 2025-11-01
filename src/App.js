import React, { useEffect, useMemo, useRef, useState } from "react";

// === أدوات الأرقام العربية الشرقية ===
const toArabicIndic = (n) => {
  const map = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  return String(n).replace(/[0-9]/g, (d) => map[parseInt(d, 10)]);
};
const fromArabicIndic = (s) =>
  s.replace(/[٠-٩]/g, (d) => ({"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"}[d]));

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const EXPECTED_TIME_MS = 5000;
const REVIEW_CORRECT_TARGET = 2;
const buildReviewEntries = (stats) =>
  Object.values(stats)
    .filter((stat) => stat.wrong > 0)
    .map((stat) => ({ ...stat }));
const formatSeconds = (ms) => {
  const seconds = (ms / 1000).toFixed(1);
  return toArabicIndic(seconds).replace(".", "٫");
};

export default function App() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(2);
  const [input, setInput] = useState("");         // نخزنها دومًا كأرقام شرقية
  const [total, setTotal] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [questionStats, setQuestionStats] = useState({}); // key -> aggregated stats
  const [history, setHistory] = useState([]);       // {q, ok, timeMs, slow}
  const [isFinished, setIsFinished] = useState(false);
  const [lastResult, setLastResult] = useState(null); // {text, ok, slow}
  const [questionStart, setQuestionStart] = useState(null);
  const [timeStats, setTimeStats] = useState({ totalMs: 0, count: 0, maxMs: 0 });
  const lastPairRef = useRef(null);

  const reviewEntries = useMemo(() => buildReviewEntries(questionStats), [questionStats]);

  const pendingReviewQuestions = useMemo(
    () => reviewEntries.filter((stat) => stat.correct < REVIEW_CORRECT_TARGET),
    [reviewEntries]
  );

  const orderedReviewEntries = useMemo(() => {
    const pending = [];
    const completed = [];
    reviewEntries.forEach((stat) => {
      if (stat.correct < REVIEW_CORRECT_TARGET) pending.push(stat);
      else completed.push(stat);
    });
    return [...pending, ...completed];
  }, [reviewEntries]);

  const answer = useMemo(() => a * b, [a, b]);
  const inputRef = useRef(null);

  const pickNextPair = (statsSnapshot, lastPair) => {
    const entries = buildReviewEntries(statsSnapshot);
    const pending = entries.filter((stat) => stat.correct < REVIEW_CORRECT_TARGET);
    const reviewProbability = pending.length > 0 ? 0.45 : 0;
    const shouldUseReview = pending.length > 0 && Math.random() < reviewProbability;

    if (shouldUseReview) {
      const pool = pending.filter(
        (stat) => !(lastPair && stat.a === lastPair.a && stat.b === lastPair.b)
      );
      const choicePool = pool.length > 0 ? pool : pending;
      const randomReview = choicePool[Math.floor(Math.random() * choicePool.length)];
      return { nextA: randomReview.a, nextB: randomReview.b };
    }

    let candidateA;
    let candidateB;
    do {
      candidateA = randInt(2, 10);
      candidateB = randInt(2, 10);
    } while (lastPair && candidateA === lastPair.a && candidateB === lastPair.b);

    return { nextA: candidateA, nextB: candidateB };
  };

  const applyNextQuestion = (statsSnapshot) => {
    const { nextA, nextB } = pickNextPair(statsSnapshot, lastPairRef.current);
    setA(nextA);
    setB(nextB);
    setInput("");
    setQuestionStart(Date.now());
    lastPairRef.current = { a: nextA, b: nextB };
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const newQuestion = () => {
    applyNextQuestion(questionStats);
  };

  useEffect(() => {
    newQuestion();
    // eslint-disable-next-line
  }, []);

  const submitAnswer = () => {
    if (isFinished) return; // لا شيء أثناء المراجعة
    const normalized = fromArabicIndic(input).trim();
    if (normalized === "") return;
    const userVal = Number(normalized);
    const ok = userVal === answer;
    const now = Date.now();
    const elapsedMs = questionStart ? now - questionStart : 0;
    const slow = elapsedMs > EXPECTED_TIME_MS;

    const qTxt = `${toArabicIndic(a)} × ${toArabicIndic(b)} = ${toArabicIndic(userVal)}`;
    setHistory((h) => [{ q: qTxt, ok, timeMs: elapsedMs, slow }, ...h].slice(0, 80));
    setTotal((t) => t + 1);
    if (ok) setCorrect((c) => c + 1);

    const key = `${a}x${b}`;
    const prevStat = questionStats[key] || {
      a,
      b,
      correct: 0,
      wrong: 0,
      attempts: 0,
      slowCount: 0,
      lastUserAnswer: null,
      lastWasCorrect: null,
      lastTimeMs: null
    };

    const nextStat = {
      ...prevStat,
      a,
      b,
      correct: prevStat.correct + (ok ? 1 : 0),
      wrong: prevStat.wrong + (ok ? 0 : 1),
      attempts: prevStat.attempts + 1,
      slowCount: prevStat.slowCount + (slow ? 1 : 0),
      lastUserAnswer: toArabicIndic(userVal),
      lastWasCorrect: ok,
      lastTimeMs: elapsedMs
    };

    const nextQuestionStats = {
      ...questionStats,
      [key]: nextStat
    };

    setQuestionStats(nextQuestionStats);

    setTimeStats((prev) => {
      const totalMs = prev.totalMs + elapsedMs;
      const count = prev.count + 1;
      const maxMs = Math.max(prev.maxMs, elapsedMs);
      return { totalMs, count, maxMs };
    });

    // شريط نتيجة فوري يعرض السؤال السابق مع الحكم
    setLastResult({
      ok,
      slow,
      text: ok
        ? `✔️ صحيح — ${toArabicIndic(a)} × ${toArabicIndic(b)} = ${toArabicIndic(answer)} — ⏱️ ${formatSeconds(elapsedMs)} ث`
        : `❌ خطأ — ${toArabicIndic(a)} × ${toArabicIndic(b)} = ${toArabicIndic(userVal)} (الصحيح: ${toArabicIndic(answer)}) — ⏱️ ${formatSeconds(elapsedMs)} ث`
    });

    // سؤال جديد فورًا — كبسة Enter واحدة تكفي
    applyNextQuestion(nextQuestionStats);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      submitAnswer();
    }
  };

  const resetAll = () => {
    setTotal(0);
    setCorrect(0);
    setQuestionStats({});
    setHistory([]);
    setIsFinished(false);
    setLastResult(null);
    setTimeStats({ totalMs: 0, count: 0, maxMs: 0 });
    applyNextQuestion({});
  };

  const finish = () => {
    setIsFinished(true);
    setLastResult(null); // نخفي الشريط
    setQuestionStart(null);
    setTimeout(() => inputRef.current?.blur(), 0);
  };

  const resume = () => {
    setIsFinished(false);
    setQuestionStart(Date.now());
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  const avgTimeMs = timeStats.count === 0 ? 0 : timeStats.totalMs / timeStats.count;

  return (
    <div dir="rtl" className="app">
      <style>{`
        :root{--indigo:#4f46e5}
        *{box-sizing:border-box} body{margin:0}
        .app{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(135deg,#eef2ff,#ffffff 40%,#faf5ff)}
        .container{width:100%;max-width:900px;margin:auto}
        header{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:16px}
        h1{margin:0;color:var(--indigo);font-weight:900;font-size:clamp(22px,3vw,32px)}
        .btn{border:none;border-radius:16px;padding:10px 16px;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.08)}
        .primary{background:#6366f1}.primary:hover{background:#4f46e5}
        .danger{background:#ef4444}.danger:hover{background:#dc2626}
        .success{background:#10b981}.success:hover{background:#059669}
        .grid{display:grid;gap:18px}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:24px;box-shadow:0 12px 30px rgba(79,70,229,.08)}
        .center{text-align:center}
        .question{font-weight:900;color:var(--indigo);line-height:1.1;margin:12px 0;font-size:clamp(64px,10vw,120px)}
        .inputRow{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px}
        .input{width:min(360px,70vw);text-align:center;font-size:clamp(40px,7vw,72px);font-weight:800;border:2px solid #c7d2fe;border-radius:18px;padding:12px 16px;outline:none;background:#eef2ff;font-family:"Noto Naskh Arabic","Segoe UI",sans-serif}
        .input:focus{box-shadow:0 0 0 8px rgba(99,102,241,.15);border-color:#818cf8}
        .submit{background:#2563eb}
        .submit:hover{background:#1d4ed8}
        .toast{margin:8px auto 0;max-width:720px;border-radius:16px;padding:10px 14px;font-weight:800}
        .ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
        .bad{background:#fff1f2;color:#991b1b;border:1px solid #fecaca}
        .toast.slow{background:#fff7ed;color:#9a3412;border:1px solid #fdba74}
        .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:18px}
        .kpi{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:20px;padding:16px;text-align:center}
        .kpi .lbl{font-size:12px;opacity:.9}.kpi .val{font-size:28px;font-weight:900}
        .actions{display:flex;justify-content:center;gap:10px;margin-top:14px;flex-wrap:wrap}
        .section-title{color:#4f46e5;font-weight:900;margin:0 0 8px 0}
        ul.list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;max-height:260px;overflow:auto}
        .item{border:1px solid #e5e7eb;background:#f9fafb;border-radius:14px;padding:10px 12px;font-weight:700}
        .item.ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
        .item.bad{background:#fff1f2;border-color:#fecaca;color:#991b1b}
        .item.slow{background:#fff7ed;border-color:#fdba74;color:#9a3412}
        .hint{color:#6b7280;font-size:14px}
        .badge{display:inline-block;margin-inline-start:8px;padding:2px 8px;border-radius:9999px;background:#eef2ff;color:#4338ca;font-weight:800}
        .reviewBanner{margin:6px 0 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:14px;padding:10px 12px;color:#92400e;font-weight:700}
      `}</style>

      <div className="container">
        <header>
          <h1>🧮 مُدرِّب جداول الضرب</h1>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {!isFinished ? (
              <>
                <button className="btn success" onClick={finish}>إنهاء التدريب</button>
                {pendingReviewQuestions.length > 0 && (
                  <button className="btn primary" onClick={finish}>مراجعة الأخطاء الآن</button>
                )}
              </>
            ) : (
              <button className="btn primary" onClick={resume}>استئناف التدريب</button>
            )}
            <button className="btn danger" onClick={resetAll}>إعادة تعيين</button>
          </div>
        </header>

        <div className="grid">
          <div className="card center">
            {isFinished && (
              <div className="reviewBanner">وضع المراجعة مُفعل — تظهر الأخطاء أدناه لمراجعتها.</div>
            )}
            {!isFinished && (
              <div className="hint">اكتب الجواب ثم اضغط <b>Enter</b> أو زر <b>تحقق</b> — سيتم الانتقال للسؤال التالي تلقائيًا.</div>
            )}

            {/* المسألة */}
            <div className="question">
              {toArabicIndic(a)} <span style={{color:"#9ca3af"}}>×</span> {toArabicIndic(b)} =
            </div>

            {!isFinished && (
              <div className="inputRow">
                <input
                  ref={inputRef}
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9٠-٩]*"
                  placeholder={toArabicIndic(0)}
                  className="input"
                  value={input}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9٠-٩]/g, "");
                    const western = raw.replace(/[٠-٩]/g, (d) => ({'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'}[d]));
                    setInput(toArabicIndic(western));
                  }}
                  onKeyDown={handleKeyDown}
                />
                <button className="btn submit" type="button" onClick={submitAnswer}>
                  تحقق
                </button>
              </div>
            )}

            {/* شريط نتيجة آخر إجابة */}
            {lastResult && (
              <div className={`toast ${lastResult.ok ? 'ok' : 'bad'} ${lastResult.slow ? 'slow' : ''}`}>
                {lastResult.text}
              </div>
            )}

            {/* مؤشرات الأداء */}
            <div className="kpis">
              <div className="kpi"><div className="lbl">الإجمالي</div><div className="val">{toArabicIndic(total)}</div></div>
              <div className="kpi"><div className="lbl">النسبة</div><div className="val">{toArabicIndic(percent)}%</div></div>
              <div className="kpi"><div className="lbl">متوسط الزمن</div><div className="val">{timeStats.count === 0 ? '—' : `${formatSeconds(avgTimeMs)} ث`}</div></div>
              <div className="kpi"><div className="lbl">أطول زمن</div><div className="val">{timeStats.count === 0 ? '—' : `${formatSeconds(timeStats.maxMs)} ث`}</div></div>
            </div>
          </div>

          {/* أثناء التدريب: سجل كامل. عند الانتهاء: الأخطاء فقط */}
          {!isFinished ? (
            <div className="card">
              <h2 className="section-title">سجل الإجابات</h2>
              {history.length === 0 ? (
                <div className="hint">لا يوجد سجل بعد.</div>
              ) : (
                <ul className="list">
                  {history.map((h, idx) => (
                    <li key={idx} className={`item ${h.ok ? 'ok' : 'bad'} ${h.slow ? 'slow' : ''}`}>
                      {h.q} — {h.ok ? 'صحيح' : 'خطأ'} — ⏱️ {formatSeconds(h.timeMs)} ث
                      {h.slow && <span style={{ marginInlineStart: 8 }}>⏰</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="card">
              <h2 className="section-title">الأخطاء للمراجعة <span className="badge">{toArabicIndic(pendingReviewQuestions.length)}</span></h2>
              {reviewEntries.length === 0 ? (
                <div className="hint">لا توجد أخطاء — ممتاز! 🌟</div>
              ) : (
                <ul className="list">
                  {orderedReviewEntries.map((stat) => {
                    const needsReview = stat.correct < REVIEW_CORRECT_TARGET;
                    const remaining = Math.max(REVIEW_CORRECT_TARGET - stat.correct, 0);
                    return (
                      <li key={`${stat.a}x${stat.b}`} className={`item ${needsReview ? 'bad' : 'ok'}`}>
                        {toArabicIndic(stat.a)} × {toArabicIndic(stat.b)} <span style={{color:"#9ca3af"}}>=</span> {toArabicIndic(stat.a * stat.b)}
                        <div className="hint">
                          ✅ مرات صحيحة: {toArabicIndic(stat.correct)} — ❌ مرات خاطئة: {toArabicIndic(stat.wrong)}
                        </div>
                        <div className="hint">
                          {stat.lastUserAnswer !== null ? (
                            <>
                              آخر محاولة: {stat.lastUserAnswer} — {stat.lastWasCorrect ? 'صحيح' : 'خطأ'} — ⏱️ {formatSeconds(stat.lastTimeMs)} ث
                            </>
                          ) : (
                            'لا توجد محاولات بعد'
                          )}
                        </div>
                        {stat.slowCount > 0 && (
                          <div className="hint">⏰ مرات كان فيها الحل بطيئًا: {toArabicIndic(stat.slowCount)}</div>
                        )}
                        {needsReview ? (
                          <div className="hint">🔁 يحتاج إلى {toArabicIndic(remaining)} إجابة صحيحة إضافية لإكمال المراجعة.</div>
                        ) : (
                          <div className="hint">🎉 تمت المراجعة بنجاح!</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}