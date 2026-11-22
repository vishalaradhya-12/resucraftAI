import http.server
import socketserver
import os
import json
import urllib.request
import urllib.parse
import urllib.error

PORT = 3000

SYSTEM_INSTRUCTION = """You are an expert ATS Resume Parsing Engine. Your job is to extract all information from the provided raw resume into a strictly structured, clean JSON object.

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
}"""

class ResuCraftHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-gemini-key')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        # Support both Netlify function path and /api redirect
        path = self.path.split('?')[0]
        if path in ('/.netlify/functions/parse-resume', '/api/parse-resume'):
            content_length = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_body.decode('utf-8'))
            except Exception:
                data = {}

            api_key = data.get('apiKey') or self.headers.get('x-gemini-key') or os.environ.get('GEMINI_API_KEY')
            if not api_key or not api_key.strip():
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                res = {
                    "success": False,
                    "error": "NO_API_KEY",
                    "message": "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment, or enter your free Google AI Studio key in the ResuCraft settings."
                }
                self.wfile.write(json.dumps(res).encode('utf-8'))
                return

            text = data.get('text', '')
            images = data.get('images', [])

            parts = [{"text": SYSTEM_INSTRUCTION}]
            if text:
                parts.append({"text": f"RAW RESUME CONTENT TO EXTRACT:\n\n{text}"})

            if isinstance(images, list):
                for img in images:
                    if isinstance(img, dict) and img.get('data') and img.get('mimeType'):
                        clean_b64 = img['data'].split('base64,')[-1]
                        parts.append({
                            "inlineData": {
                                "mimeType": img['mimeType'],
                                "data": clean_b64
                            }
                        })

            gemini_payload = {
                "contents": [{"parts": parts}],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json"
                }
            }

            candidate_endpoints = [
                'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent',
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
                'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent'
            ]

            parsed_resume = None
            used_model = "gemini-1.5-flash"
            last_err_msg = ""
            last_status = 502

            for base_url in candidate_endpoints:
                url = f"{base_url}?key={urllib.parse.quote(api_key.strip())}"
                req = urllib.request.Request(
                    url,
                    data=json.dumps(gemini_payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        resp_data = json.loads(resp.read().decode('utf-8'))
                        candidate = resp_data.get('candidates', [{}])[0]
                        raw_text = candidate.get('content', {}).get('parts', [{}])[0].get('text', '')
                        parsed_resume = json.loads(raw_text)
                        import re
                        m = re.search(r'models/([^:]+)', base_url)
                        if m:
                            used_model = m.group(1)
                        break
                except urllib.error.HTTPError as e:
                    err_body = e.read().decode('utf-8', errors='ignore')
                    err_msg = f"Gemini API error: HTTP {e.code}"
                    try:
                        p = json.loads(err_body)
                        if 'error' in p and 'message' in p['error']:
                            err_msg = p['error']['message']
                    except Exception:
                        pass
                    last_err_msg = err_msg
                    last_status = e.code
                    if e.code in (400, 401, 403, 429):
                        break
                except Exception as ex:
                    last_err_msg = str(ex)

            if parsed_resume is not None:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                res = {
                    "success": True,
                    "model": used_model,
                    "data": parsed_resume
                }
                self.wfile.write(json.dumps(res).encode('utf-8'))
            else:
                self.send_response(last_status if last_status >= 400 else 502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                res = {
                    "success": False,
                    "error": "GEMINI_API_ERROR",
                    "message": last_err_msg or "Failed to query Gemini model."
                }
                self.wfile.write(json.dumps(res).encode('utf-8'))
            return
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), ResuCraftHTTPRequestHandler) as httpd:
        print(f"ResuCraft AI server running at http://localhost:{PORT} (No-Cache + Serverless Functions Proxy)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
