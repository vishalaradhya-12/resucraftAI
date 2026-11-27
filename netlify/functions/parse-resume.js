/**
 * Netlify Serverless Function: parse-resume.js
 * 
 * Uses Google Gemini 1.5 Flash to semantically parse complex, multi-column,
 * Canva, or scanned resumes into ResuCraft's high-precision JSON schema.
 * 
 * Environment Variable: GEMINI_API_KEY (configured in Netlify Site Configuration)
 * Also supports client-supplied key via 'x-gemini-key' header or body 'apiKey' for local/self-hosted use.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-gemini-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const SYSTEM_INSTRUCTION = `You are an expert ATS Resume Parsing Engine. Your job is to extract all information from the provided raw resume into a strictly structured, clean JSON object.

Follow these critical extraction rules:
1. Fix OCR, kerning, and line-wrapping errors (e.g. "Mar 202 3" -> "Mar 2023", "Pharmacolog y" -> "Pharmacology", "completenes s" -> "completeness").
2. Experience: Extract every job with exact job title, company name, location, and dates (e.g. "Nov 2023 - Present").
3. Bullets: Each bullet must be an individual, complete, clean accomplishment statement. Do NOT combine multiple bullets into one. Do NOT split a single sentence across bullets. Never include repeated job titles inside bullet text.
4. Skills: Accurately categorize all skills into:
   - technical: programming languages, algorithms, data engineering, libraries
   - domain: business domains (e.g. Inventory Analytics, Pharmacovigilance, Supply Chain)
   - tools: software, platforms, cloud tools (e.g. Power BI, Snowflake, Argus Safety)
   - soft: leadership, collaboration, problem-solving
5. Projects: Extract notable personal, academic, or key projects with name, role, tech stack, and accomplishment bullets.
6. Education: Extract degrees, institutions, locations, and graduation years.
7. Certifications: Extract certification names, issuing bodies, and dates.
8. Output ONLY the JSON matching this exact schema:
{
  "name": "Candidate Full Name",
  "targetTitle": "Current or Target Professional Title",
  "email": "candidate email",
  "phone": "candidate phone",
  "location": "City, State/Country",
  "linkedin": "LinkedIn URL or handle",
  "github": "GitHub URL or handle",
  "portfolio": "Portfolio/Website URL",
  "summary": "Executive / Professional Summary paragraph",
  "skills": {
    "technical": ["Skill 1", "Skill 2"],
    "domain": ["Domain 1", "Domain 2"],
    "tools": ["Tool 1", "Tool 2"],
    "soft": ["Soft Skill 1"]
  },
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country",
      "period": "Start Date - End Date",
      "bullets": [
        "Accomplishment bullet 1",
        "Accomplishment bullet 2"
      ]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "role": "Role / Lead",
      "link": "URL",
      "techStack": "Technologies used",
      "description": "Brief description",
      "bullets": [
        "Project bullet 1"
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree and Major",
      "institution": "Institution Name",
      "location": "City, State",
      "year": "Graduation Year"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Body",
      "year": "Year"
    }
  ]
}`;

exports.handler = async function(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const apiKey = payload.apiKey || event.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: 'NO_API_KEY',
          message: 'Gemini API key is not configured. Please set GEMINI_API_KEY in your Netlify Site Configuration (Environment variables), or enter your free Google AI Studio key in the ResuCraft settings.'
        })
      };
    }

    const { text, images } = payload;
    if (!text && (!images || images.length === 0)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: 'EMPTY_INPUT',
          message: 'No resume text or images were provided for extraction.'
        })
      };
    }

    // Build Gemini multimodal parts
    const parts = [
      { text: SYSTEM_INSTRUCTION }
    ];

    if (text) {
      parts.push({ text: `RAW RESUME CONTENT TO EXTRACT:\n\n${text}` });
    }

    if (Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        if (img.data && img.mimeType) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data.replace(/^data:[^;]+;base64,/, '')
            }
          });
        }
      }
    }

    // Candidate models to try in order of preference (v1 stable, v1beta aliases)
    const candidateEndpoints = [
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent'
    ];

    // Dynamically discover available models if needed
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const dynModels = (listData.models || [])
          .filter(m => {
            const name = (m.name || '').toLowerCase();
            const methods = m.supportedGenerationMethods || [];
            return methods.includes('generateContent') &&
              name.includes('gemini') &&
              !/-(tts|image|audio|robotics|computer-use|live)/.test(name) &&
              !name.includes('embedding') &&
              !name.includes('aqa');
          })
          .sort((a, b) => (b.name.includes('flash') ? 1 : 0) - (a.name.includes('flash') ? 1 : 0))
          .slice(0, 3)
          .map(m => `https://generativelanguage.googleapis.com/v1beta/${m.name}:generateContent`);
        for (const u of dynModels) {
          if (!candidateEndpoints.includes(u)) candidateEndpoints.push(u);
        }
      }
    } catch (e) {}

    let response = null;
    let lastErrMsg = '';
    let usedModel = 'gemini-1.5-flash';

    for (const endpoint of candidateEndpoints) {
      const geminiUrl = `${endpoint}?key=${encodeURIComponent(apiKey.trim())}`;
      try {
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              { parts }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        });

        if (res.ok) {
          response = res;
          const match = endpoint.match(/models\/([^:]+)/);
          if (match) usedModel = match[1];
          break;
        }

        const errText = await res.text();
        let errMsg = `HTTP ${res.status}`;
        try {
          const parsedErr = JSON.parse(errText);
          if (parsedErr.error && parsedErr.error.message) {
            errMsg = parsedErr.error.message;
          }
        } catch (e) {}

        lastErrMsg = errMsg;

        // If it's not a 404/not found error (e.g. invalid key 400/403 or quota 429), don't keep trying models
        if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429) {
          return {
            statusCode: res.status,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              success: false,
              error: 'GEMINI_API_ERROR',
              message: errMsg
            })
          };
        }
      } catch (networkErr) {
        lastErrMsg = networkErr.message;
      }
    }

    if (!response || !response.ok) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: 'GEMINI_API_ERROR',
          message: lastErrMsg || 'Failed to reach any supported Gemini model.'
        })
      };
    }

    const geminiData = await response.json();
    const candidate = geminiData.candidates && geminiData.candidates[0];
    const outputText = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;

    if (!outputText) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: 'NO_RESPONSE',
          message: 'Gemini completed without returning extracted text.'
        })
      };
    }

    let parsedResume;
    try {
      parsedResume = JSON.parse(outputText);
    } catch (parseErr) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: 'JSON_PARSE_ERROR',
          message: 'Failed to parse Gemini output as structured JSON.',
          raw: outputText
        })
      };
    }

    // Return successfully extracted structured resume
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        model: usedModel,
        data: parsedResume
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error processing resume.'
      })
    };
  }
};
