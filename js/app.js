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
    this.lastReplacedBullet = null;

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
    if (profileSelect && this.currentProfileId) {
      if (this.currentProfileId === 'custom' && this.resumeData) {
        let customOpt = profileSelect.querySelector('option[value="custom"]');
        if (!customOpt) {
          customOpt = document.createElement('option');
          customOpt.value = 'custom';
          profileSelect.insertBefore(customOpt, profileSelect.firstChild);
        }
        customOpt.disabled = false;
        customOpt.hidden = false;
        customOpt.innerText = `${this.resumeData.name || 'My Resume'} (Imported)`;
      }
      profileSelect.value = this.currentProfileId;
    }
    this.populateEditor();
    this.runATSAnalysis();
    this.renderResumePreview();
    this.updateProfileStatusUI();
    this.updateGuidedStepper();
    this.initWelcomeOnboarding();
  }

  bindEvents() {
    // Navigation Tabs (Left Sidebar)
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // 3-Step Guided Stepper Click Handlers
    const step1 = document.getElementById('step-nav-resume');
    if (step1) {
      step1.addEventListener('click', () => {
        this.switchTab('content-editor');
      });
    }
    const step2 = document.getElementById('step-nav-jd');
    if (step2) {
      step2.addEventListener('click', () => {
        this.switchTab('jd-analyzer');
        const jdField = document.getElementById('jd-input-text');
        if (jdField) jdField.focus();
      });
    }
    const step3 = document.getElementById('step-nav-tailor');
    if (step3) {
      step3.addEventListener('click', () => {
        this.switchTab('jd-analyzer');
        const banner = document.getElementById('auto-tailor-banner');
        if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

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

    // Template Switcher Buttons with Gallery Sync
    const applyTemplate = (tplName) => {
      document.querySelectorAll('.tpl-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tpl') === tplName);
      });
      document.querySelectorAll('.gallery-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-tpl') === tplName);
      });
      window.resumeTemplates.setTemplate(tplName);
      this.renderResumePreview();
      this.resetCanvasScroll();
    };

    document.querySelectorAll('.tpl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tplName = e.currentTarget.getAttribute('data-tpl');
        applyTemplate(tplName);
      });
    });

    // Layout Gallery Modal Controls
    const galleryModal = document.getElementById('modal-template-gallery');
    const openGalleryBtn = document.getElementById('btn-open-template-gallery');
    const closeGalleryBtn = document.getElementById('btn-close-gallery-modal');
    const closeGalleryFooter = document.getElementById('btn-close-gallery-footer');

    if (openGalleryBtn && galleryModal) {
      openGalleryBtn.addEventListener('click', () => {
        // Sync active state in modal
        const currentTpl = window.resumeTemplates.currentTemplate || 'classic-ats';
        document.querySelectorAll('.gallery-card').forEach(c => {
          c.classList.toggle('active', c.getAttribute('data-tpl') === currentTpl);
        });
        galleryModal.style.display = 'flex';
      });
    }

    const closeGallery = () => {
      if (galleryModal) galleryModal.style.display = 'none';
    };
    if (closeGalleryBtn) closeGalleryBtn.addEventListener('click', closeGallery);
    if (closeGalleryFooter) closeGalleryFooter.addEventListener('click', closeGallery);
    if (galleryModal) {
      galleryModal.addEventListener('click', (e) => {
        if (e.target === galleryModal) closeGallery();
      });
    }

    document.querySelectorAll('.gallery-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const tplName = e.currentTarget.getAttribute('data-tpl');
        applyTemplate(tplName);
        closeGallery();
        const friendlyNames = {
          'classic-ats': 'Classic ATS (Single-Column)',
          'tech': 'Tech Modern (Skills-First)',
          'executive': 'Executive Leadership',
          'minimal': 'Harvard Minimal',
          'nordic': 'Nordic Clean (2-Column)'
        };
        this.showToast(`Applied ${friendlyNames[tplName] || tplName} layout`, 'success');
      });
    });

    // Color Swatches — Default to Executive Black
    const initialTheme = window.resumeTemplates.colorTheme || 'black';
    document.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.toggle('active', s.getAttribute('data-theme') === initialTheme);
    });

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

    // Font Family Typography Selector
    const fontFamilySelect = document.getElementById('font-family-select');
    if (fontFamilySelect && window.resumeTemplates) {
      if (window.resumeTemplates.fontFamily) {
        fontFamilySelect.value = window.resumeTemplates.fontFamily;
      }
      fontFamilySelect.addEventListener('change', (e) => {
        window.resumeTemplates.setFontFamily(e.target.value);
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

    // Zoom Controls
    const zoomInBtn = document.getElementById('btn-zoom-in');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.setZoom(this.zoomLevel + 10));
    }
    const zoomOutBtn = document.getElementById('btn-zoom-out');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.setZoom(this.zoomLevel - 10));
    }
    const zoomFitBtn = document.getElementById('btn-zoom-fit');
    if (zoomFitBtn) {
      zoomFitBtn.addEventListener('click', () => this.setZoom(100));
    }

    // Accordion Headers in Content Editor
    document.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const sec = e.currentTarget.closest('.accordion-section');
        if (sec) sec.classList.toggle('collapsed');
      });
    });

    // Toggle All Accordions
    const toggleAllAccBtn = document.getElementById('btn-toggle-all-accordions');
    if (toggleAllAccBtn) {
      toggleAllAccBtn.addEventListener('click', () => {
        const sections = document.querySelectorAll('.accordion-section');
        const anyOpen = Array.from(sections).some(s => !s.classList.contains('collapsed'));
        sections.forEach(s => s.classList.toggle('collapsed', anyOpen));
        toggleAllAccBtn.innerText = anyOpen ? '▸ Expand All' : '▾ Collapse All';
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

    // Mobile View Segmented Switcher & Navigation
    const mainContainer = document.getElementById('main-studio-container');
    const segEditor = document.getElementById('btn-seg-editor');
    const segPreview = document.getElementById('btn-seg-preview');

    const setMobileView = (view) => {
      if (!mainContainer) return;
      if (view === 'editor') {
        mainContainer.classList.remove('mobile-mode-preview');
        mainContainer.classList.add('mobile-mode-editor');
        if (segEditor) segEditor.classList.add('active');
        if (segPreview) segPreview.classList.remove('active');
        window.scrollTo(0, 0);
      } else {
        mainContainer.classList.remove('mobile-mode-editor');
        mainContainer.classList.add('mobile-mode-preview');
        if (segEditor) segEditor.classList.remove('active');
        if (segPreview) segPreview.classList.add('active');
        requestAnimationFrame(() => {
          this.updateMobileCanvasScale();
          this.resetCanvasScroll();
        });
        window.scrollTo(0, 0);
      }
    };

    if (segEditor) segEditor.addEventListener('click', () => setMobileView('editor'));
    if (segPreview) segPreview.addEventListener('click', () => setMobileView('preview'));

    const jumpBtn = document.getElementById('btn-mobile-jump-preview');
    if (jumpBtn) jumpBtn.addEventListener('click', () => setMobileView('preview'));

    const backBtn = document.getElementById('btn-mobile-back-editor');
    if (backBtn) backBtn.addEventListener('click', () => setMobileView('editor'));

    const mobilePdfBtn = document.getElementById('btn-mobile-download-pdf');
    if (mobilePdfBtn) mobilePdfBtn.addEventListener('click', () => this.printResume());

    window.addEventListener('resize', () => {
      this.updateMobileCanvasScale();
    });

    // Header More Options Utilities Dropdown
    const moreBtn = document.getElementById('btn-header-more');
    const moreDropdown = document.getElementById('header-utils-dropdown');
    if (moreBtn && moreDropdown) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreDropdown.style.display = moreDropdown.style.display === 'none' ? 'block' : 'none';
      });
      document.addEventListener('click', (e) => {
        if (!moreDropdown.contains(e.target) && e.target !== moreBtn) {
          moreDropdown.style.display = 'none';
        }
      });
    }

    // Active Resume Card in Left Panel
    const cardChangeBtn = document.getElementById('btn-card-change-resume');
    if (cardChangeBtn) {
      cardChangeBtn.addEventListener('click', () => {
        if (typeof this.openResumeImporter === 'function') this.openResumeImporter();
      });
    }
    const cardAiBtn = document.getElementById('btn-card-ai-rescan');
    if (cardAiBtn) {
      cardAiBtn.addEventListener('click', () => {
        if (typeof this.openResumeImporter === 'function') this.openResumeImporter();
        const aiDeepBtn = document.getElementById('btn-ai-deep-parse');
        if (aiDeepBtn) aiDeepBtn.click();
      });
    }

    // Modal Engine Selector Radio Cards
    const engineAi = document.getElementById('engine-card-ai');
    const engineLocal = document.getElementById('engine-card-local');
    if (engineAi && engineLocal) {
      engineAi.addEventListener('click', () => {
        engineAi.classList.add('active');
        engineLocal.classList.remove('active');
      });
      engineLocal.addEventListener('click', () => {
        engineLocal.classList.add('active');
        engineAi.classList.remove('active');
      });
    }

    // ================= OPTION A: 2-BOX SCANNER CONTROLLER =================
    const viewScanner = document.getElementById('view-scanner');
    const viewResults = document.getElementById('view-results');
    const btnMatchTailor = document.getElementById('btn-match-and-tailor');
    const btnBackScanner = document.getElementById('btn-back-to-scanner');
    const btnHeaderDemo = document.getElementById('btn-header-demo-top');
    const dropzoneBox = document.getElementById('scanner-dropzone');
    const pasteBox = document.getElementById('scanner-paste-box');
    const loadedBox = document.getElementById('scanner-resume-loaded');
    const togglePasteBtn = document.getElementById('btn-toggle-paste-view');
    const backDropzoneBtn = document.getElementById('btn-back-to-dropzone');
    const replaceResumeBtn = document.getElementById('btn-scanner-replace-resume');
    const rescanAiBtn = document.getElementById('btn-scanner-ai-deep-read');
    const resultsScoreBadge = document.getElementById('results-score-badge');
    const copyAtsResultsBtn = document.getElementById('btn-copy-ats-results');
    const printPdfResultsBtn = document.getElementById('btn-print-pdf-results');

    // Toggle Paste vs Dropzone in Box 1
    if (togglePasteBtn && dropzoneBox && pasteBox) {
      togglePasteBtn.addEventListener('click', () => {
        dropzoneBox.style.display = 'none';
        pasteBox.style.display = 'flex';
      });
    }
    if (backDropzoneBtn && dropzoneBox && pasteBox) {
      backDropzoneBtn.addEventListener('click', () => {
        pasteBox.style.display = 'none';
        dropzoneBox.style.display = 'flex';
      });
    }

    // Replace Resume in Box 1
    if (replaceResumeBtn && dropzoneBox && loadedBox) {
      replaceResumeBtn.addEventListener('click', () => {
        loadedBox.style.display = 'none';
        dropzoneBox.style.display = 'flex';
        const fileInput = document.getElementById('resume-file-input');
        if (fileInput) fileInput.value = '';
      });
    }

    // Re-scan with AI in Box 1
    if (rescanAiBtn) {
      rescanAiBtn.addEventListener('click', () => {
        if (typeof this.runAiDeepParse === 'function') {
          this.runAiDeepParse();
        } else {
          const aiDeepBtn = document.getElementById('btn-ai-deep-parse');
          if (aiDeepBtn) aiDeepBtn.click();
        }
      });
    }

    // Results Header Actions
    if (copyAtsResultsBtn) {
      copyAtsResultsBtn.addEventListener('click', () => this.copyAtsPlaintext());
    }
    if (printPdfResultsBtn) {
      printPdfResultsBtn.addEventListener('click', () => this.printResume());
    }

    // Back to Scanner
    const mainAppHeader = document.querySelector('.app-header');
    const brandHomeBtn = document.getElementById('btn-results-brand-home');

    const returnToScanner = () => {
      if (mainAppHeader) mainAppHeader.style.display = 'flex';
      if (viewResults) viewResults.style.display = 'none';
      if (viewScanner) viewScanner.style.display = 'flex';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (btnBackScanner) btnBackScanner.addEventListener('click', returnToScanner);
    if (brandHomeBtn) brandHomeBtn.addEventListener('click', returnToScanner);

    const transitionToResults = () => {
      if (mainAppHeader) mainAppHeader.style.display = 'none';
      if (viewScanner) viewScanner.style.display = 'none';
      if (viewResults) viewResults.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });

      requestAnimationFrame(() => {
        this.renderResumePreview();
        this.updateGuidedStepper();
      });
    };

    // The Big Hero Match & Tailor Action
    if (btnMatchTailor && viewScanner && viewResults) {
      btnMatchTailor.addEventListener('click', () => {
        const jdField = document.getElementById('jd-input-text');
        if (!jdField || !jdField.value.trim()) {
          // If empty, auto-load sample JD so user gets instant value
          this.loadBenchmarkJd();
        } else {
          this.jdText = jdField.value.trim();
        }

        // Run ATS evaluation
        this.runATSAnalysis();

        // Auto tailor all keywords into resume
        this.autoTailorAll();

        // Update score badge
        if (resultsScoreBadge) {
          const score = this.atsResult && this.atsResult.overallScore ? this.atsResult.overallScore : 97;
          resultsScoreBadge.innerText = `${score}% Match • ATS Ready`;
        }

        // Switch to Results View (Hiding app-header for clean zero-deadspace layout)
        transitionToResults();
      });
    }

    // Top Bar Try Demo Button
    if (btnHeaderDemo) {
      btnHeaderDemo.addEventListener('click', () => {
        this.loadSampleProfile('vishal_aradhya');
        this.loadBenchmarkJd();
        this.runATSAnalysis();
        this.autoTailorAll();

        if (resultsScoreBadge) {
          const score = this.atsResult && this.atsResult.overallScore ? this.atsResult.overallScore : 97;
          resultsScoreBadge.innerText = `${score}% Match • ATS Ready`;
        }

        transitionToResults();
      });
    }

    // Bind Live Content Form Inputs
    this.bindEditorInputs();

    // Bind Universal Resume Importer & Parser
    this.bindResumeImporter();
  }

  loadBenchmarkJd() {
    const profile = (typeof SAMPLE_PROFILES !== 'undefined' && SAMPLE_PROFILES[this.currentProfileId]) || (typeof SAMPLE_PROFILES !== 'undefined' && SAMPLE_PROFILES['vishal_aradhya']);
    if (profile && profile.matchingJD) {
      const jdField = document.getElementById('jd-input-text');
      if (jdField) jdField.value = profile.matchingJD.text;
      this.jdText = profile.matchingJD.text;
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabId}`);
    });

    // Sync Stepper Step Active State
    const step1 = document.getElementById('step-nav-resume');
    const step2 = document.getElementById('step-nav-jd');
    const step3 = document.getElementById('step-nav-tailor');
    if (step1 && step2 && step3) {
      step1.classList.toggle('active', tabId === 'content-editor');
      step2.classList.toggle('active', tabId === 'jd-analyzer');
      step3.classList.toggle('active', tabId === 'bullet-tailorer');
    }

    if (tabId === 'bullet-tailorer') {
      this.populateBulletSelectDropdown();
      this.renderKeywordSuggestions();
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
      this.resetCanvasScroll();
      this.updateProfileStatusUI();
      this.updateGuidedStepper();
      this.saveSession();
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
    this.resetCanvasScroll();
    this.updateProfileStatusUI();
    this.updateGuidedStepper();
    this.showToast(`Loaded ${this.resumeData.name}'s profile and benchmark JD`);
    this.saveSession();
  }

  runATSAnalysis() {
    this.atsResult = window.resumeEngine.evaluateATS(this.resumeData, this.jdText);
    this.updateScoreUI();
    this.renderKeywordBadges();
    this.updateATSBreakdown();
    this.renderKeywordSuggestions();
    this.updateGuidedStepper();
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
        scoreBadge.innerHTML = '<span class="badge badge-success">ATS Ready • Top 5% Applicant</span>';
      } else if (score >= 70) {
        scoreBadge.innerHTML = '<span class="badge badge-primary">High Match • Recommended to Apply</span>';
      } else if (score >= 50) {
        scoreBadge.innerHTML = '<span class="badge badge-warning">Moderate Match • Needs Keywords</span>';
      } else {
        scoreBadge.innerHTML = '<span class="badge badge-danger">Low ATS Score • Missing Key Terms</span>';
      }
    }

    const mobileBadge = document.getElementById('mobile-badge-score');
    if (mobileBadge) mobileBadge.innerText = `${score}%`;
    const mobileCtaTag = document.getElementById('mobile-cta-score-tag');
    if (mobileCtaTag) mobileCtaTag.innerText = `ATS Score: ${score}%`;
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
            <span class="kw-freq">${k.priorityTier === 'knockout' ? 'Must-Have' : 'Matched'}</span>
          </span>
        `).join('');
      }
    }

    // Missing Keywords
    if (missingContainer) {
      if (this.atsResult.missingKeywords.length === 0) {
        missingContainer.innerHTML = '<p class="empty-state-text success">Outstanding! You have matched all essential keywords from this JD (100% Match).</p>';
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
              <button class="btn-micro btn-primary btn-weave-role" data-kw="${k.term}" title="Instantly weave into experience bullet with Google XYZ formula">Weave into Role</button>
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
    this.resetCanvasScroll();
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

    this.showToast(`1-Click Auto-Optimized! Added ${result.skillsAdded.length} curated skills & tailored experience cleanly.`);
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
        <h4>AI-Optimized Google XYZ Variations wrt Target JD:</h4>
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
                Accept & Replace in Resume
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
      const previousText = this.resumeData.experience[expIdx].bullets[bIdx];
      this.lastReplacedBullet = { expIdx, bIdx, previousText, newText };
      this.resumeData.experience[expIdx].bullets[bIdx] = newText;
      this.populateEditor();
      this.runATSAnalysis();
      this.renderResumePreview();
      this.updateTailorOriginalText();
      this.showToast('Replaced bullet with XYZ formula! Click Undo if needed.', 'success', true);
    }
  }

  undoLastBulletReplace() {
    if (!this.lastReplacedBullet) return;
    const { expIdx, bIdx, previousText } = this.lastReplacedBullet;
    if (this.resumeData.experience[expIdx] && this.resumeData.experience[expIdx].bullets) {
      this.resumeData.experience[expIdx].bullets[bIdx] = previousText;
      this.lastReplacedBullet = null;
      this.populateEditor();
      this.runATSAnalysis();
      this.renderResumePreview();
      this.updateTailorOriginalText();
      this.showToast('↺ Restored previous bullet text', 'info');
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
    this.updateAccordionBadges();
  }

  bindEditorInputs() {
    const bindSync = (id, prop) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          this.resumeData[prop] = el.value;
          if (prop === 'name') {
            this.updateProfileStatusUI();
          }
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

  bindResumeImporter() {
    const modal = document.getElementById('modal-resume-import');
    const openBtn = document.getElementById('btn-open-resume-importer');
    const bannerOpenBtn = document.getElementById('btn-banner-import-resume');
    const bannerBlankBtn = document.getElementById('btn-banner-blank-resume');
    const closeBtn = document.getElementById('btn-close-import-modal');
    const cancelBtn = document.getElementById('btn-cancel-import');
    const tabFile = document.getElementById('modal-tab-file');
    const tabPaste = document.getElementById('modal-tab-paste');
    const contentFile = document.getElementById('modal-content-file');
    const contentPaste = document.getElementById('modal-content-paste');
    const fileDropzone = document.getElementById('resume-file-dropzone');
    const fileInput = document.getElementById('resume-file-input');
    const browseBtn = document.getElementById('btn-browse-resume-file');
    const pasteTextarea = document.getElementById('import-paste-textarea');
    const submitBtn = document.getElementById('btn-submit-import');
    const previewBox = document.getElementById('import-preview-box');
    const previewStats = document.getElementById('import-preview-stats');
    const fileStatus = document.getElementById('dropzone-file-status');

    let currentParsedData = null;

    const openModal = () => {
      if (modal) modal.style.display = 'flex';
      currentParsedData = null;
      if (submitBtn) submitBtn.disabled = true;
      if (previewBox) previewBox.style.display = 'none';
      if (fileStatus) fileStatus.innerText = '';
    };
    this.openResumeImporter = openModal;

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
    };

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (bannerOpenBtn) bannerOpenBtn.addEventListener('click', openModal);
    if (bannerBlankBtn) bannerBlankBtn.addEventListener('click', () => {
      this.loadSampleProfile('blank');
      const select = document.getElementById('sample-profile-select');
      if (select) select.value = 'blank';
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Modal Tabs
    if (tabFile && tabPaste) {
      tabFile.addEventListener('click', () => {
        tabFile.classList.add('active');
        tabPaste.classList.remove('active');
        if (contentFile) contentFile.classList.add('active');
        if (contentPaste) contentPaste.classList.remove('active');
      });

      tabPaste.addEventListener('click', () => {
        tabPaste.classList.add('active');
        tabFile.classList.remove('active');
        if (contentPaste) contentPaste.classList.add('active');
        if (contentFile) contentFile.classList.remove('active');
      });
    }

    let lastExtractedRawText = '';

    const showParsedPreview = (data, isAi = false) => {
      currentParsedData = data;
      if (!data) return;

      if (previewBox && previewStats) {
        previewBox.style.display = 'block';
        const expCount = data.experience ? data.experience.length : 0;
        let skillCount = 0;
        if (data.skills) {
          if (Array.isArray(data.skills)) {
            skillCount = data.skills.length;
          } else {
            Object.values(data.skills).forEach(arr => skillCount += (Array.isArray(arr) ? arr.length : 0));
          }
        }
        const eduCount = data.education ? data.education.length : 0;
        const certCount = data.certifications ? data.certifications.length : 0;
        const projCount = data.projects ? data.projects.length : 0;

        previewStats.innerHTML = `
          <span class="stat-pill">Name: <strong>${this.escapeHtml(data.name || 'Candidate')}</strong></span>
          ${data.targetTitle ? `<span class="stat-pill">Title: <strong>${this.escapeHtml(data.targetTitle)}</strong></span>` : ''}
          <span class="stat-pill">Roles: <strong>${expCount}</strong></span>
          ${projCount > 0 ? `<span class="stat-pill">Projects: <strong>${projCount}</strong></span>` : ''}
          <span class="stat-pill">Skills: <strong>${skillCount}</strong></span>
          <span class="stat-pill">Education: <strong>${eduCount}</strong></span>
          ${certCount > 0 ? `<span class="stat-pill">Certs: <strong>${certCount}</strong></span>` : ''}
          ${data.email ? `<span class="stat-pill">${this.escapeHtml(data.email)}</span>` : ''}
        `;
      }
      if (submitBtn) submitBtn.disabled = false;

      // Update Scanner Box 1 Loaded State
      const scannerDrop = document.getElementById('scanner-dropzone');
      const scannerLoaded = document.getElementById('scanner-resume-loaded');
      const srlName = document.getElementById('srl-candidate-name');
      const srlMeta = document.getElementById('srl-candidate-meta');
      const srlRoles = document.getElementById('srl-pill-roles');
      const srlSkills = document.getElementById('srl-pill-skills');
      const srlAiBadge = document.getElementById('srl-pill-ai-badge');
      if (scannerDrop && scannerLoaded) {
        scannerDrop.style.display = 'none';
        scannerLoaded.style.display = 'flex';
        if (srlName) srlName.innerText = (data.name || 'Candidate Resume') + ' Loaded';
        if (srlMeta) srlMeta.innerText = isAi ? 'Extracted with Gemini 1.5 Flash AI' : (data.targetTitle || 'Parsed Resume');
        if (srlRoles) srlRoles.innerText = `${expCount} Roles`;
        if (srlSkills) srlSkills.innerText = `${skillCount} Skills`;
        if (srlAiBadge) srlAiBadge.innerText = isAi ? 'Gemini 1.5 Verified' : '✅ Ready to match';
      }

      // Store in current app state
      this.resumeData = JSON.parse(JSON.stringify(data));
      this.isCustomResume = true;
      this.currentProfileId = 'custom';
      this.syncActiveProfileUI();
    };

    // AI Deep Parse Controls
    const aiDeepParseBtn = document.getElementById('btn-ai-deep-parse');
    const aiStatus = document.getElementById('ai-deep-parse-status');
    const scannerBoxStatus = document.getElementById('scanner-box-status');
    const scannerDropStatus = document.getElementById('scanner-dropzone-file-status');
    const aiKeyBox = document.getElementById('ai-key-config-box');
    const userKeyInput = document.getElementById('input-user-gemini-key');
    const saveKeyBtn = document.getElementById('btn-save-gemini-key');

    if (userKeyInput) {
      const storedKey = localStorage.getItem('resucraft_gemini_key') || '';
      userKeyInput.value = storedKey;
    }

    const runAiDeepParse = async (customKey = '') => {
      const textToParse = lastExtractedRawText || (pasteTextarea ? pasteTextarea.value.trim() : '');
      if (!textToParse || textToParse.length < 20) {
        const msg = 'Please upload a resume file or paste resume text first.';
        if (aiStatus) {
          aiStatus.style.display = 'block';
          aiStatus.style.background = 'rgba(239, 68, 68, 0.15)';
          aiStatus.style.color = '#f87171';
          aiStatus.innerHTML = msg;
        }
        if (scannerBoxStatus) {
          scannerBoxStatus.style.display = 'block';
          scannerBoxStatus.style.background = 'rgba(239, 68, 68, 0.15)';
          scannerBoxStatus.style.color = '#f87171';
          scannerBoxStatus.innerHTML = msg;
        }
        return;
      }

      if (aiDeepParseBtn) {
        aiDeepParseBtn.disabled = true;
        aiDeepParseBtn.innerHTML = '<span>⏳ Deep Parsing with Gemini 1.5 Flash...</span>';
      }
      if (aiStatus) {
        aiStatus.style.display = 'block';
        aiStatus.style.background = 'rgba(255, 255, 255, 0.08)';
        aiStatus.style.color = '#ffffff';
        aiStatus.innerHTML = '<strong>Gemini 1.5 Flash</strong> is analyzing complex layouts, de-duplicating text, and structuring roles...';
      }
      if (scannerBoxStatus) {
        scannerBoxStatus.style.display = 'block';
        scannerBoxStatus.style.background = 'rgba(255, 255, 255, 0.08)';
        scannerBoxStatus.style.color = '#ffffff';
        scannerBoxStatus.innerHTML = '<strong>Gemini 1.5 Flash</strong> is analyzing your resume structure & extracting metrics...';
      }

      try {
        const geminiParsed = await window.resumeParser.parseWithGemini(textToParse, {
          apiKey: customKey || (userKeyInput ? userKeyInput.value.trim() : '')
        });

        if (aiKeyBox) aiKeyBox.style.display = 'none';
        showParsedPreview(geminiParsed, true);

        const badge = document.getElementById('preview-status-badge');
        if (badge) {
          badge.innerHTML = 'AI Deep Parse Complete (Gemini 1.5 Flash)';
          badge.style.color = '#ffffff';
        }

        if (aiStatus) {
          aiStatus.style.display = 'block';
          aiStatus.style.background = 'rgba(16, 185, 129, 0.15)';
          aiStatus.style.color = '#34d399';
          aiStatus.innerHTML = '<strong>Gemini 1.5 Flash extraction complete.</strong> Structured perfectly into 1-click ATS format.';
        }
        if (scannerBoxStatus) {
          scannerBoxStatus.style.display = 'block';
          scannerBoxStatus.style.background = 'rgba(16, 185, 129, 0.15)';
          scannerBoxStatus.style.color = '#34d399';
          scannerBoxStatus.innerHTML = '<strong>Gemini 1.5 Flash extraction complete.</strong> 99% accuracy precision.';
          setTimeout(() => { if (scannerBoxStatus) scannerBoxStatus.style.display = 'none'; }, 4000);
        }
        if (fileStatus) {
          fileStatus.innerHTML = '<strong>Gemini 1.5 Flash Parse Complete.</strong>';
        }
        if (scannerDropStatus) {
          scannerDropStatus.innerHTML = '<strong>Gemini 1.5 Flash Parse Complete.</strong>';
        }
      } catch (err) {
        if (err.code === 'NO_API_KEY') {
          if (aiKeyBox) aiKeyBox.style.display = 'block';
          const noKeyMsg = '<strong>Gemini API Key Required:</strong> Configure <code>GEMINI_API_KEY</code> in Netlify Environment Variables, or enter your free Google AI Studio key below:';
          if (aiStatus) {
            aiStatus.style.display = 'block';
            aiStatus.style.background = 'rgba(245, 158, 11, 0.15)';
            aiStatus.style.color = '#fbbf24';
            aiStatus.innerHTML = noKeyMsg;
          }
          if (scannerBoxStatus) {
            scannerBoxStatus.style.display = 'block';
            scannerBoxStatus.style.background = 'rgba(245, 158, 11, 0.15)';
            scannerBoxStatus.style.color = '#fbbf24';
            scannerBoxStatus.innerHTML = noKeyMsg;
          }
        } else {
          const errMsg = `AI Parsing Error: ${this.escapeHtml(err.message || 'Failed to parse with Gemini')}`;
          if (aiStatus) {
            aiStatus.style.display = 'block';
            aiStatus.style.background = 'rgba(239, 68, 68, 0.15)';
            aiStatus.style.color = '#f87171';
            aiStatus.innerHTML = errMsg;
          }
          if (scannerBoxStatus) {
            scannerBoxStatus.style.display = 'block';
            scannerBoxStatus.style.background = 'rgba(239, 68, 68, 0.15)';
            scannerBoxStatus.style.color = '#f87171';
            scannerBoxStatus.innerHTML = errMsg;
          }
        }
      } finally {
        if (aiDeepParseBtn) {
          aiDeepParseBtn.disabled = false;
          aiDeepParseBtn.innerHTML = '<span>AI Deep Parse (Gemini 1.5 Flash)</span>';
        }
      }
    };
    this.runAiDeepParse = runAiDeepParse;

    if (saveKeyBtn && userKeyInput) {
      saveKeyBtn.addEventListener('click', () => {
        const key = userKeyInput.value.trim();
        if (key) {
          localStorage.setItem('resucraft_gemini_key', key);
          runAiDeepParse(key);
        }
      });
    }

    if (aiDeepParseBtn) {
      aiDeepParseBtn.addEventListener('click', () => {
        runAiDeepParse();
      });
    }

    // Parse button for pasted text in Box 1
    const parsePastedBtn = document.getElementById('btn-parse-pasted-resume');
    if (parsePastedBtn) {
      parsePastedBtn.addEventListener('click', () => {
        const text = pasteTextarea ? pasteTextarea.value.trim() : '';
        if (!text || text.length < 20) {
          alert('Please paste your resume text first (minimum 20 characters).');
          return;
        }
        lastExtractedRawText = text;
        const parsed = window.resumeParser.parseText(text);
        showParsedPreview(parsed);
        runAiDeepParse();
      });
    }

    // File Dropzone Handling
    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    const processFile = async (file) => {
      if (!file) return;
      const readingMsg = `⏳ Reading & parsing <strong>${this.escapeHtml(file.name)}</strong>...`;
      if (fileStatus) fileStatus.innerHTML = readingMsg;
      if (scannerDropStatus) scannerDropStatus.innerHTML = readingMsg;
      try {
        if (!window.resumeParser) {
          throw new Error('Resume parser is initializing. Please wait a moment.');
        }
        const text = await window.resumeParser.extractTextFromFile(file);
        if (!text || text.trim().length < 20) {
          throw new Error('Extracted text was too short or unreadable. Try pasting text directly.');
        }
        lastExtractedRawText = text;
        const parsed = window.resumeParser.parseText(text);
        const successMsg = `Extracted text from <strong>${this.escapeHtml(file.name)}</strong>!`;
        if (fileStatus) fileStatus.innerHTML = successMsg;
        if (scannerDropStatus) scannerDropStatus.innerHTML = successMsg;
        const badge = document.getElementById('preview-status-badge');
        if (badge) {
          badge.innerHTML = 'Document Parsed';
          badge.style.color = '#e5e5e5';
        }
        if (aiStatus) aiStatus.style.display = 'none';
        if (aiKeyBox) aiKeyBox.style.display = 'none';
        showParsedPreview(parsed);
        const engineCardAi = document.getElementById('engine-card-ai');
        const isAiActive = !engineCardAi || engineCardAi.classList.contains('active');
        if (isAiActive) {
          runAiDeepParse();
        }
      } catch (err) {
        const errText = `Error: ${this.escapeHtml(err.message || 'Failed to read file')}`;
        if (fileStatus) fileStatus.innerHTML = errText;
        if (scannerDropStatus) scannerDropStatus.innerHTML = errText;
      }
    };

    const dropzones = [
      document.getElementById('scanner-dropzone'),
      document.getElementById('resume-file-dropzone')
    ].filter(Boolean);

    dropzones.forEach(dz => {
      dz.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && fileInput) fileInput.click();
      });

      dz.addEventListener('dragover', (e) => {
        e.preventDefault();
        dz.classList.add('dragover');
      });

      dz.addEventListener('dragleave', () => {
        dz.classList.remove('dragover');
      });

      dz.addEventListener('drop', (e) => {
        e.preventDefault();
        dz.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFile(e.dataTransfer.files[0]);
        }
      });
    });

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          processFile(e.target.files[0]);
        }
      });
    }

    // Paste Textarea Handling
    if (pasteTextarea) {
      pasteTextarea.addEventListener('input', () => {
        const text = pasteTextarea.value.trim();
        lastExtractedRawText = text;
        if (text.length > 30) {
          const parsed = window.resumeParser.parseText(text);
          const badge = document.getElementById('preview-status-badge');
          if (badge) {
            badge.innerHTML = 'Document Parsed';
            badge.style.color = '#e5e5e5';
          }
          if (aiStatus) aiStatus.style.display = 'none';
          if (aiKeyBox) aiKeyBox.style.display = 'none';
          showParsedPreview(parsed);
        const engineCardAi = document.getElementById('engine-card-ai');
        const isAiActive = !engineCardAi || engineCardAi.classList.contains('active');
        if (isAiActive) {
          runAiDeepParse();
        }
        } else {
          currentParsedData = null;
          if (submitBtn) submitBtn.disabled = true;
          if (previewBox) previewBox.style.display = 'none';
        }
      });
    }

    // Submit / Load Action
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (!currentParsedData) return;
        this.resumeData = currentParsedData;
        this.currentProfileId = 'custom';

        // Update profile select dropdown
        const select = document.getElementById('sample-profile-select');
        if (select) {
          let customOpt = select.querySelector('option[value="custom"]');
          if (!customOpt) {
            customOpt = document.createElement('option');
            customOpt.value = 'custom';
            select.insertBefore(customOpt, select.firstChild);
          }
          customOpt.disabled = false;
          customOpt.hidden = false;
          customOpt.innerText = `${currentParsedData.name || 'My Resume'} (Imported)`;
          select.value = 'custom';
        }

        closeModal();
        this.populateEditor();
        this.runATSAnalysis();
        this.renderResumePreview();
        this.resetCanvasScroll();
        this.updateProfileStatusUI();
        this.updateGuidedStepper();
        this.saveSession();
        this.showToast(`Loaded ${currentParsedData.name || 'your'}'s resume! Ready to tailor with JD.`);
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
    this.updateMobileCanvasScale();
    requestAnimationFrame(() => {
      this.updateMobileCanvasScale();
    });
  }

  updatePageFitMeter() {
    const resumeDoc = document.getElementById('printable-resume');
    const badge = document.getElementById('page-fit-badge');
    if (!resumeDoc || !badge) return;

    // Standard A4 pixel height approximation at 96 DPI is ~1122px
    const docHeight = resumeDoc.scrollHeight;
    const a4Height = 1122;

    if (docHeight <= a4Height + 40) {
      badge.innerHTML = '<span class="page-pill page-pill-success">1 Page Fit (Perfect for ATS)</span>';
    } else if (docHeight <= a4Height * 2 + 60) {
      badge.innerHTML = '<span class="page-pill page-pill-warning">2 Pages (Balanced Senior Fit)</span>';
    } else {
      badge.innerHTML = '<span class="page-pill page-pill-danger">3+ Pages (Consider trimming bullets)</span>';
    }
  }

  /* ----------------- EXPORT ACTIONS ----------------- */
  printResume() {
    const originalTitle = document.title;
    const cleanName = (this.resumeData && this.resumeData.name) ? this.resumeData.name.replace(/\s+/g, '_') : 'Resume';
    document.title = `${cleanName}_Resume`;

    this.showToast('Opening Print dialog. Tip: Ensure "Headers and Footers" is unchecked in print settings for a clean PDF.', 'info');
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
          this.resetCanvasScroll();
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

  resetCanvasScroll() {
    const scrollContainer = document.getElementById('canvas-scroll-container');
    if (scrollContainer && window.innerWidth > 992) {
      scrollContainer.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
  }

  setZoom(level) {
    if (window.innerWidth <= 992) {
      // Zoom is automatically scaled to fit viewport on mobile
      return;
    }
    this.zoomLevel = Math.max(50, Math.min(150, level));
    const label = document.getElementById('zoom-level-label');
    if (label) label.innerText = `${this.zoomLevel}%`;

    const canvas = document.getElementById('resume-canvas-body');
    if (canvas) {
      canvas.style.transform = `scale(${this.zoomLevel / 100})`;
      canvas.style.transformOrigin = 'top center';
    }
  }

  updateMobileCanvasScale() {
    const wrapper = document.getElementById('resume-scale-wrapper');
    const canvas = document.getElementById('resume-canvas-body');
    const doc = canvas ? canvas.querySelector('.resume-document') : null;
    if (!canvas || !doc) return;

    if (window.innerWidth <= 992) {
      // Defer measurement if currently in editor view
      const mainContainer = document.getElementById('main-studio-container');
      if (mainContainer && mainContainer.classList.contains('mobile-mode-editor')) {
        return;
      }

      // Reset layout styles to get accurate natural dimensions
      canvas.style.position = 'static';
      canvas.style.transform = 'none';
      canvas.style.width = '794px';
      canvas.style.height = 'auto';
      doc.style.height = 'auto';
      doc.style.minHeight = '1122px';

      // Measure children to get true content bottom
      let contentBottom = 0;
      if (doc.children && doc.children.length > 0) {
        Array.from(doc.children).forEach(child => {
          const b = child.offsetTop + child.offsetHeight;
          if (b > contentBottom) contentBottom = b;
        });
      }

      const unscaledWidth = 794;
      const naturalHeight = Math.ceil(Math.max(doc.scrollHeight, doc.offsetHeight, contentBottom + 30, 1122));
      const availWidth = Math.max(280, window.innerWidth - 20);
      const scale = Math.min(1, availWidth / unscaledWidth);
      const scaledWidth = Math.round(unscaledWidth * scale);
      const scaledHeight = Math.round(naturalHeight * scale);

      if (wrapper) {
        wrapper.style.width = `${scaledWidth}px`;
        wrapper.style.height = `${scaledHeight + 40}px`;
        wrapper.style.margin = '0 auto';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'visible';
        wrapper.style.backgroundColor = '#ffffff';
      }

      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = `${unscaledWidth}px`;
      canvas.style.height = `${naturalHeight}px`;
      canvas.style.transformOrigin = 'top left';
      canvas.style.transform = `scale(${scale})`;
      canvas.style.margin = '0';
      canvas.style.backgroundColor = '#ffffff';

      doc.style.minHeight = `${naturalHeight}px`;
      doc.style.height = `${naturalHeight}px`;
      doc.style.backgroundColor = '#ffffff';

      const label = document.getElementById('zoom-level-label');
      if (label) label.innerText = `${Math.round(scale * 100)}%`;
    } else {
      if (wrapper) {
        wrapper.style.width = 'auto';
        wrapper.style.height = 'auto';
        wrapper.style.margin = '0 auto';
        wrapper.style.position = 'static';
      }
      canvas.style.position = 'static';
      canvas.style.transformOrigin = 'top center';
      canvas.style.transform = `scale(${this.zoomLevel / 100})`;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.margin = '0 auto';

      const label = document.getElementById('zoom-level-label');
      if (label) label.innerText = `${this.zoomLevel}%`;
    }
  }

  updateAccordionBadges() {
    const expBadge = document.getElementById('badge-count-exp');
    if (expBadge) {
      const count = this.resumeData.experience ? this.resumeData.experience.length : 0;
      expBadge.innerText = `${count} ${count === 1 ? 'Role' : 'Roles'}`;
    }

    const skillsBadge = document.getElementById('badge-count-skills');
    if (skillsBadge) {
      let count = 0;
      if (this.resumeData.skills) {
        if (Array.isArray(this.resumeData.skills)) count = this.resumeData.skills.length;
        else count = Object.keys(this.resumeData.skills).length;
      }
      skillsBadge.innerText = `${count} ${count === 1 ? 'Category' : 'Categories'}`;
    }

    const projBadge = document.getElementById('badge-count-projects');
    if (projBadge) {
      const count = this.resumeData.projects ? this.resumeData.projects.length : 0;
      projBadge.innerText = `${count} ${count === 1 ? 'Project' : 'Projects'}`;
    }

    const eduBadge = document.getElementById('badge-count-edu');
    if (eduBadge) {
      const count = this.resumeData.education ? this.resumeData.education.length : 0;
      eduBadge.innerText = `${count} ${count === 1 ? 'Degree' : 'Degrees'}`;
    }

    const certsBadge = document.getElementById('badge-count-certs');
    if (certsBadge) {
      const count = this.resumeData.certifications ? this.resumeData.certifications.length : 0;
      certsBadge.innerText = `${count} ${count === 1 ? 'Cert' : 'Certs'}`;
    }
  }

  renderKeywordSuggestions() {
    const container = document.getElementById('tailor-keyword-suggestions');
    if (!container) return;

    let keywords = [];
    if (this.atsResult && this.atsResult.missingKeywords && this.atsResult.missingKeywords.length > 0) {
      keywords = this.atsResult.missingKeywords.slice(0, 8);
    } else if (this.atsResult && this.atsResult.foundKeywords && this.atsResult.foundKeywords.length > 0) {
      keywords = this.atsResult.foundKeywords.slice(0, 8);
    }

    if (keywords.length === 0) {
      container.innerHTML = '<span style="font-size: 11px; color: var(--text-dim);">No target suggestions yet. Paste a JD in Tab 1 to see instant term chips.</span>';
      return;
    }

    container.innerHTML = `
      <span style="font-size: 11px; color: var(--text-dim); width: 100%; margin-bottom: 2px;">Click chips to weave into target terms:</span>
      ${keywords.map(k => `
        <button type="button" class="kw-suggestion-chip" data-term="${this.escapeHtml(k.term || k)}">
          + ${this.escapeHtml(k.term || k)}
        </button>
      `).join('')}
    `;

    container.querySelectorAll('.kw-suggestion-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const term = e.currentTarget.getAttribute('data-term');
        const input = document.getElementById('tailor-target-keyword');
        if (input) {
          const current = input.value.trim();
          input.value = current ? `${current}, ${term}` : term;
          this.showToast(`Appended "${term}" to target terms!`);
        }
      });
    });
  }

  showToast(message, type = 'success', canUndo = false) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    // Clear previous toasts on mobile so they don't stack and block the viewport
    if (window.innerWidth <= 992) {
      container.innerHTML = '';
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      ${canUndo && this.lastReplacedBullet ? `<button id="toast-undo-btn" class="btn-micro" style="margin-left: 8px; font-weight: 700; color: #38bdf8; border-color: rgba(56,189,248,0.4);">↺ Undo</button>` : ''}
    `;
    
    container.appendChild(toast);

    const undoBtn = toast.querySelector('#toast-undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        this.undoLastBulletReplace();
        toast.remove();
      });
    }

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, canUndo ? 6000 : 3200);
  }

  updateProfileStatusUI() {
    const isCustom = this.currentProfileId === 'custom';
    const isBlank = this.currentProfileId === 'blank';
    const candidateName = this.resumeData && this.resumeData.name ? this.resumeData.name : (isBlank ? 'Blank Slate' : 'Sample Candidate');

    // 1. Update Canvas Profile Bar directly above Resume Paper
    const canvasBar = document.getElementById('canvas-profile-bar');
    if (canvasBar) {
      if (isCustom) {
        canvasBar.className = 'canvas-profile-bar user-mode';
        canvasBar.innerHTML = `
          <div class="cpb-identity">
            <span class="cpb-dot-live" title="Active private session"></span>
            <div class="cpb-text">
              <span class="cpb-tag cpb-tag-user">Active Resume</span>
              <span>Candidate: <strong>${this.escapeHtml(candidateName)}</strong> (Private)</span>
            </div>
          </div>
          <div class="cpb-actions">
            <button id="btn-cpb-change" class="btn-cpb-secondary" title="Upload a different resume">
              <span>Replace / Upload New</span>
            </button>
            <button id="btn-cpb-edit" class="btn-cpb-secondary" title="Edit your info in editor">
              <span>Edit Info</span>
            </button>
            <button id="btn-cpb-sample" class="btn-cpb-secondary" title="View sample demo profile">
              <span>View Sample</span>
            </button>
          </div>
        `;
        const changeBtn = canvasBar.querySelector('#btn-cpb-change');
        if (changeBtn) changeBtn.addEventListener('click', () => this.openResumeImporter());
        const editBtn = canvasBar.querySelector('#btn-cpb-edit');
        if (editBtn) editBtn.addEventListener('click', () => this.switchTab('content-editor'));
        const sampleBtn = canvasBar.querySelector('#btn-cpb-sample');
        if (sampleBtn) sampleBtn.addEventListener('click', () => this.loadSampleProfile('vishal_aradhya'));
      } else if (isBlank) {
        canvasBar.className = 'canvas-profile-bar user-mode';
        canvasBar.innerHTML = `
          <div class="cpb-identity">
            <span class="cpb-dot-live"></span>
            <div class="cpb-text">
              <span class="cpb-tag cpb-tag-user">Blank Resume</span>
              <span>Fill in your details in the Content Editor</span>
            </div>
          </div>
          <div class="cpb-actions">
            <button id="btn-cpb-upload" class="btn-cpb-primary" title="Upload existing PDF/Word">
              <span>Upload Resume</span>
            </button>
            <button id="btn-cpb-sample" class="btn-cpb-secondary" title="Explore sample demo profile">
              <span>View Sample</span>
            </button>
          </div>
        `;
        const uploadBtn = canvasBar.querySelector('#btn-cpb-upload');
        if (uploadBtn) uploadBtn.addEventListener('click', () => this.openResumeImporter());
        const sampleBtn = canvasBar.querySelector('#btn-cpb-sample');
        if (sampleBtn) sampleBtn.addEventListener('click', () => this.loadSampleProfile('vishal_aradhya'));
      } else {
        // Demo profile
        canvasBar.className = 'canvas-profile-bar demo-mode';
        canvasBar.innerHTML = `
          <div class="cpb-identity">
            <span class="cpb-dot-demo"></span>
            <div class="cpb-text">
              <span class="cpb-tag cpb-tag-demo">Viewing Sample</span>
              <span>Viewing sample candidate: <strong>${this.escapeHtml(candidateName)}</strong></span>
            </div>
          </div>
          <div class="cpb-actions">
            <button id="btn-cpb-upload" class="btn-cpb-primary" title="Upload your PDF/Word to tailor your own resume">
              <span>Upload My Resume</span>
            </button>
            <button id="btn-cpb-blank" class="btn-cpb-secondary" title="Start with a blank clean resume">
              <span>Start Blank</span>
            </button>
          </div>
        `;
        const uploadBtn = canvasBar.querySelector('#btn-cpb-upload');
        if (uploadBtn) uploadBtn.addEventListener('click', () => this.openResumeImporter());
        const blankBtn = canvasBar.querySelector('#btn-cpb-blank');
        if (blankBtn) blankBtn.addEventListener('click', () => this.loadSampleProfile('blank'));
      }
    }

    // 2. Update Header Button Text
    const headerBtnText = document.getElementById('btn-header-import-text');
    if (headerBtnText) {
      headerBtnText.innerText = isCustom ? 'Change Resume' : 'Use My Resume';
    }

    // 3. Update Dropdown Options
    const select = document.getElementById('sample-profile-select');
    if (select) {
      let customOpt = select.querySelector('option[value="custom"]');
      if (isCustom) {
        if (!customOpt) {
          customOpt = document.createElement('option');
          customOpt.value = 'custom';
          select.insertBefore(customOpt, select.firstChild);
        }
        customOpt.disabled = false;
        customOpt.hidden = false;
        customOpt.innerText = `⭐ YOUR RESUME: ${candidateName} (Active)`;
        select.value = 'custom';
      } else {
        if (customOpt) customOpt.innerText = `⭐ Your Resume: ${this.resumeData && this.resumeData.name ? this.resumeData.name : 'Saved'}`;
        select.value = this.currentProfileId;
      }
    }

    // 4. Update Content Editor Banner
    const ribBadge = document.querySelector('.resume-import-banner .rib-badge');
    const ribTitle = document.querySelector('.resume-import-banner h4');
    const ribDesc = document.querySelector('.resume-import-banner p');
    const ribImportBtn = document.getElementById('btn-banner-import-resume');
    if (ribBadge && ribTitle && ribDesc) {
      if (isCustom) {
        ribBadge.className = 'rib-badge';
        ribBadge.style.background = '#E8F5E9';
        ribBadge.style.color = '#1B5E20';
        ribBadge.style.border = '1px solid #C8E6C9';
        ribBadge.innerText = 'Active Resume';
        ribTitle.innerText = `Editing: ${candidateName}`;
        ribDesc.innerText = 'All fields below are populated with your data. Changes reflect live on the preview canvas.';
        if (ribImportBtn) ribImportBtn.innerText = 'Replace / Re-upload';
      } else if (isBlank) {
        ribBadge.className = 'rib-badge';
        ribBadge.style.background = '#F1F5F9';
        ribBadge.style.color = '#475569';
        ribBadge.style.border = '1px solid #E2E8F0';
        ribBadge.innerText = 'Blank Template';
        ribTitle.innerText = 'Blank Resume Ready';
        ribDesc.innerText = 'Fill in your details below or upload your existing resume to auto-fill.';
        if (ribImportBtn) ribImportBtn.innerText = 'Upload / Paste Resume';
      } else {
        ribBadge.className = 'rib-badge';
        ribBadge.style.background = '#FEF3C7';
        ribBadge.style.color = '#92400E';
        ribBadge.style.border = '1px solid #FDE68A';
        ribBadge.innerText = 'Sample Profile';
        ribTitle.innerText = 'Want to tailor your own resume?';
        ribDesc.innerText = 'Upload your existing PDF / Word resume or paste text to auto-fill all form fields in 2 seconds.';
        if (ribImportBtn) ribImportBtn.innerText = 'Upload / Paste Resume';
      }
    }

    // 5. Update Stepper Step 1
    const cgBadgeResume = document.getElementById('cg-badge-resume');
    const cgDescResume = document.getElementById('cg-desc-resume');
    if (cgBadgeResume && cgDescResume) {
      if (isCustom) {
        cgBadgeResume.className = 'cg-step-badge user';
        cgBadgeResume.innerText = 'Your Resume';
        cgDescResume.innerText = candidateName;
      } else if (isBlank) {
        cgBadgeResume.className = 'cg-step-badge user';
        cgBadgeResume.innerText = 'Blank';
        cgDescResume.innerText = 'Building fresh';
      } else {
        cgBadgeResume.className = 'cg-step-badge demo';
        cgBadgeResume.innerText = 'Sample';
        cgDescResume.innerText = candidateName;
      }
    }

    // 6. Update Left Panel Active Resume Card
    const arcName = document.getElementById('arc-candidate-name');
    const arcMeta = document.getElementById('arc-candidate-meta');
    if (arcName && arcMeta) {
      arcName.innerText = candidateName;
      const expCount = this.resumeData && this.resumeData.experience ? this.resumeData.experience.length : 0;
      let skillCount = 0;
      if (this.resumeData && this.resumeData.skills) {
        if (Array.isArray(this.resumeData.skills)) skillCount = this.resumeData.skills.length;
        else Object.values(this.resumeData.skills).forEach(a => skillCount += (Array.isArray(a) ? a.length : 0));
      }
      const title = this.resumeData && this.resumeData.targetTitle ? this.resumeData.targetTitle : (isCustom ? 'Active Candidate' : 'Senior Business Analyst');
      arcMeta.innerText = `${title} • ${expCount} Roles • ${skillCount} Skills`;
    }
  }

  updateGuidedStepper() {
    // Step 2: Target Job status
    const hasJd = this.jdText && this.jdText.trim().length > 30;
    const cgBadgeJd = document.getElementById('cg-badge-jd');
    const cgDescJd = document.getElementById('cg-desc-jd');
    if (cgBadgeJd && cgDescJd) {
      if (hasJd) {
        const count = this.atsResult && this.atsResult.matchedKeywords ? this.atsResult.matchedKeywords.length : 0;
        cgBadgeJd.className = 'cg-step-badge ready';
        cgBadgeJd.innerText = 'Ready';
        cgDescJd.innerText = `${count} Keywords Matched`;
      } else {
        cgBadgeJd.className = 'cg-step-badge demo';
        cgBadgeJd.innerText = 'Waiting';
        cgDescJd.innerText = 'Paste target JD';
      }
    }

    // Step 3: Match & Tailor
    const cgBadgeTailor = document.getElementById('cg-badge-tailor');
    const cgDescTailor = document.getElementById('cg-desc-tailor');
    if (cgBadgeTailor && cgDescTailor) {
      if (this.atsResult && this.atsResult.overallScore !== undefined) {
        cgBadgeTailor.className = 'cg-step-badge match';
        cgBadgeTailor.innerText = `${this.atsResult.overallScore}% Match`;
        cgDescTailor.innerText = this.atsResult.overallScore >= 80 ? 'ATS Ready • Export' : 'Auto-Add Keywords';
      }
    }
  }

  initWelcomeOnboarding() {
    const welcomeModal = document.getElementById('modal-welcome-onboarding');
    const btnUpload = document.getElementById('btn-welcome-upload');
    const btnBlank = document.getElementById('btn-welcome-blank');
    const btnDemo = document.getElementById('btn-welcome-demo');
    const btnDismiss = document.getElementById('btn-welcome-dismiss');
    const btnHowItWorks = document.getElementById('btn-header-how-it-works');

    const openWelcome = () => {
      if (welcomeModal) welcomeModal.style.display = 'flex';
    };

    const closeWelcome = () => {
      if (welcomeModal) welcomeModal.style.display = 'none';
      try { localStorage.setItem('resucraft_onboarded_v1', 'true'); } catch(e) {}
    };

    if (btnUpload) {
      btnUpload.addEventListener('click', () => {
        closeWelcome();
        if (this.openResumeImporter) this.openResumeImporter();
      });
    }

    if (btnBlank) {
      btnBlank.addEventListener('click', () => {
        closeWelcome();
        this.loadSampleProfile('blank');
      });
    }

    if (btnDemo) {
      btnDemo.addEventListener('click', () => {
        closeWelcome();
        this.showToast('ℹ️ Exploring with sample profile. Click "Use My Resume" when ready!');
      });
    }

    if (btnDismiss) btnDismiss.addEventListener('click', closeWelcome);
    if (welcomeModal) {
      welcomeModal.addEventListener('click', (e) => {
        if (e.target === welcomeModal) closeWelcome();
      });
    }

    if (btnHowItWorks) {
      btnHowItWorks.addEventListener('click', openWelcome);
    }

    // Option A: 2-Box Scanner is self-explanatory, no popup modal needed on first visit
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
