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
    
    // Set worker source if not set
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
   * Intelligently parses raw resume text into structured ResuCraft candidate object
   * @param {string} text - Raw unformatted text
   * @returns {Object} Structured resumeData
   */
  parseText(text) {
    if (!text || typeof text !== 'string') return null;

    // Normalize line breaks and clean whitespace
    const rawLines = text
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

    // Contact regex patterns
    const emailRe = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const phoneRe = /(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4})/;
    const linkedinRe = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i;
    const githubRe = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i;
    const urlRe = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|io|dev|org|net|me|ai)(?:\/[^\s]*)?)/i;

    // Scan first 8 lines for candidate identity and contact info
    const headerLines = rawLines.slice(0, 8);
    for (let i = 0; i < headerLines.length; i++) {
      const line = headerLines[i];

      const em = line.match(emailRe);
      if (em && !result.email) result.email = em[1].trim();

      const ph = line.match(phoneRe);
      if (ph && !result.phone) result.phone = ph[0].trim();

      const li = line.match(linkedinRe);
      if (li && !result.linkedin) result.linkedin = 'linkedin.com/in/' + li[1];

      const gh = line.match(githubRe);
      if (gh && !result.github) result.github = 'github.com/' + gh[1];

      // Name extraction: first non-contact line
      if (i === 0 && !em && !ph && !li && !gh) {
        result.name = line.replace(/^(?:resume|curriculum\s+vitae|cv)\s*[-:]?\s*/i, '').trim();
      } else if (i === 1 && !result.name && !em && !ph) {
        result.name = line.trim();
      } else if (!result.targetTitle && (i === 1 || i === 2) && !em && !ph && !li && !gh) {
        // Line following name often has role/title or title | location
        const parts = line.split(/[|•–—]/);
        if (parts.length >= 1 && parts[0].trim().length > 2) {
          result.targetTitle = parts[0].trim();
        }
        if (parts.length >= 2 && !result.location) {
          result.location = parts[1].trim();
        }
      }
    }

    // Default name fallback if not captured
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
    const bulletPrefixRe = /^[•\-\*▸–—\+✓\d+\.]\s*/;

    // Detect section boundaries
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
      result.summary = sections.summary.join(' ').replace(/\s+/g, ' ').trim();
    }

    // 2. Process Skills
    const skillsObj = {};
    for (const line of sections.skills) {
      if (line.includes(':')) {
        const [cat, rawVals] = line.split(/:(.+)/);
        const vals = this.splitSkills(rawVals);
        if (vals.length > 0) {
          skillsObj[cat.trim()] = vals;
        }
      } else {
        const vals = this.splitSkills(line);
        if (vals.length > 0) {
          if (!skillsObj['Technical Skills']) skillsObj['Technical Skills'] = [];
          skillsObj['Technical Skills'].push(...vals);
        }
      }
    }
    // De-duplicate skills
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

  splitSkills(str) {
    if (!str) return [];
    // Split by comma or bullet, unless inside parentheses
    const tokens = [];
    let current = '';
    let inParen = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '(') inParen = true;
      else if (char === ')') inParen = false;

      if ((char === ',' || char === '|' || char === '•' || char === ';') && !inParen) {
        if (current.trim().length > 1) tokens.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim().length > 1) tokens.push(current.trim());
    return tokens;
  }

  parseExperience(lines) {
    const expList = [];
    let currentJob = null;
    const bulletRe = /^[•\-\*▸–—\+✓]\s*(.+)/;
    const dateRe = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|\d{1,2}\/\d{4})\s*[-–—to\s]+\s*(Present|Current|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4})/i;

    for (const line of lines) {
      const bulletMatch = line.match(bulletRe);

      if (bulletMatch) {
        if (!currentJob) {
          currentJob = { role: 'Professional Experience', company: '', period: '', bullets: [] };
          expList.push(currentJob);
        }
        currentJob.bullets.push(bulletMatch[1].trim());
      } else if (line.trim().length > 0) {
        // Likely a job header row (Title, Company, Dates)
        let period = '';
        let headerText = line;

        const dMatch = line.match(dateRe);
        if (dMatch) {
          period = dMatch[0].trim();
          headerText = line.replace(dMatch[0], '').trim();
        }

        let role = '';
        let company = '';

        if (headerText.includes('@')) {
          const parts = headerText.split('@');
          role = parts[0].trim();
          company = parts[1].split('|')[0].trim();
        } else if (headerText.includes('|')) {
          const parts = headerText.split('|').map(p => p.trim());
          role = parts[0];
          company = parts.length > 1 ? parts[1] : '';
        } else if (headerText.includes(' - ')) {
          const parts = headerText.split(' - ').map(p => p.trim());
          role = parts[0];
          company = parts.length > 1 ? parts[1] : '';
        } else {
          role = headerText;
        }

        const titleStr = role.replace(/[,|–—]$/, '').trim() || 'Role Title';
        currentJob = {
          id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          title: titleStr,
          role: titleStr,
          company: company.replace(/[,|–—]$/, '').trim(),
          location: '',
          period: period,
          bullets: []
        };
        expList.push(currentJob);
      }
    }

    return expList.filter(job => job.title || job.bullets.length > 0);
  }

  parseProjects(lines) {
    const projList = [];
    let currentProj = null;
    const bulletRe = /^[•\-\*▸–—\+✓]\s*(.+)/;

    for (const line of lines) {
      const bulletMatch = line.match(bulletRe);
      if (bulletMatch) {
        if (!currentProj) {
          currentProj = {
            id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            name: 'Key Initiative',
            role: '',
            link: '',
            tech: '',
            bullets: []
          };
          projList.push(currentProj);
        }
        currentProj.bullets.push(bulletMatch[1].trim());
      } else if (line.trim().length > 0) {
        const parts = line.split(/[|–—]/).map(p => p.trim());
        currentProj = {
          id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          name: parts[0] || 'Project Title',
          role: parts.length > 1 ? parts[1] : '',
          link: '',
          tech: parts.length > 2 ? parts[2] : '',
          bullets: []
        };
        projList.push(currentProj);
      }
    }
    return projList;
  }

  parseEducation(lines) {
    const eduList = [];
    const yearRe = /\b(19\d{2}|20\d{2})\b/;

    for (const line of lines) {
      if (!line.trim()) continue;
      let year = '';
      const yMatch = line.match(yearRe);
      if (yMatch) year = yMatch[0];

      let clean = line.replace(yearRe, '').replace(/[,|–—]$/, '').trim();
      const parts = clean.split(/[|–—,]/).map(p => p.trim()).filter(p => p.length > 0);

      let degree = parts[0] || line;
      let inst = parts.length > 1 ? parts[1] : '';

      eduList.push({
        id: 'edu-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        degree: degree,
        institution: inst,
        year: year,
        location: ''
      });
    }
    return eduList;
  }

  parseCertifications(lines) {
    const certList = [];
    const bulletRe = /^[•\-\*▸–—\+✓]\s*(.+)/;

    for (const line of lines) {
      if (!line.trim()) continue;
      const clean = line.replace(bulletRe, '$1').trim();
      if (clean.length > 2) {
        certList.push(clean);
      }
    }
    return certList;
  }
}

// Global singleton instance
window.resumeParser = new ResumeParser();
