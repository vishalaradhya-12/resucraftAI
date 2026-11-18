/**
 * ResuCraft Universal Client-Side Resume Parser
 * Parses plain text, PDF, and DOCX resumes into structured candidate data
 * with 0 server dependency (100% client-side privacy).
 */

class ResumeParser {
  constructor() {
    this.pdfjsLib = window.pdfjsLib || null;
    this.mammoth = window.mammoth || null;
  }

  /**
   * Main entry point to extract text from any uploaded File
   * @param {File} file - PDF, DOCX, TXT, or MD file
   * @returns {Promise<string>} Extracted plain text
   */
  async extractTextFromFile(file) {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      return await this.extractFromPDF(file);
    } else if (fileName.endsWith('.docx')) {
      return await this.extractFromDOCX(file);
    } else {
      // Plain text, markdown, rtf
      return await this.readTextFile(file);
    }
  }

  readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  async extractFromPDF(file) {
    if (!window.pdfjsLib) {
      throw new Error('PDF reader engine is still loading. Please try again in 2 seconds.');
    }
    
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let lastY = null;
      let pageText = '';

      for (const item of textContent.items) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }
      fullText += pageText + '\n\n';
    }

    return fullText;
  }

  async extractFromDOCX(file) {
    if (!window.mammoth) {
      throw new Error('Word document reader is still loading. Please try again in 2 seconds.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  }

  /**
   * Sanitizes extracted text and fixes punctuation and PDF artifacts
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+([,.:;!?%])/g, '$1')   // Remove space before punctuation: "10% ." -> "10%."
      .replace(/([(\[{])\s+/g, '$1')      // Remove space after open bracket: "( pandas" -> "(pandas"
      .replace(/\s+([)\]}])/g, '$1')      // Remove space before close bracket: "NumPy )" -> "NumPy)"
      .replace(/([a-zA-Z])\s+-\s*([a-zA-Z])/g, '$1-$2') // Fix separated hyphens: "SQL -based" -> "SQL-based"
      .replace(/₹\s+/g, '₹')              // "₹ 1.2 Cr" -> "₹1.2 Cr"
      .replace(/\$\s+/g, '$')              // "$ 100" -> "$100"
      .replace(/\s{2,}/g, ' ')            // Multiple spaces to single space
      .trim();
  }

  /**
   * Normalizes Unicode bullet symbols into standard bullet representation
   */
  normalizeBullets(text) {
    if (!text) return '';
    return text
      .replace(/[\u2022\u25cf\u25aa\uf0b7\u2219\u25cb\u00b7▪●■◆◇►▸✓✔]/g, '• ')
      .replace(/^[ \t]*[-*]\s+/gm, '• ');
  }

  /**
   * Unwraps lines that were wrapped mid-sentence in PDFs
   */
  unwrapSectionLines(lines) {
    const bulletRe = /^[•\-\*▸–—\+✓●▪■◆◇►✔\d+\.]\s*/;
    const dateRe = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\b\d{4}|\d{1,2}\/\d{4})\s*[-–—to\s]+\s*(Present|Current|\b\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4})/i;
    // Capitalized action verbs indicating a bullet point even without bullet symbol
    const actionVerbsList = [
      'Identified', 'Analysed', 'Analyzed', 'Built', 'Designed', 'Automated',
      'Spearheaded', 'Uncovered', 'Reduced', 'Improved', 'Increased', 'Architected',
      'Engineered', 'Developed', 'Led', 'Created', 'Implemented', 'Achieved',
      'Collaborated', 'Drove', 'Optimized', 'Maintained', 'Delivered', 'Managed',
      'Formulated', 'Executed', 'Coordinated', 'Established', 'Streamlined',
      'Pioneered', 'Directed', 'Authored', 'Mentored', 'Trained', 'Scaled',
      'Resolved', 'Migrated', 'Administered', 'Negotiated', 'Constructed',
      'Transformed', 'Generated', 'Accelerated', 'Facilitated', 'Modernized',
      'Programmed', 'Performed', 'Ran', 'Conducted', 'Supervised', 'Overhauled',
      'Synthesized', 'Orchestrated', 'Initiated', 'Partnered', 'Produced', 'Monitored'
    ];
    const actionVerbStart = new RegExp('^(?:' + actionVerbsList.join('|') + ')\\b');
    const jobTitleKeywords = /\b(?:Analyst|Engineer|Manager|Developer|Director|Lead|Consultant|Executive|Specialist|Intern|Architect|Designer|Scientist|Associate|Officer|Coordinator|Administrator|VP)\b/i;

    const unwrapped = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      const isBullet = bulletRe.test(line);
      const isDate = dateRe.test(line);
      const startsWithCapVerb = actionVerbStart.test(line);

      // Check if this line is an implied bullet without symbol
      if (!isBullet && !isDate && startsWithCapVerb && line.length > 30) {
        line = '• ' + line;
      }

      const nowBullet = bulletRe.test(line);

      if (!nowBullet && !isDate && unwrapped.length > 0) {
        const prev = unwrapped[unwrapped.length - 1];
        const prevIsBullet = bulletRe.test(prev);

        if (prevIsBullet) {
          // Is this line a continuation of the previous bullet?
          // 1. If previous line did not end with a sentence terminator (. ! ?), it's definitely continuation
          const prevEndsWithTerminator = /[.!?]['"]?\s*$/.test(prev);
          // 2. If current line starts with lowercase, it's definitely continuation
          const startsWithLower = /^[a-z]/.test(line);
          // 3. Check if this line is an actual job title header
          const isHeader = !startsWithLower && (line.includes('@') || line.includes(' | ') || (jobTitleKeywords.test(line) && line.length < 50 && prevEndsWithTerminator));

          if (!isHeader || !prevEndsWithTerminator || startsWithLower) {
            // Continuation of previous bullet!
            if (prev.endsWith('-')) {
              unwrapped[unwrapped.length - 1] = prev.slice(0, -1) + line;
            } else {
              unwrapped[unwrapped.length - 1] = prev + ' ' + line;
            }
            continue;
          }
        }
      }

      unwrapped.push(line);
    }
    return unwrapped;
  }

  splitSkills(str) {
    if (!str) return [];
    const tokens = [];
    let current = '';
    let inParen = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '(') inParen = true;
      else if (char === ')') inParen = false;

      if ((char === ',' || char === '|' || char === '•' || char === ';') && !inParen) {
        if (current.trim().length > 1) tokens.push(this.cleanText(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim().length > 1) tokens.push(this.cleanText(current.trim()));
    return tokens;
  }

  /**
   * Intelligently parses raw resume text into structured ResuCraft candidate object
   * @param {string} text - Raw unformatted text
   * @returns {Object} Structured resumeData
   */
  parseText(text) {
    if (!text || typeof text !== 'string') return null;

    const normalized = this.normalizeBullets(text);
    const rawLines = normalized
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const result = {
      id: 'custom_' + Date.now(),
      name: '',
      targetTitle: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: '',
      summary: '',
      skills: {},
      experience: [],
      projects: [],
      education: [],
      certifications: []
    };

    if (rawLines.length === 0) return result;

    // Contact extraction patterns
    const emailRe = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const phoneRe = /(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{4,5})/;
    const linkedinRe = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i;
    const githubRe = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i;

    // Scan first 8 lines for candidate identity and contact info
    const headerLines = rawLines.slice(0, 8);
    for (let i = 0; i < headerLines.length; i++) {
      const line = headerLines[i];

      // Scan pipe-separated tokens
      if (line.includes('|') || line.includes('•')) {
        const parts = line.split(/[|•]/).map(p => p.trim());
        parts.forEach(p => {
          if (p.includes('@') && !p.includes('/') && !result.email) result.email = p;
          else if (p.includes('linkedin.com') && !result.linkedin) {
            const li = p.match(linkedinRe);
            result.linkedin = li ? 'linkedin.com/in/' + li[1] : p;
          } else if (p.includes('github.com') && !result.github) {
            const gh = p.match(githubRe);
            result.github = gh ? 'github.com/' + gh[1] : p;
          } else if (phoneRe.test(p) && !result.phone) {
            result.phone = p;
          } else if (!result.location && p.length > 2 && p.length < 45 && !p.includes(':')) {
            result.location = this.cleanText(p);
          }
        });
      } else {
        const em = line.match(emailRe);
        if (em && !result.email) result.email = em[1].trim();

        const ph = line.match(phoneRe);
        if (ph && !result.phone) result.phone = ph[0].trim();

        const li = line.match(linkedinRe);
        if (li && !result.linkedin) result.linkedin = 'linkedin.com/in/' + li[1];

        const gh = line.match(githubRe);
        if (gh && !result.github) result.github = 'github.com/' + gh[1];
      }

      // Name extraction: first non-contact, non-header line
      if (i === 0 && !emailRe.test(line) && !phoneRe.test(line) && !linkedinRe.test(line) && !githubRe.test(line)) {
        result.name = this.cleanText(line.replace(/^(?:resume|curriculum\s+vitae|cv)\s*[-:]?\s*/i, ''));
      } else if (i === 1 && !result.name && !emailRe.test(line) && !phoneRe.test(line)) {
        result.name = this.cleanText(line);
      } else if (!result.targetTitle && (i === 1 || i === 2) && !emailRe.test(line) && !phoneRe.test(line) && !linkedinRe.test(line) && !githubRe.test(line)) {
        const parts = line.split(/[|•–—]/);
        if (parts.length >= 1 && parts[0].trim().length > 2) {
          result.targetTitle = this.cleanText(parts[0]);
        }
        if (parts.length >= 2 && !result.location) {
          result.location = this.cleanText(parts[1]);
        }
      }
    }

    if (!result.name && rawLines.length > 0) {
      result.name = rawLines[0].substring(0, 40);
    }

    // Section classification
    const secHeaders = [
      { key: 'summary', regex: /^(?:professional\s+|executive\s+)?(?:summary|profile|statement|objective|about\s+me)$/i },
      { key: 'skills', regex: /^(?:technical\s+|core\s+|key\s+)?(?:skills|technologies|tools|competencies)(?:\s+(?:&|and)\s+tools)?$/i },
      { key: 'experience', regex: /^(?:work\s+|professional\s+|employment\s+)?(?:experience|employment\s+history|career\s+history|work\s+history)$/i },
      { key: 'projects', regex: /^(?:key\s+|selected\s+|technical\s+|featured\s+)?(?:projects|initiatives)$/i },
      { key: 'education', regex: /^(?:education|academic\s+background|academics|qualifications)$/i },
      { key: 'certifications', regex: /^(?:certifications|licenses|credentials|honors\s+(?:&|and)\s+certifications)$/i }
    ];

    const sections = {
      summary: [],
      skills: [],
      experience: [],
      projects: [],
      education: [],
      certifications: []
    };

    let currentSec = null;
    const bulletPrefixRe = /^[•\-\*▸–—\+✓●▪■◆◇►✔\d+\.]\s*/;

    for (let i = 2; i < rawLines.length; i++) {
      const line = rawLines[i];
      const cleanHeader = line.replace(/[:\-–—]+$/, '').trim();

      let matched = null;
      if (cleanHeader.length < 45 && !bulletPrefixRe.test(line)) {
        for (const sec of secHeaders) {
          if (sec.regex.test(cleanHeader)) {
            matched = sec.key;
            break;
          }
        }
      }

      if (matched) {
        currentSec = matched;
        continue;
      }

      if (currentSec) {
        sections[currentSec].push(line);
      }
    }

    // 1. Process Summary
    if (sections.summary.length > 0) {
      result.summary = this.cleanText(sections.summary.join(' '));
    }

    // 2. Process Skills
    const skillsObj = {};
    for (const line of sections.skills) {
      if (line.includes(':')) {
        const [cat, rawVals] = line.split(/:(.+)/);
        const vals = this.splitSkills(rawVals);
        if (vals.length > 0) {
          skillsObj[this.cleanText(cat)] = vals;
        }
      } else {
        const vals = this.splitSkills(line);
        if (vals.length > 0) {
          if (!skillsObj['Technical Skills']) skillsObj['Technical Skills'] = [];
          skillsObj['Technical Skills'].push(...vals);
        }
      }
    }
    for (const cat in skillsObj) {
      skillsObj[cat] = Array.from(new Set(skillsObj[cat]));
    }
    result.skills = Object.keys(skillsObj).length > 0 ? skillsObj : { 'Core Competencies': [] };

    // 3. Process Work Experience
    result.experience = this.parseExperience(sections.experience);

    // 4. Process Projects
    result.projects = this.parseProjects(sections.projects);

    // 5. Process Education
    result.education = this.parseEducation(sections.education);

    // 6. Process Certifications
    result.certifications = this.parseCertifications(sections.certifications);

    return result;
  }

  parseExperience(rawLines) {
    const lines = this.unwrapSectionLines(rawLines);
    const expList = [];
    let currentJob = null;
    const bulletRe = /^[•\-\*▸–—\+✓●▪■◆◇►✔]\s*(.+)/;
    const dateRe = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\b\d{4}|\d{1,2}\/\d{4})\s*[-–—to\s]+\s*(Present|Current|\b\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4})/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bMatch = line.match(bulletRe);
      if (bMatch) {
        if (!currentJob) {
          currentJob = { id: 'exp-' + Date.now(), title: 'Experience', company: '', period: '', location: '', bullets: [] };
          expList.push(currentJob);
        }
        currentJob.bullets.push(this.cleanText(bMatch[1]));
        continue;
      }

      const dMatch = line.match(dateRe);
      const nextDMatch = (i + 1 < lines.length) && lines[i + 1].match(dateRe);
      const nextNextDMatch = (i + 2 < lines.length) && lines[i + 2].match(dateRe);

      if (dMatch || nextDMatch || nextNextDMatch || line.includes('@') || line.includes(' | ') || (line.length < 65 && !line.endsWith('.'))) {
        let title = '';
        let company = '';
        let period = '';
        let location = '';

        if (nextNextDMatch) {
          // Line i: Title, Line i+1: Company, Line i+2: Date / Location
          title = line;
          company = lines[i + 1];
          const dateLine = lines[i + 2];
          const m = dateLine.match(dateRe);
          period = m ? m[0] : '';
          location = dateLine.replace(dateRe, '').replace(/^[•|\s,-]+|[•|\s,-]+$/g, '').trim();
          i += 2;
        } else if (nextDMatch) {
          // Two-line header:
          // Line i: Title (e.g. "Senior Executive – Analytics" or "Data Analyst")
          // Line i+1: Company & Date (e.g. "Titan Company Ltd (Jewellery Division)  November 2025 - Present")
          title = line;
          const secondLine = lines[i + 1];
          const m = secondLine.match(dateRe);
          period = m ? m[0] : '';
          const remaining = secondLine.replace(dateRe, '').replace(/^[•|\s,-]+|[•|\s,-]+$/g, '').trim();

          if (remaining.includes('@')) {
            const parts = remaining.split('@');
            company = parts[0].trim();
            location = parts[1].trim();
          } else if (remaining.includes('•') || remaining.includes('|')) {
            const parts = remaining.split(/[•|]/);
            company = parts[0].trim();
            location = parts.slice(1).join(', ').trim();
          } else {
            company = remaining;
          }

          // If line i actually had both Title and Company separated by @ or - or |
          if (line.includes('@')) {
            const parts = line.split('@');
            title = parts[0].trim();
            if (!company) company = parts[1].trim();
          } else if (line.includes(' - ') && !line.includes('–')) {
            const parts = line.split(' - ');
            title = parts[0].trim();
            if (!company) company = parts[1].trim();
          }

          i += 1;
        } else if (dMatch) {
          // Single line with date: "Company / Role  Date"
          period = dMatch[0];
          let remaining = line.replace(dMatch[0], '').replace(/^[•|\s,-]+|[•|\s,-]+$/g, '').trim();
          if (remaining.includes('@')) {
            const parts = remaining.split('@');
            title = parts[0].trim();
            company = parts[1].trim();
          } else if (remaining.includes(' - ')) {
            const parts = remaining.split(' - ');
            title = parts[0].trim();
            company = parts[1].trim();
          } else {
            title = remaining;
          }
        } else {
          // Header without date
          if (line.includes('@')) {
            const parts = line.split('@');
            title = parts[0].trim();
            company = parts[1].trim();
          } else {
            title = line;
          }
        }

        currentJob = {
          id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          title: this.cleanText(title || 'Professional Role'),
          company: this.cleanText(company),
          period: this.cleanText(period),
          location: this.cleanText(location),
          bullets: []
        };
        expList.push(currentJob);
      } else {
        if (!currentJob) {
          currentJob = { id: 'exp-' + Date.now(), title: 'Experience', company: '', period: '', location: '', bullets: [] };
          expList.push(currentJob);
        }
        currentJob.bullets.push(this.cleanText(line));
      }
    }

    return expList.filter(job => job.title || job.bullets.length > 0);
  }

  parseProjects(rawLines) {
    const bulletRe = /^[•\-\*▸–—\+✓●▪■◆◇►✔]\s*(.+)/;
    const urlRe = /(?:https?:\/\/)?(?:www\.)?(?:github\.com\/[^\s]+|[a-zA-Z0-9-]+\.(?:dev|io|tech|app|com)(?:\/[^\s]*)?)/i;
    // Capitalized action verbs that begin project bullets
    const actionVerbStart = /^(?:Architected|Engineered|Built|Designed|Developed|Implemented|Created|Optimized|Trained|Scaled|Resolved|Identified|Spearheaded|Automated|Integrated|Deployed|Formulated|Constructed)\b/;

    // Pre-process unwrapping for projects
    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i].trim();
      if (!line) continue;

      // Turn capitalized action-verb lines into bullets if length > 35
      if (!bulletRe.test(line) && !urlRe.test(line) && actionVerbStart.test(line) && line.length > 35) {
        line = '• ' + line;
      }

      if (lines.length > 0) {
        const prev = lines[lines.length - 1];
        // Join hyphenated url wrap: e.g. "github.com/.../retail-intelligence-" + "copilot"
        if (prev.endsWith('-') && !line.includes(' ') && line.length < 30) {
          lines[lines.length - 1] = prev + line;
          continue;
        }
        // Join wrapped project title: e.g. "GenAI Retail Analytics..." + "Engine"
        if (!bulletRe.test(prev) && !urlRe.test(prev) && !prev.includes('•') && !prev.includes(' | ') &&
            !bulletRe.test(line) && !urlRe.test(line) && !line.includes('•') && !line.includes(' | ') &&
            line.length < 25 && !line.endsWith('.')) {
          lines[lines.length - 1] = prev + ' ' + line;
          continue;
        }
        // Join wrapped bullet line
        if (bulletRe.test(prev) && !bulletRe.test(line) && !urlRe.test(line) && !line.includes('•') && !line.includes(' | ')) {
          if (prev.endsWith('-')) {
            lines[lines.length - 1] = prev.slice(0, -1) + line;
          } else {
            lines[lines.length - 1] = prev + ' ' + line;
          }
          continue;
        }
      }
      lines.push(line);
    }

    const projList = [];
    let currentProj = null;

    for (const line of lines) {
      const bMatch = line.match(bulletRe);
      if (bMatch) {
        if (!currentProj) {
          currentProj = {
            id: 'proj-' + Date.now(),
            name: 'Key Project',
            role: '',
            tech: '',
            link: '',
            bullets: []
          };
          projList.push(currentProj);
        }
        currentProj.bullets.push(this.cleanText(bMatch[1]));
        continue;
      }

      const urlMatch = line.match(urlRe);
      if (urlMatch) {
        if (!currentProj) {
          currentProj = { id: 'proj-' + Date.now(), name: 'Key Project', role: '', tech: '', link: urlMatch[0], bullets: [] };
          projList.push(currentProj);
        } else {
          currentProj.link = urlMatch[0];
        }
        continue;
      }

      if (line.includes('•') || line.includes(' | ') || /^(?:Tech(?:\s*Stack)?|Technologies|Tools):/i.test(line)) {
        if (!currentProj) {
          currentProj = { id: 'proj-' + Date.now(), name: 'Key Project', role: '', tech: '', link: '', bullets: [] };
          projList.push(currentProj);
        }
        const cleanLine = line.replace(/^(?:Tech(?:\s*Stack)?|Technologies|Tools):\s*/i, '');
        const sep = cleanLine.includes('•') ? '•' : '|';
        const parts = cleanLine.split(sep).map(p => p.trim()).filter(Boolean);
        if (parts.length > 1) {
          currentProj.role = this.cleanText(parts[0]);
          currentProj.tech = this.cleanText(parts.slice(1).join(', '));
        } else {
          currentProj.tech = this.cleanText(cleanLine);
        }
        continue;
      }

      // New project title
      if (line.length < 90 && !line.endsWith('.')) {
        if (currentProj && currentProj.bullets.length > 0) {
          currentProj = {
            id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            name: this.cleanText(line),
            role: '',
            tech: '',
            link: '',
            bullets: []
          };
          projList.push(currentProj);
        } else {
          if (!currentProj) {
            currentProj = {
              id: 'proj-' + Date.now(),
              name: this.cleanText(line),
              role: '',
              tech: '',
              link: '',
              bullets: []
            };
            projList.push(currentProj);
          } else {
            currentProj.name = this.cleanText(line);
          }
        }
      } else {
        if (!currentProj) {
          currentProj = { id: 'proj-' + Date.now(), name: 'Key Project', role: '', tech: '', link: '', bullets: [] };
          projList.push(currentProj);
        }
        currentProj.bullets.push(this.cleanText(line));
      }
    }

    return projList.filter(p => p.name || p.bullets.length > 0);
  }

  parseEducation(rawLines) {
    const lines = this.unwrapSectionLines(rawLines);
    const eduList = [];
    const yearRe = /\b(?:19|20)\d{2}(?:\s*[-–—to\s]+\s*(?:(?:19|20)\d{2}|Present|Current))?\b/i;

    for (const line of lines) {
      if (!line.trim()) continue;
      let year = '';
      const yMatch = line.match(yearRe);
      if (yMatch) year = yMatch[0];

      let clean = line.replace(yearRe, '').replace(/[\(\)]/g, '').replace(/[,|–—]$/, '').trim();
      const parts = clean.split(/[|–—]/).map(p => p.trim()).filter(Boolean);

      eduList.push({
        id: 'edu-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        degree: this.cleanText(parts[0] || line),
        institution: this.cleanText(parts.length > 1 ? parts[1] : ''),
        year: year,
        location: ''
      });
    }
    return eduList;
  }

  parseCertifications(rawLines) {
    const lines = this.unwrapSectionLines(rawLines);
    const certList = [];
    const bulletRe = /^[•\-\*▸–—\+✓●▪■◆◇►✔]\s*(.+)/;

    for (const line of lines) {
      if (!line.trim()) continue;
      const clean = this.cleanText(line.replace(bulletRe, '$1').trim());
      if (clean.length > 2) {
        certList.push(clean);
      }
    }
    return certList;
  }
}

// Global singleton instance
window.resumeParser = new ResumeParser();
