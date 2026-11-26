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

  preCleanText(text) {
    if (!text) return '';
    return text
      .replace(/[\u00a0\u200b\u200e\u200f]/g, ' ')
      // Fix spaced 4-digit years from PDF kerning (e.g. "202 3" -> "2023", "20 19" -> "2019")
      .replace(/\b(19|20)(\d)\s+(\d{2})\b/g, '$1$2$3')
      .replace(/\b(19|20)(\d{2})\s+(\d)\b/g, '$1$2$3')
      .replace(/\b(19|20)\s+(\d{2})\b/g, '$1$2')
      .replace(/\b(19|20)\s+(\d)\s+(\d)\b/g, '$1$2$3')
      .replace(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?)\s+(\d{2,3})\s+(\d{1,2})/gi, '$1 $2$3')
      // Fix hyphen line breaks: "Book -\n in" -> "Book-in", "End - to - End" -> "End-to-End"
      .replace(/([a-zA-Z0-9])\s*-\s*\n\s*([a-zA-Z0-9])/g, '$1-$2')
      // Fix multi-word hyphenated joins
      .replace(/\b(Book)\s*-\s*(in)\b/gi, '$1-$2')
      .replace(/\b(Post)\s*-\s*(Marketing)\b/gi, '$1-$2')
      .replace(/\b(Cross)\s*-\s*(functional)\b/gi, '$1-$2')
      .replace(/\b(End)\s*-\s*to\s*-\s*(End)\b/gi, '$1-to-$2')
      .replace(/\b(WHO)\s*-\s*(DD)\b/gi, '$1-$2')
      .replace(/\b(follow)\s*-\s*(up)\b/gi, '$1-$2')
      .replace(/\b(dose)\s*-\s*(response)\b/gi, '$1-$2')
      // Trailing single lowercase letter kerning split (e.g. 'completenes s' -> 'completeness', 'Pharmacolog y' -> 'Pharmacology')
      // Excludes 'a' to preserve valid English phrases like 'have a car' or 'with a team'
      .replace(/\b([a-zA-Z]{4,})\s+([b-z])\b/g, '$1$2')
      // Leading single uppercase letter kerning split (e.g. 'C ricket' -> 'Cricket')
      .replace(/\b([A-Z])\s+([a-z]{3,})\b/g, '$1$2')
      // Known justified PDF fragments
      .replace(/\b(Redo)\s+(care)\b/gi, '$1$2')
      .replace(/\b(Ph)\s+(armacy)\b/gi, '$1$2')
      .replace(/\b(an)\s+(d)\b/gi, '$1$2')
      .replace(/\b(Certificat)\s+(ion)\b/gi, '$1$2')
      .replace(/\b(Trave)\s+(lling)\b/gi, '$1$2')
      .replace(/\b(Lt)\s+(d)\b/gi, '$1$2')
      // Fix uppercase name breaks: "Vivek A RADHYA" -> "Vivek ARADHYA"
      .replace(/\b([A-Z])\s+([A-Z]{3,})\b/g, '$1$2')
      // Fix spaced LinkedIn URLs
      .replace(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)\s*-\s*([a-zA-Z0-9_-]+)/gi, 'linkedin.com/in/$1-$2')
      // Join line-broken conjunctions / ampersands in lists
      .replace(/(&|and)\s*\n\s*([a-zA-Z])/g, '$1 $2')
      .replace(/\s+([,.:;!?%])/g, '$1');
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

    const cleaned = this.preCleanText(text);
    const normalized = this.normalizeBullets(cleaned);
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
    const phoneRe = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s.-]?\d{3,5}[\s.-]?\d{4,5}|\d{10}|\d{5}[\s-]?\d{5})/;
    const linkedinRe = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i;
    const githubRe = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i;

    const isNameInvalid = (n) => {
      return !n || /^(?:professional\s+|executive\s+|career\s+)?(?:summary|profile|statement|objective|about\s+me|experience|work\s+experience|skills|technical\s+skills|education|projects|certifications|curriculum\s+vitae|resume|cv)\b/i.test(n);
    };

    // Section classification headers
    const secHeaders = [
      { key: 'summary', regex: /^(?:professional\s+|executive\s+|career\s+)?(?:summary|profile|statement|objective|about\s+me)$/i },
      { key: 'skills', regex: /^(?:technical\s+|core\s+|key\s+)?(?:skills|technologies|tools|competencies)(?:\s+(?:&|and)\s+tools)?$/i },
      { key: 'experience', regex: /^(?:work\s+|professional\s+|employment\s+)?(?:experience|employment\s+history|career\s+history|work\s+history)$/i },
      { key: 'projects', regex: /^(?:key\s+|selected\s+|technical\s+|featured\s+|personal\s+|academic\s+|independent\s+)?(?:projects|initiatives)$/i },
      { key: 'education', regex: /^(?:education|academic\s+background|academics|qualifications)$/i },
      { key: 'certifications', regex: /^(?:certifications|licenses|credentials|honors\s+(?:&|and)\s+certifications|certifications?\s*[\/&]\s*(?:short\s+courses|training|licenses))$/i },
      { key: 'hobbies', regex: /^(?:hobbies|interests|extracurricular(?:\s+activities)?)$/i }
    ];

    const isSectionHeader = (line) => {
      const clean = line.replace(/^[•\-\*#\d\.\s]+/, '').replace(/[:\-–—]+$/, '').trim();
      if (clean.length > 50) return null;
      for (const h of secHeaders) {
        if (h.regex.test(clean)) return h.key;
      }
      return null;
    };

    // Scan all lines for contact info and associated candidate name
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const em = line.match(emailRe);
      const ph = line.match(phoneRe);
      const li = line.match(linkedinRe);
      const gh = line.match(githubRe);

      if (em && !result.email) result.email = em[1].trim();
      if (ph && !result.phone) result.phone = ph[0].trim();
      if (li && !result.linkedin) result.linkedin = 'linkedin.com/in/' + li[1];
      if (gh && !result.github) result.github = 'github.com/' + gh[1];

      // If contact info found and name not set yet (or was a section header)
      if ((em || ph || li) && (!result.name || isNameInvalid(result.name))) {
        if (i > 0) {
          const prev = rawLines[i - 1].replace(/^[•\-\*📞✉\s]+/, '').trim();
          if (prev.length > 2 && prev.length < 40 && !isSectionHeader(prev) && !emailRe.test(prev) && !phoneRe.test(prev)) {
            result.name = this.cleanText(prev);
          }
        }
      }
    }

    // Name extraction fallback: first non-header, non-contact line from the top
    if (!result.name || isNameInvalid(result.name)) {
      for (let i = 0; i < Math.min(6, rawLines.length); i++) {
        const line = rawLines[i];
        if (!isSectionHeader(line) && !emailRe.test(line) && !phoneRe.test(line) && line.length < 40) {
          result.name = this.cleanText(line.replace(/^(?:resume|curriculum\s+vitae|cv)\s*[-:]?\s*/i, ''));
          break;
        }
      }
    }

    // Target title and location from top lines
    for (let i = 0; i < Math.min(5, rawLines.length); i++) {
      const line = rawLines[i];
      if (line === result.name || isSectionHeader(line)) continue;
      if (!result.targetTitle && !emailRe.test(line) && !phoneRe.test(line) && !linkedinRe.test(line)) {
        const parts = line.split(/[|•–—]/);
        if (parts.length >= 1 && parts[0].trim().length > 2 && parts[0].trim().length < 50) {
          result.targetTitle = this.cleanText(parts[0]);
        }
        if (parts.length >= 2 && !result.location) {
          result.location = this.cleanText(parts[1]);
        }
      }
    }

    const sections = {
      summary: [],
      skills: [],
      experience: [],
      projects: [],
      education: [],
      certifications: [],
      hobbies: []
    };

    let currentSec = null;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const detectedSec = isSectionHeader(line);

      if (detectedSec) {
        currentSec = detectedSec;
        continue;
      }

      // Ignore isolated contact lines or candidate name so they don't pollute bullet points
      const normLine = line.replace(/\s+/g, ' ').trim().toLowerCase();
      const normName = (result.name || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (emailRe.test(line) || phoneRe.test(line) || linkedinRe.test(line) || githubRe.test(line) || (normName && (normLine === normName || normLine.includes(normName)))) {
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
    const unwrappedSkills = [];
    const skillBulletRe = /^[•\-\*▸–—\+✓●▪■◆◇►✔]/;
    for (const rawLine of sections.skills) {
      let line = rawLine.trim();
      if (!line) continue;
      if (/^[•\-\*]?\s*[A-Za-z\s&/]+:/.test(line)) {
        unwrappedSkills.push(line);
      } else if (unwrappedSkills.length > 0) {
        if (skillBulletRe.test(line)) {
          unwrappedSkills[unwrappedSkills.length - 1] += ' • ' + line.replace(/^[•\-\*▸–—\+✓●▪■◆◇►✔]\s*/, '');
        } else {
          // Wrapped continuation line
          unwrappedSkills[unwrappedSkills.length - 1] += ' ' + line;
        }
      } else {
        unwrappedSkills.push(line);
      }
    }

    const skillsObj = {};
    for (const line of unwrappedSkills) {
      if (line.includes(':')) {
        const [cat, rawVals] = line.split(/:(.+)/);
        const cleanCat = this.cleanText(cat.replace(/^[•\-\*#\d\.\s]+/, ''));
        const vals = this.splitSkills(rawVals);
        if (vals.length > 0) {
          skillsObj[cleanCat] = vals;
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
          // Line 1 has the date (e.g. "Relicare tech services... Mar 2023 – Present")
          period = dMatch[0];
          let remaining = line.replace(dMatch[0], '').replace(/^[•|\s,-]+|[•|\s,-]+$/g, '').trim();

          // Check if next line is Title & Location (Pattern B)
          if (i + 1 < lines.length && !bulletRe.test(lines[i + 1]) && !dateRe.test(lines[i + 1])) {
            const nextLine = lines[i + 1];
            company = remaining;

            if (nextLine.includes('@')) {
              const parts = nextLine.split('@');
              title = parts[0].trim();
              location = parts[1].trim();
            } else if (nextLine.includes('  ')) {
              const parts = nextLine.split(/\s{2,}/);
              title = parts[0].trim();
              location = parts.slice(1).join(', ').trim();
            } else if (jobTitleKeywords.test(nextLine)) {
              const m = nextLine.match(jobTitleKeywords);
              const idx = m.index + m[0].length;
              title = nextLine.substring(0, idx).trim();
              location = nextLine.substring(idx).replace(/^[•|\s,-]+|[•|\s,-]+$/g, '').trim();
            } else {
              title = nextLine;
            }
            i += 1; // consume line 2
          } else {
            // Standard single line header
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
    const degreeKeywords = /\b(?:B\.?E\.?|B\.?Tech\.?|M\.?Tech\.?|B\.?Sc\.?|M\.?Sc\.?|B\.?Com\.?|Bachelor|Master|Doctor|Ph\.?D\.?|MBA|Degree|Diploma)\b/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let year = '';
      const yMatch = line.match(yearRe);
      if (yMatch) year = yMatch[0];

      // Check if this is a 2-line education format:
      // Line i: Institution (e.g. "Krupanidhi College of Pharmacy")
      // Line i+1: Degree & Location (e.g. "Master of pharmacy in Pharmacology Bengaluru, Karnataka")
      if (!degreeKeywords.test(line) && i + 1 < lines.length && degreeKeywords.test(lines[i + 1])) {
        const nextLine = lines[i + 1].trim();
        const nyMatch = nextLine.match(yearRe);
        if (nyMatch && !year) year = nyMatch[0];

        let degreeText = nextLine.replace(yearRe, '').replace(/[\(\)]/g, '').replace(/[,|–—]$/, '').trim();
        let location = '';

        if (degreeText.includes('–') || degreeText.includes('—') || degreeText.includes('|')) {
          const parts = degreeText.split(/[|–—]/).map(p => p.trim()).filter(Boolean);
          degreeText = parts[0] || '';
          location = parts.slice(1).join(', ');
        } else {
          const locMatch = degreeText.match(/\b([A-Z][a-z]{2,}),\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)$/);
          if (locMatch) {
            location = locMatch[0].trim();
            degreeText = degreeText.substring(0, locMatch.index).trim();
          }
        }

        eduList.push({
          id: 'edu-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          degree: this.cleanText(degreeText),
          institution: this.cleanText(line),
          year: year,
          location: this.cleanText(location)
        });
        i += 1; // skip next line
        continue;
      }

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
      let clean = this.cleanText(line.replace(bulletRe, '$1').trim());
      // De-duplicate if format is "Course from Issuer – Issuer"
      if (clean.includes('–') || clean.includes(' - ')) {
        const parts = clean.split(/[–\-]/).map(p => p.trim());
        if (parts.length === 2 && parts[0].toLowerCase().includes(parts[1].toLowerCase())) {
          clean = parts[0];
        }
      }
      if (clean.length > 2) {
        certList.push(clean);
      }
    }
    return certList;
  }

  /**
   * AI Deep Parse using Google Gemini 1.5 Flash via Netlify Serverless Function
   * @param {string} rawText Raw text of the resume
   * @param {Object} [options]
   * @param {string} [options.apiKey] Optional user-provided Gemini API key
   * @param {Array} [options.images] Optional base64 images for visual/scanned PDF parsing
   * @returns {Promise<Object>} ResuCraft-structured resume object
   */
  /**
   * Direct Client-Side Gemini Fallback (0 Netlify Function Credits Used)
   * Connects directly from the browser to Google Gemini API
   */
  async parseDirectWithGemini(rawText, apiKey, images = []) {
    const modelUrls = [
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent'
    ];
    
    const systemPrompt = `You are an expert ATS Resume Parsing Engine. Extract all information from the provided raw resume into a strictly structured JSON object.
Rules:
1. Fix OCR and kerning errors.
2. Extract all experiences with exact job title, company name, location, and dates.
3. Every bullet must be a clean, complete individual statement.
4. Categorize skills into technical, domain, tools, soft.
5. Extract projects, education, and certifications.
Output ONLY a raw JSON object with keys: name, targetTitle, email, phone, location, linkedin, github, portfolio, summary, skills (object with technical, domain, tools, soft arrays), experience (array of objects with title, company, location, period, bullets), projects (array with name, role, tech, bullets), education (array with degree, school, location, year), certifications (array with name, issuer, year).`;

    const parts = [
      { text: systemPrompt },
      { text: `Resume content to parse:\n\n${rawText}` }
    ];

    if (Array.isArray(images) && images.length > 0) {
      for (const img of images.slice(0, 3)) {
        if (img && img.data && img.mimeType) {
          parts.push({
            inline_data: {
              mime_type: img.mimeType,
              data: img.data.replace(/^data:[^;]+;base64,/, '')
            }
          });
        }
      }
    }

    const payload = {
      contents: [{ role: 'user', parts: parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 8192
      }
    };

    let resp = null;
    let lastErrMsg = '';
    for (const baseUrl of modelUrls) {
      const r = await fetch(`${baseUrl}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        resp = r;
        break;
      }
      const errBody = await r.json().catch(() => ({}));
      lastErrMsg = errBody?.error?.message || `HTTP ${r.status}`;
      if (r.status !== 404 && r.status !== 400) break;
    }

    // Dynamic ListModels fallback if hardcoded model names rotate
    if (!resp) {
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          const avail = (listData.models || []).filter(m =>
            (m.supportedGenerationMethods || []).includes('generateContent') &&
            m.name && m.name.includes('gemini')
          );
          avail.sort((a, b) => (b.name.includes('flash') ? 1 : 0) - (a.name.includes('flash') ? 1 : 0));
          for (const m of avail.slice(0, 3)) {
            const dynUrl = `https://generativelanguage.googleapis.com/v1beta/${m.name}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const r = await fetch(dynUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (r.ok) {
              resp = r;
              break;
            }
          }
        }
      } catch (listErr) {}
    }

    if (!resp) {
      throw new Error(lastErrMsg || 'All Gemini model endpoints failed.');
    }

    const jsonResp = await resp.json();
    const textOutput = jsonResp?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsedObj;
    try {
      parsedObj = JSON.parse(textOutput);
    } catch (e) {
      // Strip markdown code fences if any
      const cleaned = textOutput.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      parsedObj = JSON.parse(cleaned);
    }

    return this.normalizeGeminiOutput(parsedObj);
  }

  /**
   * AI Deep Parse using Google Gemini 1.5 Flash
   * Automatically prioritizes direct browser call when API key is present to save Netlify credits!
   */
  async parseWithGemini(rawText, options = {}) {
    if (!rawText || rawText.trim().length < 15) {
      throw new Error('Resume content is too short for AI parsing.');
    }

    const apiKey = options.apiKey || localStorage.getItem('resucraft_gemini_key') || '';

    // Direct Client-Side First: If user entered an API key, call Gemini directly (0 Netlify credits used!)
    if (apiKey) {
      try {
        return await this.parseDirectWithGemini(rawText, apiKey, options.images);
      } catch (directErr) {
        console.warn('Direct client Gemini call failed, attempting serverless fallback:', directErr);
      }
    }

    const payload = {
      text: rawText,
      apiKey: apiKey || undefined,
      images: options.images || []
    };

    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['x-gemini-key'] = apiKey;
    }

    let response;
    try {
      response = await fetch('/.netlify/functions/parse-resume', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
    } catch (netErr) {
      // Fallback to /api/parse-resume
      try {
        response = await fetch('/api/parse-resume', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });
      } catch (err2) {
        if (apiKey) {
          return await this.parseDirectWithGemini(rawText, apiKey, options.images);
        }
        throw new Error('Network error reaching resume parsing service. Please check your internet connection.');
      }
    }

    // If Netlify credit limit is reached (402 Payment Required or 429)
    if (response.status === 402 || response.status === 429) {
      if (apiKey) {
        return await this.parseDirectWithGemini(rawText, apiKey, options.images);
      }
      const customErr = new Error('Netlify credit limit reached. Please enter your free Google Gemini API key to parse resumes directly with 0 server costs.');
      customErr.code = 'NO_API_KEY';
      throw customErr;
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      if (result.error === 'NO_API_KEY') {
        const customErr = new Error(result.message || 'Gemini API key is required.');
        customErr.code = 'NO_API_KEY';
        throw customErr;
      }
      if (apiKey) {
        return await this.parseDirectWithGemini(rawText, apiKey, options.images);
      }
      throw new Error(result.message || `AI parsing failed (HTTP ${response.status}).`);
    }

    const data = result.data;
    if (!data || typeof data !== 'object') {
      throw new Error('AI returned an invalid response structure.');
    }

    // Sanitize and ensure full ResuCraft schema compliance
    return this.normalizeGeminiOutput(data);
  }

  normalizeGeminiOutput(d) {
    const skills = d.skills || {};
    return {
      name: (d.name || '').trim() || 'Candidate',
      targetTitle: (d.targetTitle || '').trim() || 'Professional',
      email: (d.email || '').trim(),
      phone: (d.phone || '').trim(),
      location: (d.location || '').trim(),
      linkedin: (d.linkedin || '').trim(),
      github: (d.github || '').trim(),
      portfolio: (d.portfolio || '').trim(),
      summary: (d.summary || '').trim(),
      skills: {
        technical: Array.isArray(skills.technical) ? skills.technical.map(s => String(s).trim()).filter(Boolean) : [],
        domain: Array.isArray(skills.domain) ? skills.domain.map(s => String(s).trim()).filter(Boolean) : [],
        tools: Array.isArray(skills.tools) ? skills.tools.map(s => String(s).trim()).filter(Boolean) : [],
        soft: Array.isArray(skills.soft) ? skills.soft.map(s => String(s).trim()).filter(Boolean) : []
      },
      experience: Array.isArray(d.experience) ? d.experience.map((exp, idx) => ({
        id: 'exp-ai-' + Date.now() + '-' + idx,
        title: (exp.title || '').trim(),
        company: (exp.company || '').trim(),
        location: (exp.location || '').trim(),
        period: (exp.period || '').trim(),
        bullets: Array.isArray(exp.bullets) ? exp.bullets.map(b => String(b).trim()).filter(b => b.length > 3) : []
      })) : [],
      projects: Array.isArray(d.projects) ? d.projects.map((proj, idx) => ({
        id: 'proj-ai-' + Date.now() + '-' + idx,
        name: (proj.name || '').trim(),
        role: (proj.role || '').trim(),
        link: (proj.link || '').trim(),
        techStack: (proj.techStack || '').trim(),
        description: (proj.description || '').trim(),
        bullets: Array.isArray(proj.bullets) ? proj.bullets.map(b => String(b).trim()).filter(b => b.length > 3) : []
      })) : [],
      education: Array.isArray(d.education) ? d.education.map((edu, idx) => ({
        id: 'edu-ai-' + Date.now() + '-' + idx,
        degree: (edu.degree || '').trim(),
        institution: (edu.institution || '').trim(),
        location: (edu.location || '').trim(),
        year: (edu.year || '').trim()
      })) : [],
      certifications: Array.isArray(d.certifications) ? d.certifications.map(c => {
        if (typeof c === 'string') return c.trim();
        if (c && typeof c === 'object') {
          return [c.name, c.issuer, c.year].filter(Boolean).join(' - ');
        }
        return '';
      }).filter(Boolean) : []
    };
  }
}

// Global singleton instance
window.resumeParser = new ResumeParser();
