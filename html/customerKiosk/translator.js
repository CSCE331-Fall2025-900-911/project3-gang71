// /**
//  * Translation utility for translating page content to Spanish
//  * Uses the backend /api/translate endpoint
//  */
// class PageTranslator {
//     constructor() {
//         this.currentLanguage = localStorage.getItem('currentLanguage') || 'en';
//         this.originalContent = {}; // map element id -> original text

//         // translationCache keyed by original text (trimmed) -> { ES: '...', FR: '...' }
//         this.translationCache = JSON.parse(localStorage.getItem('translationCache') || '{}');
//     }

//     /**
//      * Translate a single text string, with client-side cache check
//      * @param {string} text - Text to translate
//      * @param {string} targetLang - Target language code (e.g., 'ES' for Spanish)
//      * @returns {Promise<string>} Translated text
//      */
//     async translate(text, targetLang = 'ES') {
//         try {
//             const key = text.trim();
//             console.log('[translate] Input text:', key, 'Target lang:', targetLang);
            
//             if (this.translationCache[key] && this.translationCache[key][targetLang]) {
//                 console.log('[translate] Found in cache:', this.translationCache[key][targetLang]);
//                 return this.translationCache[key][targetLang];
//             }

//             console.log('[translate] Not in cache, calling API...');
//             const resp = await fetch('/api/translate', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ text: key,  targetLang: targetLang, })
//             });

//             console.log('[translate] API response status:', resp.status, resp.ok);
            
//             if (!resp.ok) {
//                 console.error('Translate API response not ok', resp.status);
//                 const errorData = await resp.json();
//                 console.error('Error data:', errorData);
//                 return text;
//             }

//             const data = await resp.json();
//             console.log('[translate] API response data:', data);
            
//             const translated = data.translatedText || text;
//             console.log('[translate] Translated result:', translated);

//             // store in client cache keyed by original text
//             if (!this.translationCache[key]) this.translationCache[key] = {};
//             this.translationCache[key][targetLang] = translated;
//             localStorage.setItem('translationCache', JSON.stringify(this.translationCache));

//             return translated;

//         } catch (err) {
//             console.error('Translation fetch error:', err);
//             console.error('Error stack:', err.stack);
//             return text;        // Return original text if translation fails
//         }
//     }

//     /**
//      * Translate multiple texts in batch. translate() itself checks client cache so this
//      * will call the server only for uncached originals.
//      * @param {string[]} texts - Array of texts to translate
//      * @param {string} targetLang - Target language code (default: 'ES')
//      * @returns {Promise<string[]>} Array of translated texts
//      */
//     async translateBatch(texts, targetLang = 'ES') {
//         console.log('[translateBatch] Starting batch with', texts.length, 'texts, target lang:', targetLang);
//         const promises = texts.map(t => this.translate(t, targetLang));
//         const results = await Promise.all(promises);
//         console.log('[translateBatch] Batch complete, results:', results);
//         return results;
//     }

//     // ensure element has an id we can use as a key
//     ensureElementId(el) {
//         if (el.id && el.id.trim()) return el.id;
//         const gen = 'translate-' + Math.random().toString(36).slice(2, 9);
//         el.id = gen;
//         return gen;
//     }

//     async translatePage(targetLang = 'ES') {
//         try {
//             // Normalize target language to uppercase
//             targetLang = targetLang.toUpperCase();
//             console.log('[translatePage] Starting translation to:', targetLang);

//             const elements = Array.from(document.querySelectorAll('[data-translate]'));
//             console.log('[translatePage] Found', elements.length, 'elements with data-translate');
            
//             if (elements.length === 0) {
//                 console.warn('[translatePage] No elements found with data-translate attribute');
//                 return;
//             }

//             // Collect original texts (one per element) but avoid duplicates
//             const originals = [];
//             const elToOriginal = [];

//             elements.forEach((el, idx) => {
//                 const id = this.ensureElementId(el);
//                 if (!this.originalContent[id]) {
//                     this.originalContent[id] = el.textContent.trim();
//                 }
//                 const original = this.originalContent[id];
//                 console.log('[translatePage] Element', idx, 'id:', id, 'original text:', original);
//                 elToOriginal.push({ el, original });
//                 originals.push(original);
//             });

