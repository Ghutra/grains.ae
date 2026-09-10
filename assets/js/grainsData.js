/* Grains Hub — grainsData.js v1.0 — LADY STARK
   Canonical commercial data layer. Source of truth: /assets/data/stock.json.
   Missing FOB/freight/CIF/premium/spec values are NEVER invented.
*/
(function(window){
'use strict';
const CONFIG={STOCK_URL:'/assets/data/stock.json',CACHE_TTL_MS:300000};
const BASIS={FOB_ORIGIN:'FOB_ORIGIN',CIF_DUBAI:'CIF_DUBAI',DUBAI_STOCK:'DUBAI_STOCK'};
const PACKING={STANDARD_PP:'STANDARD_PP',CUSTOM_NONWOVEN:'CUSTOM_NONWOVEN'};
const state={products:[],loadedAt:0,source:null};
function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(/,/g,'').replace(/[^\d.-]/g,''));return Number.isFinite(n)?n:null}
function txt(v){return v==null?'':String(v).trim()}
function first(item,keys){for(const k of keys){const n=num(item[k]);if(n!==null)return n}return null}
function weight(v){const s=txt(v).toLowerCase().replace(/,/g,'');const m=s.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|mt|ton|tonne|tonnes)\b/);if(!m)return null;const n=Number(m[1]);return /mt|ton|tonne/.test(m[2])?n*1000:n}
function pkgKg(x){return first(x,['packageKg','packagingKg','bagWeightKg','weightKg'])??weight(x.size)??weight(x.packaging)}
function currency(x){const e=txt(x.currency||x.priceCurrency).toUpperCase();if(e==='AED'||e==='USD')return e;const p=txt(x.price);if(/\bUSD\b|\$/.test(p))return'USD';if(/\bAED\b|د\.?\s*إ/.test(p))return'AED';return null}
function availability(x){const a=txt(x.availability||x.status||x.stockStatus).toLowerCase();if(x.isBooking===true||x.booking===true||/booking|pre[\s-]?booking|on[\s-]?request/.test(a))return'BOOKING';if(/out[\s-]?of[\s-]?stock|sold[\s-]?out|unavailable/.test(a))return'OUT_OF_STOCK';if(/available|in[\s-]?stock|ready/.test(a))return'IN_STOCK';if(first(x,['stockQuantityMT','quantityMT','availableMT'])!==null||/\bbags?\b|\bmt\b|\btonnes?\b/i.test(txt(x.stock)))return'IN_STOCK';return'UNKNOWN'}
function priceUnit(x,c){const e=txt(x.priceUnit||x.unit).toUpperCase();if(/MT|TON/.test(e))return'MT';if(/KG/.test(e))return'KG';if(/BAG|PACKAGE|PACK/.test(e))return'PACKAGE';const p=txt(x.price).toUpperCase();if(/\/?\s*(MT|TON|TONNE|TONNES)\b/.test(p))return'MT';if(/\/?\s*KG\b/.test(p))return'KG';if(c==='USD')return'MT';return'PACKAGE'}
function basis(x,c,a){const b=txt(x.priceBasis||x.basis||x.tradeBasis).toUpperCase();if(/CIF|CFR|C&F/.test(b))return BASIS.CIF_DUBAI;if(/FOB/.test(b))return BASIS.FOB_ORIGIN;if(/DUBAI.?STOCK|LOCAL|STOCK/.test(b))return BASIS.DUBAI_STOCK;if(c==='AED'&&a!=='BOOKING')return BASIS.DUBAI_STOCK;return null}
function stockMT(x,kg){const e=first(x,['stockQuantityMT','quantityMT','availableMT']);if(e!==null)return e;const b=first(x,['stockBags','bagCount','quantityBags']);if(b!==null&&kg!==null)return b*kg/1000;const m=txt(x.stock).match(/([\d,.]+)\s*bags?/i);return m&&kg!==null?num(m[1])*kg/1000:null}
function normalize(x,i){const c=currency(x),a=availability(x),u=priceUnit(x,c),kg=pkgKg(x),p=first(x,['price','currentPrice','spotPrice']);let pk=null,pm=null;if(p!==null){if(u==='KG'){pk=p;pm=p*1000}else if(u==='MT'){pm=p;pk=p/1000}else if(u==='PACKAGE'&&kg){pk=p/kg;pm=pk*1000}}return{
id:txt(x.id||x.sku)||`grain-${i}`,name:txt(x.name||x.product||x.title),origin:txt(x.origin||x.country||x.source),
supplier:txt(x.supplier||x.supplierName),supplierTier:txt(x.supplierTier||x.badge||x.tier),
grainType:txt(x.grainType||x.type||x.category),grade:txt(x.grade),packaging:txt(x.packaging||x.pack||x.package),packageKg:kg,
availability:a,rawStock:x.stock??null,stockBags:first(x,['stockBags','bagCount','quantityBags']),stockMT:stockMT(x,kg),
currency:c,price:p,priceUnit:u,priceBasis:basis(x,c,a),pricePerKg:pk,pricePerMT:pm,
fobUSDPerMT:first(x,['fobUSDPerMT','fobPriceUSDPerMT']),freightUSDPerMT:first(x,['freightUSDPerMT','freightPerMT','oceanFreightUSDPerMT']),
cifDubaiUSDPerMT:first(x,['cifDubaiUSDPerMT','cifUSDPerMT']),
customNonwovenPremiumUSDPerMT:first(x,['customNonwovenPremiumUSDPerMT','customPackingPremiumUSDPerMT','packingPremiumUSDPerMT']),
trend:first(x,['trendChange','trendPercent','dailyChangePercent']),updatedAt:x.updatedAt||x.lastUpdated||x.timestamp||null,
image:txt(x.img||x.image||x.imageUrl),keywords:Array.isArray(x.keywords)?x.keywords:[],raw:x}}
async function load(force){if(!force&&state.loadedAt&&Date.now()-state.loadedAt<CONFIG.CACHE_TTL_MS)return state.products.slice();const r=await fetch(CONFIG.STOCK_URL+'?_='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('stock.json HTTP '+r.status);const j=await r.json();const raw=Array.isArray(j)?j:(Array.isArray(j.products)?j.products:Array.isArray(j.items)?j.items:[]);if(!Array.isArray(raw))throw Error('Unsupported stock.json structure');state.products=raw.map(normalize);state.loadedAt=Date.now();state.source=CONFIG.STOCK_URL;return state.products.slice()}
function customPackingPrice(p){return p&&p.fobUSDPerMT!==null&&p.customNonwovenPremiumUSDPerMT!==null?p.fobUSDPerMT+p.customNonwovenPremiumUSDPerMT:null}
function cifPrice(p,packing){if(!p)return null;const f=packing===PACKING.CUSTOM_NONWOVEN?customPackingPrice(p):p.fobUSDPerMT;if(f!==null&&p.freightUSDPerMT!==null)return f+p.freightUSDPerMT;return p.cifDubaiUSDPerMT}
function formatPrice(p){if(!p||p.price===null)return'Price on request';if(p.priceUnit==='MT')return`${p.currency||''} ${p.price.toLocaleString(undefined,{maximumFractionDigits:2})} / MT`;if(p.priceUnit==='KG')return`${p.currency||''} ${p.price.toLocaleString(undefined,{maximumFractionDigits:4})} / kg`;if(p.packageKg)return`${p.currency||''} ${p.price.toLocaleString(undefined,{maximumFractionDigits:2})} / ${p.packageKg}kg`;return`${p.currency||''} ${p.price.toLocaleString(undefined,{maximumFractionDigits:2})}`}
window.GrainsHubData={version:'1.0',CONFIG,BASIS,PACKING,load,normalize,all:()=>state.products.slice(),inStock:()=>state.products.filter(p=>p.availability==='IN_STOCK'),booking:()=>state.products.filter(p=>p.availability==='BOOKING'),customPackingPrice,cifPrice,formatPrice,get state(){return{...state,products:state.products.slice()}}};
})(window);
