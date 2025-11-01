// /api/brands.js
const fs = require("fs");
const path = require("path");

function withCors(res, data, status = 200) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.status(status).json(data);
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return withCors(res, { ok: true });

  // load dataset
  let raw;
  try {
    raw = fs.readFileSync(path.join(process.cwd(), "brands.json"), "utf8");
  } catch {
    return withCors(
      { ...res },
      { data: [], meta: { page: 1, limit: 0, total: 0, total_pages: 0 } },
      200
    );
  }

  let items;
  try {
    items = JSON.parse(raw);
  } catch {
    return withCors(
      { ...res },
      { data: [], meta: { page: 1, limit: 0, total: 0, total_pages: 0 } },
      200
    );
  }

  // query params, accept multiple spellings
  const q = (req.query.q || req.query.search || req.query.query || "")
    .toString()
    .toLowerCase();

  const industries = []
    .concat(req.query.industry || [])
    .concat(req.query.industries || []);

  const sizes = []
    .concat(req.query.size || [])
    .concat(req.query.company_size || [])
    .map(String);

  const heatMin = Number(req.query.heat_min || 0);

  const isDtcParam = req.query.is_dtc ?? req.query.dtc ?? null;
  const isDtc =
    isDtcParam === "true" ? true : isDtcParam === "false" ? false : null;

  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "24", 10)));

  // filter
  let filtered = items.filter((b) => {
    if (q) {
      const s = `${b.name || ""} ${b.domain || ""} ${b.instagram || ""}`.toLowerCase();
      if (!s.includes(q)) return false;
    }
    if (industries.length && !industries.includes(b.industry)) return false;
    if (sizes.length && !sizes.includes(b.employees_bucket)) return false; // dataset uses employees_bucket
    if (heatMin && (b.heat_score || 0) < heatMin) return false;
    if (isDtc !== null && !!b.is_dtc !== isDtc) return false;
    return true;
  });

  // sort
  const sort = (req.query.sort || "-heat_score").toString();
  filtered.sort((a, b) => {
    const key = sort.replace("-", "");
    const dir = sort.startsWith("-") ? -1 : 1;
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
  });

  // paginate
  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return withCors(res, {
    data,
    meta: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
};