//             // Remove duplicates to minimize requests
//             const uniqueOriginals = Array.from(new Set(originals));
//             console.log('[translatePage] Unique originals to translate:', uniqueOriginals.length);

//             // Translate all unique originals (translate() will skip already-cached ones)
//             const translatedMap = {};
//             console.log('[translatePage] Calling translateBatch...');
//             const translations = await this.translateBatch(uniqueOriginals, targetLang);
//             console.log('[translatePage] Got translations back:', translations);
            
//             uniqueOriginals.forEach((orig, i) => {
//                 translatedMap[orig] = translations[i] || orig;
//             });

//             console.log('[translatePage] Translation map:', translatedMap);

//             // Apply translations to elements and update client cache
//             elToOriginal.forEach(({ el, original }, idx) => {
//                 const translated = translatedMap[original] || original;
//                 console.log('[translatePage] Setting element', idx, 'to:', translated);
//                 // Simply set textContent - this preserves all child elements (like .dynamic spans)
//                 // Each data-translate span is translated independently
//                 el.textContent = translated;
//             });

//             this.currentLanguage = targetLang === 'ES' ? 'es' : 'en';
//             localStorage.setItem('currentLanguage', this.currentLanguage);
//             console.log('[translatePage] Translation complete!');
//         } catch (err) {
//             console.error('translatePage error:', err);
//             console.error('Error stack:', err.stack);
//         }
//     }

//     async switchLanguage(lang) {
//         const normalizedLang = lang.toUpperCase();
//         console.log('[switchLanguage] Called with:', lang, 'normalized to:', normalizedLang);
//         if (normalizedLang === 'ES') {
//             console.log('[switchLanguage] Calling translatePage with ES');
//             await this.translatePage('ES');
//         } else {
//             console.log('[switchLanguage] Calling switchToEnglish');
//             this.switchToEnglish();
//         }
//     }

//     switchToEnglish() {
//         const elements = document.querySelectorAll('[data-translate]');
//         elements.forEach(el => {
//             let elementKey = el.id;
//             if (!elementKey) {
//                 // Try to find it in originalContent by checking the text match
//                 for (const key in this.originalContent) {
//                     if (el.textContent === this.originalContent[key]) {
//                         elementKey = key;
//                         break;
//                     }
//                 }
//             }

//             if (elementKey && this.originalContent[elementKey]) {
//                 el.textContent = this.originalContent[elementKey];
//             }
//         });
//         this.currentLanguage = 'en';
//         localStorage.setItem('currentLanguage', this.currentLanguage);
//     }

//     getCurrentLanguage() {
//         return this.currentLanguage;
//     }
// }

// const pageTranslator = new PageTranslator();
// window.pageTranslator = pageTranslator; // expose globally if other scripts call it

// // Initialize language based on stored preference
// document.addEventListener('DOMContentLoaded', function () {
//   const languageToggle = document.getElementById('languageToggle');
//   const currentLang = pageTranslator.getCurrentLanguage();
  
//   if (languageToggle && currentLang === 'es') {
//     languageToggle.textContent = 'English';
//     languageToggle.classList.add('active');
    
//     // Auto-translate to Spanish if that was the last language used
//     setTimeout(() => pageTranslator.translatePage('ES'), 300);
//   }
// });

// // Global function for button click handler
// function toggleLanguage(button) {
//   console.log('[toggleLanguage] Called, current language:', pageTranslator.getCurrentLanguage());
//   if (pageTranslator.getCurrentLanguage() === 'en') {
//     console.log('[toggleLanguage] Switching to Spanish');
//     pageTranslator.switchLanguage('es');
//     button.textContent = 'English';
//     button.classList.add('active');
//   } else {
//     console.log('[toggleLanguage] Switching to English');
//     pageTranslator.switchLanguage('en');
//     button.textContent = 'Español';
//     button.classList.remove('active');
//   }
// }

