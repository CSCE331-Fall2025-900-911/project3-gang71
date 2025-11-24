/**
 * Translation utility for translating page content to Spanish
 * Uses the backend /api/translate endpoint
 */
class PageTranslator {
    constructor() {
        this.currentLanguage = localStorage.getItem('currentLanguage') || 'EN';
        this.originalContent = {}; // map element id -> original text

        // translationCache keyed by original text (trimmed) -> { ES: '...', FR: '...' }
        this.translationCache = JSON.parse(localStorage.getItem('translationCache') || '{}');
    }

    // Translate a single text string, with client-side cache check
    /**
   * Translate a single text string
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language code (e.g., 'ES' for Spanish)
   * @returns  Translated text
   */
    async translate(text) {
        try {
            const targetLang = 'ES'; // always Spanish
            const key = text.trim();
            if (this.translationCache[key] && this.translationCache[key][targetLang]) {
                return this.translationCache[key][targetLang];
            }

            const resp = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: key,  targetLang: targetLang, })
            });

            if (!resp.ok) {
                console.error('Translate API response not ok', resp.status);
                return text;
            }

            const data = await resp.json();
            const translated = data.translatedText || text;

            // store in client cache keyed by original text
            if (!this.translationCache[key]) this.translationCache[key] = {};
            this.translationCache[key][targetLang] = translated;
            localStorage.setItem('translationCache', JSON.stringify(this.translationCache));

            return translated;

        } catch (err) {
            console.error('Translation fetch error:', err);
            return text;        // Return original text if translation fails
        }
    }

    // Translate multiple texts in batch. translate() itself checks client cache so this
    // will call the server only for uncached originals.
    async translateBatch(texts, targetLang = 'es') {
        const promises = texts.map(t => this.translate(t, targetLang));
        return Promise.all(promises);
    }

    // ensure element has an id we can use as a key
    ensureElementId(el) {
        if (el.id && el.id.trim()) return el.id;
        const gen = 'translate-' + Math.random().toString(36).slice(2, 9);
        el.id = gen;
        return gen;
    }

    async translatePage(targetLang = 'ES') {
        try {
            // Normalize target language to uppercase
            targetLang = targetLang.toUpperCase(); 

            const elements = Array.from(document.querySelectorAll('[data-translate]'));
            if (elements.length === 0) return;

            // Collect original texts (one per element) but avoid duplicates
            const originals = [];
            const elToOriginal = [];

            elements.forEach(el => {
                const id = this.ensureElementId(el);
                if (!this.originalContent[id]) {
                    this.originalContent[id] = el.textContent.trim();
                }
                const original = this.originalContent[id];
                elToOriginal.push({ el, original });
                originals.push(original);
            });

            // Remove duplicates to minimize requests
            const uniqueOriginals = Array.from(new Set(originals));

            // Translate all unique originals (translate() will skip already-cached ones)
            const translatedMap = {};
            const translations = await this.translateBatch(uniqueOriginals, targetLang);
            uniqueOriginals.forEach((orig, i) => {
                translatedMap[orig] = translations[i] || orig;
            });

            // Apply translations to elements and update client cache
            elToOriginal.forEach(({ el, original }) => {
                const translated = translatedMap[original] || original;
                el.textContent = translated;
            });

            this.currentLanguage = targetLang;
            localStorage.setItem('currentLanguage', targetLang);
        } catch (err) {
            console.error('translatePage error:', err);
        }
    }

    async switchLanguage(lang) {
        const normalizedLang = lang.toUpperCase();
        console.log('switchLanguage called with:', lang, 'normalized to:', normalizedLang);
        if (normalizedLang === 'ES') {
            console.log('Calling translatePage with ES');
            await this.translatePage('ES');
        } else {
            console.log('Calling switchToEnglish');
            this.switchToEnglish();
        }
    }

    switchToEnglish() {
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(el => {
            let elementKey = el.id;
            if (!elementKey) {
                // Try to find it in originalContent by checking the text match
                for (const key in this.originalContent) {
                    if (el.textContent === this.originalContent[key]) {
                        elementKey = key;
                        break;
                    }
                }
            }

            if (elementKey && this.originalContent[elementKey]) {
                el.textContent = this.originalContent[elementKey];
            }
        });
        this.currentLanguage = 'EN';
        localStorage.setItem('currentLanguage', this.currentLanguage);
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

const pageTranslator = new PageTranslator();
window.pageTranslator = pageTranslator; // expose globally if other scripts call it

// Initialize language based on stored preference
document.addEventListener('DOMContentLoaded', function () {
  const languageToggle = document.getElementById('languageToggle');
  if (languageToggle && pageTranslator.getCurrentLanguage() === 'ES') {
    toggle.checked = true;
  }
});

// Global function for checkbox onchange handler
function toggleLanguage(checkbox) {
  console.log('toggleLanguage called, checked:', checkbox.checked);
  if (checkbox.checked) {
    pageTranslator.switchLanguage('es');
  } else {
    pageTranslator.switchLanguage('en');
  }
}