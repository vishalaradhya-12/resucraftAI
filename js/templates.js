/**
 * Resume Template Rendering System
 * Supports 4 aesthetic, ATS-compliant formats with live keyword highlighting & real-time sync
 */

class ResumeTemplates {
  constructor() {
    this.currentTemplate = 'classic-ats';
    // Default heading accent is ALWAYS Executive Black for ATS gold standard
    let savedTheme = 'black';
    try {
      const stored = localStorage.getItem('resucraft_color_theme');
      if (stored && stored !== 'indigo') {
        savedTheme = stored;
      }
    } catch(e) {}
    this.colorTheme = savedTheme;
    this.highlightKeywords = true;
    this.fontSize = 'medium'; // small, medium, large
    let savedFont = 'sora';
    try {
      const storedFont = localStorage.getItem('resucraft_font_family');
      if (storedFont && storedFont !== 'inter') {
        savedFont = storedFont;
      }
    } catch(e) {}
    this.fontFamily = savedFont; // sora, space, garamond, playfair, merriweather, inter
  }

  setTemplate(templateName) {
    this.currentTemplate = templateName;
  }

  setColorTheme(themeName) {
    this.colorTheme = themeName || 'black';
    try { localStorage.setItem('resucraft_color_theme', this.colorTheme); } catch(e) {}
  }

  setFontSize(size) {
    this.fontSize = size;
  }

  setFontFamily(family) {
    this.fontFamily = family;
    try { localStorage.setItem('resucraft_font_family', family); } catch(e) {}
  }

  toggleHighlight(enabled) {
    this.highlightKeywords = enabled;
  }

