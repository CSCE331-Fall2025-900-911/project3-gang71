/**
 * Translation utility for translating page content to Spanish
 * Uses the backend /api/translate endpoint
 */
class PageTranslator {
    constructor() {
        this.currentLanguage = 'en';
        this.originalContent = {}; // map id -> original text
        this.translationCache = JSON.parse(localStorage.getItem('translationCache') || '{}');
        // this.translationCache = {};     // id -> { es: "...", fr: "..." }
            // translationCache = {
                // "translate-abc123": { es: "Añadir al pedido" },
                // "translate-f9k20l3": { es: "Cerrar sesión" }
                // }
    }

    // Translate a single text string
    async translate(text, targetLang = 'es') {
        try {
            const resp = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, targetLang })
            });
            if (!resp.ok) {
                console.error('Translate API response not ok', resp.status);
                return text;
            }
            const data = await resp.json();
            return data.translatedText || text;
        } catch (err) {
            console.error('Translation fetch error:', err);
            return text;          //return original text if translation fails
        }
    }

    // Translate multiple texts in batch
    async translateBatch(texts, targetLang = 'es') {
        const results = await Promise.allSettled(
            texts.map(text => this.translate(text, targetLang))
        );

        return results.map((res, i) => {
            if (res.status === "fulfilled") {
                return res.value;               // translated text
            } else {
                console.error("Translation failed for:", texts[i], res.reason);
                return texts[i];                // fallback → original text
            }
        });
    }


    // ensure element has an id we can use as a key
    ensureElementId(el) {
        if (el.id && el.id.trim()) return el.id;
        const gen = 'translate-' + Math.random().toString(36).slice(2, 9);
        el.id = gen;
        return gen;
    }

    async translatePage(targetLang = 'es') {
        try {
            const elements = Array.from(document.querySelectorAll('[data-translate]'));
            if (elements.length === 0) return;

            const texts = elements.map(el => {
                const id = this.ensureElementId(el);

                //store original english text once (to revert back to english without calling translation api)
                if (!this.originalContent[id]) {
                    this.originalContent[id] = el.textContent.trim();
                }
                // if (!Object.prototype.hasOwnProperty.call(this.originalContent, id)) {
                //     this.originalContent[id] = el.textContent.trim();
                // }
                // return this.originalContent[id];
                const original = this.originalContent[id];

                // cache check ----------------------
                if (this.translationCache[id] && this.translationCache[id][targetLang]){
                    return this.translationCache[id][targetLang];       //already translated
                }

                //no cached translation means translate original
                return original
            });

            const translations = await this.translateBatch(texts, targetLang);

            elements.forEach((el, i) => {
                const id = el.id;
                const original = this.originalContent[id];
                const translated = translations[i] ?? original;
                el.textContent = translated;

                // el.textContent = translations[i] ?? this.originalContent[el.id];

                //save to cache -------------------------------
                if (!this.translationCache[id]) {
                    this.translationCache[id] = {};
                }
                this.translationCache[id][targetLang] = translated;
                
                // SAVE cache to localStorage
                localStorage.setItem('translationCache', JSON.stringify(this.translationCache));
            });

            this.currentLanguage = targetLang;
            localStorage.setItem('currentLanguage', targetLang);
        } catch (err) {
            console.error('translatePage error:', err);
        }
    }

    async switchLanguage(lang) {
        if (lang === 'es') {
            await this.translatePage('es');
        } else {
            this.switchToEnglish();
        }
    }

    switchToEnglish() {
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(el => {
            if (el.id && this.originalContent[el.id]) {
                el.textContent = this.originalContent[el.id];
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