/** stopwatch.js — قياس زمن استجابة الشبكة الحقيقي (Task 2.3) */
export function start() {
  const t0 = performance.now();
  return {
    /** زمن منقضٍ بالمللي ثانية حتى لحظة الاستدعاء */
    ms: () => Math.round(performance.now() - t0),
  };
}
