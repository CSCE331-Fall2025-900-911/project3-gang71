/**
 * Translation utility for translating page content to Spanish
 * Uses the backend /api/translate endpoint
 */
class PageTranslator {
    constructor() {
        this.currentLanguage = localStorage.getItem('currentLanguage') || 'en';
        this.originalContent = {}; // map element id -> original text

        // translationCache keyed by original text (trimmed) -> { ES: '...', FR: '...' }
        this.translationCache = JSON.parse(localStorage.getItem('translationCache') || '{}');
    }

    /**
     * Translate a single text string, with client-side cache check
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language code (e.g., 'ES' for Spanish)
     * @returns {Promise<string>} Translated text
     */
    async translate(text, targetLang = 'ES') {
        try {
            const key = text.trim();
            console.log('[translate] Input text:', key, 'Target lang:', targetLang);
            
            if (this.translationCache[key] && this.translationCache[key][targetLang]) {
                console.log('[translate] Found in cache:', this.translationCache[key][targetLang]);
                return this.translationCache[key][targetLang];
            }

            console.log('[translate] Not in cache, calling API...');
            const resp = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: key,  targetLang: targetLang, })
            });

            console.log('[translate] API response status:', resp.status, resp.ok);
            
            if (!resp.ok) {
                console.error('Translate API response not ok', resp.status);
                const errorData = await resp.json();
                console.error('Error data:', errorData);
                return text;
            }

            const data = await resp.json();
            console.log('[translate] API response data:', data);
            
            const translated = data.translatedText || text;
            console.log('[translate] Translated result:', translated);

            // store in client cache keyed by original text
            if (!this.translationCache[key]) this.translationCache[key] = {};
            this.translationCache[key][targetLang] = translated;
            localStorage.setItem('translationCache', JSON.stringify(this.translationCache));

            return translated;

        } catch (err) {
            console.error('Translation fetch error:', err);
            console.error('Error stack:', err.stack);
            return text;        // Return original text if translation fails
        }
    }

    /**
     * Translate multiple texts in batch. translate() itself checks client cache so this
     * will call the server only for uncached originals.
     * @param {string[]} texts - Array of texts to translate
     * @param {string} targetLang - Target language code (default: 'ES')
     * @returns {Promise<string[]>} Array of translated texts
     */
    async translateBatch(texts, targetLang = 'ES') {
        console.log('[translateBatch] Starting batch with', texts.length, 'texts, target lang:', targetLang);
        const promises = texts.map(t => this.translate(t, targetLang));
        const results = await Promise.all(promises);
        console.log('[translateBatch] Batch complete, results:', results);
        return results;
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
            console.log('[translatePage] Starting translation to:', targetLang);

            const elements = Array.from(document.querySelectorAll('[data-translate]'));
            console.log('[translatePage] Found', elements.length, 'elements with data-translate');
            
            if (elements.length === 0) {
                console.warn('[translatePage] No elements found with data-translate attribute');
                return;
            }

            // Collect original texts (one per element) but avoid duplicates
            const originals = [];
            const elToOriginal = [];

            elements.forEach((el, idx) => {
                const id = this.ensureElementId(el);
                if (!this.originalContent[id]) {
                    this.originalContent[id] = el.textContent.trim();
                }
                const original = this.originalContent[id];
                console.log('[translatePage] Element', idx, 'id:', id, 'original text:', original);
                elToOriginal.push({ el, original });
                originals.push(original);
            });

            // Remove duplicates to minimize requests
            const uniqueOriginals = Array.from(new Set(originals));
            console.log('[translatePage] Unique originals to translate:', uniqueOriginals.length);

            // Translate all unique originals (translate() will skip already-cached ones)
            const translatedMap = {};
            console.log('[translatePage] Calling translateBatch...');
            const translations = await this.translateBatch(uniqueOriginals, targetLang);
            console.log('[translatePage] Got translations back:', translations);
            
            uniqueOriginals.forEach((orig, i) => {
                translatedMap[orig] = translations[i] || orig;
            });

            console.log('[translatePage] Translation map:', translatedMap);

            // Apply translations to elements and update client cache
            elToOriginal.forEach(({ el, original }, idx) => {
                const translated = translatedMap[original] || original;
                console.log('[translatePage] Setting element', idx, 'to:', translated);
                // Simply set textContent - this preserves all child elements (like .dynamic spans)
                // Each data-translate span is translated independently
                el.textContent = translated;
            });

            this.currentLanguage = targetLang === 'ES' ? 'es' : 'en';
            localStorage.setItem('currentLanguage', this.currentLanguage);
            console.log('[translatePage] Translation complete!');
        } catch (err) {
            console.error('translatePage error:', err);
            console.error('Error stack:', err.stack);
        }
    }

    async switchLanguage(lang) {
        const normalizedLang = lang.toUpperCase();
        console.log('[switchLanguage] Called with:', lang, 'normalized to:', normalizedLang);
        if (normalizedLang === 'ES') {
            console.log('[switchLanguage] Calling translatePage with ES');
            await this.translatePage('ES');
        } else {
            console.log('[switchLanguage] Calling switchToEnglish');
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
        this.currentLanguage = 'en';
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
  const currentLang = pageTranslator.getCurrentLanguage();
  
  if (languageToggle && currentLang === 'es') {
    languageToggle.textContent = 'English';
    languageToggle.classList.add('active');
    
    // Auto-translate to Spanish if that was the last language used
    setTimeout(() => pageTranslator.translatePage('ES'), 300);
  }
});

// Global function for button click handler
function toggleLanguage(button) {
  console.log('[toggleLanguage] Called, current language:', pageTranslator.getCurrentLanguage());
  if (pageTranslator.getCurrentLanguage() === 'en') {
    console.log('[toggleLanguage] Switching to Spanish');
    pageTranslator.switchLanguage('es');
    button.textContent = 'English';
    button.classList.add('active');
  } else {
    console.log('[toggleLanguage] Switching to English');
    pageTranslator.switchLanguage('en');
    button.textContent = 'Español';
    button.classList.remove('active');
  }
}