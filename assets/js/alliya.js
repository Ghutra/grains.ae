/*
============================================================
ALLIYA v9.2-web
Procurement Intelligence
Grains Hub
============================================================

Purpose:
- Preserve the complete working Alliya v9 web UI/behavior
- Upgrade procurement matching using GrainsHubData v4.0
- Use GrainsHubData as canonical identity/pricing layer
- Never invent commercial specifications
- Never silently default broken/purity/moisture
- Never double-add freight to CIF prices
- Deterministic / no Gemini / no external API keys

Architecture:

    Alliya v9.2 UI
          |
          v
    Procurement Engine
          |
          v
    GrainsHubData v4.0
          |
          +---- stock.json
          +---- marketHistory.json
          +---- suppliers.json
          +---- freight.json

Public compatibility:

    window.Alliya.ask()
    window.Alliya.open()
    window.Alliya.close()
    window.Alliya.version

============================================================
*/

(function (window, document) {

    'use strict';

    /* ======================================================
       CONFIG
    ====================================================== */

    const VERSION = '9.2-web';

    const CONFIG = {
        dataTimeout: 9000,

        selectors: {
            floatBtn: 'alliyaFloatBtn',
            modal: 'alliyaModal',
            response: 'alliyaResponse',
            suggestions: 'alliyaSuggestions',
            query: 'alliyaQuery'
        },

        whatsappNumber: '',
        email: '',

        maxResults: 5,

        /*
         * IMPORTANT:
         *
         * This is NOT a freight calculation.
         *
         * GrainsHubData v4.0 is authoritative for commercial
         * price basis. If a stock price is already CIF Dubai,
         * Alliya must not add freight again.
         */
        allowDerivedFreight: false
    };


    /* ======================================================
       STATE
    ====================================================== */

    const state = {
        ready: false,
        loading: false,

        products: [],
        suppliers: [],
        knowledge: [],

        lastQuery: '',
        lastResults: [],

        initialized: false
    };


    /* ======================================================
       SMALL UTILITIES
    ====================================================== */

    function esc(value) {

        if (value === null || value === undefined) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function normalizeText(value) {

        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[–—−]/g, '-')
            .replace(/[_/]+/g, ' ')
            .replace(/[^\w.%$€£₹+\-\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }


    function number(value) {

        if (value === null || value === undefined || value === '') {
            return null;
        }

        const n = Number(
            String(value)
                .replace(/,/g, '')
                .replace(/[^\d.-]/g, '')
        );

        return Number.isFinite(n) ? n : null;
    }


    function formatNumber(value, decimals) {

        const n = number(value);

        if (n === null) {
            return '';
        }

        const d = decimals === undefined
            ? (Number.isInteger(n) ? 0 : 2)
            : decimals;

        return n.toLocaleString('en-US', {
            minimumFractionDigits: d,
            maximumFractionDigits: d
        });
    }


    function firstDefined() {

        for (let i = 0; i < arguments.length; i++) {

            const value = arguments[i];

            if (
                value !== undefined &&
                value !== null &&
                value !== ''
            ) {
                return value;
            }
        }

        return null;
    }


    function asArray(value) {

        if (Array.isArray(value)) {
            return value;
        }

        if (!value || typeof value !== 'object') {
            return [];
        }

        if (Array.isArray(value.items)) return value.items;
        if (Array.isArray(value.products)) return value.products;
        if (Array.isArray(value.stock)) return value.stock;
        if (Array.isArray(value.data)) return value.data;
        if (Array.isArray(value.records)) return value.records;

        return [];
    }


    /* ======================================================
       CANONICAL DATA ACCESS
       ====================================================== */

    function getCanonicalData() {

        /*
         * GrainsHubData v4.0 is the canonical layer.
         *
         * Do not create an independent stock parser here.
         */

        return window.GrainsHubData || null;
    }


    function canonicalAll() {

        const D = getCanonicalData();

        if (!D) {
            return [];
        }

        try {

            if (typeof D.all === 'function') {

                const result = D.all();

                if (Array.isArray(result)) {
                    return result;
                }
            }

        } catch (error) {
            console.warn(
                '[Alliya 9.2] GrainsHubData.all() failed',
                error
            );
        }

        /*
         * Compatibility fallbacks.

         * These do not replace GrainsHubData.
         * They simply accommodate minor v4.x implementation
         * differences while keeping the canonical object first.
         */

        const candidates = [
            D.products,
            D.stock,
            D.items,
            D.data
        ];

        for (const candidate of candidates) {

            if (Array.isArray(candidate)) {
                return candidate;
            }
        }

        return [];
    }


    function canonicalSearch(query) {

        const D = getCanonicalData();

        if (!D) {
            return [];
        }

        try {

            if (typeof D.search === 'function') {

                const result = D.search(query);

                if (Array.isArray(result)) {
                    return result;
                }
            }

        } catch (error) {

            console.warn(
                '[Alliya 9.2] GrainsHubData.search() failed',
                error
            );
        }

        return [];
    }


    function canonicalExact(query) {

        const D = getCanonicalData();

        if (!D) {
            return null;
        }

        try {

            if (typeof D.exactMatch === 'function') {

                return D.exactMatch(query) || null;
            }

        } catch (error) {

            console.warn(
                '[Alliya 9.2] GrainsHubData.exactMatch() failed',
                error
            );
        }

        return null;
    }


    /* ======================================================
       CANONICAL FIELD ACCESS
       ====================================================== */

    function productField(product, names) {

        if (!product || typeof product !== 'object') {
            return null;
        }

        for (const name of names) {

            if (
                product[name] !== undefined &&
                product[name] !== null &&
                product[name] !== ''
            ) {
                return product[name];
            }
        }

        return null;
    }


    function productOrigin(product) {

        return firstDefined(
            productField(product, [
                'origin',
                'country',
                'originCountry'
            ])
        );
    }


    function productVariety(product) {

        return firstDefined(
            productField(product, [
                'variety',
                'canonicalVariety',
                'riceVariety',
                'name'
            ])
        );
    }


    function productProcessing(product) {

        return firstDefined(
            productField(product, [
                'processing',
                'process',
                'grade',
                'form'
            ])
        );
    }


    function productCrop(product) {

        return firstDefined(
            productField(product, [
                'crop',
                'cropYear',
                'year'
            ])
        );
    }


    function productKey(product) {

        return firstDefined(
            product.productKey,
            product.identityKey,
            product.canonicalKey
        );
    }


    function quoteKey(product) {

        return firstDefined(
            product.quoteKey,
            product.commercialQuoteKey
        );
    }


    function supplierName(product) {

        return firstDefined(
            productField(product, [
                'supplier',
                'supplierName',
                'seller',
                'vendor'
            ])
        );
    }


    function availability(product) {

        return firstDefined(
            productField(product, [
                'availability',
                'status',
                'stockStatus'
            ])
        );
    }


    function stockMT(product) {

        return firstDefined(
            productField(product, [
                'stockMT',
                'availableMT',
                'quantityMT',
                'qtyMT',
                'quantity'
            ])
        );
    }


    function packing(product) {

        return firstDefined(
            productField(product, [
                'packing',
                'packaging',
                'pack'
            ])
        );
    }


    /* ======================================================
       PRICE — CANONICAL ONLY
       ====================================================== */

    function getCommercialPrice(product) {

        const D = getCanonicalData();

        /*
         * Prefer the canonical commercial price formatter/helper
         * supplied by GrainsHubData v4.0.
         */

        if (D) {

            try {

                if (typeof D.commercialPrice === 'function') {

                    const result = D.commercialPrice(product);

                    if (result) {
                        return normalizeCommercialPrice(result, product);
                    }
                }

            } catch (error) {

                console.warn(
                    '[Alliya 9.2] commercialPrice() failed',
                    error
                );
            }
        }

        /*
         * Compatibility extraction only.
         *
         * We NEVER calculate CIF/FOB ourselves here.
         */

        const price = firstDefined(
            productField(product, [
                'price',
                'commercialPrice',
                'spotPrice',
                'spotPriceAEDPerMT',
                'pricePerMT'
            ])
        );

        const currency = firstDefined(
            productField(product, [
                'currency',
                'priceCurrency'
            ])
        );

        const basis = firstDefined(
            productField(product, [
                'basis',
                'priceBasis',
                'incoterm'
            ])
        );

        return normalizeCommercialPrice(
            {
                price,
                currency,
                basis
            },
            product
        );
    }


    function normalizeCommercialPrice(raw, product) {

        if (!raw) {
            return {
                available: false,
                price: null,
                currency: null,
                basis: null,
                text: 'Contact Trade Desk'
            };
        }

        if (typeof raw === 'number') {

            return {
                available: true,
                price: raw,
                currency: firstDefined(
                    productField(product, ['currency']),
                    'USD'
                ),
                basis: firstDefined(
                    productField(product, ['basis']),
                    null
                ),
                text: formatPriceText(
                    raw,
                    firstDefined(
                        productField(product, ['currency']),
                        'USD'
                    ),
                    firstDefined(
                        productField(product, ['basis']),
                        null
                    )
                )
            };
        }

        const price = number(
            firstDefined(
                raw.price,
                raw.amount,
                raw.value,
                raw.pricePerMT
            )
        );

        const currency = firstDefined(
            raw.currency,
            raw.priceCurrency,
            productField(product, [
                'currency',
                'priceCurrency'
            ])
        );

        const basis = firstDefined(
            raw.basis,
            raw.priceBasis,
            raw.incoterm,
            productField(product, [
                'basis',
                'priceBasis',
                'incoterm'
            ])
        );

        return {
            available: price !== null,
            price,
            currency: currency || null,
            basis: basis || null,
            text: price !== null
                ? formatPriceText(price, currency, basis)
                : 'Contact Trade Desk'
        };
    }


    function formatPriceText(price, currency, basis) {

        if (price === null || price === undefined) {
            return 'Contact Trade Desk';
        }

        let text = '';

        if (currency) {
            text += String(currency).toUpperCase() + ' ';
        }

        text += formatNumber(price);

        text += ' / MT';

        if (basis) {
            text += ' ' + String(basis).toUpperCase();
        }

        return text;
    }


    /* ======================================================
       SPECIFICATIONS
       ====================================================== */

    function getSpecification(product, fieldNames, label) {

        const value = productField(product, fieldNames);

        /*
         * CRITICAL v9.2 RULE:
         *
         * Missing specification = unknown.
         *
         * We do NOT use:
         *   broken || 2
         *   purity || 95
         *   moisture || 12
         *
         * A missing field remains missing.
         */

        if (value === null) {
            return {
                available: false,
                value: null,
                label
            };
        }

        return {
            available: true,
            value,
            label
        };
    }


    function specs(product) {

        return {

            broken: getSpecification(
                product,
                [
                    'brokenPercent',
                    'broken'
                ],
                'Broken'
            ),

            purity: getSpecification(
                product,
                [
                    'purityPercent',
                    'purity'
                ],
                'Purity'
            ),

            moisture: getSpecification(
                product,
                [
                    'moisturePercent',
                    'moisture'
                ],
                'Moisture'
            ),

            grainLength: getSpecification(
                product,
                [
                    'grainLength',
                    'length',
                    'grainLengthMM'
                ],
                'Grain length'
            )
        };
    }


    function formatSpec(spec) {

        if (!spec || !spec.available) {
            return null;
        }

        let value = spec.value;

        if (
            spec.label === 'Broken' ||
            spec.label === 'Purity' ||
            spec.label === 'Moisture'
        ) {

            const n = number(value);

            if (n !== null) {
                value = formatNumber(n) + '%';
            }
        }

        return spec.label + ': ' + value;
    }


    /* ======================================================
       PRODUCT NORMALIZATION
       ====================================================== */

    function normalizeProduct(product) {

        if (!product || typeof product !== 'object') {
            return null;
        }

        const price = getCommercialPrice(product);

        const specifications = specs(product);

        return {

            raw: product,

            productKey: productKey(product),
            quoteKey: quoteKey(product),

            origin: productOrigin(product),
            variety: productVariety(product),
            processing: productProcessing(product),
            crop: productCrop(product),

            supplier: supplierName(product),

            availability: availability(product),
            stockMT: stockMT(product),

            packing: packing(product),

            price,

            specs: specifications
        };
    }


    /* ======================================================
       QUERY INTELLIGENCE
       ====================================================== */

    function parseIntent(query) {

        const raw = String(query || '');
        const q = normalizeText(raw);

        const intent = {

            raw,

            normalized: q,

            variety: null,
            origin: null,
            processing: null,
            crop: null,

            supplier: null,

            requestedMT: null,

            wantsPrice: false,
            wantsAvailability: false,
            wantsSupplier: false,
            wantsQuote: false,
            wantsRFQ: false,
            wantsComparison: false,

            terms: []
        };


        /*
         * Exact / known variety vocabulary.
         *
         * This is only query extraction.
         *
         * Product identity itself comes from GrainsHubData.
         */

        const varieties = [
            'super basmati',
            'pk386',
            'pk 386',
            'pk385',
            'pk 385',
            'd98',
            'ks282',
            'irri 6',
            'irri6',
            'irri 9',
            'irri9',
            '1121',
            '1509',
            '1718',
            '1847',
            '1401',
            'pusa',
            'sugandha',
            'sharbati',
            'sona masoori',
            'ir64',
            'pr11',
            'pr11/14',
            'pr106',
            'pr47',
            'pr26',
            'rh10',
            'taj'
        ];

        for (const variety of varieties) {

            if (q.includes(normalizeText(variety))) {

                intent.variety = variety;
                break;
            }
        }


        /*
         * Processing.
         */

        const processingTerms = [
            'golden sella',
            'white sella',
            'creamy sella',
            'white creamy sella',
            'sella',
            'steam',
            'raw',
            'parboiled'
        ];

        for (const term of processingTerms) {

            if (q.includes(term)) {

                intent.processing = term;
                break;
            }
        }


        /*
         * Origin.
         */

        if (
            q.includes('pakistan') ||
            q.includes('pakistani')
        ) {

            intent.origin = 'Pakistan';

        } else if (
            q.includes('india') ||
            q.includes('indian')
        ) {

            intent.origin = 'India';
        }


        /*
         * Crop.
         */

        const cropMatch = q.match(
            /\b(20\d{2})(?:\s*crop)?\b/
        );

        if (cropMatch) {
            intent.crop = cropMatch[1];
        }


        /*
         * Quantity.
         */

        const quantityMatch = q.match(
            /(\d+(?:\.\d+)?)\s*(?:mt|metric\s*tons?|tonnes?|tons?)\b/i
        );

        if (quantityMatch) {
            intent.requestedMT = number(quantityMatch[1]);
        }


        /*
         * Procurement intent.
         */

        intent.wantsPrice =
            /\b(price|prices|cost|rate|quote|quotation|usd|aed)\b/i.test(raw);

        intent.wantsAvailability =
            /\b(stock|available|availability|ready|inventory)\b/i.test(raw);

        intent.wantsSupplier =
            /\b(supplier|suppliers|seller|source|mill|processor)\b/i.test(raw);

        intent.wantsQuote =
            /\b(quote|get me a quote|quotation)\b/i.test(raw);

        intent.wantsRFQ =
            /\b(rfq|request for quotation|request quote|buy|purchase|order)\b/i.test(raw);

        intent.wantsComparison =
            /\b(compare|comparison|cheapest|best|options|alternative|alternatives|versus|vs)\b/i.test(raw);


        intent.terms = q
            .split(/\s+/)
            .filter(Boolean);

        return intent;
    }


    /* ======================================================
       IDENTITY MATCHING
       ====================================================== */

    function textOfProduct(product) {

        return normalizeText([
            product.productKey,
            product.variety,
            product.origin,
            product.processing,
            product.crop,
            product.supplier,
            product.packing
        ].filter(Boolean).join(' '));
    }


    function identityScore(product, intent) {

        let score = 0;

        const p = textOfProduct(product);

        const variety = normalizeText(intent.variety);
        const processing = normalizeText(intent.processing);
        const origin = normalizeText(intent.origin);
        const crop = normalizeText(intent.crop);

        /*
         * Exact canonical identity gets strongest weight.
         */

        if (
            intent.variety &&
            normalizeText(product.variety) === variety
        ) {

            score += 100;

        } else if (
            intent.variety &&
            p.includes(variety)
        ) {

            score += 35;
        }


        /*
         * Origin is commercially important.
         */

        if (
            intent.origin &&
            normalizeText(product.origin) === origin
        ) {

            score += 45;

        } else if (
            intent.origin
        ) {

            score -= 25;
        }


        /*
         * Processing must be distinguished.
         */

        if (
            intent.processing &&
            normalizeText(product.processing) === processing
        ) {

            score += 55;

        } else if (
            intent.processing &&
            p.includes(processing)
        ) {

            score += 20;
        }


        /*
         * Crop.
         */

        if (
            intent.crop &&
            normalizeText(product.crop) === crop
        ) {

            score += 30;
        }


        /*
         * Availability / stock.
         */

        if (product.stockMT !== null) {
            score += 8;
        }


        /*
         * Commercial price available.
         */

        if (product.price.available) {
            score += 8;
        }


        return score;
    }


    /* ======================================================
       PROCUREMENT RANKING
       ====================================================== */

    function scoreProduct(product, intent) {

        let score = identityScore(product, intent);

        const p = textOfProduct(product);


        /*
         * Exact query terms.
         */

        for (const term of intent.terms) {

            if (term.length < 2) {
                continue;
            }

            if (p.includes(term)) {
                score += 1;
            }
        }


        /*
         * Supplier intent.
         */

        if (
            intent.wantsSupplier &&
            product.supplier
        ) {

            score += 10;
        }


        /*
         * Price intent.

         * Only reward products with an actual canonical price.
         */

        if (
            intent.wantsPrice &&
            product.price.available
        ) {

            score += 15;
        }


        /*
         * Availability intent.

         * Again, missing availability is not treated as zero stock.
         */

        if (
            intent.wantsAvailability &&
            product.availability
        ) {

            score += 12;
        }


        /*
         * Quantity requirement.

         * If stock quantity is known, compare it.
         * If unknown, do not assume unavailable.
         */

        if (intent.requestedMT !== null) {

            const availableMT = number(product.stockMT);

            if (availableMT !== null) {

                if (availableMT >= intent.requestedMT) {
                    score += 20;
                } else {
                    score -= 5;
                }
            }
        }


        return score;
    }


    function uniqueProducts(products) {

        const map = new Map();

        for (const product of products) {

            const key =
                product.quoteKey ||
                product.productKey ||
                [
                    product.origin,
                    product.variety,
                    product.processing,
                    product.crop,
                    product.supplier
                ].join('|');

            if (!map.has(key)) {
                map.set(key, product);
            }
        }

        return Array.from(map.values());
    }


    function findProducts(intent) {

        let source = [];


        /*
         * First give the canonical search engine an opportunity
         * to identify the correct product.
         */

        const searchText = [
            intent.variety,
            intent.origin,
            intent.processing,
            intent.crop
        ].filter(Boolean).join(' ');


        if (searchText) {

            const searched = canonicalSearch(searchText);

            if (searched.length) {
                source = searched;
            }
        }


        /*
         * If canonical search gives nothing, use all canonical
         * records and rank them.
         */

        if (!source.length) {
            source = canonicalAll();
        }


        const products = source
            .map(normalizeProduct)
            .filter(Boolean);


        /*
         * If an exact canonical match exists, promote it.
         */

        const exactQuery = [
            intent.origin,
            intent.variety,
            intent.processing,
            intent.crop
        ].filter(Boolean).join(' ');

        if (exactQuery) {

            const exact = canonicalExact(exactQuery);

            if (exact) {

                const normalizedExact =
                    normalizeProduct(exact);

                if (normalizedExact) {

                    products.unshift(
                        normalizedExact
                    );
                }
            }
        }


        const unique = uniqueProducts(products);


        return unique
            .map(product => ({
                product,
                score: scoreProduct(product, intent)
            }))
            .sort((a, b) => {

                if (b.score !== a.score) {
                    return b.score - a.score;
                }

                /*
                 * Do not use price as the primary identity
                 * ranking criterion.
                 *
                 * A cheaper PR106 must never beat an exact
                 * 1121 identity simply because it is cheaper.
                 */

                return 0;
            })
            .filter(item => item.score > 0)
            .slice(0, CONFIG.maxResults);
    }


    /* ======================================================
       RESPONSE COMPONENTS
       ====================================================== */

    function identityLine(product) {

        const parts = [];

        if (product.origin) {
            parts.push(product.origin);
        }

        if (product.variety) {
            parts.push(product.variety);
        }

        if (product.processing) {
            parts.push(product.processing);
        }

        if (product.crop) {
            parts.push('Crop ' + product.crop);
        }

        return parts.join(' · ');
    }


    function commercialLine(product) {

        const parts = [];

        if (product.price.available) {

            parts.push(
                '<strong>' +
                esc(product.price.text) +
                '</strong>'
            );

        } else {

            parts.push(
                '<strong>Price: Contact Trade Desk</strong>'
            );
        }


        if (product.stockMT !== null) {

            parts.push(
                'Stock: ' +
                esc(formatNumber(product.stockMT)) +
                ' MT'
            );

        } else if (product.availability) {

            parts.push(
                esc(product.availability)
            );
        }


        return parts.join(' · ');
    }


    function supplierLine(product) {

        if (!product.supplier) {
            return '';
        }

        return (
            '<div class="alliya-supplier">' +
            '<span>Supplier</span> ' +
            esc(product.supplier) +
            '</div>'
        );
    }


    function specificationLines(product) {

        const output = [];

        const fields = [
            product.specs.broken,
            product.specs.purity,
            product.specs.moisture,
            product.specs.grainLength
        ];

        for (const field of fields) {

            const text = formatSpec(field);

            if (text) {

                output.push(
                    '<span>' +
                    esc(text) +
                    '</span>'
                );
            }
        }

        if (!output.length) {
            return '';
        }

        return (
            '<div class="alliya-specs">' +
            output.join(' · ') +
            '</div>'
        );
    }


    function resultCard(product, index) {

        const identity =
            identityLine(product) ||
            'Product identity available through Trade Desk';


        const price =
            commercialLine(product);


        const supplier =
            supplierLine(product);


        const specification =
            specificationLines(product);


        return (
            '<div class="alliya-result">' +

                '<div class="alliya-result-head">' +

                    '<span class="alliya-rank">' +
                    '#' + (index + 1) +
                    '</span>' +

                    '<div class="alliya-result-title">' +
                        '<strong>' +
                        esc(identity) +
                        '</strong>' +
                    '</div>' +

                '</div>' +

                '<div class="alliya-result-commercial">' +
                    price +
                '</div>' +

                supplier +

                (
                    product.packing
                        ? '<div class="alliya-packing"><span>Packing</span> ' +
                          esc(product.packing) +
                          '</div>'
                        : ''
                ) +

                specification +

                '<div class="alliya-result-actions">' +

                    '<button type="button" ' +
                        'class="alliya-action alliya-action-quote" ' +
                        'data-action="quote" ' +
                        'data-index="' + index + '">' +
                        'Get Quote' +
                    '</button>' +

                    '<button type="button" ' +
                        'class="alliya-action" ' +
                        'data-action="rfq" ' +
                        'data-index="' + index + '">' +
                        'Request FCL' +
                    '</button>' +

                '</div>' +

            '</div>'
        );
    }


    /* ======================================================
       RESPONSE BUILDER
       ====================================================== */

    function buildResponse(query, ranked) {

        const intent = parseIntent(query);


        if (!ranked.length) {

            return {
                html:
                    '<div class="alliya-message">' +

                        '<strong>I could not find a confident match.</strong>' +

                        '<p>' +
                        'I do not want to guess the product identity or ' +
                        'commercial specification. Try the variety, origin, ' +
                        'processing or crop year, and I will narrow it down.' +
                        '</p>' +

                    '</div>',

                results: []
            };
        }


        const topScore = ranked[0].score;

        /*
         * If identity confidence is weak, don't present the result
         * as an exact procurement match.
         */

        const weakMatch = topScore < 70;


        let html = '';


        if (weakMatch) {

            html +=
                '<div class="alliya-message">' +
                    '<strong>Here are the closest matches I found.</strong>' +
                    '<p>' +
                    'The request does not contain enough identity detail ' +
                    'for me to call one product an exact match.' +
                    '</p>' +
                '</div>';

        } else {

            html +=
                '<div class="alliya-message">' +
                    '<strong>Here is the closest procurement match.</strong>' +
                    '<p>' +
                    'I matched the request against Grains Hub’s canonical ' +
                    'product identity and commercial data.' +
                    '</p>' +
                '</div>';
        }


        /*
         * Procurement request summary.
         */

        const requestParts = [];

        if (intent.variety) {
            requestParts.push(intent.variety);
        }

        if (intent.processing) {
            requestParts.push(intent.processing);
        }

        if (intent.origin) {
            requestParts.push(intent.origin);
        }

        if (intent.crop) {
            requestParts.push('Crop ' + intent.crop);
        }

        if (intent.requestedMT !== null) {
            requestParts.push(
                formatNumber(intent.requestedMT) + ' MT'
            );
        }


        if (requestParts.length) {

            html +=
                '<div class="alliya-request">' +
                    '<span>Request</span> ' +
                    esc(requestParts.join(' · ')) +
                '</div>';
        }


        html +=
            '<div class="alliya-results">';


        ranked.forEach((item, index) => {

            html += resultCard(
                item.product,
                index
            );
        });


        html += '</div>';


        /*
         * Commercial safety note.

         * This is especially important where price basis is
         * available because v9.2 must not turn a CIF price into
         * CIF + freight.
         */

        const first = ranked[0].product;

        if (first.price.available) {

            html +=
                '<div class="alliya-note">' +
                    'Price shown is the canonical commercial price/basis ' +
                    'available in Grains Hub data. No additional freight has ' +
                    'been added by Alliya.' +
                '</div>';
        }


        /*
         * Missing specifications.

         * Explicitly explain that missing values are not assumptions.
         */

        const missing = [];

        if (!first.specs.broken.available) {
            missing.push('broken %');
        }

        if (!first.specs.purity.available) {
            missing.push('purity %');
        }

        if (!first.specs.moisture.available) {
            missing.push('moisture %');
        }


        if (missing.length) {

            html +=
                '<div class="alliya-note">' +
                    'Specification data not present in the source: ' +
                    esc(missing.join(', ')) +
                    '. I have not assumed values.' +
                '</div>';
        }


        return {
            html,
            results: ranked
        };
    }


    /* ======================================================
       PERSONALITY / RHYTHM
       ====================================================== */

    function introFor(intent) {

        if (intent.wantsRFQ || intent.wantsQuote) {

            return 'Yes — let’s turn that into a procurement request.';
        }

        if (intent.wantsComparison) {

            return 'I’ll compare the closest commercial options without mixing product identities.';
        }

        if (intent.wantsAvailability) {

            return 'Let’s check the available supply first.';
        }

        if (intent.wantsPrice) {

            return 'Let’s look at the current commercial match.';
        }

        return 'Let’s narrow that down.';
    }


    /* ======================================================
       LINK / CTA HELPERS
       ====================================================== */

    function whatsappLink(text) {

        if (!CONFIG.whatsappNumber) {
            return '';
        }

        const url =
            'https://wa.me/' +
            encodeURIComponent(CONFIG.whatsappNumber) +
            '?text=' +
            encodeURIComponent(text);

        return (
            '<a class="alliya-cta-link" ' +
            'href="' + esc(url) + '" ' +
            'target="_blank" ' +
            'rel="noopener noreferrer">' +
            'WhatsApp Trade Desk' +
            '</a>'
        );
    }


    function emailLink(subject, body) {

        if (!CONFIG.email) {
            return '';
        }

        const url =
            'mailto:' +
            CONFIG.email +
            '?subject=' +
            encodeURIComponent(subject) +
            '&body=' +
            encodeURIComponent(body);

        return (
            '<a class="alliya-cta-link" ' +
            'href="' + esc(url) + '">' +
            'Email Trade Desk' +
            '</a>'
        );
    }


    /* ======================================================
       ACTION GENERATION
       ====================================================== */

    function buildProcurementMessage(product, action) {

        const identity = identityLine(product);

        const quantity =
            number(product.stockMT) !== null
                ? formatNumber(product.stockMT) + ' MT available'
                : 'Quantity to confirm';

        const price =
            product.price.available
                ? product.price.text
                : 'Price to confirm';


        if (action === 'rfq') {

            return [
                'Grains Hub RFQ',
                '',
                'Product: ' + identity,
                'Supplier: ' + (product.supplier || 'To confirm'),
                'Price: ' + price,
                quantity,
                '',
                'Please confirm FCL quantity, packing, specification,',
                'delivery requirements and final commercial terms.'
            ].join('\n');
        }


        return [
            'Grains Hub Quote Request',
            '',
            'Product: ' + identity,
            'Supplier: ' + (product.supplier || 'To confirm'),
            'Current price: ' + price,
            quantity,
            '',
            'Please confirm executable quotation and availability.'
        ].join('\n');
    }


    function handleResultAction(action, index) {

        const item =
            state.lastResults[index];

        if (!item || !item.product) {
            return;
        }

        const product = item.product;

        const message =
            buildProcurementMessage(
                product,
                action
            );


        let links = '';


        const wa =
            whatsappLink(message);

        if (wa) {
            links += wa;
        }


        const mail =
            emailLink(
                'Grains Hub ' +
                (action === 'rfq'
                    ? 'RFQ'
                    : 'Quote Request') +
                ' — ' +
                identityLine(product),
                message
            );

        if (mail) {
            links += mail;
        }


        if (!links) {

            links =
                '<div class="alliya-note">' +
                'Please contact the Grains Hub Trade Desk to proceed.' +
                '</div>';
        }


        const response =
            document.getElementById(
                CONFIG.selectors.response
            );


        if (response) {

            response.insertAdjacentHTML(
                'beforeend',

                '<div class="alliya-followup">' +
                    '<strong>' +
                    (
                        action === 'rfq'
                            ? 'FCL request prepared.'
                            : 'Quote request prepared.'
                    ) +
                    '</strong>' +

                    '<p>' +
                    esc(identityLine(product)) +
                    '</p>' +

                    '<div class="alliya-cta-row">' +
                        links +
                    '</div>' +

                '</div>'
            );

            response.scrollTop =
                response.scrollHeight;
        }
    }


    /* ======================================================
       SUGGESTIONS
       ====================================================== */

    function renderSuggestions() {

        const container =
            document.getElementById(
                CONFIG.selectors.suggestions
            );

        if (!container) {
            return;
        }


        const suggestions = [
            '1121 Golden Sella India',
            '1509 Steam India',
            'PR106 Golden Sella India',
            'IRRI 6 Pakistan'
        ];


        container.innerHTML =
            suggestions.map(
                suggestion =>

                    '<button type="button" ' +
                    'class="alliya-suggestion" ' +
                    'data-suggestion="' +
                    esc(suggestion) +
                    '">' +
                    esc(suggestion) +
                    '</button>'

            ).join('');
    }


    /* ======================================================
       CSS
    ====================================================== */

    function injectStyles() {

        if (document.getElementById('alliya-v92-styles')) {
            return;
        }


        const style =
            document.createElement('style');

        style.id =
            'alliya-v92-styles';


        style.textContent = `

        #alliyaFloatBtn {
            position: fixed;
            right: 20px;
            bottom: 20px;
            z-index: 99998;

            width: 58px;
            height: 58px;

            border: 0;
            border-radius: 50%;

            cursor: pointer;

            background:
                linear-gradient(
                    135deg,
                    #c49b3f,
                    #e3c46a
                );

            color: #fff;

            font-size: 14px;
            font-weight: 700;

            box-shadow:
                0 8px 30px rgba(0,0,0,.22);

            transition:
                transform .2s ease,
                box-shadow .2s ease;
        }


        #alliyaFloatBtn:hover {
            transform: translateY(-2px);
            box-shadow:
                0 12px 34px rgba(0,0,0,.28);
        }


        #alliyaModal {
            position: fixed;

            right: 20px;
            bottom: 90px;

            width: min(440px, calc(100vw - 30px));

            max-height:
                min(720px, calc(100vh - 120px));

            z-index: 99999;

            display: none;

            overflow: hidden;

            background: #fff;

            border:
                1px solid rgba(196,155,63,.35);

            border-radius: 18px;

            box-shadow:
                0 20px 60px rgba(0,0,0,.22);
        }


        #alliyaModal.alliya-open {
            display: flex;
            flex-direction: column;
        }


        .alliya-header {
            display: flex;
            align-items: center;
            justify-content: space-between;

            padding: 15px 17px;

            background:
                linear-gradient(
                    135deg,
                    #c49b3f,
                    #e3c46a
                );

            color: #fff;
        }


        .alliya-brand {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }


        .alliya-brand strong {
            font-size: 16px;
        }


        .alliya-brand small {
            opacity: .9;
            font-size: 11px;
        }


        .alliya-close {
            border: 0;
            background: transparent;
            color: #fff;

            cursor: pointer;

            font-size: 24px;
            line-height: 1;
        }


        #alliyaResponse {
            flex: 1;

            min-height: 180px;

            max-height:
                min(520px, calc(100vh - 310px));

            overflow-y: auto;

            padding: 16px;

            color: #252525;

            font-size: 14px;
            line-height: 1.55;
        }


        .alliya-message {
            margin-bottom: 13px;
        }


        .alliya-message p {
            margin: 7px 0 0;
        }


        .alliya-request {
            margin:
                10px 0 14px;

            padding:
                9px 11px;

            border-radius: 9px;

            background: #faf7ef;

            border:
                1px solid rgba(196,155,63,.18);
        }


        .alliya-request span,
        .alliya-supplier span,
        .alliya-packing span {
            font-weight: 700;
            color: #80631e;
        }


        .alliya-results {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }


        .alliya-result {
            padding: 12px;

            border:
                1px solid #e8e3d7;

            border-radius: 12px;

            background: #fff;
        }


        .alliya-result-head {
            display: flex;
            gap: 8px;
            align-items: flex-start;
        }


        .alliya-rank {
            flex: 0 0 auto;

            min-width: 25px;
            height: 25px;

            display: inline-flex;
            align-items: center;
            justify-content: center;

            border-radius: 50%;

            background: #f5edda;

            color: #80631e;

            font-size: 11px;
            font-weight: 700;
        }


        .alliya-result-title {
            line-height: 1.4;
        }


        .alliya-result-commercial {
            margin-top: 8px;
        }


        .alliya-supplier,
        .alliya-packing {
            margin-top: 5px;
            font-size: 12px;
        }


        .alliya-specs {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 8px;

            margin-top: 8px;

            color: #666;

            font-size: 11px;
        }


        .alliya-result-actions {
            display: flex;
            gap: 7px;

            margin-top: 11px;
        }


        .alliya-action {
            border:
                1px solid #c49b3f;

            border-radius: 7px;

            background: #fff;

            color: #80631e;

            padding: 7px 10px;

            cursor: pointer;

            font-size: 11px;
            font-weight: 700;
        }


        .alliya-action-quote {
            background: #c49b3f;
            color: #fff;
        }


        .alliya-note {
            margin-top: 12px;

            padding: 9px 10px;

            border-radius: 8px;

            background: #f8f8f8;

            color: #666;

            font-size: 11px;
            line-height: 1.45;
        }


        .alliya-followup {
            margin-top: 13px;

            padding: 12px;

            border-radius: 10px;

            background: #faf7ef;

            border:
                1px solid rgba(196,155,63,.25);
        }


        .alliya-followup p {
            margin: 5px 0 9px;
        }


        .alliya-cta-row {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
        }


        .alliya-cta-link {
            display: inline-block;

            padding: 8px 11px;

            border-radius: 7px;

            background: #c49b3f;

            color: #fff !important;

            text-decoration: none;

            font-size: 11px;
            font-weight: 700;
        }


        .alliya-input-area {
            padding: 10px;

            border-top:
                1px solid #ece8df;

            background: #fff;
        }


        .alliya-input-row {
            display: flex;
            gap: 7px;
        }


        #alliyaQuery {
            flex: 1;

            min-width: 0;

            resize: none;

            border:
                1px solid #ddd5c5;

            border-radius: 9px;

            padding: 10px;

            outline: none;

            font-family: inherit;
            font-size: 13px;
        }


        #alliyaQuery:focus {
            border-color: #c49b3f;
        }


        .alliya-send {
            border: 0;

            border-radius: 9px;

            padding: 0 13px;

            cursor: pointer;

            background: #c49b3f;
            color: #fff;

            font-weight: 700;
        }


        #alliyaSuggestions {
            display: flex;

            gap: 5px;

            overflow-x: auto;

            padding-top: 7px;
        }


        .alliya-suggestion {
            flex: 0 0 auto;

            border:
                1px solid #e1d8c5;

            border-radius: 20px;

            background: #fff;

            color: #80631e;

            padding: 6px 9px;

            cursor: pointer;

            font-size: 10px;
        }


        @media (max-width: 640px) {

            #alliyaFloatBtn {
                right: 14px;
                bottom: 14px;
            }


            #alliyaModal {
                right: 10px;
                bottom: 82px;

                width:
                    calc(100vw - 20px);

                max-height:
                    calc(100vh - 100px);
            }

        }


        @media (max-width: 400px) {

            #alliyaModal {
                right: 7px;

                width:
                    calc(100vw - 14px);
            }

            #alliyaResponse {
                padding: 12px;
            }

        }

        `;


        document.head.appendChild(style);
    }


    /* ======================================================
       HTML INJECTION
       ====================================================== */

    function killAllExisting() {

        /*
         * Preserve the working v9 cleanup behavior:
         * remove duplicate Alliya instances before injection.
         */

        const selectors = [
            '#alliyaFloatBtn',
            '#alliyaModal'
        ];

        selectors.forEach(selector => {

            document
                .querySelectorAll(selector)
                .forEach(element => {

                    /*
                     * Keep only one instance.
                     */

                    const elements =
                        document.querySelectorAll(selector);

                    if (elements.length > 1) {

                        for (
                            let i = 1;
                            i < elements.length;
                            i++
                        ) {

                            elements[i].remove();
                        }
                    }
                });
        });
    }


    function injectHTML() {

        killAllExisting();


        if (
            !document.getElementById(
                CONFIG.selectors.floatBtn
            )
        ) {

            const button =
                document.createElement('button');

            button.id =
                CONFIG.selectors.floatBtn;

            button.type = 'button';

            button.setAttribute(
                'aria-label',
                'Open Alliya'
            );

            button.innerHTML =
                'AI';

            document.body.appendChild(button);
        }


        if (
            !document.getElementById(
                CONFIG.selectors.modal
            )
        ) {

            const modal =
                document.createElement('div');

            modal.id =
                CONFIG.selectors.modal;

            modal.setAttribute(
                'role',
                'dialog'
            );

            modal.setAttribute(
                'aria-label',
                'Alliya procurement assistant'
            );


            modal.innerHTML = `

                <div class="alliya-header">

                    <div class="alliya-brand">

                        <strong>
                            Alliya
                        </strong>

                        <small>
                            Grains Hub Procurement Intelligence
                        </small>

                    </div>

                    <button
                        type="button"
                        class="alliya-close"
                        id="alliyaClose"
                        aria-label="Close Alliya"
                    >
                        ×
                    </button>

                </div>


                <div id="alliyaResponse">

                    <div class="alliya-message">

                        <strong>
                            Hello. I’m Alliya.
                        </strong>

                        <p>
                            Tell me the grain, variety, origin,
                            processing or quantity you are looking for.
                        </p>

                    </div>

                </div>


                <div class="alliya-input-area">

                    <div class="alliya-input-row">

                        <textarea
                            id="alliyaQuery"
                            rows="2"
                            placeholder="e.g. 25 MT PR106 Golden Sella India"
                        ></textarea>

                        <button
                            type="button"
                            class="alliya-send"
                            id="alliyaSend"
                        >
                            Ask
                        </button>

                    </div>


                    <div id="alliyaSuggestions"></div>

                </div>

            `;


            document.body.appendChild(modal);
        }
    }


    /* ======================================================
       MODAL CONTROL
       ====================================================== */

    function openModal() {

        const modal =
            document.getElementById(
                CONFIG.selectors.modal
            );

        if (!modal) {
            return;
        }

        modal.classList.add(
            'alliya-open'
        );


        const query =
            document.getElementById(
                CONFIG.selectors.query
            );

        if (query) {

            setTimeout(
                () => query.focus(),
                80
            );
        }
    }


    function closeModal() {

        const modal =
            document.getElementById(
                CONFIG.selectors.modal
            );

        if (!modal) {
            return;
        }

        modal.classList.remove(
            'alliya-open'
        );
    }


    /* ======================================================
       ASK ALLIYA
       ====================================================== */

    function askAlliya(query) {

        const response =
            document.getElementById(
                CONFIG.selectors.response
            );


        const clean =
            String(query || '').trim();


        if (!clean) {

            if (response) {

                response.innerHTML =
                    '<div class="alliya-message">' +
                        '<strong>Tell me what you need.</strong>' +
                        '<p>' +
                        'For example: 25 MT PR106 Golden Sella India.' +
                        '</p>' +
                    '</div>';
            }

            return;
        }


        state.lastQuery =
            clean;


        if (!getCanonicalData()) {

            if (response) {

                response.innerHTML =
                    '<div class="alliya-message">' +
                        '<strong>Alliya data is not loaded yet.</strong>' +
                        '<p>' +
                        'Please wait for Grains Hub data to finish loading, ' +
                        'then ask again.' +
                        '</p>' +
                    '</div>';
            }

            return;
        }


        const intent =
            parseIntent(clean);


        const ranked =
            findProducts(intent);


        state.lastResults =
            ranked;


        const built =
            buildResponse(
                clean,
                ranked
            );


        if (response) {

            response.innerHTML =
                '<div class="alliya-message">' +
                    '<strong>' +
                    esc(introFor(intent)) +
                    '</strong>' +
                '</div>' +
                built.html;

            response.scrollTop = 0;
        }


        return built;
    }


    /* ======================================================
       EVENT HANDLERS
       ====================================================== */

    function setupEvents() {

        const floatButton =
            document.getElementById(
                CONFIG.selectors.floatBtn
            );


        if (floatButton) {

            floatButton.addEventListener(
                'click',
                openModal
            );
        }


        const closeButton =
            document.getElementById(
                'alliyaClose'
            );


        if (closeButton) {

            closeButton.addEventListener(
                'click',
                closeModal
            );
        }


        const sendButton =
            document.getElementById(
                'alliyaSend'
            );


        const query =
            document.getElementById(
                CONFIG.selectors.query
            );


        if (sendButton) {

            sendButton.addEventListener(
                'click',
                function () {

                    askAlliya(
                        query
                            ? query.value
                            : ''
                    );
                }
            );
        }


        if (query) {

            query.addEventListener(
                'keydown',
                function (event) {

                    if (
                        event.key === 'Enter' &&
                        !event.shiftKey
                    ) {

                        event.preventDefault();

                        askAlliya(
                            query.value
                        );
                    }
                }
            );
        }


        const suggestions =
            document.getElementById(
                CONFIG.selectors.suggestions
            );


        if (suggestions) {

            suggestions.addEventListener(
                'click',
                function (event) {

                    const button =
                        event.target.closest(
                            '[data-suggestion]'
                        );

                    if (!button) {
                        return;
                    }


                    const text =
                        button.getAttribute(
                            'data-suggestion'
                        );


                    if (query) {
                        query.value = text;
                    }


                    askAlliya(text);
                }
            );
        }


        const response =
            document.getElementById(
                CONFIG.selectors.response
            );


        if (response) {

            response.addEventListener(
                'click',
                function (event) {

                    const button =
                        event.target.closest(
                            '[data-action]'
                        );

                    if (!button) {
                        return;
                    }


                    const action =
                        button.getAttribute(
                            'data-action'
                        );


                    const index =
                        Number(
                            button.getAttribute(
                                'data-index'
                            )
                        );


                    if (
                        action === 'quote' ||
                        action === 'rfq'
                    ) {

                        handleResultAction(
                            action,
                            index
                        );
                    }
                }
            );
        }


        /*
         * Close on Escape.
         */

        document.addEventListener(
            'keydown',
            function (event) {

                if (
                    event.key === 'Escape'
                ) {

                    closeModal();
                }
            }
        );
    }


    /* ======================================================
       DATA READINESS
       ====================================================== */

    function waitForCanonicalData() {

        return new Promise(
            resolve => {

                const started =
                    Date.now();


                function check() {

                    if (
                        getCanonicalData() &&
                        canonicalAll().length
                    ) {

                        state.ready = true;
                        resolve(true);
                        return;
                    }


                    if (
                        Date.now() - started >=
                        CONFIG.dataTimeout
                    ) {

                        resolve(false);
                        return;
                    }


                    setTimeout(
                        check,
                        100
                    );
                }


                check();
            }
        );
    }


    /* ======================================================
       INIT
       ====================================================== */

    async function init() {

        if (state.initialized) {
            return;
        }


        state.initialized = true;


        /*
         * UI is always injected first.

         * This is deliberately independent of data loading,
         * so Alliya never disappears merely because data has
         * not finished loading.
         */

        injectStyles();
        injectHTML();
        renderSuggestions();
        setupEvents();


        /*
         * Canonical data readiness.
         */

        state.loading = true;

        await waitForCanonicalData();

        state.loading = false;


        if (state.ready) {

            state.products =
                canonicalAll()
                    .map(normalizeProduct)
                    .filter(Boolean);

        }


        console.log(
            '[Alliya ' + VERSION + '] initialized',
            {
                canonicalData:
                    !!getCanonicalData(),

                products:
                    state.products.length,

                ready:
                    state.ready
            }
        );
    }


    /* ======================================================
       PUBLIC API
       ====================================================== */

    /*
     * IMPORTANT:
     *
     * Keep window.Alliya exactly available.
     *
     * This is what the v9 UI and existing page integrations
     * expect.
     */

    window.Alliya = {

        ask: askAlliya,

        open: openModal,

        close: closeModal,

        version: VERSION,

        /*
         * Useful for debugging without changing public behavior.
         */

        ready: function () {
            return state.ready;
        },

        data: function () {
            return state.products.slice();
        },

        parseIntent: parseIntent
    };


    /*
     * Optional compatibility namespace.
     *
     * Unlike v9.1, this does NOT replace window.Alliya.
     */

    window.AlliyaUnified = {

        version: VERSION,

        ask: askAlliya,

        parseIntent: parseIntent
    };


    /* ======================================================
       START
       ====================================================== */

    function start() {

        if (
            document.readyState === 'loading'
        ) {

            document.addEventListener(
                'DOMContentLoaded',
                init,
                { once: true }
            );

        } else {

            init();
        }
    }


    start();


})(window, document);
