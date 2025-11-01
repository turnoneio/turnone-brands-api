import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'brands.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const set = new Set();
    for (const b of data) if (b.industry) set.add(b.industry);
    res.status(200).json({ data: Array.from(set).sort() });
  } catch (e) {
    res.status(500).json({ error: 'failed_to_build_industries' });
  }
}
