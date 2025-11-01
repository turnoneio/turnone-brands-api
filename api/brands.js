import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), 'brands.json');
  const data = fs.readFileSync(filePath, 'utf8');
  const brands = JSON.parse(data);
  res.status(200).json(brands);
}
