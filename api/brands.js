import brands from '../brands.json' assert { type: 'json' };

export default function handler(req, res) {
  res.status(200).json(brands);
}
