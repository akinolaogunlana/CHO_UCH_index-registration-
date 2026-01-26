// delete-passport.js (deploy to Vercel/Netlify or any Node.js server)
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: "dpsbwjw83",
  api_key: "YOUR_API_KEY",
  api_secret: "YOUR_API_SECRET",
  secure: true
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { public_id, secret } = req.body;
  if (secret !== "CHO_DELETE_SECRET") return res.status(403).json({ error: "Unauthorized" });
  if (!public_id) return res.status(400).json({ error: "Missing public_id" });

  try {
    const result = await cloudinary.v2.uploader.destroy(public_id);
    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}