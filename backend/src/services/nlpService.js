'use strict';
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const stemmer   = natural.PorterStemmer;

const PATTERNS = {
  roads:            { kw: ['road','pothole','street','highway','bridge','flyover','footpath','pavement','tar','asphalt','crack','broken road','speed breaker','sarak','sadak','gaddha','pul','veedhi','rastu'], rx: [/pot\s*hole/i,/broken\s*road/i,/road\s*(damage|repair|block)/i,/bridge\s*(collapse|damage)/i], w: 1.0 },
  water_supply:     { kw: ['water','pipeline','pipe','leak','tap','borewell','contaminated','no water','water shortage','pani','paani','neer','jala','water board','bore','motor','sump'], rx: [/water\s*(supply|shortage|cut|leak)/i,/no\s*water/i,/pipe\s*(burst|leak|broken)/i,/contaminated\s*water/i], w: 1.0 },
  electricity:      { kw: ['electricity','power','current','electric','transformer','pole','wire','sparking','power cut','outage','voltage','bijli','street light','live wire','fuse','lineman'], rx: [/power\s*(cut|outage|failure)/i,/no\s*(electricity|power|current)/i,/electric\s*(pole|wire|shock)/i,/street\s*light/i,/live\s*wire/i], w: 1.0 },
  waste_management: { kw: ['garbage','waste','trash','dump','dustbin','litter','dirty','stinking','smell','collection','sweeping','kachra','ganda','safai','dead animal'], rx: [/garbage\s*(not|collection|dump|overflow)/i,/not\s*swept/i,/dead\s*animal/i], w: 1.0 },
  drainage:         { kw: ['drain','drainage','blocked','clog','flood','waterlogging','overflow','manhole','open drain','sewer','sewerage','nali','naala','stagnant water'], rx: [/drain\s*(blocked|clog|overflow)/i,/water\s*(logging|stagnant|flood)/i,/manhole\s*(open|broken)/i], w: 1.0 },
  infrastructure:   { kw: ['building','structure','wall','roof','ceiling','collapse','crack','dangerous','unsafe','encroachment','railing','public toilet'], rx: [/building\s*(collapse|crack|dangerous)/i,/wall\s*(broken|fallen)/i,/encroachment/i], w: 0.9 },
  parks:            { kw: ['park','garden','playground','tree','bench','swing','slide','grass','overgrown','fallen tree','bagh','udyan'], rx: [/park\s*(dirty|broken|maintenance)/i,/tree\s*(fallen|dangerous|blocking)/i], w: 0.9 },
  health:           { kw: ['hospital','doctor','medicine','health','mosquito','dengue','malaria','unhygienic','food safety','contamination','clinic','vaccination','fever','epidemic'], rx: [/hospital\s*(not|closed|no\s*doctor)/i,/dengue|malaria|cholera|typhoid/i,/disease\s*(outbreak|spreading)/i], w: 0.9 },
  education:        { kw: ['school','teacher','education','student','classroom','midday meal','textbook','scholarship','anganwadi'], rx: [/teacher\s*(absent|not\s*coming)/i,/midday\s*meal/i,/scholarship\s*(not|pending)/i], w: 0.8 },
  public_services:  { kw: ['service','office','certificate','ration','pension','subsidy','corrupt','bribe','aadhaar','voter id','patta','caste certificate','corruption'], rx: [/ration\s*(not|card|shop)/i,/pension\s*(not|delayed)/i,/bribe\s*(demanded|taken)/i], w: 0.8 },
  law_enforcement:  { kw: ['police','crime','theft','robbery','harassment','traffic','accident','illegal','eve teasing','dark road','chain snatching'], rx: [/illegal\s*(parking|construction)/i,/eve\s*teasing/i,/chain\s*snatching/i], w: 0.8 },
  street_lights:    { kw: ['street light','streetlight','lamp post','dark road','light not working','bulb fused','lamp broken','no light at night'], rx: [/street\s*light\s*(not|broken|off|fused)/i,/dark\s*(road|area)/i], w: 1.1 },
  noise_pollution:  { kw: ['noise','loud','loudspeaker','music','honking','disturbing','disturbance','DJ'], rx: [/noise\s*(pollution|disturbance)/i,/loud\s*(music|speaker)/i], w: 0.8 }
};

