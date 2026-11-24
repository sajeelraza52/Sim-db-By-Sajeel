// api/proxy.js
export default async function handler(req, res) {
  // CORS headers allow karein taake aapki site ise call kar sake
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { number } = req.query;

  if (!number) {
    return res.status(400).json({ success: false, error: 'Number parameter missing' });
  }

  // Number normalize karein (jaise PHP mein kiya tha)
  let digits = String(number).replace(/\D/g, '');
  if (digits.startsWith('0092')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('92') && digits.length === 12) {
    digits = digits.slice(2);
  } else {
    digits = digits.replace(/^0+/, '');
  }

  if (!/^3\d{9}$/.test(digits)) {
    return res.status(400).json({ success: false, error: 'Invalid mobile number. Format: 03XXXXXXXXX' });
  }

  try {
    const upstreamUrl = `https://amscript.xyz/PublicApi/Siminfo.php?number=${encodeURIComponent(digits)}`;
    
    // Vercel ke server se call kar rahe hain, browser se nahi
    const response = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Upstream HTTP ${response.status}`);
    }

    const data = await response.json();
    const records = data?.data;
    const record = Array.isArray(records) ? records[0] : records;

    if (!record) {
      return res.status(404).json({ success: false, error: `No record found for ${digits}` });
    }

    // Final response (Channel link removed)
    res.status(200).json({
      success: true,
      details: {
        mobile: record.phone ?? digits,
        name: record.full_name ?? 'Not Found',
        cnic: record.cnic ?? 'Not Found',
        address: record.address ?? 'Not Found',
      },
      Developer: 'Usman Tech',
    });

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(502).json({ success: false, error: `Upstream failed: ${error.message}` });
  }
}