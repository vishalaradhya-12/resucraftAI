const { handler } = require('../netlify/functions/parse-resume');

/**
 * Vercel Serverless Function Adapter for /api/parse-resume.
 * Adapts Vercel's Node (req, res) to the shared handler without duplicating logic.
 */
module.exports = async function (req, res) {
  const event = {
    httpMethod: req.method,
    headers: req.headers || {},
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
  };

  const result = await handler(event, {});
  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, value);
    }
  }
  res.status(result.statusCode || 200).send(result.body || '');
};
