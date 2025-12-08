(function() {
    'use strict';

    const AccessibilityManager = {
        settings: {
            fontSize: 'normal', // possible values: 'normal', 'large', 'xlarge'
            contrast: 'normal' // possible values: 'normal', 'high'
        },

        init: function() {
            this.loadSettings();
            this.applySettings();
            this.createToolBar();
        },

        loadSettings: function() {
            const saved = localStorage.getItem("accessibilitySettings");
            if (saved) {
                try {
                    this.settings = JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to load accessibility settings:', e);
                }
            }
        },

        saveSettings: function() {
            localStorage.setItem('accessibilitySettings', JSON.stringify(this.settings));
        },

        applySettings: function() {
            const root = document.documentElement;

            // apply font size
            switch (this.settings.fontSize) {
                case 'large':
                    root.style.fontSize = '18px';
                    break;
                case 'xlarge':
                    root.style.fontSize = '22px';
                    break;
                default:
                    root.style.fontSize = '14px';
            }

            // apply contrast
            if (this.settings.contrast === 'high') {
                document.body.classList.add('high-contrast');
            } else {
                document.body.classList.remove('high-contrast');
            }
        },

        setFontSize: function(size) {
            this.settings.fontSize = size;
            this.saveSettings();
            this.applySettings();
            this.updateToolBar();
        },

        setContrast: function(mode) {
            this.settings.contrast = mode;
            this.saveSettings();
            this.applySettings();
            this.updateToolBar();
        },

        createToolBar: function() {
            const toolbar = document.createElement('div');
            toolbar.id = 'accessibility-toolbar';
            toolbar.innerHTML = `
                <button id="a11y-toggle" aria-label="Toggle Accessibility Settings" title="Accessibility Settings">
                    <span class="material-icons-sharp">accessibility</span>
                </button>
                <div id="a11y-panel" class="a11y-panel" hidden>
                    <h3>Accessibility Settings</h3>

                    <div class="a11y-section">
                        <label>Text Size:</label>
                        <div class="a11y-buttons">
                            <button data-action="font-normal" class="a11y-btn ${this.settings.fontSize === 'normal' ? 'active' : ''}">
                                Normal
                            </button>
                            <button data-action="font-large" class="a11y-btn ${this.settings.fontSize === 'large' ? 'active' : ''}">
                                Large
                            </button>
                            <button data-action="font-xlarge" class="a11y-btn ${this.settings.fontSize === 'xlarge' ? 'active' : ''}">
                                X-Large
                            </button>
                        </div>
                    </div>

                    <div class="a11y-section">
                        <label>Contrast:</label>
                        <div class="a11y-buttons">
                            <button data-action="contrast-normal" class="a11y-btn ${this.settings.contrast === 'normal' ? 'active' : ''}">
                                Normal
                            </button>
                            <button data-action="contrast-high" class="a11y-btn ${this.settings.contrast === 'high' ? 'active' : ''}">
                                High Contrast
                            </button>
                        </div>
                    </div>

                    <button id="a11y-close" class="a11y-close"> Close</button>
                </div>
            `;

            document.body.appendChild(toolbar);

            // add event listeners
            const toggle = document.getElementById('a11y-toggle');
            const panel = document.getElementById('a11y-panel');
            const close = document.getElementById('a11y-close');

            toggle.addEventListener('click', () => {
                const isHidden = panel.hasAttribute('hidden');
                if (isHidden) {
                    panel.removeAttribute('hidden');
                    toggle.setAttribute('aria-expanded', 'false');
                } else {
                    panel.setAttribute('hidden', '');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });

            close.addEventListener('click', () => {
                panel.setAttribute('hidden', '');
                toggle.setAttribute('aria-expanded', 'false');
            });

            // handle settings buttons
            panel.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) {
                    return;
                }

                const action = btn.dataset.action;

                if (action.startsWith('font-')) {
                    const size = action.replace('font-', '');
                    this.setFontSize(size);
                } else if (action.startsWith('contrast-')) {
                    const mode = action.replace('contrast-', '');
                    this.setContrast(mode);
                }
            });

            // close panel when clicking outside
            document.addEventListener('click', (e) => {
                if (!toolbar.contains(e.target) && !panel.hasAttribute('hidden')) {
                    panel.setAttribute('hidden', '');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });
        },

        updateToolBar: function() {
            const buttons = document.querySelectorAll('.a11y-btn');
            buttons.forEach(btn => {
                const action = btn.dataset.action;

                if (action === `font-${this.settings.fontSize}` ||
                    action === `contrast-${this.settings.contrast}`) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
            });
        }
    };

    // initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AccessibilityManager.init());
    } else {
        AccessibilityManager.init();
    }
})();