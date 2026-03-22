'use strict';
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const stemmer   = natural.PorterStemmer;

const PATTERNS = {
  roads:            { kw: ['road','pothole','street damage','broken street','street broken','highway','bridge','flyover','footpath','pavement','tar','asphalt','crack','broken road','speed breaker','lane','avenue','damaged','unsafe road','sarak','sadak','gaddha','pul','veedhi','rastu','गली','सड़क','पुल','फुटपाथ','टूटी सड़क','गड्ढा','क्षतिग्रस्त'], rx: [/pot\s*hole/i,/broken\s*road/i,/road\s*(damage|repair|block|crack|dangerous|unsafe)/i,/bridge\s*(collapse|damage)/i,/street\s*(damage|crack|broken|hole|uneven)/i], w: 1.2 },
  water_supply:     { kw: ['water','pipeline','pipe','leak','tap','borewell','contaminated','no water','water shortage','pani','paani','neer','jala','water board','bore','motor','sump','पानी','नल','बोरवेल','पाइप','रिसाव','पानी की कमी'], rx: [/water\s*(supply|shortage|cut|leak)/i,/no\s*water/i,/pipe\s*(burst|leak|broken)/i,/contaminated\s*water/i], w: 1.0 },
  electricity:      { kw: ['electricity','power','current','electric','transformer','pole','wire','sparking','power cut','outage','voltage','bijli','live wire','fuse','lineman','बिजली','करंट','खंभा','तार','विद्युत','लाइन'], rx: [/power\s*(cut|outage|failure)/i,/no\s*(electricity|power|current)/i,/electric\s*(pole|wire|shock)/i,/live\s*wire/i], w: 1.0 },
  waste_management: { kw: ['garbage','waste','trash','dump','dustbin','litter','dirty','stinking','smell','collection','sweeping','kachra','ganda','safai','dead animal','कचरा','गंदगी','कूड़ा','सफाई','गली'], rx: [/garbage\s*(not|collection|dump|overflow)/i,/not\s*swept/i,/dead\s*animal/i], w: 1.0 },
  drainage:         { kw: ['drain','drainage','blocked','clog','flood','waterlogging','overflow','manhole','open drain','sewer','sewerage','nali','naala','stagnant water','नाली','सीवर','पानी भरा','जलभराव'], rx: [/drain\s*(blocked|clog|overflow)/i,/water\s*(logging|stagnant|flood)/i,/manhole\s*(open|broken)/i], w: 1.0 },
  infrastructure:   { kw: ['building','structure','wall','roof','ceiling','collapse','crack','dangerous','unsafe','encroachment','railing','public toilet','मकान','दीवार','छत','खतरनाक','टूटा हुआ'], rx: [/building\s*(collapse|crack|dangerous)/i,/wall\s*(broken|fallen)/i,/encroachment/i], w: 0.9 },
  parks:            { kw: ['park','garden','playground','bench','swing','slide','grass','overgrown','fallen tree','bagh','udyan','पार्क','बाग','पेड़','खेल का मैदान','घास'], rx: [/park\s*(dirty|broken|maintenance)/i,/tree\s*(fallen|dangerous|blocking)/i], w: 0.9 },
  health:           { kw: ['hospital','doctor','medicine','health','mosquito','dengue','malaria','unhygienic','food safety','contamination','clinic','vaccination','fever','epidemic','अस्पताल','डॉक्टर','बीमार','बुखार','स्वास्थ्य'], rx: [/hospital\s*(not|closed|no\s*doctor)/i,/dengue|malaria|cholera|typhoid/i,/disease\s*(outbreak|spreading)/i], w: 0.9 },
  education:        { kw: ['school','teacher','education','student','classroom','midday meal','textbook','scholarship','anganwadi','स्कूल','शिक्षक','पढ़ाई','छात्र','पढ़ने का कमरा'], rx: [/teacher\s*(absent|not\s*coming)/i,/midday\s*meal/i,/scholarship\s*(not|pending)/i], w: 0.8 },
  public_services:  { kw: ['service','office','certificate','ration','pension','subsidy','corrupt','bribe','aadhaar','voter id','patta','caste certificate','corruption','सेवा','कार्यालय','राशन','पेंशन','भ्रष्टाचार'], rx: [/ration\s*(not|card|shop)/i,/pension\s*(not|delayed)/i,/bribe\s*(demanded|taken)/i], w: 0.8 },
  law_enforcement:  { kw: ['police','crime','theft','robbery','harassment','traffic','accident','illegal','eve teasing','chain snatching','unknown people','suspicious people','trespassing','suspicious activity','intruder','breaking in','burglary','security','danger','threatening','abuse','stalking','पुलिस','अपराध','चोरी','दुर्घटना','यातायात','संदिग्ध','चोर','डकैती'], rx: [/illegal\s*(parking|construction)/i,/eve\s*teasing/i,/chain\s*snatching/i,/unknown\s*people/i,/suspicious\s*(people|activity|person)/i,/trespassing/i], w: 0.8 },
  street_lights:    { kw: ['street light','streetlight','lamp post','light not working','bulb fused','lamp broken','no light at night','सड़क की बत्ती','लैंप','अंधेरा','dark at night'], rx: [/street\s*light\s*(not|broken|off|fused|out|dark)/i,/lamp\s*(broken|not|fused|out)/i,/light\s*not\s*(working|on)/i], w: 1.0 },
  noise_pollution:  { kw: ['noise','loud','loudspeaker','music','honking','disturbing','disturbance','DJ','शोर','लाउड','संगीत','तेज आवाज'], rx: [/noise\s*(pollution|disturbance)/i,/loud\s*(music|speaker)/i], w: 0.8 }
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
  critical: ['emergency','urgent','dangerous','life threatening','accident','death','died','collapse','explosion','fire','flood','electric shock','live wire','ambulance','child','baby','pregnant','bridge collapse','bridge broken','पुल टूट','पुल गिर','पुल ढह','खतरनाक','आपातकाल','जानलेवा','दुर्घटना','मौत','विस्फोट','आग','बाढ़','बिजली का झटका','जीवंत तार'],
  high:     ['no water','power cut','sewage overflow','road blocked','3 days','4 days','5 days','week ago','since yesterday','many days','submerged','overflowing','disease','contaminated','no electricity'],
  medium:   ['broken','damaged','leaking','pothole','garbage','dirty','not working','blocked'],
  low:      ['small','minor','request','suggestion','improvement','not urgent']
};

