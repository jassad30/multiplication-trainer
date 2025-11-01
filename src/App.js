import React, { useEffect, useMemo, useRef, useState } from "react";

// === أدوات الأرقام العربية الشرقية ===
const toArabicIndic = (n) => {
  const map = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  return String(n).replace(/[0-9]/g, (d) => map[parseInt(d, 10)]);
};
const fromArabicIndic = (s) => {
  const map = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"8","٨":"8","٩":"9"};
  // fix mapping typo: ensure ٧ -> 7
};

// نصحّح خريطة التحويل بشكل صحيح
const fromArabicIndicSafe = (s) => s.replace(/[٠-٩]/g, (d) => ({'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'}[d]));

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export default function App() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(2);
  const [input, setInput] = useState("");         // نخزنها دومًا كأرقام شرقية
  const [total, setTotal] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrongList, setWrongList] = useState([]);   // {q, user, ans}
  const [history, setHistory] = useState([]);       // {q, ok}
  const [isFinished, setIsFinished] = useState(false);
  const [lastResult, setLastResult] = useState(null); // {text, ok}

  const answer = useMemo(() => a * b, [a, b]);
  const inputRef = useRef(null);

  const newQuestion = () => {
    setA(randInt(2, 10));
    setB(randInt(2, 10));
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  useEffect(() => {
    newQuestion();
    // eslint-disable-next-line
  }, []);

  const submitAnswer = () => {
    if (isFinished) return; // لا شيء أثناء المراجعة
    const normalized = fromArabicIndicSafe(input).trim();
    if (normalized === "") return;
    const userVal = Number(normalized);
    const ok = userVal === answer;

    const qTxt = `${toArabicIndic(a)} × ${toArabicIndic(b)} = ${toArabicIndic(userVal)}`;
    setHistory((h) => [{ q: qTxt, ok }, ...h].slice(0, 80));
    setTotal((t) => t + 1);
    if (ok) setCorrect((c) => c + 1);
    else setWrongList((w) => [{ q: `${toArabicIndic(a)} × ${toArabicIndic(b)}`, user: toArabicIndic(userVal), ans: answer }, ...w]);

    // شريط نتيجة فوري يعرض السؤال السابق مع الحكم
    setLastResult({
      ok,
      text: ok
        ? `✔️ صحيح — ${toArabicIndic(a)} × ${toArabicIndic(b)} = ${toArabicIndic(answer)}`
        : `❌ خطأ — ${toArabicIndic(a)} × ${toArabicIndic(b)} = ${toArabicIndic(userVal)} (الصحيح: ${toArabicIndic(answer)})`
    });

    // سؤال جديد فورًا — كبسة Enter واحدة تكفي
    newQuestion();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      submitAnswer();
    }
  };

  const resetAll = () => {
    setTotal(0);
    setCorrect(0);
    setWrongList([]);
    setHistory([]);
    setIsFinished(false);
    setLastResult(null);
    newQuestion();
  };

  const finish = () => {
    setIsFinished(true);
    setLastResult(null); // نخفي الشريط
    setTimeout(() => inputRef.current?.blur(), 0);
  };

  const resume = () => {
    setIsFinished(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);

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
        .input{width:min(460px,80vw);text-align:center;font-size:clamp(40px,7vw,72px);font-weight:800;border:2px solid #c7d2fe;border-radius:18px;padding:12px 16px;outline:none;background:#eef2ff;font-family:"Noto Naskh Arabic","Segoe UI",sans-serif}
        .input:focus{box-shadow:0 0 0 8px rgba(99,102,241,.15);border-color:#818cf8}
        .toast{margin:8px auto 0;max-width:720px;border-radius:16px;padding:10px 14px;font-weight:800}
        .ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
        .bad{background:#fff1f2;color:#991b1b;border:1px solid #fecaca}
        .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}
        .kpi{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:20px;padding:16px;text-align:center}
        .kpi .lbl{font-size:12px;opacity:.9}.kpi .val{font-size:28px;font-weight:900}
        .actions{display:flex;justify-content:center;gap:10px;margin-top:14px;flex-wrap:wrap}
        .section-title{color:#4f46e5;font-weight:900;margin:0 0 8px 0}
        ul.list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;max-height:260px;overflow:auto}
        .item{border:1px solid #e5e7eb;background:#f9fafb;border-radius:14px;padding:10px 12px;font-weight:700}
        .item.ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}
        .item.bad{background:#fff1f2;border-color:#fecaca;color:#991b1b}
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
                {wrongList.length > 0 && (
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
              <div className="hint">اكتب الجواب واضغط <b>Enter</b> مرة واحدة — سيتم التحقق والانتقال للسؤال التالي فورًا.</div>
            )}

            {/* المسألة */}
            <div className="question">
              {toArabicIndic(a)} <span style={{color:"#9ca3af"}}>×</span> {toArabicIndic(b)} =
            </div>

            {!isFinished && (
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
            )}

            {/* شريط نتيجة آخر إجابة */}
            {lastResult && (
              <div className={`toast ${lastResult.ok ? 'ok' : 'bad'}`}>
                {lastResult.text}
              </div>
            )}

            {/* مؤشرات الأداء */}
            <div className="kpis">
              <div className="kpi"><div className="lbl">الإجمالي</div><div className="val">{toArabicIndic(total)}</div></div>
              <div className="kpi"><div className="lbl">صحيح</div><div className="val">{toArabicIndic(correct)}</div></div>
              <div className="kpi"><div className="lbl">النسبة</div><div className="val">{toArabicIndic(percent)}%</div></div>
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
                    <li key={idx} className={`item ${h.ok ? 'ok' : 'bad'}`}>
                      {h.q} — {h.ok ? 'صحيح' : 'خطأ'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="card">
              <h2 className="section-title">الأخطاء للمراجعة <span className="badge">{toArabicIndic(wrongList.length)}</span></h2>
              {wrongList.length === 0 ? (
                <div className="hint">لا توجد أخطاء — ممتاز! 🌟</div>
              ) : (
                <ul className="list">
                  {wrongList.map((w, i) => (
                    <li key={i} className="item bad">
                      {w.q} <span style={{color:"#9ca3af"}}>=</span> {w.user} <span className="hint">(الصحيح: {toArabicIndic(w.ans)})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}