const DEPT = {
  roads:            { code:'PWD',   name:'Public Works Department (PWD Delhi)',      reason:'Roads, bridges and infrastructure managed by PWD' },
  infrastructure:   { code:'PWD',   name:'Public Works Department (PWD Delhi)',      reason:'Building and structural issues handled by PWD' },
  water_supply:     { code:'DJB',   name:'Delhi Jal Board (DJB)',                    reason:'Water supply and pipeline issues handled by Delhi Jal Board' },
  drainage:         { code:'DJB',   name:'Delhi Jal Board (DJB)',                    reason:'Drainage and sewage handled by Delhi Jal Board' },
  electricity:      { code:'BSES',  name:'BSES / TPDDL — Electricity Distribution', reason:'Power supply issues managed by BSES/TPDDL' },
  street_lights:    { code:'NDMC',  name:'New Delhi Municipal Council (NDMC)',       reason:'Street lights managed by NDMC' },
  waste_management: { code:'MCD',   name:'Municipal Corporation of Delhi (MCD)',     reason:'Garbage collection managed by MCD' },
  parks:            { code:'PRD',   name:'Parks & Garden Society — Delhi',           reason:'Parks and gardens maintained by Parks & Garden Society' },
  health:           { code:'HFW',   name:'Health & Family Welfare — Delhi',          reason:'Health concerns handled by Health & Family Welfare' },
  education:        { code:'EDU',   name:'Directorate of Education — Delhi',         reason:'School issues handled by Directorate of Education' },
  public_services:  { code:'MCD',   name:'Municipal Corporation of Delhi (MCD)',     reason:'Govt service issues handled by MCD' },
  law_enforcement:  { code:'DPOL',  name:'Delhi Police',                             reason:'Safety issues handled by Delhi Police' },
  noise_pollution:  { code:'DPOL',  name:'Delhi Police',                             reason:'Noise violations handled by Delhi Police' },
  other:            { code:'MCD',   name:'Municipal Corporation of Delhi (MCD)',     reason:'General civic issues routed to MCD' }
};

const SLA_BASE = { electricity:12, water_supply:18, drainage:24, waste_management:24, roads:48, street_lights:36, health:24, law_enforcement:12, infrastructure:72, parks:96, education:96, public_services:120, noise_pollution:48, other:72 };
const PRIORITY_FACTOR = { critical:0.25, high:0.5, medium:0.75, low:1.0 };
const PRIORITY_KW = {
  critical: ['emergency','urgent','dangerous','life threatening','accident','death','died','collapse','explosion','fire','flood','electric shock','live wire','ambulance','child','baby','pregnant'],
  high:     ['no water','power cut','sewage overflow','road blocked','3 days','4 days','5 days','week ago','since yesterday','many days','submerged','overflowing','disease','contaminated','no electricity'],
  medium:   ['broken','damaged','leaking','pothole','garbage','dirty','not working','blocked'],
  low:      ['small','minor','request','suggestion','improvement','not urgent']
};

class NLPClassifier {
  _prep(t) { return (t||'').toLowerCase().replace(/[^\w\s\u0900-\u097f\u0c00-\u0c7f\u0b80-\u0bff]/g,' ').replace(/\s+/g,' ').trim(); }
  _tok(t) { return (tokenizer.tokenize(this._prep(t))||[]).map(w=>stemmer.stem(w)); }

  _scores(text) {
    const pt = this._prep(text);
    const scores = {};
    for (const [cat, cfg] of Object.entries(PATTERNS)) {
      let s = 0;
      for (const kw of cfg.kw) if (pt.includes(kw)) s += kw.split(' ').length * 1.5 * cfg.w;
      for (const rx of cfg.rx) if (rx.test(pt)) s += 3 * cfg.w;
      scores[cat] = s;
    }
    return scores;
  }

  detectPriority(text) {
    const pt = this._prep(text);
    for (const [p, kws] of Object.entries(PRIORITY_KW))
      for (const kw of kws) if (pt.includes(kw)) return p;
    return 'low';
  }

  detectSentiment(text) {
    const pt = this._prep(text); let s = 0;
    for (const w of ['pathetic','disgusting','terrible','worst','corrupt','useless']) if (pt.includes(w)) s-=2;
    for (const w of ['bad','angry','frustrated']) if (pt.includes(w)) s-=1;
    for (const w of ['thank','appreciate','good','resolved','better']) if (pt.includes(w)) s+=1;
    return s<=-3?'very_negative':s<0?'negative':s>0?'positive':'neutral';
  }