  /**
   * Highlights & bolds high-impact business metrics, ROI figures, and matched JD keywords
   * ensuring commanding visual hierarchy for recruiter 6-second scans & ATS readability
   */
  /**
   * Autonomous Semantic Phrase-Chunk Bolding Engine
   * Intelligently detects and bolds high-impact sentence bits, ROI clauses, action metrics,
   * technical pipeline architectures, and credentials just like in professional executive resumes.
   */
  processText(text, matchedKeywords = [], context = 'bullet') {
    if (!text) return "";
    let cleanText = String(text)
      .replace(/<[^>]*>?/gm, '')
      .replace(/">/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    // Escape HTML first to prevent any script injection
    let escapedText = this.escapeHtml(cleanText);

    // Context detection: summary vs bullet vs skill
    const isSummary = context === 'summary' || (context !== 'skill' && context !== false && (escapedText.length > 120 && (escapedText.includes('experience in') || escapedText.includes('specialising in') || escapedText.includes('specializing in') || escapedText.includes('Skilled in'))));
    const isSkill = context === 'skill' || context === false;

    const candidates = [];

    if (isSummary) {
      // 1. Experience duration (e.g. "3+ years")
      const expMatch = escapedText.match(/\b\d+\+?\s+years\b/i);
      if (expMatch) candidates.push(expMatch[0]);

      // 2. Specializing in ... clause (e.g. "inventory, merchandising and sales analytics")
      const specMatch = escapedText.match(/speciali[sz]ing in\s+([^.]+?)(?=\.\s*Skilled|\.\s*[A-Z]|$)/i);
      if (specMatch) candidates.push(specMatch[1].trim());

      // 3. Skilled in [Tools] (e.g. "SQL, Python, Power BI and Excel")
      const skillMatch = escapedText.match(/Skilled in\s+([^.]+?)(?=,\s*with hands-on|\.\s*[A-Z]|$)/i);
      if (skillMatch) candidates.push(skillMatch[1].trim());

      // 4. Hands-on work in [competencies] (e.g. "sales velocity, stock ageing and sell-through analysis, demand analysis, KPI reporting and dashboard automation")
      const handsOnMatch = escapedText.match(/(?:hands-on work in|hands-on experience in)\s+([^.]+?)(?=\.\s*[A-Z]|$)/i);
      if (handsOnMatch) candidates.push(handsOnMatch[1].trim());

      // 5. Degrees (e.g. "M.Tech in Big Data Analytics")
      const degreeMatch = escapedText.match(/(?:M\.?Tech|B\.?E\.?|B\.?Tech|Master of|Bachelor of)\s+in\s+[^,;.\n]+?(?=\s+and|\s+&|,\s*|\.\s*|$)/i);
      if (degreeMatch) candidates.push(degreeMatch[0].trim());

      // 6. Certifications (e.g. "Microsoft PL-300 certified")
      const certMatch = escapedText.match(/(?:Microsoft\s+)?PL-300(?:\s+certified)?|Microsoft Certified:[^,;.]+/i);
      if (certMatch) candidates.push(certMatch[0].trim());
    } else if (!isSkill) {
      // BULLET & PROJECT CONTEXT

      // Rule 1: Action + Metric at start (e.g. "Improved inventory turnover by 12%", "Reduced excess inventory exposure by 15%")
      const startActionMetric = escapedText.match(/^(?:Improved|Reduced|Increased|Boosted|Decreased|Expanded|Accelerated|Optimized|Elevated|Enhanced|Scaled|Grew)\s+[^,;\n]+?\s+(?:by|to)\s+\d+(?:\.\d+)?%/i);
      if (startActionMetric) candidates.push(startActionMetric[0]);

      // Rule 2: Financial Currency + opportunity / sales (e.g. "₹1.2 Cr of excess inventory and working capital opportunities", "₹2 Cr in potential sales")
      const finMatch = escapedText.match(/(?:₹|\$|€|£)\s?[\d.,]+\s?(?:Cr|Crore|Lakh|k|M|B)?\s+(?:of|in)\s+[^,;.\n]+?(?:opportunities|savings|revenue|sales|pipeline|cost reduction|working capital[a-zA-Z\s]*?)(?=\s+(?:through|across|by|using|in order to|helping)\b|[,.]|$)/i);
      if (finMatch) candidates.push(finMatch[0]);

      // Rule 3: Outcome percentage clauses (e.g. "15% improvement in operational efficiency", "15% increase in customer satisfaction scores")
      const pctOutcome = escapedText.match(/\b\d+(?:\.\d+)?%\s+(?:improvement|increase|reduction|growth|efficiency|boost|surge|gain)\s+(?:in|of)\s+[^,;.\n]+?(?=[,.]|$)/i);
      if (pctOutcome) candidates.push(pctOutcome[0]);

      // Rule 4: Active outcome verb + metric (e.g. "improving data accuracy, consistency and reporting reliability by 25%", "lift top-design availability by 10%", "helping reduce negative feedback by 10%")
      const activeOutcomeMatches = escapedText.matchAll(/(?:(?:helping\s+)?(?:reduce|lift|improving|enhancing|boosting|increasing|reducing|cutting|saving|elevating|mitigating))\s+[a-zA-Z0-9\s,&/()-]+?\s+by\s+\d+(?:\.\d+)?%/gi);
      for (const m of activeOutcomeMatches) {
        candidates.push(m[0].trim());
      }

      // Rule 5: Technical Model / Pipeline / Architecture clauses (e.g. "Built predictive models using scikit-learn and XGBoost")
      const builtModel = escapedText.match(/\bBuilt\s+(?:predictive models|predictive machine learning models|data pipelines|analytics pipelines|ETL pipelines|ML models|dashboards)\s+(?:using|leveraging)\s+[^,;.\n]+?(?=\s+(?:to forecast|to reduce|to automate|for|helping|applying)\b|[,.]|$)/i);
      if (builtModel) candidates.push(builtModel[0]);

      // Dashboard + Cloud platform architectures (e.g. "Amazon QuickSight dashboards on AWS Redshift and S3")
      const dashArch = escapedText.match(/\b(?:Amazon QuickSight|Power BI|Tableau)\s+dashboards\s+on\s+[^,;.\n]+?(?=\s+(?:for|to|helping)\b|[,.]|$)/i);
      if (dashArch) candidates.push(dashArch[0]);

      // End-to-end data pipeline builds (e.g. "Built Python (pandas, NumPy) and Power BI analytics pipelines")
      const builtPipeline = escapedText.match(/\b(?:Built|Architected)\s+[A-Za-z0-9\s(),-]+?(?:analytics pipelines|ETL pipelines|data pipelines)(?=\s+(?:for|to|incorporating)\b|[,.]|$)/i);
      if (builtPipeline) candidates.push(builtPipeline[0]);

      // Flagship governance or data initiatives (e.g. "Spearheaded Data Quality Management and Data Governance protocols")
      const flagshipInitiative = escapedText.match(/^(?:Spearheaded|Established)\s+(?:enterprise\s+)?[A-Z][a-zA-Z\s(),&/]+?(?:protocols|standards|frameworks|initiatives)(?=\s+(?:across|in|by|for)\b|[,.]|$)/i);
      if (flagshipInitiative) candidates.push(flagshipInitiative[0]);

      // Rule 6: Volume scale count + context (e.g. "25K+ SKUs", "200K+ customer reviews using NLP")
      const volumeCount = escapedText.match(/\b\d+[\d.,]*[kKmMbB]?\+?\s+(?:customer reviews(?:\s+using\s+[a-zA-Z\s,]+)?|active users|records|transactions|SKUs?)\b/i);
      if (volumeCount) candidates.push(volumeCount[0]);

      // Rule 7: Operational wins (e.g. "reducing delays")
      const opWin = escapedText.match(/\b(?:reducing delays|preventing stockouts|eliminating bottlenecks)\b/i);
      if (opWin) candidates.push(opWin[0]);
    }

    // Deduplicate and filter empty
    const uniqueCandidates = Array.from(new Set(candidates.map(c => c.trim()))).filter(Boolean);
    uniqueCandidates.sort((a, b) => b.length - a.length);

    let result = escapedText;
    const placeholders = [];
    uniqueCandidates.forEach((phrase, idx) => {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(escaped, 'g');
      const ph = `___PHRASE_BOLD_${idx}___`;
      placeholders.push({ ph, phrase });
      result = result.replace(reg, ph);
    });

    // Fallback: If no candidate was captured for a bullet, bold standalone numbers/metrics
    if (!isSkill && placeholders.length === 0) {
      const fallbackMetric = /(₹\s?[\d.,]+\s?(?:Cr|Crore|Lakh|k)?|\$[\d.,]+[kKmMbB]?|\b\d+(?:\.\d+)?%|\b\d+K\+?)/gi;
      result = result.replace(fallbackMetric, '<strong class="metric-bold">$1</strong>');
    }

    // Keyword highlighting (ATS matched keywords)
    if (this.highlightKeywords && matchedKeywords && matchedKeywords.length > 0) {
      const termSet = new Set();
      matchedKeywords.forEach(kw => {
        const term = typeof kw === 'string' ? kw : (kw && kw.term ? kw.term : '');
        if (term && term.trim().length >= 2) termSet.add(term.trim());
        if (kw && Array.isArray(kw.aliases)) {
          kw.aliases.forEach(a => { if (a && a.length >= 2) termSet.add(a.trim()); });
        }
      });

      if (termSet.size > 0) {
        const termsArray = Array.from(termSet).sort((a, b) => b.length - a.length).slice(0, 45);
        const pattern = termsArray.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const kwRegex = new RegExp(`\\b(${pattern})\\b`, 'gi');

        // Apply inside phrase placeholders
        placeholders.forEach(item => {
          item.phrase = item.phrase.replace(kwRegex, '<mark class="kw-matched">$1</mark>');
        });

        // Apply outside phrase placeholders
        result = result.replace(kwRegex, '<strong class="kw-bold"><mark class="kw-matched">$1</mark></strong>');
      }
    }

    // Restore phrase-bold chunks with strong tag
    placeholders.forEach(({ ph, phrase }) => {
      result = result.replace(new RegExp(ph, 'g'), `<strong class="phrase-bold">${phrase}</strong>`);
    });

    return result;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  render(resumeData, matchedKeywords = []) {
    switch (this.currentTemplate) {
      case 'classic-ats':
        return this.renderClassicATS(resumeData, matchedKeywords);
      case 'executive':
        return this.renderExecutive(resumeData, matchedKeywords);
      case 'minimal':
        return this.renderMinimal(resumeData, matchedKeywords);
      case 'nordic':
        return this.renderNordic(resumeData, matchedKeywords);
      case 'tech':
      default:
        return this.renderTechModern(resumeData, matchedKeywords);
    }
  }

  /* ----------------- 0. CLASSIC ATS TEMPLATE (REFERENCE DESIGN) ----------------- */
  renderClassicATS(data, matchedKeywords) {
    return `
      <div class="resume-document tpl-classic-ats theme-${this.colorTheme} size-${this.fontSize} font-${this.fontFamily}" id="printable-resume">
        <!-- Centered Header -->
        <header class="classic-header">
          <h1 class="classic-name">${this.escapeHtml(data.name || "Your Name")}</h1>
          <div class="classic-contact-bar">
            ${data.email ? `
              <span class="classic-contact-item">
                <svg class="classic-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                <a href="mailto:${this.escapeHtml(data.email)}">${this.escapeHtml(data.email)}</a>
              </span>
            ` : ''}
            ${data.phone ? `
              <span class="classic-contact-item">
                <svg class="classic-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                <span>${this.escapeHtml(data.phone)}</span>
              </span>
            ` : ''}
            ${data.linkedin ? `
              <span class="classic-contact-item">
                <svg class="classic-icon" viewBox="0 0 24 24" width="13" height="13" fill="#0077b5"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25c-.9 0-1.63.73-1.63 1.63s.73 1.63 1.63 1.63 1.63-.73 1.63-1.63-.73-1.63-1.63-1.63z"/></svg>
                <a href="https://${this.escapeHtml(data.linkedin.replace(/^https?:\/\//, ''))}" target="_blank">${this.escapeHtml(data.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, ''))}</a>
              </span>
            ` : ''}
            ${data.github ? `
              <span class="classic-contact-item">
                <a href="https://${this.escapeHtml(data.github.replace(/^https?:\/\//, ''))}" target="_blank">${this.escapeHtml(data.github.replace(/^https?:\/\//, ''))}</a>
              </span>
            ` : ''}
          </div>
        </header>

        <!-- SUMMARY -->
        ${data.summary ? `
          <section class="classic-section">
            <h2 class="classic-section-title">SUMMARY</h2>
            <p class="classic-summary-text">${this.processText(data.summary, matchedKeywords)}</p>
          </section>
        ` : ''}

        <!-- SKILLS -->
        ${this.renderClassicSkills(data.skills, matchedKeywords)}

        <!-- EXPERIENCE -->
        ${this.renderClassicExperience(data.experience, matchedKeywords)}

        <!-- PROJECTS -->
        ${this.renderClassicProjects(data.projects, matchedKeywords)}

        <!-- CERTIFICATIONS -->
        ${this.renderClassicCertifications(data.certifications)}

        <!-- EDUCATION -->
        ${this.renderClassicEducation(data.education)}
      </div>
    `;
  }

  renderClassicSkills(skills, matchedKeywords) {
    if (!skills) return '';
    let content = '';

    if (Array.isArray(skills)) {
      content = `<div class="classic-skill-row"><span class="classic-cat-vals">${skills.map(s => this.processText(s, matchedKeywords, false)).join(', ')}</span></div>`;
    } else {
      content = Object.entries(skills).map(([category, list]) => {
        if (!Array.isArray(list) || list.length === 0) return '';
        return `
          <div class="classic-skill-row">
            <strong class="classic-cat-name">${this.escapeHtml(category)}:</strong>
            <span class="classic-cat-vals">${list.map(s => this.processText(s, matchedKeywords, false)).join(', ')}</span>
          </div>
        `;
      }).join('');
    }

    return `
      <section class="classic-section">
        <h2 class="classic-section-title">SKILLS</h2>
        <div class="classic-skills-container">${content}</div>
      </section>
    `;
  }

  renderClassicExperience(experience, matchedKeywords) {
    if (!experience || !Array.isArray(experience) || experience.length === 0) return '';

    return `
      <section class="classic-section">
        <h2 class="classic-section-title">EXPERIENCE</h2>
        ${experience.map(exp => `
          <div class="classic-exp-item">
            <div class="classic-exp-title-row">
              <strong class="classic-exp-title">${this.escapeHtml(exp.title || '')}</strong>
            </div>
            <div class="classic-exp-company-row">
              <span class="classic-exp-company">${this.escapeHtml(exp.company || '')}</span>
              <span class="classic-exp-period">${this.escapeHtml(exp.period || '')}</span>
            </div>
            ${exp.bullets && Array.isArray(exp.bullets) ? `
              <ul class="classic-bullets">
                ${exp.bullets.map(bullet => `
                  <li class="classic-bullet-point">${this.processText(bullet, matchedKeywords)}</li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
    `;
  }

  renderClassicProjects(projects, matchedKeywords) {
    if (!projects || !Array.isArray(projects) || projects.length === 0) return '';

    return `
      <section class="classic-section">
        <h2 class="classic-section-title">KEY PROJECTS</h2>
        ${projects.map(proj => {
          const safeLink = proj.link && !proj.link.match(/^https?:\/\//) ? 'https://' + proj.link : proj.link;
          return `
          <div class="classic-exp-item">
            <div class="classic-exp-title-row">
              <strong class="classic-exp-title">${this.escapeHtml(proj.name || '')}</strong>
              ${safeLink ? `<span class="classic-exp-period"><a href="${this.escapeHtml(safeLink)}" target="_blank">${this.escapeHtml(proj.link)}</a></span>` : ''}
            </div>
            ${(proj.role || proj.tech) ? `
            <div class="classic-exp-company-row">
              <span class="classic-exp-company">${this.escapeHtml(proj.role || '')}${proj.role && proj.tech ? ' &bull; ' : ''}${this.escapeHtml(proj.tech || '')}</span>
            </div>` : ''}
            ${proj.bullets && Array.isArray(proj.bullets) ? `
              <ul class="classic-bullets">
                ${proj.bullets.map(b => `
                  <li class="classic-bullet-point">${this.processText(b, matchedKeywords)}</li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
        `}).join('')}
      </section>
    `;
  }

  renderClassicCertifications(certifications) {
    if (!certifications || !Array.isArray(certifications) || certifications.length === 0) return '';

    return `
      <section class="classic-section">
        <h2 class="classic-section-title">CERTIFICATIONS</h2>
        <p class="classic-cert-row">
          ${certifications.map(cert => this.escapeHtml(cert)).join(' &bull; ')}
        </p>
      </section>
    `;
  }

  renderClassicEducation(education) {
    if (!education || !Array.isArray(education) || education.length === 0) return '';

    return `
      <section class="classic-section">
        <h2 class="classic-section-title">EDUCATION</h2>
        <div class="classic-edu-container">
          ${education.map(edu => `
            <div class="classic-edu-row">
              <strong>${this.escapeHtml(edu.degree || '')}</strong> &ndash; ${this.escapeHtml(edu.institution || '')}${edu.location ? ` &bull; ${this.escapeHtml(edu.location)}` : ''}${edu.year ? ` &bull; ${this.escapeHtml(edu.year)}` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  /* ----------------- 1. TECH MODERN TEMPLATE ----------------- */
  renderTechModern(data, matchedKeywords) {
    return `
      <div class="resume-document tpl-tech theme-${this.colorTheme} size-${this.fontSize} font-${this.fontFamily}" id="printable-resume">
        <!-- Header -->
        <header class="resume-header">
          <div class="header-main">
            <h1 class="candidate-name">${this.escapeHtml(data.name || "Your Name")}</h1>
            <div class="candidate-title">${this.escapeHtml(data.targetTitle || "Software Engineer")}</div>
          </div>
          <div class="header-contact">
            ${data.email ? `<span class="contact-item"><i class="icon">✉</i> ${this.escapeHtml(data.email)}</span>` : ''}
            ${data.phone ? `<span class="contact-item"><i class="icon">📞</i> ${this.escapeHtml(data.phone)}</span>` : ''}
            ${data.location ? `<span class="contact-item"><i class="icon">📍</i> ${this.escapeHtml(data.location)}</span>` : ''}
            ${data.linkedin ? `<span class="contact-item"><i class="icon">🔗</i> ${this.escapeHtml(data.linkedin)}</span>` : ''}
            ${data.github ? `<span class="contact-item"><i class="icon">💻</i> ${this.escapeHtml(data.github)}</span>` : ''}
            ${data.portfolio ? `<span class="contact-item"><i class="icon">🌐</i> ${this.escapeHtml(data.portfolio)}</span>` : ''}
          </div>
        </header>

        <!-- Summary -->
        ${data.summary ? `
          <section class="resume-section section-summary">
            <h2 class="section-title">Professional Summary</h2>
            <p class="summary-text">${this.processText(data.summary, matchedKeywords)}</p>
          </section>
        ` : ''}

        <!-- Skills Matrix -->
        ${this.renderSkillsSection(data.skills, matchedKeywords)}

        <!-- Experience -->
        ${this.renderExperienceSection(data.experience, matchedKeywords)}

        <!-- Projects -->
        ${this.renderProjectsSection(data.projects, matchedKeywords)}

        <!-- Education -->
        ${this.renderEducationSection(data.education)}

        <!-- Certifications -->
        ${this.renderCertificationsSection(data.certifications)}
      </div>
    `;
  }

  /* ----------------- 2. EXECUTIVE TEMPLATE ----------------- */
  renderExecutive(data, matchedKeywords) {
    return `
      <div class="resume-document tpl-executive theme-${this.colorTheme} size-${this.fontSize} font-${this.fontFamily}" id="printable-resume">
        <header class="resume-header">
          <div class="header-top-bar"></div>
          <h1 class="candidate-name">${this.escapeHtml(data.name || "Your Name")}</h1>
          <div class="candidate-title">${this.escapeHtml(data.targetTitle || "Executive Leader")}</div>
          <div class="header-contact">
            ${[data.email, data.phone, data.location, data.linkedin, data.portfolio].filter(Boolean).map(item => `<span>${this.escapeHtml(item)}</span>`).join(' &bull; ')}
          </div>
        </header>

        ${data.summary ? `
          <section class="resume-section section-summary">
            <h2 class="section-title">Executive Profile</h2>
            <p class="summary-text">${this.processText(data.summary, matchedKeywords)}</p>
          </section>
        ` : ''}

        ${this.renderExperienceSection(data.experience, matchedKeywords, "Professional Experience & Leadership")}
        ${this.renderSkillsSection(data.skills, matchedKeywords, "Core Competencies & Strategic Capabilities")}
        ${this.renderProjectsSection(data.projects, matchedKeywords, "Key Initiatives & Strategic Deliverables")}
        ${this.renderEducationSection(data.education)}
        ${this.renderCertificationsSection(data.certifications)}
      </div>
    `;
  }

  /* ----------------- 3. HARVARD / MINIMAL TEMPLATE ----------------- */
  renderMinimal(data, matchedKeywords) {
    return `
      <div class="resume-document tpl-minimal theme-${this.colorTheme} size-${this.fontSize} font-${this.fontFamily}" id="printable-resume">
        <header class="resume-header text-center">
          <h1 class="candidate-name">${this.escapeHtml(data.name || "Your Name")}</h1>
          <div class="header-contact">
            ${[data.location, data.phone, data.email, data.linkedin, data.github].filter(Boolean).map(item => `<span>${this.escapeHtml(item)}</span>`).join(' | ')}
          </div>
        </header>

        ${data.summary ? `
          <section class="resume-section">
            <h2 class="section-title">STATEMENT</h2>
            <p class="summary-text">${this.processText(data.summary, matchedKeywords)}</p>
          </section>
        ` : ''}

        ${this.renderExperienceSection(data.experience, matchedKeywords, "WORK EXPERIENCE")}
        ${this.renderSkillsSection(data.skills, matchedKeywords, "TECHNICAL & PROFESSIONAL SKILLS")}
        ${this.renderProjectsSection(data.projects, matchedKeywords, "SELECTED PROJECTS")}
        ${this.renderEducationSection(data.education, "EDUCATION")}
        ${this.renderCertificationsSection(data.certifications, "HONORS & CERTIFICATIONS")}
      </div>
    `;
  }

  /* ----------------- 4. NORDIC CLEAN TEMPLATE ----------------- */
  renderNordic(data, matchedKeywords) {
    return `
      <div class="resume-document tpl-nordic theme-${this.colorTheme} size-${this.fontSize} font-${this.fontFamily}" id="printable-resume">
        <div class="nordic-layout">
          <!-- Sidebar -->
          <aside class="nordic-sidebar">
            <h1 class="candidate-name">${this.escapeHtml(data.name || "Your Name")}</h1>
            <div class="candidate-title">${this.escapeHtml(data.targetTitle || "Senior Specialist")}</div>

            <div class="sidebar-block contact-block">
              <h3 class="sidebar-heading">Contact</h3>
              ${data.email ? `<div>${this.escapeHtml(data.email)}</div>` : ''}
              ${data.phone ? `<div>${this.escapeHtml(data.phone)}</div>` : ''}
              ${data.location ? `<div>${this.escapeHtml(data.location)}</div>` : ''}
              ${data.linkedin ? `<div>${this.escapeHtml(data.linkedin)}</div>` : ''}
              ${data.github ? `<div>${this.escapeHtml(data.github)}</div>` : ''}
            </div>

            ${this.renderNordicSkills(data.skills, matchedKeywords)}
            ${this.renderEducationSection(data.education, "Education", true)}
            ${this.renderCertificationsSection(data.certifications, "Certifications", true)}
          </aside>

          <!-- Main Content -->
          <main class="nordic-main">
            ${data.summary ? `
              <section class="resume-section">
                <h2 class="section-title">About Me</h2>
                <p class="summary-text">${this.processText(data.summary, matchedKeywords)}</p>
              </section>
            ` : ''}

            ${this.renderExperienceSection(data.experience, matchedKeywords, "Experience")}
            ${this.renderProjectsSection(data.projects, matchedKeywords, "Key Projects")}
          </main>
        </div>
      </div>
    `;
  }

  /* ----------------- SUB-SECTION RENDERERS ----------------- */
  renderSkillsSection(skills, matchedKeywords, title = "Technical Skills") {
    if (!skills) return '';
    let content = '';

    if (Array.isArray(skills)) {
      content = `<div class="skills-tag-cloud">${skills.map(s => `<span class="skill-pill">${this.processText(s, matchedKeywords, false)}</span>`).join('')}</div>`;
    } else {
      content = Object.entries(skills).map(([category, list]) => {
        if (!Array.isArray(list) || list.length === 0) return '';
        return `
          <div class="skill-category-row">
            <strong class="category-name">${this.escapeHtml(category)}:</strong>
            <span class="category-skills">${list.map(s => this.processText(s, matchedKeywords, false)).join(', ')}</span>
          </div>
        `;
      }).join('');
    }

    return `
      <section class="resume-section section-skills">
        <h2 class="section-title">${title}</h2>
        <div class="skills-container">${content}</div>
      </section>
    `;
  }

  renderNordicSkills(skills, matchedKeywords) {
    if (!skills) return '';
    let items = [];
    if (Array.isArray(skills)) {
      items = skills;
    } else {
      Object.values(skills).forEach(arr => {
        if (Array.isArray(arr)) items.push(...arr);
      });
    }

    return `
      <div class="sidebar-block">
        <h3 class="sidebar-heading">Skills</h3>
        <div class="nordic-skill-pills">
          ${items.map(s => `<span class="nordic-pill">${this.processText(s, matchedKeywords, false)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  renderExperienceSection(experience, matchedKeywords, title = "Work Experience") {
    if (!experience || !Array.isArray(experience) || experience.length === 0) return '';

    return `
      <section class="resume-section section-experience">
        <h2 class="section-title">${title}</h2>
        ${experience.map(exp => `
          <div class="exp-item">
            <div class="exp-header">
              <div class="exp-title-role">
                <span class="exp-role">${this.escapeHtml(exp.title || "")}</span>
                <span class="exp-company">${exp.company ? `@ ${this.escapeHtml(exp.company)}` : ''}</span>
              </div>
              <div class="exp-meta">
                <span class="exp-period">${this.escapeHtml(exp.period || "")}</span>
                ${exp.location ? `<span class="exp-location"> &bull; ${this.escapeHtml(exp.location)}</span>` : ''}
              </div>
            </div>
            ${exp.bullets && Array.isArray(exp.bullets) ? `
              <ul class="exp-bullets">
                ${exp.bullets.map(bullet => `
                  <li class="bullet-point">${this.processText(bullet, matchedKeywords)}</li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </section>
    `;
  }

  renderProjectsSection(projects, matchedKeywords, title = "Projects & Engineering Initiatives") {
    if (!projects || !Array.isArray(projects) || projects.length === 0) return '';

    return `
      <section class="resume-section section-projects">
        <h2 class="section-title">${title}</h2>
        ${projects.map(proj => {
          const safeLink = proj.link && !proj.link.match(/^https?:\/\//) ? 'https://' + proj.link : proj.link;
          return `
          <div class="proj-item">
            <div class="proj-header">
              <div class="proj-title-role">
                <strong class="proj-name">${this.escapeHtml(proj.name || "")}</strong>
                ${proj.role ? `<span class="proj-role"> &bull; <em>${this.escapeHtml(proj.role)}</em></span>` : ''}
              </div>
              ${safeLink ? `
                <div class="proj-meta">
                  <a href="${this.escapeHtml(safeLink)}" target="_blank" class="proj-link">${this.escapeHtml(proj.link)}</a>
                </div>
              ` : ''}
            </div>
            ${proj.tech ? `
              <div class="proj-tech-row">
                <span class="proj-tech-label">Tech Stack:</span>
                <span class="proj-tech-list">${this.processText(proj.tech, matchedKeywords)}</span>
              </div>
            ` : ''}
            ${proj.bullets && Array.isArray(proj.bullets) ? `
              <ul class="proj-bullets">
                ${proj.bullets.map(bullet => `
                  <li class="bullet-point">${this.processText(bullet, matchedKeywords)}</li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
        `}).join('')}
      </section>
    `;
  }

  renderEducationSection(education, title = "Education", isSidebar = false) {
    if (!education || !Array.isArray(education) || education.length === 0) return '';

    return `
      <section class="resume-section section-education ${isSidebar ? 'sidebar-block' : ''}">
        <${isSidebar ? 'h3 class="sidebar-heading"' : 'h2 class="section-title"'}>${title}</${isSidebar ? 'h3' : 'h2'}>
        ${education.map(edu => `
          <div class="edu-item">
            <div class="edu-header">
              <strong class="edu-degree">${this.escapeHtml(edu.degree || "")}</strong>
              ${edu.year ? `<span class="edu-year">${this.escapeHtml(edu.year)}</span>` : ''}
            </div>
            <div class="edu-inst">${this.escapeHtml(edu.institution || "")}</div>
            ${edu.details ? `<div class="edu-details">${this.escapeHtml(edu.details)}</div>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  }

  renderCertificationsSection(certifications, title = "Certifications", isSidebar = false) {
    if (!certifications || !Array.isArray(certifications) || certifications.length === 0) return '';

    return `
      <section class="resume-section section-certifications ${isSidebar ? 'sidebar-block' : ''}">
        <${isSidebar ? 'h3 class="sidebar-heading"' : 'h2 class="section-title"'}>${title}</${isSidebar ? 'h3' : 'h2'}>
        <ul class="cert-list">
          ${certifications.map(cert => `
            <li class="cert-item">${this.escapeHtml(cert)}</li>
          `).join('')}
        </ul>
      </section>
    `;
  }
}

// Global instance
window.resumeTemplates = new ResumeTemplates();