class NLPClassifier {
  _prep(t) { return (t||'').toLowerCase().replace(/[^\w\s\u0900-\u097f\u0c00-\u0c7f\u0b80-\u0bff]/g,' ').replace(/\s+/g,' ').trim(); }
  _tok(t) { return (tokenizer.tokenize(this._prep(t))||[]).map(w=>stemmer.stem(w)); }

  _scores(text) {
    const pt = this._prep(text);
    const tokens = this._tok(text);
    const scores = {};
    console.log(`   [NLP-Scores] Preprocessed text: "${pt}"`);
    console.log(`   [NLP-Tokens] Tokenized: [${tokens.join(', ')}]`);
    
    for (const [cat, cfg] of Object.entries(PATTERNS)) {
      let s = 0;
      const matched = [];
      
      // Exact keyword matching
      for (const kw of cfg.kw) {
        if (pt.includes(kw)) { 
          s += kw.split(' ').length * 1.5 * cfg.w; 
          matched.push(kw); 
        }
      }
      
      // Regex matching
      for (const rx of cfg.rx) {
        if (rx.test(pt)) { 
          s += 3 * cfg.w; 
          matched.push(rx.toString()); 
        }
      }
      
      // Token-based fallback matching (partial/stemmed keywords)
      // 🔴 SKIP token matching for niche categories (street_lights, electricity, etc) - too generic
      // These categories must match via regex patterns only (explicit intent required)
      const skipTokenMatching = ['street_lights', 'electricity', 'law_enforcement'];
      if (s === 0 && !skipTokenMatching.includes(cat)) {
        const uniqueTokenMatches = new Set();
        const tokenMatched = [];
        for (const kw of cfg.kw) {
          const kwTokens = this._tok(kw);
          for (const token of tokens) {
            if (token.length < 4) continue; // Require at least 4 chars
            for (const kwToken of kwTokens) {
              if (kwToken.length < 4) continue; // Require at least 4 chars for keywords
              // Check if token and kwToken share significant similarity
              if ((token.length > 4 && kwToken.length > 4) && 
                  (token.startsWith(kwToken) || kwToken.startsWith(token))) {
                uniqueTokenMatches.add(kwToken); // Only count unique keywords
                tokenMatched.push(`${token}~${kwToken}`);
                break;
              }
            }
          }
        }
        
        // Only accept token-based match if we found multiple UNIQUE keywords
        if (uniqueTokenMatches.size >= 2) {
          s += 0.3 * cfg.w * uniqueTokenMatches.size; // Score based on unique matches
          tokenMatched.forEach(m => matched.push(m));
        }
      }
      
      scores[cat] = s;
      if (matched.length > 0) {
        console.log(`   ├─ ${cat}: ${s.toFixed(2)} (matched: ${matched.slice(0,3).join(', ')}${matched.length > 3 ? '...' : ''})`);
      }
    }
    return scores;
  }

  detectPriority(text) {
    const pt = this._prep(text);
    
    // Check for explicit critical keywords
    for (const [p, kws] of Object.entries(PRIORITY_KW)) {
      for (const kw of kws) {
        if (pt.includes(kw)) {
          console.log(`[NLP-Priority] Detected ${p} priority from keyword: "${kw}" in text: "${text}"`);
          return p;
        }
      }
    }
    
    // Special case: Bridge infrastructure emergencies
    if ((pt.includes('bridge') || pt.includes('flyover') || pt.includes('pul')) && 
        (pt.includes('broken') || pt.includes('collapse') || pt.includes('damage') || 
         pt.includes('टूट') || pt.includes('गिर') || pt.includes('ढह'))) {
      console.log(`[NLP-Priority] Detected CRITICAL: Bridge infrastructure emergency`);
      return 'critical';
    }
    
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
    
    // Calculate confidence with minimum floor for valid text
    let confidence = 0;
    if (total > 0) {
      confidence = Math.min(max/(total+0.01), 0.99);
    } else if (text.trim().length >= 5) {
      // If no matches found but text is valid, give minimum confidence
      confidence = 0.25;
      best = 'other';
      console.log(`[NLP-Classify] No keyword matches, using default category with min confidence`);
    }
    
    if (max < 0.5 && best !== 'other') {
      // If score is very low, reconsider as 'other'
      confidence = Math.max(confidence, 0.2);
    }
    
    const priority = this.detectPriority(text);
    const d = DEPT[best]||DEPT.other;
    
    // Debug logging
    const topCategories = Object.entries(scores)
      .sort((a,b) => b[1]-a[1])
      .slice(0,3)
      .map(([cat,score]) => `${cat}:${score.toFixed(2)}`)
      .join(' | ');
    console.log(`[NLP-Classify] Input: "${text.substring(0,50)}..." | Top scores: ${topCategories} | Selected: ${best} | Confidence: ${(confidence*100).toFixed(2)}% | Priority: ${priority}`);
    
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
