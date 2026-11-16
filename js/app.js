/**
 * ResuCraft Main Application Controller
 * Handles state management, UI synchronization, ATS score animations, and exports
 */

class ResuCraftApp {
  constructor() {
    this.currentProfileId = 'vishal_aradhya';
    this.resumeData = JSON.parse(JSON.stringify(SAMPLE_PROFILES.vishal_aradhya));
    this.jdText = this.resumeData.matchingJD ? this.resumeData.matchingJD.text : "";
    this.atsResult = null;
    this.activeTab = 'jd-analyzer';
    this.zoomLevel = 100;

    // Auto-restore session from localStorage
    try {
      const saved = localStorage.getItem('resucraft_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.resumeData && parsed.jdText !== undefined) {
          this.resumeData = parsed.resumeData;
          this.jdText = parsed.jdText;
          this.currentProfileId = parsed.currentProfileId || 'vishal_aradhya';
        }
      }
    } catch(e) { /* localStorage unavailable or corrupt — continue with defaults */ }

    this.init();
  }

  saveSession() {
    try {
      localStorage.setItem('resucraft_session', JSON.stringify({
        resumeData: this.resumeData,
        jdText: this.jdText,
        currentProfileId: this.currentProfileId
      }));
    } catch(e) { /* storage full or private mode — silent fail */ }
  }

  init() {
    this.bindEvents();

    // Restore UI fields from session (if auto-restored)
    const jdField = document.getElementById('jd-input-text');
    if (jdField && this.jdText) jdField.value = this.jdText;
    const profileSelect = document.getElementById('sample-profile-select');
    if (profileSelect && this.currentProfileId) profileSelect.value = this.currentProfileId;
    this.populateEditor();
    this.runATSAnalysis();
    this.renderResumePreview();
  }

  bindEvents() {
    // Navigation Tabs (Left Sidebar)
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Sample Profile Switcher
    const profileSelect = document.getElementById('sample-profile-select');
    if (profileSelect) {
      profileSelect.addEventListener('change', (e) => {
        this.loadSampleProfile(e.target.value);
      });
    }

    // JD Textarea Input
    const jdInput = document.getElementById('jd-input-text');
    if (jdInput) {
      jdInput.value = this.jdText;
      jdInput.addEventListener('input', () => {
        this.jdText = jdInput.value;
        this.runATSAnalysis();
        this.renderResumePreview();
      });
    }

    // Load matching JD button
    const loadJdBtn = document.getElementById('btn-load-matched-jd');
    if (loadJdBtn) {
      loadJdBtn.addEventListener('click', () => {
        const profile = SAMPLE_PROFILES[this.currentProfileId];
        if (profile && profile.matchingJD) {
          const jdField = document.getElementById('jd-input-text');
          if (jdField) {
            jdField.value = profile.matchingJD.text;
            this.jdText = profile.matchingJD.text;
            this.showToast(`Loaded benchmark JD for ${profile.matchingJD.title}`);
            this.runATSAnalysis();
            this.renderResumePreview();
          }
        }
      });
    }

    // Clear JD button
    const clearJdBtn = document.getElementById('btn-clear-jd');
    if (clearJdBtn) {
      clearJdBtn.addEventListener('click', () => {
        const jdField = document.getElementById('jd-input-text');
        if (jdField) {
          jdField.value = '';
          this.jdText = '';
          this.showToast('Job description cleared', 'info');
          this.runATSAnalysis();
          this.renderResumePreview();
        }
      });
    }

    // Template Switcher Buttons
    document.querySelectorAll('.tpl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        const tplName = target.getAttribute('data-tpl');
        window.resumeTemplates.setTemplate(tplName);
        this.renderResumePreview();
        this.showToast(`Switched template to ${target.innerText.trim()}`);
      });
    });

    // Color Swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        const theme = target.getAttribute('data-theme');
        window.resumeTemplates.setColorTheme(theme);
        this.renderResumePreview();
      });
    });

    // Keyword Highlight Toggle
    const highlightToggle = document.getElementById('toggle-kw-highlight');
    if (highlightToggle) {
      highlightToggle.addEventListener('change', (e) => {
        window.resumeTemplates.toggleHighlight(e.target.checked);
        this.renderResumePreview();
      });
    }

    // Font Size Selector
    const fontSizeSelect = document.getElementById('font-size-select');
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener('change', (e) => {
        window.resumeTemplates.setFontSize(e.target.value);
        this.renderResumePreview();
      });
    }

    // Print / Download PDF Button
    const printBtn = document.getElementById('btn-print-pdf');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        this.printResume();
      });
    }

    // Copy ATS Plaintext Button
    const copyAtsBtn = document.getElementById('btn-copy-ats');
    if (copyAtsBtn) {
      copyAtsBtn.addEventListener('click', () => {
        this.copyAtsPlaintext();
      });
    }

    // Export JSON Button
    const exportJsonBtn = document.getElementById('btn-export-json');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        this.exportJson();
      });
    }

    // Import JSON File Input
    const importInput = document.getElementById('import-json-file');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        this.importJson(e);
      });
    }

    // AI Generate Summary Button
    const genSummaryBtn = document.getElementById('btn-ai-summary');
    if (genSummaryBtn) {
      genSummaryBtn.addEventListener('click', () => {
        this.generateSmartSummary();
      });
    }

    // Restore Original Resume Buttons
    const headerRestoreBtn = document.getElementById('btn-header-restore');
    if (headerRestoreBtn) {
      headerRestoreBtn.addEventListener('click', () => {
        this.restoreOriginalResume();
      });
    }

    const restoreResumeBtn = document.getElementById('btn-restore-resume');
    if (restoreResumeBtn) {
      restoreResumeBtn.addEventListener('click', () => {
        this.restoreOriginalResume();
      });
    }

    // 1-Click Auto-Tailor All Action
    const autoTailorAllBtn = document.getElementById('btn-auto-tailor-all');
    if (autoTailorAllBtn) {
      autoTailorAllBtn.addEventListener('click', () => {
        this.autoTailorAll();
      });
    }

    // Add All Missing Skills Buttons
    const addAllSkillsBtn = document.getElementById('btn-auto-add-skills');
    if (addAllSkillsBtn) {
      addAllSkillsBtn.addEventListener('click', () => {
        this.addAllMissingSkills();
      });
    }
    const missingAddAllSkillsBtn = document.getElementById('btn-missing-add-all-skills');
    if (missingAddAllSkillsBtn) {
      missingAddAllSkillsBtn.addEventListener('click', () => {
        this.addAllMissingSkills();
      });
    }

    // Weave All Missing Bullets Buttons
    const weaveAllBulletsBtn = document.getElementById('btn-auto-weave-bullets');
    if (weaveAllBulletsBtn) {
      weaveAllBulletsBtn.addEventListener('click', () => {
        this.weaveAllMissingBullets();
      });
    }
    const missingWeaveAllBtn = document.getElementById('btn-missing-weave-all');
    if (missingWeaveAllBtn) {
      missingWeaveAllBtn.addEventListener('click', () => {
        this.weaveAllMissingBullets();
      });
    }

    // Bullet Tailorer trigger button
    const generateBulletsBtn = document.getElementById('btn-generate-bullets');
    if (generateBulletsBtn) {
      generateBulletsBtn.addEventListener('click', () => {
        this.runBulletTailorer();
      });
    }

    // Bind Live Content Form Inputs
    this.bindEditorInputs();
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabId}`);
    });

    if (tabId === 'bullet-tailorer') {
      this.populateBulletSelectDropdown();
    }
  }

  loadSampleProfile(profileKey) {
    if (profileKey === 'blank') {
      this.currentProfileId = 'blank';
      this.resumeData = {
        id: 'blank', name: 'Your Full Name', targetTitle: 'Target Job Title',
        email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '',
        summary: '', skills: { 'Technical Skills': [] },
        experience: [], projects: [], education: [], certifications: []
      };
      this.jdText = '';
      const jdField = document.getElementById('jd-input-text');
      if (jdField) jdField.value = '';
      this.populateEditor();
      this.runATSAnalysis();
      this.renderResumePreview();
      this.showToast('Started a blank resume — fill in your own details!');
      return;
    }
    if (!SAMPLE_PROFILES[profileKey]) return;
    this.currentProfileId = profileKey;
    this.resumeData = JSON.parse(JSON.stringify(SAMPLE_PROFILES[profileKey]));
    
    // Update JD input
    if (this.resumeData.matchingJD) {
      this.jdText = this.resumeData.matchingJD.text;
      const jdField = document.getElementById('jd-input-text');
      if (jdField) jdField.value = this.jdText;
    }

    this.populateEditor();
    this.runATSAnalysis();
    this.renderResumePreview();
    this.showToast(`Loaded ${this.resumeData.name}'s profile and benchmark JD`);
    this.saveSession();
  }

  runATSAnalysis() {
    this.atsResult = window.resumeEngine.evaluateATS(this.resumeData, this.jdText);
    this.updateScoreUI();
    this.renderKeywordBadges();
    this.updateATSBreakdown();
    this.saveSession();
  }

  updateScoreUI() {
    const score = this.atsResult ? this.atsResult.overallScore : 0;
    const scoreValElem = document.getElementById('ats-score-value');
    const scoreCircle = document.getElementById('ats-progress-svg-circle');
    const scoreBadge = document.getElementById('ats-score-rating');

    if (scoreValElem) {
      scoreValElem.innerText = `${score}%`;
    }

    if (scoreCircle) {
      // Circumference = 2 * PI * r = 2 * 3.14159 * 42 ~= 263.89
      const circumference = 264;
      const offset = circumference - (score / 100) * circumference;
      scoreCircle.style.strokeDashoffset = offset;

      // Color tiering
      if (score >= 80) {
        scoreCircle.style.stroke = '#10b981'; // Emerald
      } else if (score >= 60) {
        scoreCircle.style.stroke = '#f59e0b'; // Amber
      } else {
        scoreCircle.style.stroke = '#ef4444'; // Red
      }
    }

    if (scoreBadge) {
      if (score >= 85) {
        scoreBadge.innerHTML = '<span class="badge badge-success">⭐ ATS Ready • Top 5% Applicant</span>';
      } else if (score >= 70) {
        scoreBadge.innerHTML = '<span class="badge badge-primary">✔ High Match • Recommended for Apply</span>';
      } else if (score >= 50) {
        scoreBadge.innerHTML = '<span class="badge badge-warning">⚡ Moderate Match • Needs Keywords</span>';
      } else {
        scoreBadge.innerHTML = '<span class="badge badge-danger">⚠️ Low ATS Score • Missing Key Terms</span>';
      }
    }
  }

  renderKeywordBadges() {
    const foundContainer = document.getElementById('matched-keywords-container');
    const missingContainer = document.getElementById('missing-keywords-container');

    if (!this.atsResult) return;

    // Found Keywords
    if (foundContainer) {
      if (this.atsResult.foundKeywords.length === 0) {
        foundContainer.innerHTML = '<p class="empty-state-text">No matched keywords yet. Paste a JD or add relevant skills.</p>';
      } else {
        foundContainer.innerHTML = this.atsResult.foundKeywords.map(k => `
          <span class="kw-tag matched" title="${k.priorityLabel || 'Matched Skill'}">
            <span class="kw-dot"></span>
            <strong>${k.term}</strong>
            <span class="kw-freq">${k.priorityTier === 'knockout' ? '⭐ Must-Have' : 'Matched'}</span>
          </span>
        `).join('');
      }
    }

    // Missing Keywords
    if (missingContainer) {
      if (this.atsResult.missingKeywords.length === 0) {
        missingContainer.innerHTML = '<p class="empty-state-text success">🎉 Outstanding! You have matched all essential keywords from this JD (100% Match).</p>';
      } else {
        missingContainer.innerHTML = this.atsResult.missingKeywords.map(k => `
          <div class="missing-kw-card">
            <div class="missing-kw-info">
              <span class="missing-badge ${k.priorityTier || ''}">${k.priorityLabel || 'Missing'}</span>
              <strong class="missing-term">${k.term}</strong>
              <span class="missing-cat">${k.category}</span>
            </div>
            <div class="missing-actions">
              <button class="btn-micro btn-success btn-add-skill" data-kw="${k.term}" title="Add directly to Technical Skills Matrix">+ Add to Skills</button>
              <button class="btn-micro btn-primary btn-weave-role" data-kw="${k.term}" title="Instantly weave into experience bullet with Google XYZ formula">⚡ Weave into Role</button>
              <button class="btn-micro btn-tailor-kw" data-kw="${k.term}" title="Customize in Bullet Tailorer">Customize</button>
            </div>
          </div>
        `).join('');

        // Bind quick actions
        missingContainer.querySelectorAll('.btn-add-skill').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const kw = e.currentTarget.getAttribute('data-kw');
            this.addKeywordToSkills(kw);
          });
        });

        missingContainer.querySelectorAll('.btn-weave-role').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const kw = e.currentTarget.getAttribute('data-kw');
            this.weaveKeywordIntoExperience(kw);
          });
        });

        missingContainer.querySelectorAll('.btn-tailor-kw').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const kw = e.currentTarget.getAttribute('data-kw');
            this.switchTab('bullet-tailorer');
            const targetKwInput = document.getElementById('tailor-target-keyword');
            if (targetKwInput) targetKwInput.value = kw;
            this.runBulletTailorer();
          });
        });
      }
    }
  }

  updateATSBreakdown() {
    if (!this.atsResult) return;
    const { keywordCoverageScore, hardSkillsScore, quantificationScore, actionVerbScore, breakdown } = this.atsResult;

    const setMeter = (id, val, text) => {
      const bar = document.getElementById(`${id}-bar`);
      const valElem = document.getElementById(`${id}-val`);
      if (bar) bar.style.width = `${val || 0}%`;
      if (valElem) valElem.innerText = text || `${val || 0}%`;
    };

    const bCount = breakdown ? `(${breakdown.matchedCount || 0}/${breakdown.totalCount || 0} terms)` : '';
    setMeter('cov-score', keywordCoverageScore, `${keywordCoverageScore || 0}% ${bCount}`);
    setMeter('tech-score', hardSkillsScore, `${hardSkillsScore || 0}%`);
    const qCount = (this.atsResult.bulletStats && this.atsResult.bulletStats.quantifiedBullets !== undefined) ? ` (${this.atsResult.bulletStats.quantifiedBullets} quantified bullets)` : '';
    setMeter('quant-score', quantificationScore, `${quantificationScore || 0}%${qCount}`);
    setMeter('verb-score', actionVerbScore, `${actionVerbScore || 0}%`);
  }

  /* ----------------- 1-CLICK AUTO TAILOR ACTIONS ----------------- */

  restoreOriginalResume() {
    const original = SAMPLE_PROFILES[this.currentProfileId] || SAMPLE_PROFILES.vishal_aradhya;
    this.resumeData = JSON.parse(JSON.stringify(original));

    this.populateEditor();
    this.runATSAnalysis();
    this.renderResumePreview();
    this.showToast('↺ Restored original resume! All custom modifications and added keywords reset.', 'info');
    this.saveSession();
  }

  autoTailorAll() {
    if (!this.atsResult || !this.atsResult.missingKeywords || this.atsResult.missingKeywords.length === 0) {
      this.showToast('Your resume already matches all key requirements for this JD!', 'info');
      return;
    }

    const missing = [...this.atsResult.missingKeywords];
    const result = window.resumeEngine.autoTailorResume(this.resumeData, missing, this.jdText);

    this.populateEditor();
    this.runATSAnalysis();
    this.renderResumePreview();

    this.showToast(`🎉 1-Click Auto-Optimized! Added ${result.skillsAdded.length} curated skills & tailored experience cleanly.`);
  }

  addAllMissingSkills() {
    if (!this.atsResult || !this.atsResult.missingKeywords || this.atsResult.missingKeywords.length === 0) {
      this.showToast('No missing skills found to add.', 'info');
      return;
    }

    let addedCount = 0;
    // Cap at top 4 high-value canonical skills
    this.atsResult.missingKeywords.slice(0, 4).forEach(k => {
      this.addKeywordToSkills(k.term, false);
      addedCount++;
    });

    this.populateEditor();
    this.runATSAnalysis();
    this.renderResumePreview();
    this.showToast(`Added ${addedCount} essential canonical skills to your Skills Matrix!`);
  }

  weaveAllMissingBullets() {
    if (!this.atsResult || !this.atsResult.missingKeywords || this.atsResult.missingKeywords.length === 0) {
      this.showToast('No missing competencies to weave.', 'info');
      return;
    }

    this.autoTailorAll();
  }

  weaveKeywordIntoExperience(keyword) {
    if (!keyword) return;
    if (!this.resumeData.experience || this.resumeData.experience.length === 0) return;

    const success = window.resumeEngine ? window.resumeEngine.weaveKeywordIntoExperience(this.resumeData, keyword) : false;
    if (!success) {
      this.showToast(`"${keyword}" is already incorporated into your experience bullets.`, 'info');
      return;
    }

    this.populateEditor();
    this.runATSAnalysis();
    this.renderResumePreview();
    this.showToast(`Integrated "${keyword}" into experience using Google XYZ formula!`);
  }

  addKeywordToSkills(keyword, triggerUpdate = true) {
    if (!keyword) return;
    const cleanKw = keyword.trim();
    if (!cleanKw) return;

    if (!this.resumeData.skills) this.resumeData.skills = {};

    // Match against ontology for precise canonical naming and categorization
    const ontologyMatch = window.resumeEngine && window.resumeEngine.ontology ?
      window.resumeEngine.ontology.find(e => 
        e.canonical.toLowerCase() === cleanKw.toLowerCase() || 
        e.id === cleanKw.toLowerCase() || 
        e.aliases.includes(cleanKw.toLowerCase())
      ) : null;

    const formattedTerm = ontologyMatch ? ontologyMatch.canonical : (window.resumeEngine ? window.resumeEngine.formatTermCase(cleanKw) : cleanKw);
    const targetCat = ontologyMatch ? ontologyMatch.category : "Analytics & ML Skills";

    // Ensure category exists
    if (!this.resumeData.skills[targetCat]) {
      this.resumeData.skills[targetCat] = [];
    }

    // Check if duplicate or already present in any category
    const exists = Object.values(this.resumeData.skills).some(list => 
      Array.isArray(list) && list.some(s => s.toLowerCase() === formattedTerm.toLowerCase())
    );

    if (!exists) {
      this.resumeData.skills[targetCat].push(formattedTerm);
    }

    if (triggerUpdate) {
      this.populateEditor();
      this.runATSAnalysis();
      this.renderResumePreview();
      this.showToast(`Added "${formattedTerm}" to ${targetCat}!`);
    }
  }

  /* ----------------- BULLET TAILORER ASSISTANT ----------------- */
  populateBulletSelectDropdown() {
    const select = document.getElementById('tailor-bullet-select');
    if (!select) return;

    select.innerHTML = '';
    let index = 1;

    if (this.resumeData.experience && Array.isArray(this.resumeData.experience)) {
      this.resumeData.experience.forEach((exp, expIdx) => {
        if (exp.bullets && Array.isArray(exp.bullets)) {
          exp.bullets.forEach((bullet, bIdx) => {
            const opt = document.createElement('option');
            opt.value = `${expIdx}:${bIdx}`;
            const shortText = bullet.length > 70 ? bullet.substring(0, 70) + '...' : bullet;
            opt.innerText = `[${exp.company || 'Role ' + (expIdx + 1)}] Bullet #${bIdx + 1}: ${shortText}`;
            select.appendChild(opt);
          });
        }
      });
    }

    // Set first selected bullet into preview
    this.updateTailorOriginalText();
    select.onchange = () => this.updateTailorOriginalText();
  }

  updateTailorOriginalText() {
    const select = document.getElementById('tailor-bullet-select');
    const origBox = document.getElementById('tailor-original-bullet');
    if (!select || !origBox) return;
    if (!select.value) {
      origBox.innerText = "No bullet points available yet. Add an experience bullet first.";
      return;
    }

    const [expIdx, bIdx] = select.value.split(':').map(Number);
    const exp = this.resumeData.experience[expIdx];
    if (exp && exp.bullets && exp.bullets[bIdx]) {
      origBox.innerText = exp.bullets[bIdx];
    }
  }

  runBulletTailorer() {
    const select = document.getElementById('tailor-bullet-select');
    const origBox = document.getElementById('tailor-original-bullet');
    const kwInput = document.getElementById('tailor-target-keyword');
    const resultsContainer = document.getElementById('tailor-results-container');

    if (!select || !origBox || !resultsContainer) return;
    if (!select.value) {
      this.showToast('Please add or select an experience bullet point first.', 'info');
      return;
    }

    const [expIdx, bIdx] = select.value.split(':').map(Number);
    const exp = this.resumeData.experience[expIdx];
    const originalText = exp && exp.bullets ? exp.bullets[bIdx] : origBox.innerText;

    // Collect target keywords (from manual input or missing keywords)
    let targetKeywords = [];
    if (kwInput && kwInput.value.trim()) {
      targetKeywords = kwInput.value.split(',').map(s => s.trim());
    } else if (this.atsResult && this.atsResult.missingKeywords.length > 0) {
      targetKeywords = this.atsResult.missingKeywords.slice(0, 3).map(k => k.term);
    } else {
      targetKeywords = ["Data Governance", "SQL", "Power BI", "Root Cause Analysis"];
    }

    const variations = window.resumeEngine.tailorBullet(originalText, targetKeywords, exp ? exp.title : "", exp ? exp.company : "");

    resultsContainer.innerHTML = `
      <div class="tailor-results-header">
        <h4>⚡ AI-Optimized Google XYZ Variations wrt Target JD:</h4>
        <span class="target-kw-badge">Targeting: <strong>${targetKeywords.join(', ')}</strong></span>
      </div>
      <div class="variations-grid">
        ${variations.map(v => `
          <div class="variation-card">
            <div class="var-header">
              <span class="var-label">${v.label}</span>
              <span class="var-boost">${v.metricBoost}</span>
            </div>
            <p class="var-text" id="text-${v.id}">${v.text}</p>
            <div class="var-footer">
              <span class="var-keywords">Keywords included: ${v.addedKeywords.join(', ')}</span>
              <button class="btn btn-secondary btn-sm btn-accept-bullet" data-var="${v.id}">
                ✓ Accept & Replace in Resume
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Bind accept buttons
    resultsContainer.querySelectorAll('.btn-accept-bullet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const varId = e.currentTarget.getAttribute('data-var');
        const chosenText = document.getElementById(`text-${varId}`).innerText;
        this.replaceBullet(expIdx, bIdx, chosenText);
      });
    });
  }

  replaceBullet(expIdx, bIdx, newText) {
    if (this.resumeData.experience[expIdx] && this.resumeData.experience[expIdx].bullets) {
      this.resumeData.experience[expIdx].bullets[bIdx] = newText;
      this.populateEditor();
      this.runATSAnalysis();
      this.renderResumePreview();
      this.updateTailorOriginalText();
      this.showToast('Updated resume bullet point with XYZ formula & keywords!', 'success');
    }
  }

  generateSmartSummary() {
    const topKeywords = this.atsResult && this.atsResult.missingKeywords && this.atsResult.missingKeywords.length > 0 ? 
      this.atsResult.missingKeywords : (this.atsResult && this.atsResult.foundKeywords ? this.atsResult.foundKeywords : []);

    const summaries = window.resumeEngine.generateTailoredSummaries(
      this.resumeData.name,
      this.resumeData.targetTitle,
      "3+",
      topKeywords,
      this.resumeData.summary
    );

    const chosenSummary = summaries[0].text;
    this.resumeData.summary = chosenSummary;
    const summaryInput = document.getElementById('input-summary');
    if (summaryInput) summaryInput.value = chosenSummary;

    this.runATSAnalysis();
    this.renderResumePreview();
    this.showToast('Generated tailored executive summary aligned with target JD!');
  }

  /* ----------------- CONTENT EDITOR ----------------- */
  populateEditor() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('input-name', this.resumeData.name);
    setVal('input-target-title', this.resumeData.targetTitle);
    setVal('input-email', this.resumeData.email);
    setVal('input-phone', this.resumeData.phone);
    setVal('input-location', this.resumeData.location);
    setVal('input-linkedin', this.resumeData.linkedin);
    setVal('input-github', this.resumeData.github);
    setVal('input-portfolio', this.resumeData.portfolio);
    setVal('input-summary', this.resumeData.summary);

    this.renderEditorExperienceList();
    this.renderEditorSkillsList();
    this.renderEditorProjectsList();
    this.renderEditorEducationList();
    this.renderEditorCertsList();
  }

  bindEditorInputs() {
    const bindSync = (id, prop) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          this.resumeData[prop] = el.value;
          this.runATSAnalysis();
          this.renderResumePreview();
        });
      }
    };

    bindSync('input-name', 'name');
    bindSync('input-target-title', 'targetTitle');
    bindSync('input-email', 'email');
    bindSync('input-phone', 'phone');
    bindSync('input-location', 'location');
    bindSync('input-linkedin', 'linkedin');
    bindSync('input-github', 'github');
    bindSync('input-portfolio', 'portfolio');
    bindSync('input-summary', 'summary');

    // Add experience button
    const addExpBtn = document.getElementById('btn-add-experience');
    if (addExpBtn) {
      addExpBtn.addEventListener('click', () => {
        if (!this.resumeData.experience) this.resumeData.experience = [];
        this.resumeData.experience.unshift({
          id: `exp-${Date.now()}`,
          title: "Senior Role Title",
          company: "Company Name",
          location: "City, State",
          period: "2024 - Present",
          bullets: [
            "Architected and deployed scalable system resulting in 40% performance gain.",
            "Collaborated with cross-functional teams to deliver key roadmap deliverables on time."
          ]
        });
        this.renderEditorExperienceList();
        this.runATSAnalysis();
        this.renderResumePreview();
        this.showToast('Added new experience entry');
      });
    }

    // Add project button
    const addProjBtn = document.getElementById('btn-add-project');
    if (addProjBtn) {
      addProjBtn.addEventListener('click', () => {
        if (!this.resumeData.projects) this.resumeData.projects = [];
        this.resumeData.projects.unshift({
          id: `proj-${Date.now()}`,
          name: "Innovative System Project",
          role: "Lead Creator",
          tech: "React, Node.js, AWS",
          link: "github.com/example/project",
          bullets: [
            "Built distributed open source utility with over 500 active users."
          ]
        });
        this.renderEditorProjectsList();
        this.runATSAnalysis();
        this.renderResumePreview();
        this.showToast('Added new project entry');
      });
    }

    // Add education button
    const addEduBtn = document.getElementById('btn-add-education');
    if (addEduBtn) {
      addEduBtn.addEventListener('click', () => {
        if (!this.resumeData.education) this.resumeData.education = [];
        this.resumeData.education.push({ id: `edu-${Date.now()}`, degree: '', institution: '', location: '', year: '', details: '' });
        this.renderEditorEducationList();
        this.renderResumePreview();
        this.showToast('Added new education entry');
      });
    }

    // Add certification button
    const addCertBtn = document.getElementById('btn-add-cert');
    if (addCertBtn) {
      addCertBtn.addEventListener('click', () => {
        if (!this.resumeData.certifications) this.resumeData.certifications = [];
        this.resumeData.certifications.push('');
        this.renderEditorCertsList();
        this.renderResumePreview();
        this.showToast('Added new certification entry');
      });
    }
  }

  renderEditorExperienceList() {
    const container = document.getElementById('editor-experience-container');
    if (!container) return;

    if (!this.resumeData.experience || this.resumeData.experience.length === 0) {
      container.innerHTML = '<p class="empty-state-text">No experience added yet.</p>';
      return;
    }

    container.innerHTML = this.resumeData.experience.map((exp, expIdx) => `
      <div class="editor-card" data-exp-index="${expIdx}">
        <div class="editor-card-header">
          <strong>${exp.title || 'Untitled Role'} @ ${exp.company || 'Company'}</strong>
          <button class="btn-micro btn-danger btn-delete-exp" data-index="${expIdx}">✕ Remove</button>
        </div>
        <div class="editor-card-grid">
          <input type="text" class="form-input exp-title-input" value="${this.escapeHtml(exp.title || '')}" placeholder="Job Title" />
          <input type="text" class="form-input exp-company-input" value="${this.escapeHtml(exp.company || '')}" placeholder="Company" />
          <input type="text" class="form-input exp-period-input" value="${this.escapeHtml(exp.period || '')}" placeholder="Period (e.g. 2022 - Present)" />
          <input type="text" class="form-input exp-location-input" value="${this.escapeHtml(exp.location || '')}" placeholder="Location" />
        </div>
        <div class="editor-bullets-wrapper">
          <label class="form-label-sm">Bullet Points (Google XYZ formula recommended):</label>
          ${(exp.bullets || []).map((bullet, bIdx) => `
            <div class="bullet-edit-row">
              <textarea class="form-textarea-sm exp-bullet-input" data-exp="${expIdx}" data-bullet="${bIdx}">${this.escapeHtml(bullet)}</textarea>
              <button class="btn-micro btn-danger btn-del-bullet" data-exp="${expIdx}" data-bullet="${bIdx}">✕</button>
            </div>
          `).join('')}
          <button class="btn-micro btn-secondary btn-add-bullet" data-exp="${expIdx}">+ Add Bullet Point</button>
        </div>
      </div>
    `).join('');

    // Bind inputs within experience list
    container.querySelectorAll('.exp-title-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.experience[idx].title = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.exp-company-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.experience[idx].company = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.exp-period-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.experience[idx].period = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.exp-location-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.experience[idx].location = e.target.value;
        this.renderResumePreview();
      });
    });

    container.querySelectorAll('.exp-bullet-input').forEach(textarea => {
      textarea.addEventListener('input', (e) => {
        const eIdx = Number(e.target.getAttribute('data-exp'));
        const bIdx = Number(e.target.getAttribute('data-bullet'));
        this.resumeData.experience[eIdx].bullets[bIdx] = e.target.value;
        this.runATSAnalysis();
        this.renderResumePreview();
      });
    });

    container.querySelectorAll('.btn-del-bullet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eIdx = Number(e.currentTarget.getAttribute('data-exp'));
        const bIdx = Number(e.currentTarget.getAttribute('data-bullet'));
        this.resumeData.experience[eIdx].bullets.splice(bIdx, 1);
        this.renderEditorExperienceList();
        this.runATSAnalysis();
        this.renderResumePreview();
      });
    });

    container.querySelectorAll('.btn-add-bullet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eIdx = Number(e.currentTarget.getAttribute('data-exp'));
        this.resumeData.experience[eIdx].bullets.push("Architected resilient solution driving 25% efficiency gains.");
        this.renderEditorExperienceList();
        this.runATSAnalysis();
        this.renderResumePreview();
      });
    });

    container.querySelectorAll('.btn-delete-exp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.getAttribute('data-index'));
        this.resumeData.experience.splice(idx, 1);
        this.renderEditorExperienceList();
        this.runATSAnalysis();
        this.renderResumePreview();
        this.showToast('Removed experience item', 'info');
      });
    });
  }

  renderEditorSkillsList() {
    const container = document.getElementById('editor-skills-container');
    if (!container) return;

    if (!this.resumeData.skills) {
      container.innerHTML = '<p class="empty-state-text">No skills categorized.</p>';
      return;
    }

    let html = '';
    if (Array.isArray(this.resumeData.skills)) {
      html = `
        <div class="skills-raw-editor">
          <label class="form-label-sm">Skills (Comma separated):</label>
          <input type="text" id="raw-skills-input" class="form-input" value="${this.escapeHtml(this.resumeData.skills.join(', '))}" />
        </div>
      `;
    } else {
      html = Object.entries(this.resumeData.skills).map(([category, items]) => `
        <div class="skill-category-edit-card">
          <div class="skill-cat-header">
            <strong>${this.escapeHtml(category)}</strong>
          </div>
          <input type="text" class="form-input cat-skills-input" data-cat="${this.escapeHtml(category)}" value="${this.escapeHtml(Array.isArray(items) ? items.join(', ') : items)}" />
        </div>
      `).join('');
    }

    container.innerHTML = html;

    container.querySelectorAll('.cat-skills-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const cat = e.target.getAttribute('data-cat');
        this.resumeData.skills[cat] = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
        this.runATSAnalysis();
        this.renderResumePreview();
      });
    });

    const rawInput = document.getElementById('raw-skills-input');
    if (rawInput) {
      rawInput.addEventListener('input', (e) => {
        this.resumeData.skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
        this.runATSAnalysis();
        this.renderResumePreview();
      });
    }
  }

  renderEditorProjectsList() {
    const container = document.getElementById('editor-projects-container');
    if (!container) return;

    if (!this.resumeData.projects || this.resumeData.projects.length === 0) {
      container.innerHTML = '<p class="empty-state-text">No projects added yet.</p>';
      return;
    }

    container.innerHTML = this.resumeData.projects.map((proj, pIdx) => `
      <div class="editor-card" data-proj-index="${pIdx}">
        <div class="editor-card-header">
          <strong>${proj.name || 'Project Name'}</strong>
          <button class="btn-micro btn-danger btn-delete-proj" data-index="${pIdx}">✕ Remove</button>
        </div>
        <div class="editor-card-grid">
          <input type="text" class="form-input proj-name-input" value="${this.escapeHtml(proj.name || '')}" placeholder="Project Name" />
          <input type="text" class="form-input proj-role-input" value="${this.escapeHtml(proj.role || '')}" placeholder="Role / Responsibilities" />
          <input type="text" class="form-input proj-tech-input" value="${this.escapeHtml(proj.tech || '')}" placeholder="Tech Stack (e.g. Go, Redis, Docker)" />
          <input type="text" class="form-input proj-link-input" value="${this.escapeHtml(proj.link || '')}" placeholder="Link / URL" />
        </div>
        <div class="editor-bullets-wrapper">
          ${(proj.bullets || []).map((bullet, bIdx) => `
            <div class="bullet-edit-row">
              <textarea class="form-textarea-sm proj-bullet-input" data-proj="${pIdx}" data-bullet="${bIdx}">${this.escapeHtml(bullet)}</textarea>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.proj-name-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.projects[idx].name = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.proj-tech-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.projects[idx].tech = e.target.value;
        this.runATSAnalysis();
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.proj-link-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.projects[idx].link = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.proj-bullet-input').forEach(textarea => {
      textarea.addEventListener('input', (e) => {
        const pIdx = Number(e.target.getAttribute('data-proj'));
        const bIdx = Number(e.target.getAttribute('data-bullet'));
        this.resumeData.projects[pIdx].bullets[bIdx] = e.target.value;
        this.runATSAnalysis();
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.btn-delete-proj').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.getAttribute('data-index'));
        this.resumeData.projects.splice(idx, 1);
        this.renderEditorProjectsList();
        this.runATSAnalysis();
        this.renderResumePreview();
      });
    });
  }

  renderEditorEducationList() {
    const container = document.getElementById('editor-education-container');
    if (!container) return;

    if (!this.resumeData.education || this.resumeData.education.length === 0) {
      container.innerHTML = '<p class="empty-state-text">No education added yet.</p>';
      return;
    }

    container.innerHTML = this.resumeData.education.map((edu, idx) => `
      <div class="editor-card">
        <div class="editor-card-header">
          <strong>${this.escapeHtml(edu.degree || 'Degree')} — ${this.escapeHtml(edu.institution || 'Institution')}</strong>
          <button class="btn-micro btn-danger btn-delete-edu" data-index="${idx}">✕ Remove</button>
        </div>
        <div class="editor-card-grid">
          <input type="text" class="form-input edu-degree-input" value="${this.escapeHtml(edu.degree || '')}" placeholder="Degree (e.g. M.Tech in Big Data Analytics)" />
          <input type="text" class="form-input edu-inst-input" value="${this.escapeHtml(edu.institution || '')}" placeholder="Institution Name" />
          <input type="text" class="form-input edu-year-input" value="${this.escapeHtml(edu.year || '')}" placeholder="Year (e.g. 2021 - 2023)" />
          <input type="text" class="form-input edu-loc-input" value="${this.escapeHtml(edu.location || '')}" placeholder="Location (e.g. Bengaluru, India)" />
          <input type="text" class="form-input edu-details-input" value="${this.escapeHtml(edu.details || '')}" placeholder="Honors, GPA, Dissertation (optional)" style="grid-column: span 2;" />
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.edu-degree-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.education[idx].degree = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.edu-inst-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.education[idx].institution = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.edu-year-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.education[idx].year = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.edu-loc-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.education[idx].location = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.edu-details-input').forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        this.resumeData.education[idx].details = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.btn-delete-edu').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.getAttribute('data-index'));
        this.resumeData.education.splice(idx, 1);
        this.renderEditorEducationList();
        this.runATSAnalysis();
        this.renderResumePreview();
        this.showToast('Education entry removed');
      });
    });
  }

  renderEditorCertsList() {
    const container = document.getElementById('editor-certs-container');
    if (!container) return;

    if (!this.resumeData.certifications || this.resumeData.certifications.length === 0) {
      container.innerHTML = '<p class="empty-state-text">No certifications added yet.</p>';
      return;
    }

    container.innerHTML = this.resumeData.certifications.map((cert, idx) => `
      <div class="bullet-edit-row">
        <input type="text" class="form-input cert-input" data-index="${idx}" value="${this.escapeHtml(cert || '')}" placeholder="e.g. AWS Certified Solutions Architect" />
        <button class="btn-micro btn-danger btn-del-cert" data-index="${idx}">✕</button>
      </div>
    `).join('');

    container.querySelectorAll('.cert-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-index'));
        this.resumeData.certifications[idx] = e.target.value;
        this.renderResumePreview();
      });
    });
    container.querySelectorAll('.btn-del-cert').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.getAttribute('data-index'));
        this.resumeData.certifications.splice(idx, 1);
        this.renderEditorCertsList();
        this.renderResumePreview();
        this.showToast('Certification removed');
      });
    });
  }

  /* ----------------- LIVE RESUME CANVAS RENDERER ----------------- */
  renderResumePreview() {
    const canvas = document.getElementById('resume-canvas-body');
    if (!canvas) return;

    const matchedKeywords = this.atsResult ? this.atsResult.foundKeywords : [];
    const html = window.resumeTemplates.render(this.resumeData, matchedKeywords);
    canvas.innerHTML = html;

    // Check page fit status
    this.updatePageFitMeter();
  }

  updatePageFitMeter() {
    const resumeDoc = document.getElementById('printable-resume');
    const badge = document.getElementById('page-fit-badge');
    if (!resumeDoc || !badge) return;

    // Standard A4 pixel height approximation at 96 DPI is ~1122px
    const docHeight = resumeDoc.scrollHeight;
    const a4Height = 1122;

    if (docHeight <= a4Height + 40) {
      badge.innerHTML = '<span class="page-pill page-pill-success">📄 1 Page Fit (Perfect for ATS)</span>';
    } else if (docHeight <= a4Height * 2 + 60) {
      badge.innerHTML = '<span class="page-pill page-pill-warning">📄📄 2 Pages (Balanced Senior Fit)</span>';
    } else {
      badge.innerHTML = '<span class="page-pill page-pill-danger">📄📄+ 3+ Pages (Consider trimming bullets)</span>';
    }
  }

  /* ----------------- EXPORT ACTIONS ----------------- */
  printResume() {
    const originalTitle = document.title;
    const cleanName = (this.resumeData && this.resumeData.name) ? this.resumeData.name.replace(/\s+/g, '_') : 'Resume';
    document.title = `${cleanName}_Resume`;

    this.showToast('📄 Opening Print dialog. Tip: Ensure "Headers and Footers" is unchecked in print settings for a clean PDF.', 'info');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 150);
  }

  copyAtsPlaintext() {
    let plain = `${this.resumeData.name}\n${this.resumeData.targetTitle}\n`;
    plain += `Contact: ${[this.resumeData.email, this.resumeData.phone, this.resumeData.location, this.resumeData.linkedin].filter(Boolean).join(' | ')}\n\n`;
    
    if (this.resumeData.summary) {
      plain += `PROFESSIONAL SUMMARY\n${this.resumeData.summary}\n\n`;
    }

    if (this.resumeData.skills) {
      plain += `SKILLS\n`;
      if (Array.isArray(this.resumeData.skills)) {
        plain += this.resumeData.skills.join(', ') + '\n\n';
      } else {
        Object.entries(this.resumeData.skills).forEach(([cat, list]) => {
          plain += `${cat}: ${Array.isArray(list) ? list.join(', ') : list}\n`;
        });
        plain += '\n';
      }
    }

    if (this.resumeData.experience) {
      plain += `EXPERIENCE\n`;
      this.resumeData.experience.forEach(exp => {
        plain += `${exp.title} - ${exp.company} (${exp.period})\n`;
        if (exp.bullets) {
          exp.bullets.forEach(b => plain += `• ${b}\n`);
        }
        plain += '\n';
      });
    }

    if (this.resumeData.projects) {
      plain += `PROJECTS\n`;
      this.resumeData.projects.forEach(p => {
        plain += `${p.name} (${p.tech || ''})\n`;
        if (p.bullets) {
          p.bullets.forEach(b => plain += `• ${b}\n`);
        }
        plain += '\n';
      });
    }

    navigator.clipboard.writeText(plain).then(() => {
      this.showToast('Copied ATS-clean plain text to clipboard!');
    }).catch(err => {
      console.error(err);
      this.showToast('Failed to copy text', 'error');
    });
  }

  exportJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.resumeData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${this.resumeData.name.replace(/\s+/g, '_')}_resume_profile.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    this.showToast('Exported profile to JSON');
  }

  importJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.name && (parsed.experience || parsed.skills)) {
          this.resumeData = parsed;
          this.populateEditor();
          this.runATSAnalysis();
          this.renderResumePreview();
          this.showToast('Successfully imported resume profile!', 'success');
          this.saveSession();
        } else {
          this.showToast('Invalid resume JSON format', 'error');
        }
      } catch (err) {
        this.showToast('Error parsing JSON file', 'error');
      }
    };
    reader.readAsText(file);
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
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
}

// Launch application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ResuCraftApp();
});
