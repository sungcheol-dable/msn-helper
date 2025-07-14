// ==UserScript==
// @name         MSN에서 광고 찾기
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Detect and highlight ad providers on MSN Korea
// @author       sungcheol-dable
// @match        https://www.msn.com/ko-kr*
// @match        https://*.msn.com/ko-kr*
// @match        https://www.msn.com/ko-kr/
// @match        https://www.msn.com/ko-kr
// @updateURL    https://cdn.jsdelivr.net/gh/sungcheol-dable/msn-helper@latest/msn-ad-detector.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/sungcheol-dable/msn-helper@latest/msn-ad-detector.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('🔍 MSN Ad Detector v1.8 - Script loaded!');

    // ===== STATE MANAGEMENT =====
    let isScanning = false;
    const adCostData = new Map(); // Store ad cost information

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
                border: 3px solid #FF1493 !important;
                border-radius: 8px !important;
                background: rgba(255, 20, 147, 0.05) !important;
            }
            .${uniqueClass}::before {
                content: "💰 광고" !important;
                position: absolute !important;
                top: -2px !important;
                left: -2px !important;
                color: white !important;
                background: linear-gradient(45deg, #FF1493, #FF69B4) !important;
                padding: 4px 8px !important;
                font-size: 11px !important;
                font-weight: bold !important;
                font-family: sans-serif !important;
                z-index: 999999 !important;
                pointer-events: none !important;
                line-height: 1 !important;
                white-space: nowrap !important;
                border-radius: 4px !important;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4) !important;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
                border: 1px solid #FF1493 !important;
            }
            .${uniqueClass}::after {
                content: "AD: ${provider}" !important;
                position: absolute !important;
                bottom: -2px !important;
                right: -2px !important;
                color: white !important;
                background: linear-gradient(45deg, #FF6B35, #F7931E) !important;
                padding: 3px 6px !important;
                font-size: 10px !important;
                font-weight: bold !important;
                font-family: sans-serif !important;
                z-index: 999999 !important;
                pointer-events: none !important;
                line-height: 1 !important;
                white-space: nowrap !important;
                border-radius: 3px !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
                border: 1px solid #FF6B35 !important;
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
            // Find the best container to mark
            const containerToMark = findBestContainer(element);
            applyVisualMarker(containerToMark, provider, baseIndex);
        }
    }
    
    function findBestContainer(element) {
        // Start from the current element and go up the DOM tree
        let current = element;
        let bestContainer = element;
        
        // Look for parent containers that are likely ad containers
        while (current && current.parentElement && current !== document.body) {
            const parent = current.parentElement;
            
            // Check if parent looks like an ad container
            if (isLikelyAdContainer(parent)) {
                bestContainer = parent;
            }
            
            // Don't go too far up
            if (parent.tagName === 'BODY' || parent.tagName === 'HTML') {
                break;
            }
            
            current = parent;
        }
        
        return bestContainer;
    }
    
    function isLikelyAdContainer(element) {
        const rect = element.getBoundingClientRect();
        
        // Skip if too small or too large
        if (rect.width < 100 || rect.height < 100 || 
            rect.width > window.innerWidth * 0.8 || 
            rect.height > window.innerHeight * 0.8) {
            return false;
        }
        
        const className = element.className || '';
        const id = element.id || '';
        
        // Check for ad-related class names or IDs
        const adIndicators = ['ad', 'banner', 'promo', 'sponsored', 'content-card', 'article', 'item'];
        const hasAdIndicator = adIndicators.some(indicator => 
            className.toLowerCase().includes(indicator) || 
            id.toLowerCase().includes(indicator)
        );
        
        return hasAdIndicator;
    }

    // ===== DOM SCANNING =====
    function scanForAds(context, contextName = '') {
        scanShadowDOM(context, contextName);
        scanWithSelectors(context, contextName);
        scanAdLabels(context, contextName);
    }
    
    function scanAdLabels(context, contextName) {
        // Find elements with ad-label class that contain '후원받음'
        const adLabels = context.querySelectorAll('.ad-label, [class*="ad-label"]');
        console.log(`🔍 Found ${adLabels.length} ad-label elements`);
        
        adLabels.forEach((adLabel, index) => {
            const text = adLabel.textContent || '';
            if (text.includes('후원받음') || text.includes('광고') || text.includes('Sponsored')) {
                console.log('🔍 Found sponsored content:', text);
                
                // Find the container and link for this ad
                const container = findAdContainer(adLabel);
                const link = findAdLink(container);
                
                if (container && link) {
                    const advertiser = extractAdvertiserFromLink(link);
                    applyVisualMarker(container, advertiser, `${contextName || 'ad-label'}-${index}`);
                }
            }
        });
    }
    
    function findAdContainer(adLabel) {
        // Start from ad-label and find the appropriate container
        let current = adLabel;
        
        // Go up to find a good container (article, content-card, etc.)
        while (current && current.parentElement && current !== document.body) {
            const parent = current.parentElement;
            
            if (isLikelyAdContainer(parent)) {
                return parent;
            }
            
            // Check for common MSN container patterns
            const className = parent.className || '';
            if (className.includes('content-card') || 
                className.includes('article') || 
                className.includes('item') ||
                parent.tagName === 'ARTICLE') {
                return parent;
            }
            
            current = parent;
        }
        
        return current;
    }
    
    function findAdLink(container) {
        // Find the main link in the container
        const links = container.querySelectorAll('a[href]');
        
        // Prefer links that are likely to be the main ad link
        for (const link of links) {
            const href = link.href;
            if (href && !href.includes('javascript:') && !href.startsWith('#')) {
                return link;
            }
        }
        
        return links[0]; // Fallback to first link
    }
    
    function extractAdvertiserFromLink(link) {
        try {
            const url = new URL(link.href);
            let hostname = url.hostname;
            
            // Clean up common prefixes
            hostname = hostname.replace(/^www\./, '');
            
            // Extract main domain for common tracking domains
            if (hostname.includes('go.microsoft.com') || 
                hostname.includes('booking.com') ||
                hostname.includes('microsoftedge.microsoft.com')) {
                // Try to extract from URL parameters
                const urlParams = url.searchParams;
                for (const [key, value] of urlParams) {
                    if (value.includes('http')) {
                        try {
                            const innerUrl = new URL(decodeURIComponent(value));
                            return innerUrl.hostname.replace(/^www\./, '');
                        } catch (e) {
                            // Ignore parsing errors
                        }
                    }
                }
            }
            
            return hostname;
        } catch (e) {
            return 'Unknown';
        }
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


    // ===== AD COST TRACKING =====
    function setupAdCostTracking() {
        // Intercept network requests to capture ad cost data
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const result = originalFetch.apply(this, args);
            
            // Monitor responses for ad cost data
            result.then(response => {
                if (response.url.includes('telemetry') || response.url.includes('log')) {
                    response.clone().text().then(text => {
                        try {
                            parseAdCostData(text);
                        } catch (e) {
                            // Silent error handling
                        }
                    });
                }
            }).catch(() => {
                // Silent error handling
            });
            
            return result;
        };
        
        // Listen for console logs that might contain ad data
        const originalLog = console.log;
        console.log = function(...args) {
            args.forEach(arg => {
                if (typeof arg === 'string' && arg.includes('AdLabel')) {
                    try {
                        parseAdCostData(arg);
                    } catch (e) {
                        // Silent error handling
                    }
                }
            });
            return originalLog.apply(this, args);
        };
    }
    
    function parseAdCostData(data) {
        try {
            // Try to parse JSON data containing ad cost information
            let jsonData = data;
            if (typeof data === 'string') {
                // Extract JSON from string if needed
                const jsonMatch = data.match(/\\{[^{}]*"co"[^{}]*\\}/);
                if (jsonMatch) {
                    jsonData = JSON.parse(jsonMatch[0]);
                } else {
                    return;
                }
            }
            
            if (jsonData && jsonData.ext && jsonData.ext.co) {
                const cost = jsonData.ext.co;
                const slotId = jsonData.ext.cid1s || jsonData.ext.slot || 'unknown';
                
                console.log(`💰 Ad Cost Detected - Slot: ${slotId}, Cost: ${cost}`);
                adCostData.set(slotId, cost);
                
                // Update existing markers with cost info
                updateMarkersWithCost();
            }
        } catch (e) {
            // Silent error handling
        }
    }
    
    function updateMarkersWithCost() {
        // Find existing ad markers and update them with cost information
        document.querySelectorAll('[class*="ad-element-"]').forEach(element => {
            const costInfo = findCostForElement(element);
            if (costInfo) {
                updateMarkerWithCost(element, costInfo);
            }
        });
    }
    
    function findCostForElement(element) {
        // Try to match element with cost data
        for (const [slotId, cost] of adCostData) {
            // Simple matching - could be improved with better logic
            return cost;
        }
        return null;
    }
    
    function updateMarkerWithCost(element, cost) {
        // Find the existing style element and update it
        const uniqueClass = Array.from(element.classList).find(cls => cls.startsWith('ad-element-'));
        if (uniqueClass) {
            const styleElement = document.querySelector(`style[data-class="${uniqueClass}"]`);
            if (styleElement) {
                const currentContent = styleElement.textContent;
                const updatedContent = currentContent.replace(
                    /(content: "AD: [^"]*")/,
                    `$1 💰${cost}원"`
                );
                styleElement.textContent = updatedContent;
            }
        }
    }

    // ===== INITIALIZATION =====
    function initialize() {
        console.log('🔍 MSN Ad Detector - Initializing...');
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 Document ready state:', document.readyState);
        setupAdCostTracking();
        createScanButton();
        console.log('🔍 MSN Ad Detector - Initialization complete!');
    }

    // ===== ENTRY POINT =====
    if (document.readyState === 'complete') {
        initialize();
    } else {
        window.addEventListener('load', initialize);
    }

})();
