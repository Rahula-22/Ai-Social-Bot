export async function fetchAnalysis() {
  const res = await fetch('/api/analyze');
  return res.json();
}