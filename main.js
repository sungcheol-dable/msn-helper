(function() {
    'use strict';

    // ===== STATE MANAGEMENT =====
    let isScanning = false;

    // ===== UI COMPONENTS =====
    function createScanButton() {
        const scanButton = document.createElement('button');
        scanButton.id = 'ad-detector-scan-button';
        scanButton.innerHTML = '🔍 광고찾기';
        scanButton.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: auto;
            height: 65px;
            padding: 0 25px;
            background: linear-gradient(45deg, #FF1493, #FF69B4);
            color: white;
            font-family: sans-serif;
            font-size: 18px;
            font-weight: bold;
            border: none;
            border-radius: 32.5px;
            cursor: pointer;
            z-index: 99999999;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        addButtonHoverEffects(scanButton);
        scanButton.onclick = runFullDetection;
        document.body.appendChild(scanButton);
    }

    function addButtonHoverEffects(button) {
        button.onmouseover = () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
        };
        
        button.onmouseout = () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
    }

    // ===== AD PROVIDER DETECTION =====
    function detectAdProvider(url) {
        // Decode URL to handle encoded parameters
        let decodedUrl = url;
        try {
            decodedUrl = decodeURIComponent(url);
        } catch (e) {
            // If decoding fails, use original URL
        }
        
        const urlLower = decodedUrl.toLowerCase();
        const domain = extractDomain(url);

        // Check for specific providers first (including in URL parameters)
        if (urlLower.includes('taboola')) {
            return 'TABOOLA';
        }
        
        if (urlLower.includes('dable')) {
            return 'DABLE';
        }
        
        if (urlLower.includes('popin')) {
            return 'POPIN';
        }
        
        if (urlLower.includes('outbrain')) {
            return 'OUTBRAIN';
        }
        
        if (urlLower.includes('criteo')) {
            return 'CRITEO';
        }
        
        // Check for ADNXS/AppNexus after specific providers to catch proxy cases
        if (urlLower.includes('adnxs') || urlLower.includes('go2cloud.org')) {
            return detectAdnxsProvider(urlLower, domain);
        }
        
        if (urlLower.includes('doubleclick') || urlLower.includes('googleadservices') || urlLower.includes('googlesyndication')) {
            return 'GOOGLE';
        }
        
        if (urlLower.includes('amazon-adsystem')) {
            return 'AMAZON';
        }
        
        if (urlLower.includes('facebook')) {
            return 'FACEBOOK';
        }
        
        if (urlLower.includes('bing') && (urlLower.includes('ads') || urlLower.includes('ad'))) {
            return 'BING';
        }

        if (urlLower.includes('djpcraze')) {
            return 'DJPCRAZE';
        }
        
        return detectUnknownProvider(urlLower, domain);
    }

    function detectAdnxsProvider(urlLower, domain) {
        if (urlLower.includes('taboola')) {
            return `TABOOLA via APPNEXUS`;
        }
        
        if (urlLower.includes('outbrain')) {
            return `OUTBRAIN via APPNEXUS`;
        }
        
        if (urlLower.includes('criteo')) {
            return `CRITEO via APPNEXUS`;
        }
        
        if (urlLower.includes('dable')) {
            return `DABLE via APPNEXUS`;
        }
        
        if (urlLower.includes('popin')) {
            return `POPIN via APPNEXUS`;
        }

        if (urlLower.includes('djpcraze')) {
            return `DJPCRAZE via APPNEXUS`;
        }
        
        return 'APPNEXUS';
    }

    function detectUnknownProvider(urlLower, domain) {
        if (urlLower.includes('taboola')) {
            return `TABOOLA (${domain})`;
        }
        
        if (urlLower.includes('outbrain')) {
            return `OUTBRAIN (${domain})`;
        }
        
        if (urlLower.includes('criteo')) {
            return `CRITEO (${domain})`;
        }
        
        if (urlLower.includes('dable')) {
            return `DABLE (${domain})`;
        }
        
        if (urlLower.includes('popin')) {
            return `POPIN (${domain})`;
        }
        
        if (urlLower.includes('doubleclick') || urlLower.includes('googleadservices') || urlLower.includes('googlesyndication')) {
            return `GOOGLE (${domain})`;
        }
        
        if (urlLower.includes('amazon') && urlLower.includes('ad')) {
            return `AMAZON (${domain})`;
        }
        
        if (urlLower.includes('facebook') || urlLower.includes('fbcdn')) {
            return `FACEBOOK (${domain})`;
        }
        
        if (urlLower.includes('bing') && (urlLower.includes('ads') || urlLower.includes('ad'))) {
            return `BING (${domain})`;
        }
        
        if (isAdUrl(urlLower)) {
            return `${domain}`;
        }
        
        return null;
    }

    function isAdUrl(urlLower) {
        const adKeywords = ['ad', 'ads', 'banner', 'promo', 'sponsored', 'tracking'];
        return adKeywords.some(keyword => urlLower.includes(keyword));
    }

    function extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return url.split('/')[2] || url;
        }
    }

    // ===== URL EXTRACTION =====
    function extractUrlFromElement(element) {
        switch (element.tagName) {
            case 'IMG':
                return extractImageUrl(element);
            case 'A':
                return element.href;
            case 'IFRAME':
                return element.src;
            default:
                return extractBackgroundUrl(element);
        }
    }

    function extractImageUrl(img) {
        return img.src || 
               img.getAttribute('data-src') || 
               img.getAttribute('data-lazy-src') || 
               img.getAttribute('srcset');
    }

    function extractBackgroundUrl(element) {
        // Check style background-image
        const style = element.getAttribute('style') || '';
        const bgMatch = style.match(/background-image:\s*url\(['"]?(.+?)['"]?\)/);
        if (bgMatch) return bgMatch[1];
        
        // Check data attributes
        const dataAttrs = ['data-src', 'data-bg', 'data-background', 'data-img', 'data-url'];
        for (const attr of dataAttrs) {
            if (element.hasAttribute(attr)) {
                return element.getAttribute(attr);
            }
        }
        
        // Check all attributes for URLs
        for (const attr of element.attributes) {
            if (attr.value && typeof attr.value === 'string' && attr.value.includes('http')) {
                return attr.value;
            }
        }
        
        return null;
    }

    // ===== VISUAL MARKING =====
    function applyVisualMarker(element, provider, baseIndex) {
        if (shouldSkipElement(element)) return;
        
        element.setAttribute('data-ad-processed', 'true');
        
        const uniqueClass = generateUniqueClass(baseIndex);
        element.classList.add(uniqueClass);
        
        const style = createMarkerStyle(uniqueClass, provider);
        appendStyleToDocument(element, style);
    }

    function shouldSkipElement(element) {
        if (element.hasAttribute('data-ad-processed')) return true;
        
        const rect = element.getBoundingClientRect();
        return rect.width < 30 || rect.height < 30;
    }


    function generateUniqueClass(baseIndex) {
        return `ad-element-${Date.now()}-${baseIndex}`;
    }

    function createMarkerStyle(uniqueClass, provider) {
        const style = document.createElement('style');
        style.textContent = `
            .${uniqueClass} {
                position: relative !important;
                border: 1px solid #FF1493 !important;
            }
            .${uniqueClass}::after {
                content: "AD: ${provider}" !important;
                position: absolute !important;
                bottom: -2px !important;
                right: -2px !important;
                color: white !important;
                background-color: #FF149399 !important;
                padding: 2px 6px !important;
                font-size: 12px !important;
                font-weight: bold !important;
                font-family: sans-serif !important;
                z-index: 999999 !important;
                pointer-events: none !important;
                line-height: 1 !important;
                white-space: nowrap !important;
                border-radius: 3px 0 0 0 !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5) !important;
            }
        `;
        return style;
    }

    function appendStyleToDocument(element, style) {
        const rootNode = element.getRootNode();
        const styleContainer = rootNode.head || rootNode;
        styleContainer.appendChild(style);
    }

    // ===== ELEMENT PROCESSING =====
    function processElement(element, url, baseIndex) {
        if (!url) return;
        
        const provider = detectAdProvider(url);
        if (provider) {
            applyVisualMarker(element, provider, baseIndex);
        }
    }

    // ===== DOM SCANNING =====
    function scanForAds(context, contextName = '') {
        scanShadowDOM(context, contextName);
        scanWithSelectors(context, contextName);
    }

    function scanShadowDOM(context, contextName) {
        const shadowHosts = context.querySelectorAll('*');
        let shadowCount = 0;
        
        shadowHosts.forEach((el) => {
            if (el.shadowRoot) {
                shadowCount++;
                scanForAds(el.shadowRoot, `shadow-${el.tagName}-${shadowCount}`);
            }
        });
    }

    function scanWithSelectors(context, contextName) {
        const foundAds = scanTargetedSelectors(context, contextName);
        
        if (foundAds === 0 && !contextName) {
            scanAllElements(context);
        }
    }

    function scanTargetedSelectors(context, contextName) {
        const adSelectors = getAdSelectors();
        let totalFound = 0;

        adSelectors.forEach(selector => {
            try {
                const elements = context.querySelectorAll(selector);
                totalFound += elements.length;
                
                elements.forEach((el, index) => {
                    const url = extractUrlFromElement(el);
                    if (url) {
                        processElement(el, url, `${contextName || 'doc'}-${index}`);
                    }
                });
            } catch (e) {
                // Silent error handling
            }
        });

        return totalFound;
    }

    function scanAllElements(context) {
        const allElements = context.querySelectorAll('img, a, div, iframe, span, section, article');
        
        allElements.forEach((el, index) => {
            const url = extractUrlFromElement(el);
            if (url) {
                processElement(el, url, `comprehensive-${index}`);
            }
        });
    }

    function getAdSelectors() {
        return [
            'img[src*="taboola"], img[src*="outbrain"], img[src*="criteo"], img[src*="doubleclick"]',
            'a[href*="taboola"], a[href*="outbrain"], a[href*="criteo"], a[href*="doubleclick"]',
            'div[style*="taboola"], div[style*="outbrain"], div[style*="criteo"]',
            'iframe[src*="ads"], iframe[src*="ad"]',
            '*[class*="ad"], *[id*="ad"], *[class*="banner"], *[id*="banner"]',
            '*[class*="sponsored"], *[id*="sponsored"], *[class*="promo"]'
        ];
    }

    // ===== MAIN DETECTION FUNCTION =====
    function runFullDetection() {
        if (isScanning) return;
        
        isScanning = true;
        
        try {
            scanForAds(document);
        } catch (e) {
            // Silent error handling
        } finally {
            isScanning = false;
        }
    }


    // ===== INITIALIZATION =====
    function initialize() {
        createScanButton();
    }

    // ===== ENTRY POINT =====
    if (document.readyState === 'complete') {
        initialize();
    } else {
        window.addEventListener('load', initialize);
    }

})();