  extractKeywords(text) {
    const tfidf = new natural.TfIdf();
    tfidf.addDocument(this._prep(text));
    const stop = new Set(['the','and','for','are','not','was','has','this','that','with','from','they','have']);
    const kws = [];
    tfidf.listTerms(0).forEach(item => { if (item.term.length>2&&!stop.has(item.term)&&kws.length<8) kws.push(item.term); });
    return kws;
  }

  getSubCategory(cat, text) {
    const m = {
      roads:{ pothole:/pot.?hole/i, road_damage:/broken|crack/i, bridge:/bridge|flyover/i },
      water_supply:{ no_supply:/no water|water cut/i, leakage:/leak/i, contamination:/dirty|contaminated/i },
      electricity:{ power_outage:/power cut|no electricity/i, transformer:/transformer/i, street_light:/street light/i, live_wire:/live wire/i },
      drainage:{ blockage:/blocked|clog/i, flooding:/flood|waterlog/i }
    };
    if (m[cat]) for (const [s,rx] of Object.entries(m[cat])) if (rx.test(text)) return s;
    return null;
  }

  generateTitle(desc, cat) {
    const sentences = (desc||'').replace(/\n+/g,'. ').split(/[.!?]/);
    let t = (sentences[0]||'').trim();
    if (t.length>100) t=t.substring(0,97)+'...';
    t = t.charAt(0).toUpperCase()+t.slice(1);
    if (!t||t.length<5) {
      const lbl = { roads:'Road Damage Report', water_supply:'Water Supply Issue', electricity:'Power Outage', waste_management:'Garbage Issue', drainage:'Drainage Problem', infrastructure:'Infrastructure Issue', parks:'Park Issue', health:'Health Concern', education:'Education Issue', public_services:'Govt Service Issue', street_lights:'Street Light Problem', law_enforcement:'Safety Issue', noise_pollution:'Noise Complaint', other:'Civic Complaint' };
      t = lbl[cat] || 'Civic Complaint';
    }
    return t;
  }

  calculateSLA(cat, priority, text) {
    const base = SLA_BASE[cat]||72;
    const f = PRIORITY_FACTOR[priority]||1.0;
    const pt = this._prep(text||'');
    let u = 1.0;
    if (['emergency','accident','collapse','fire','flood','electric shock','live wire','death'].some(w=>pt.includes(w))) u=0.4;
    const dm = pt.match(/(\d+)\s*day/);
    if (dm) { const d=parseInt(dm[1]); if(d>=7) u=Math.min(u,0.5); else if(d>=3) u=Math.min(u,0.7); }
    return Math.max(6, Math.min(Math.round(base*f*u), 240));
  }

  classify(text) {
    if (!text||text.trim().length<3) {
      const d=DEPT.other;
      return { category:'other', confidence:0, priority:'low', sentiment:'neutral', keywords:[], subCategory:null, deptCode:d.code, deptName:d.name, deptExplanation:d.reason, slaHours:72 };
    }
    const scores = this._scores(text);
    let best='other', max=0, total=0;
    for (const [cat,s] of Object.entries(scores)) { total+=s; if(s>max){max=s;best=cat;} }
    const confidence = total>0 ? Math.min(max/(total+0.01),0.99) : 0;
    if (max<1) best='other';
    const priority = this.detectPriority(text);
    const d = DEPT[best]||DEPT.other;
    return {
      category:best, confidence:parseFloat(confidence.toFixed(4)), priority,
      sentiment:this.detectSentiment(text), keywords:this.extractKeywords(text),
      subCategory:this.getSubCategory(best,text),
      deptCode:d.code, deptName:d.name, deptExplanation:d.reason,
      slaHours:this.calculateSLA(best,priority,text)
    };
  }

  geoDistance(la1,lo1,la2,lo2) {
    const R=6371000, dLat=(la2-la1)*Math.PI/180, dLon=(lo2-lo1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  textSim(t1,t2) {
    const s1=new Set(this._tok(t1)), s2=new Set(this._tok(t2));
    const inter=new Set([...s1].filter(x=>s2.has(x))), union=new Set([...s1,...s2]);
    return union.size>0?inter.size/union.size:0;
  }

  isDuplicate(c1,c2,geo=500,sim=0.25) {
    if (c1.category!==c2.category) return false;
    const near = (c1.latitude&&c1.longitude&&c2.latitude&&c2.longitude)
      ? this.geoDistance(+c1.latitude,+c1.longitude,+c2.latitude,+c2.longitude)<=geo : false;
    return near && this.textSim(`${c1.title} ${c1.description}`,`${c2.title} ${c2.description}`)>=sim;
  }
}

module.exports = new NLPClassifier();