/**
 * Translation utility for translating page content to Spanish
 * Uses hardcoded dictionary first, then backend /api/translate endpoint
 */

// Hardcoded translations dictionary
const HARDCODED_TRANSLATIONS = {
  // Navigation & UI
  'Logout': 'Cierre de sesión',
  'Enable TTS': 'Habilitar TTS',
  'Disable TTS': 'Desactivar TTS',
  'Cart': 'Carrito',
  'Reorder': 'Volver a ordenar',
  'Back to ordering': 'Volver a pedir',
  'Log out': 'Cerrar sesión',
  
  // Categories
  'La Colombe Cold Brews': 'Cold brews de La Colombe',
  'Milk Teas': 'Tés con leche',
  'Matcha': 'Matcha',
  'Slushes': 'Granizados',
  'Classics': 'Clásicos',
  'Punches': 'Ponches',
  'Milk Strikes': 'Huelgas de leche',
  'Oat Strikes': 'Huelgas de avena',
  'Milk Caps': 'Cápsulas de leche',
  'Coffees': 'Cafés',
  'Yogurts': 'Yogures',
  'Seasonal': 'De temporada',

  // Customization labels
  'Cup Size:': 'Tamaño de vaso:',
  'Small': 'Pequeño',
  'Medium (+$0.50)': 'Mediano (+$0.50)',
  'Large (+$1.00)': 'Grande (+$1.00)',
  'Temperature:': 'Temperatura:',
  'Iced': 'Frío',
  'Hot': 'Caliente',
  'Sweetness:': 'Dulzura:',
  'Ice:': 'Hielo:',
  'Toppings:': 'Complementos:',
  'Select All': 'Seleccionar todo',
  
  // Percentages
  '0%': '0%',
  '35%': '35%',
  '50%': '50%',
  '75%': '75%',
  '100%': '100%',
  '120%': '120%',
  
  // Toppings
  "Aloe Jelly (+0.95)": "Gelatina de aloe (+0.95)",
  "Aloe Jelly + Lychee Crystal Boba (+1.00)": "Gelatina de aloe + perlas de lichi cristalinas (+1.00)",
  "Boba (+0.75)": "Perlas de tapioca (+0.75)",
  "Boba + Pudding (+0.80)": "Perlas de tapioca + pudín (+0.80)",
  "Brown Sugar Boba + Milk Cap (+1.00)": "Perlas de tapioca con azúcar moreno + capa de leche (+1.00)",
  "Brown Sugar Wow Boba (+0.95)": "Perlas de tapioca con azúcar moreno Wow (+0.95)",
  "Chia Seeds (+0.75)": "Semillas de chía (+0.75)",
  "Coffee Popping Boba (+0.95)": "Perlas de café popping (+0.95)",
  "Crystal Boba (+0.95)": "Perlas de cristal (+0.95)",
  "Grape + Strawberry + Mango Popping (+1.40)": "Uva + fresa + mango popping (+1.40)",
  "Grape Popping Boba (+0.95)": "Perlas de uva popping (+0.95)",
  "Herbal Jelly (+0.75)": "Gelatina de hierbas (+0.75)",
  "Mango Jelly (+0.75)": "Gelatina de mango (+0.75)",
  "Mango Jelly + Nata Jelly (+0.80)": "Gelatina de mango + gelatina de nata de coco (+0.80)",
  "Mango Popping Boba (+0.95)": "Perlas de mango popping (+0.95)",
  "Matcha Milk Cap (+1.25)": "Capa de leche con matcha (+1.25)",
  "Milk Cap (+1.25)": "Capa de leche (+1.25)",
  "Nata Jelly (+0.75)": "Gelatina de nata de coco (+0.75)",
  "OREO (+0.75)": "OREO (+0.75)",
  "Pudding (+0.75)": "Pudín (+0.75)",
  "Red Bean (+0.75)": "Frijol rojo (+0.75)",
  "Strawberry Milk Cap (+1.25)": "Capa de leche de fresa (+1.25)",
  "Strawberry Popping Boba (+0.95)": "Perlas de fresa popping (+0.95)",

  // random 
  "Cold Brew Latte": "Latte de cold brew",

  // Buttons
  'Cancel': 'Cancelar',
  'Add to Cart': 'Añadir a la cesta',
  'Customize': 'Personalizar',
  'Remove': 'Eliminar',
  
  // Weather
  'Location:': 'Ubicación:',
  'Temperture': 'Temperatura',
  'Feels like:': 'Se siente como:',
  'Wind:': 'Viento:',

  // Drink Recommendations
  'Based on the weather, we recommend:': 'Según el tiempo, recomendamos:',
  
  // Cart
  'Your cart is empty.': 'Tu carrito está vacío.',
  'Subtotal': 'Total Parcial',
  'Tax': 'Impuesto',
  'Total': 'Total',
  'Size': 'Tamaño',
  'Price': 'Precio',
  'No modifications': 'Sin modificaciones',
  'Total price': 'Precio total',
  
//   // Accessibility
//   'Small drink size selected.': 'Tamaño pequeño seleccionado.',
//   'Medium drink size selected. The extra cost is $0.50.': 'Tamaño mediano seleccionado. El costo adicional es $0.50.',
//   'Large drink size selected. The extra cost is $1.00.': 'Tamaño grande seleccionado. El costo adicional es $1.00.',
//   '0% sweetness selected': '0% dulzura seleccionada',
//   '35% sweetness selected': '35% dulzura seleccionada',
//   '50% sweetness selected': '50% dulzura seleccionada',
//   '75% sweetness selected': '75% dulzura seleccionada',
//   '100% sweetness selected': '100% dulzura seleccionada',
//   '120% sweetness selected': '120% dulzura seleccionada',
//   '0% ice selected': '0% hielo seleccionado',
//   '50% ice selected': '50% hielo seleccionado',
//   '100% ice selected': '100% hielo seleccionado',
//   '120% ice selected': '120% hielo seleccionado',
//   'TTS enabled': 'TTS habilitado',
//   'TTS disabled': 'TTS deshabilitado',
//   'Closing modifications popup': 'Cerrando ventana emergente de modificaciones',
//   'added to cart!': '¡añadido al carrito!'
};

