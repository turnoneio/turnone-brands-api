// Vercel Serverless Function: /api/brands.js
// CommonJS style for zero-config deployment on Vercel

const fs = require("fs");
const path = require("path");

// Simple in-repo datastore (JSON). Replace later with DB if needed.
const DATA_PATH = path.join(process.cwd(), "brands.json");

// Helper: respond with CORS headers
function withCors(req, res, data, status = 200) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.status(status).json(data);
}

module.exports = (req, res) => {
  if (req.method === "OPTIONS") {
    return withCors(req, res, { ok: true });
  }

  let raw;
  try {
    raw = fs.readFileSync(DATA_PATH, "utf8");
  } catch (e) {
    return withCors(req, res, { error: "brands.json not found" }, 500);
  }

  let items;
  try {
    items = JSON.parse(raw);
  } catch (e) {
    return withCors(req, res, { error: "Invalid JSON in brands.json" }, 500);
  }

  // Query params
  const q = (req.query.q || req.query.search || "").toString().toLowerCase();
  const industry = (req.query.industry || "").toString().toLowerCase();
  const size = (req.query.size || "").toString(); // '1-10','11-50','51-200','201-1000','1000+'
  const heatMin = Number(req.query.heat_min || 0);
  const dtc = req.query.dtc === "true" ? true : req.query.dtc === "false" ? false : null;
  const highSpend = req.query.high_spend === "true";
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit || "100", 10)));

  // Filtering
  let filtered = items.filter(b => {
    const matchesQuery =
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.instagram && b.instagram.toLowerCase().includes(q)) ||
      (b.domain && b.domain.toLowerCase().includes(q));

    const matchesIndustry = !industry || (b.industry && b.industry.toLowerCase() === industry);
    const matchesSize = !size || (b.employees_bucket && b.employees_bucket === size);
    const matchesHeat = (typeof b.heat_score === "number" ? b.heat_score : 0) >= heatMin;
    const matchesDtc = dtc === null || (!!b.is_dtc === dtc);
    const matchesHighSpend = !highSpend || !!b.signals?.high_spend;

    return matchesQuery && matchesIndustry && matchesSize && matchesHeat && matchesDtc && matchesHighSpend;
  });

  // Sort by heat desc then name
  filtered.sort((a, b) => {
    const ah = typeof a.heat_score === "number" ? a.heat_score : 0;
    const bh = typeof b.heat_score === "number" ? b.heat_score : 0;
    if (bh !== ah) return bh - ah;
    return a.name.localeCompare(b.name);
  });

  // Pagination
  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const slice = filtered.slice(start, end);

  return withCors(req, res, {
    items: slice,
    page,
    limit,
    total,
    has_more: end < total
  });
};