class PageTranslator {
    constructor() {
        this.currentLanguage = localStorage.getItem('currentLanguage') || 'en';
        this.originalContent = {}; // map element id -> original text
        this.translationCache = {}; // In-memory cache
    }

    /**
     * Translate a single text string
     * Priority: 1) Hardcoded dictionary, 2) Memory cache, 3) API call
     */
    async translate(text, targetLang = 'ES') {
        try {
            const key = text.trim();
            
            if (!key) return text;
            
            // Step 1: Check hardcoded dictionary FIRST (instant!)
            if (targetLang === 'ES' && HARDCODED_TRANSLATIONS[key]) {
                console.log('[translate] Using hardcoded:', key);
                return HARDCODED_TRANSLATIONS[key];
            }
            
            // Step 2: Check memory cache
            if (this.translationCache[key] && this.translationCache[key][targetLang]) {
                console.log('[translate] Found in cache:', key);
                return this.translationCache[key][targetLang];
            }

            // Step 3: Call API for dynamic content (drink names/descriptions)
            console.log('[translate] Calling API for:', key);
            const resp = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: key, targetLang: targetLang })
            });
            
            if (!resp.ok) {
                console.error('Translate API error', resp.status);
                return text;
            }

            const data = await resp.json();
            const translated = data.translatedText || text;

            // Store in cache
            if (!this.translationCache[key]) this.translationCache[key] = {};
            this.translationCache[key][targetLang] = translated;

            return translated;

        } catch (err) {
            console.error('Translation error:', err);
            return text;
        }
    }

    /**
     * Translate multiple texts in batch
     */
    async translateBatch(texts, targetLang = 'ES') {
        console.log('[translateBatch] Starting batch with', texts.length, 'texts');
        
        const results = [];
        const needsApi = [];
        const apiIndices = [];
        
        // Separate hardcoded/cached from API-needed
        for (let i = 0; i < texts.length; i++) {
            const key = texts[i].trim();
            
            // Check hardcoded first
            if (targetLang === 'ES' && HARDCODED_TRANSLATIONS[key]) {
                console.log('[translateBatch] Hardcoded:', key);
                results[i] = HARDCODED_TRANSLATIONS[key];
                continue;
            }
            
            // Check cache
            if (this.translationCache[key] && this.translationCache[key][targetLang]) {
                console.log('[translateBatch] Cached:', key);
                results[i] = this.translationCache[key][targetLang];
                continue;
            }
            
            // Needs API
            console.log('[translateBatch] Needs API:', key);
            needsApi.push(key);
            apiIndices.push(i);
        }
        
        console.log(`[translateBatch] Hardcoded/cached: ${texts.length - needsApi.length}, API needed: ${needsApi.length}`);
        
        // Translate remaining via API (one by one to avoid rate limits)
        for (let i = 0; i < needsApi.length; i++) {
            const translated = await this.translate(needsApi[i], targetLang);
            results[apiIndices[i]] = translated;
        }
        
        console.log('[translateBatch] Batch complete');
        return results;
    }

    ensureElementId(el) {
        if (el.id && el.id.trim()) return el.id;
        const gen = 'translate-' + Math.random().toString(36).slice(2, 9);
        el.id = gen;
        return gen;
    }

    async translatePage(targetLang = 'ES') {
        try {
            targetLang = targetLang.toUpperCase();
            console.log('[translatePage] Starting translation to:', targetLang);

            const elements = Array.from(document.querySelectorAll('[data-translate]'));
            console.log('[translatePage] Found', elements.length, 'elements');
            
            if (elements.length === 0) {
                console.warn('[translatePage] No elements with data-translate');
                return;
            }

            const originals = [];
            const elToOriginal = [];

            elements.forEach((el) => {
                const id = this.ensureElementId(el);
                if (!this.originalContent[id]) {
                    this.originalContent[id] = el.textContent.trim();
                }
                const original = this.originalContent[id];
                elToOriginal.push({ el, original });
                originals.push(original);
            });

            const uniqueOriginals = Array.from(new Set(originals));
            console.log('[translatePage] Unique texts:', uniqueOriginals.length);

            const translations = await this.translateBatch(uniqueOriginals, targetLang);
            
            const translatedMap = {};
            uniqueOriginals.forEach((orig, i) => {
                translatedMap[orig] = translations[i] || orig;
            });

            elToOriginal.forEach(({ el, original }) => {
                const translated = translatedMap[original] || original;
                el.textContent = translated;
            });

            this.currentLanguage = targetLang === 'ES' ? 'es' : 'en';
            localStorage.setItem('currentLanguage', this.currentLanguage);
            console.log('[translatePage] Complete!');
        } catch (err) {
            console.error('translatePage error:', err);
        }
    }

    async switchLanguage(lang) {
        const normalizedLang = lang.toUpperCase();
        if (normalizedLang === 'ES') {
            await this.translatePage('ES');
        } else {
            this.switchToEnglish();
        }
    }

    switchToEnglish() {
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(el => {
            const elementKey = el.id;
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
window.pageTranslator = pageTranslator;

// Initialize language based on stored preference
document.addEventListener('DOMContentLoaded', function () {
  const languageToggle = document.getElementById('languageToggle');
  const currentLang = pageTranslator.getCurrentLanguage();
  
  if (languageToggle && currentLang === 'es') {
    languageToggle.textContent = 'English';
    languageToggle.classList.add('active');
    
    setTimeout(() => pageTranslator.translatePage('ES'), 300);
  }
});

// Global function for button click handler
function toggleLanguage(button) {
  if (pageTranslator.getCurrentLanguage() === 'en') {
    pageTranslator.switchLanguage('es');
    button.textContent = 'English';
    button.classList.add('active');
  } else {
    pageTranslator.switchLanguage('en');
    button.textContent = 'Español';
    button.classList.remove('active');
  }
}