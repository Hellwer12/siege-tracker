// v6.0 - 2026-06-08T19:35:52.649548
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ─── SUPABASE ───────────────────────────────────────────────────────────── */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function dbLoad(){
  const { data, error } = await sb.rpc("get_all_combats");
  if(error) throw new Error(error.message);
  return (data||[]).map(r=>({
    id:r.id, joueur:r.joueur||"", membreGuilde:r.joueur||"",
    offense:r.offense||"", defense:r.defense||"",
    offenseRaw:r.offense||"", defenseRaw:r.defense||"",
    resultat:r.resultat||"", victoire:r.victoire||"", defaite:r.defaite||"",
    session:r.session||"", date:r.date||"",
    joueurAdverse:r.joueur_adverse||"", guildeAdverse:r.guilde_adverse||"",
  }));
}
async function dbReplace(rows){
  const { error:e } = await sb.from("combats").delete().gte("id",0);
  if(e) throw new Error(e.message);
  const B=500;
  for(let i=0;i<rows.length;i+=B){
    const { error } = await sb.from("combats").insert(
      rows.slice(i,i+B).map(r=>({
        joueur:r.joueur||"", offense:r.offense||"", defense:r.defense||"",
        resultat:r.resultat||"", victoire:r.victoire||"", defaite:r.defaite||"",
        session:r.session||"", date:r.date||"",
        joueur_adverse:r.joueurAdverse||"", guilde_adverse:r.guildeAdverse||"",
      }))
    );
    if(error) throw new Error(error.message);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   TOKENS
══════════════════════════════════════════════════════════════════════════ */
const T={
  bg:"#06060A", s1:"#0E0E14", s2:"#14141C", s3:"#1C1C26", s4:"#242430",
  line:"rgba(255,255,255,0.08)", lineM:"rgba(255,255,255,0.14)",
  ink1:"#EEEAE0", ink2:"rgba(238,234,224,0.68)", ink3:"rgba(238,234,224,0.40)",
  indigo:"#6366F1", indigoDim:"rgba(99,102,241,0.11)", indigoMid:"rgba(99,102,241,0.26)",
  indigoGlow:"0 0 20px rgba(99,102,241,0.18),0 0 5px rgba(99,102,241,0.09)",
  green:"#10B981", greenDim:"rgba(16,185,129,0.11)",
  red:"#EF4444",   redDim:"rgba(239,68,68,0.11)",
  amber:"#F59E0B", amberDim:"rgba(245,158,11,0.10)", amberMid:"rgba(245,158,11,0.22)",
};
const FONT=`'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif`;
const EASE="cubic-bezier(0.4,0,0.2,1)";

/* ══════════════════════════════════════════════════════════════════════════
   MONSTER IMAGES — chargées depuis Supabase (table monsters)
   Cache en mémoire : Map nom → image_url
══════════════════════════════════════════════════════════════════════════ */

// Cache global chargé une seule fois au démarrage
let MONSTER_CACHE = new Map(); // name → {image_url, element}
let MONSTER_CACHE_LOADED = false;

async function loadMonsterCache(){
  if(MONSTER_CACHE_LOADED) return;
  try{
    const { data } = await sb.from("monsters").select("name,image_url,element");
    if(data) data.forEach(m => MONSTER_CACHE.set(m.name, {
      image_url: m.image_url,
      element:   m.element||null,
    }));
    MONSTER_CACHE_LOADED = true;
  }catch(e){
    console.warn("Monster cache load failed:", e.message);
  }
}

function monsterElement(name){
  return MONSTER_CACHE.get(name)?.element || null;
}

// Éléments SW et leurs couleurs
const ELEM_COLOR={
  Fire:"#EF4444", Water:"#3B82F6", Wind:"#22C55E",
  Light:"#EAB308", Dark:"#A855F7",
};
const ELEM_ICON={Fire:"🔥",Water:"💧",Wind:"💨",Light:"⭐",Dark:"🌑"};

// Contre-élément : ce qui bat quoi
const COUNTER_ELEM={Fire:"Water", Water:"Wind", Wind:"Fire"};
// Même famille élémentaire (substituts potentiels)
const SAME_ELEM_GROUP=[
  ["Fire"],["Water"],["Wind"],["Light","Dark"],
];
function sameElemGroup(e1,e2){
  if(!e1||!e2)return false;
  return SAME_ELEM_GROUP.some(g=>g.includes(e1)&&g.includes(e2));
}

function monsterImg(name){
  return MONSTER_CACHE.get(name)?.image_url || null;
}

// Hook pour accéder au cache dans les composants
function useMonsterImg(name){
  const [url, setUrl] = useState(()=>MONSTER_CACHE.get(name)?.image_url||null);
  useEffect(()=>{
    if(!url && MONSTER_CACHE_LOADED) setUrl(MONSTER_CACHE.get(name)?.image_url||null);
  },[name]);
  return url;
}

// Chip monstre avec image depuis Supabase
function MonsterChip({name, size=22}){
  const img = useMonsterImg(name);
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:5,
      background:T.s3,borderRadius:6,padding:"3px 8px 3px 4px",fontSize:11,color:T.ink2}}>
      {img
        ?<img src={img} alt={name} loading="lazy"
            style={{width:size,height:size,borderRadius:3,objectFit:"cover",flexShrink:0}}
            onError={e=>{e.target.style.display="none";}}/>
        :<span style={{width:size,height:size,borderRadius:3,background:T.s4,
            display:"inline-block",flexShrink:0}}/>
      }
      {name}
    </span>
  );
}

// Extrait les noms de monstres depuis la version RAW (ordre original)
// Algorithme : teste du plus long au plus court dans le cache Supabase
function extractMonsterNames(compoRaw){
  if(!compoRaw)return[];
  const words = compoRaw.trim().split(/\s+/).filter(w=>w.length>=1);
  const result = [];
  let i = 0;
  while(i < words.length){
    let matched = false;
    // Teste quadrigramme → trigramme → bigramme → mot seul
    for(let len = Math.min(4, words.length-i); len >= 1; len--){
      const candidate = words.slice(i, i+len).join(" ");
      if(len === 1 || MONSTER_CACHE.has(candidate)){
        result.push(candidate);
        i += len;
        matched = true;
        break;
      }
    }
    if(!matched){ i++; }
  }
  return result;
}

// Affiche les monstres d'une compo (version RAW) sous forme de chips
function CompoChips({compo,size=20}){
  if(!compo)return null;
  const names = extractMonsterNames(compo);
  if(!names.length)return null;
  return(
    <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
      {names.map(n=><MonsterChip key={n} name={n} size={size}/>)}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════
   i18n — Toggle FR / EN
══════════════════════════════════════════════════════════════════════════ */
const LANG={
  fr:{
    tabs:["Contre-pick","Analyse","Guilde",t("detailTitle")],
    tabIds:["counterpick","analyse","guilde","combat"],
    counterpick:"Contre-pick",
    cpSub:"Défense adverse → meilleures offenses à jouer",
    cpLive:"Live ·",
    defMode:"Défense complète",
    monMode:"Par monstre",
    wrMin:"WR≥", attMin:"Att≥",
    placeholder_compo:"Défense adverse (ex: Amber Tarnisha…)",
    placeholder_mon:"Monstre(s) clés (ex: Tarnisha Amber)",
    directResults:"Résultats directs",
    directSub:"offenses validées contre cette défense exacte",
    elemResults:"Axes de réflexion",
    elemSub:"défenses similaires par archétype · même élément ou contre-élément",
    noResult:"Aucun résultat — essaie un nom partiel, baisse WR min ou Att min",
    noElem:"Charge les images pour activer la recherche élargie",
    others:"Autres options",
    reliability:"Fiabilité",
    import:"↑ Import",
    live:"⚔ Live",
    analyse:"Analyse",
    topOff:t("topOffTitle"),
    topDef:t("topDefTitle"),
    worstDef:t("worstTitle"),
    clusters:"Clusters de défenses",
    depth:"Profondeur",
    combats:"combats",
    winRate:"Win Rate",
    victories:"V", defeats:"D", attacks:t("attacks2"),
    click_off:"clic → défenses rencontrées",
    click_def:"clic → meilleures offenses",
    // Guilde
    members:t("members"), rivalries:t("rivalries"),
    ranking:t("ranking"), minAtt:"min", attacks2:t("attacks2"),
    searchPlayer:"Rechercher un pseudo…",
    searchGuild:"Rechercher une guilde…",
    noGuild:"Aucune guilde trouvée",
    matchups:"Matchs", victories2:"Victoires", defeats2:"Défaites",
    defsUsed:t("defsUsed"),
    hardDefs:t("hardDefs"),
    offenses:t("offenses"),
    // Analyse
    topOffTitle:t("topOffTitle"),
    topDefTitle:t("topDefTitle"),
    worstTitle:t("worstTitle"),
    worstSub:t("worstSub"),
    worstOff:t("worstOff"),
    noVictory:"Aucune victoire enregistrée",
    depth2:"Profondeur", combats2:"combats",
    // Détail combat
    detailTitle:t("detailTitle"),
    allSessions:t("allSessions"),
    allPlayers:t("allPlayers"),
    allResults:t("allResults"),
    victory:"Victoire", defeat:"Défaite",
    session:"Session", player:"Joueur",
    opponent:"Adversaire", offense2:"Offense",
    defense2:"Défense", result:"Résultat",
    guildAdv:"Guilde adv.",
    addCombat:"+ Saisir", export:"↓ Export",
  },
  en:{
    tabs:["Counter-pick","Analysis","Guild","Combat log"],
    tabIds:["counterpick","analyse","guilde","combat"],
    counterpick:"Counter-pick",
    cpSub:"Enemy defense → best offenses to play",
    cpLive:"Live ·",
    defMode:"Full defense",
    monMode:"By monster",
    wrMin:"WR≥", attMin:"Att≥",
    placeholder_compo:"Enemy defense (e.g. Amber Tarnisha…)",
    placeholder_mon:"Key monster(s) (e.g. Tarnisha Amber)",
    directResults:"Direct results",
    directSub:"offenses validated against this exact defense",
    elemResults:"Lines of thought",
    elemSub:"similar defenses by archetype · same or counter-element",
    noResult:"No results — try a partial name, lower WR min or Att min",
    noElem:"Load images to enable expanded search",
    others:"Other options",
    reliability:"Reliability",
    import:"↑ Import",
    live:"⚔ Live",
    analyse:"Analysis",
    topOff:"Guild Top Offenses",
    topDef:"Top Defenses encountered",
    worstDef:"Defenses that beat us",
    clusters:"Defense clusters",
    depth:"Depth",
    combats:"combats",
    winRate:"Win Rate",
    victories:"W", defeats:"L", attacks:t("attacks2"),
    click_off:"click → defenses encountered",
    click_def:"click → best offenses",
    // Guild
    members:"Members", rivalries:"Rivalries",
    ranking:"Ranking", minAtt:"min", attacks2:t("attacks2"),
    searchPlayer:"Search a player…",
    searchGuild:"Search a guild…",
    noGuild:"No guild found",
    matchups:"Matches", victories2:"Victories", defeats2:"Defeats",
    defsUsed:"Most used defenses",
    hardDefs:"Hard defenses",
    offenses:t("offenses"),
    // Analysis
    topOffTitle:"Guild Top Offenses",
    topDefTitle:"Top Defenses encountered",
    worstTitle:"Defenses that beat us",
    worstSub:"weighted volume+rate · min 3 att · click → winning offenses",
    worstOff:"Winning offenses against this defense",
    noVictory:"No victory recorded",
    depth2:"Depth", combats2:"combats",
    // Combat log
    detailTitle:"Combat log",
    allSessions:"All sessions",
    allPlayers:"All players",
    allResults:"All results",
    victory:"Victory", defeat:"Defeat",
    session:"Session", player:"Player",
    opponent:"Opponent", offense2:"Offense",
    defense2:"Defense", result:"Result",
    guildAdv:"Enemy guild",
    addCombat:"+ Add", export:"↓ Export",
  },
};
// Context global de langue
let CURRENT_LANG="fr";
function t(key){ return LANG[CURRENT_LANG][key]||key; }

/* ══════════════════════════════════════════════════════════════════════════
   DEMO DATA
══════════════════════════════════════════════════════════════════════════ */
const OFFENSES=["Ian Mihyang Yeonhong","Jeogun Seara Sonia","Elucia Loren Mimirr","Aaliyah Feng Velajuel Yan","Adriana Mihyang Rigna","Harmonia Nora Rica","Ariel Feng Rakan Yan","Chilling Mihyang Mork","Isillen Kinki Tetra","Carcano Shamann Tetra","Jultan Malite Tetra","Ashour Kumar Racuni","Betta Hwadam Misty","Kumar Parjanya Shahat","Akroma Racuni Veromos","Ashour Racuni Veromos","Cayde Juno Lucia","Camilla Riley Tesarion","Angela Aya Leo Wind","Betta Platy Shihwa"];
const DEFENSES=["Amber Tarnisha Triton","Amber Tarnisha Woonsa","Fiona Fuuki Orion","Driana Fiona Lora","Berghild Layla Tarnisha","Hraesvelg Iris Solveig","Jaara Mimirr Triton","Guillaume Morris Orion","Driana Eshir Fiona","Shahat Tarnisha Theomars","Dark Lora Maximilian Werner","Driana Lora Maximilian","Lora Tarnisha Xiana","Lamiella Platy Shahat","Lamiella Mimirr Triton","Fiona Orion Fuuki","Tarnisha Berghild Layla","Celestara Tarnisha Triton","Nephthys Triton Amber","Tarnisha Woonsa Amber"];
const PLAYERS=["Syrus","Aeryon","Silver","Chef-kebabier","Dohming","GZ-Ço6","Rox","Baxter","Nyla","Zeph"];
const GUILDS=["Ascensiøn","PinkVoid","ShadowFist","IronWolves","VoidWalkers"];
const SESSIONS=["S-01","S-02","S-03","S-04","S-05","S-06","S-07","S-08"];

function genData(){
  const r=[];
  for(let i=0;i<320;i++){
    const p=PLAYERS[i%PLAYERS.length];
    const off=OFFENSES[Math.floor(Math.random()*OFFENSES.length)];
    const def=DEFENSES[Math.floor(Math.random()*DEFENSES.length)];
    const win=Math.random()<0.40+Math.random()*0.28;
    r.push({id:i,joueur:p,membreGuilde:p,offense:off,defense:def,
      victoire:win?"Oui":"",defaite:win?"":"Oui",resultat:win?"Victoire":"Défaite",
      guildeAdverse:GUILDS[Math.floor(Math.random()*GUILDS.length)],
      joueurAdverse:"Adv"+Math.floor(Math.random()*20),
      session:SESSIONS[Math.floor(i/40)],
      date:new Date(2025,0,1+Math.floor(i/5)).toISOString().split("T")[0]});
  }
  return r;
}
const DEMO_DATA=genData();

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════════ */
const wr=(w,t)=>t?Math.round((w/t)*100):0;

// Wilson score — fiabilité statistique (favorise 2V-0D vs 1V-0D)
const wilson=(w,t)=>{
  if(!t)return 0;
  const p=w/t,z=1.65;
  return(p+z*z/(2*t)-z*Math.sqrt((p*(1-p)+z*z/(4*t))/t))/(1+z*z/t);
};

// Score pondéré pour "défenses qui nous battent"
// Combine taux de défaite ET volume — pénalise les petits échantillons
const dangerScore=(losses,total)=>{
  if(total<2)return 0;
  const lossRate=losses/total;
  // Wilson sur les défaites + bonus volume logarithmique
  const base=wilson(losses,total);
  const volBonus=Math.log10(Math.max(total,1))/3;
  return base+volBonus;
};

function computeStats(data,field){
  const map={};
  const rawField=field==="defense"?"defenseRaw":field==="offense"?"offenseRaw":null;
  data.forEach(d=>{
    const n=d[field];if(!n)return;
    if(!map[n])map[n]={name:n,wins:0,losses:0,total:0,rawName:rawField?d[rawField]||n:n};
    map[n].total++;
    if(d.victoire)map[n].wins++;else map[n].losses++;
  });
  return Object.values(map)
    .map(x=>({...x,wr:wr(x.wins,x.total),reliability:wilson(x.wins,x.total)}))
    .sort((a,b)=>b.total-a.total);
}

/* ─── PARSER ─────────────────────────────────────────────────────────────── */
function parseCSV(rawText){
  const text=rawText.replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  const rows=[];let cur="",inQ=false,row=[];
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){if(inQ&&text[i+1]==='"'){cur+='"';i++;}else inQ=!inQ;}
    else if(ch===';'&&!inQ){row.push(cur);cur="";}
    else if(ch==='\n'&&!inQ){row.push(cur);cur="";rows.push(row);row=[];}
    else cur+=ch;
  }
  if(cur||row.length){row.push(cur);rows.push(row);}
  if(rows.length<2)throw new Error("Fichier vide ou mal formaté");
  const headers=rows[0].map(h=>h.trim());
  const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const find=(...names)=>{
    for(const n of names){let i=headers.indexOf(n);if(i>=0)return i;i=headers.findIndex(h=>norm(h)===norm(n));if(i>=0)return i;}return -1;
  };
  const iOS=find("OFFENSE bien trié","OFFENSE bien trie");
  const iDS=find("DEFENSE bien trié","DEFENSE bien trie");
  if(iOS<0)throw new Error("Colonne 'OFFENSE bien trié' introuvable");
  if(iDS<0)throw new Error("Colonne 'DEFENSE bien trié' introuvable");
  const iJ=find("Joueur"),iJA=find("Joueur adverse"),iGA=find("Guilde Adverse");
  const iR=find("Résultat","Resultat"),iO=find("OFFENCE","OFFENSE"),iD=find("DEFENSE");
  const iM=find("Nom du membre de la guilde");
  const iNA=find("nom de l'adversaire","nom de l adversaire"),iV=find("Victoire ?","Victoire");
  const get=(cols,i)=>i>=0&&i<cols.length?cols[i].trim():"";
  const result=[];
  for(let r=1;r<rows.length;r++){
    const c=rows[r];
    const off=get(c,iOS)||get(c,iO),def=get(c,iDS)||get(c,iD);
    if(!off||!def||off.includes("#VALUE!")||off.includes("#NOM?"))continue;
    const mRaw=get(c,iM),jCell=get(c,iJ).split("\n")[0].trim();
    const joueur=(mRaw&&mRaw!=="#NOM?"&&mRaw!=="")?mRaw:(jCell==="#NOM?"||jCell===""?"Inconnu":jCell);
    const resRaw=get(c,iR),vicVal=get(c,iV);
    const isW=resRaw==="Victoire"||vicVal==="1"||vicVal==="Oui";
    // off/def = version triée (pour stats), offRaw/defRaw = version originale (pour images)
    const offRaw=(get(c,iO)||"").trim();
    const defRaw=(get(c,iD)||"").trim();
    result.push({id:result.length,joueur,membreGuilde:joueur,
      joueurAdverse:get(c,iNA)||get(c,iJA).split("\n")[0].trim(),
      guildeAdverse:get(c,iGA),resultat:isW?"Victoire":"Défaite",
      offense:off,defense:def,
      offenseRaw:offRaw||off,defenseRaw:defRaw||def,
      victoire:isW?"Oui":"",defaite:isW?"":"Oui",
      session:"Import",date:new Date().toISOString().split("T")[0]});
  }
  if(!result.length)throw new Error("Aucun combat valide trouvé");
  return result;
}

/* ══════════════════════════════════════════════════════════════════════════
   ATOMS
══════════════════════════════════════════════════════════════════════════ */
function WRBadge({rate,small}){
  const c=rate>=70?T.green:rate>=50?T.amber:T.red;
  const bg=rate>=70?T.greenDim:rate>=50?T.amberDim:T.redDim;
  return <span style={{display:"inline-flex",alignItems:"center",background:bg,color:c,
    borderRadius:4,padding:small?"0 5px":"1px 7px",fontSize:small?10:11,fontWeight:700,
    fontVariantNumeric:"tabular-nums",flexShrink:0}}>{rate}%</span>;
}

function VDScore({wins,losses,total}){
  const t=total||wins+losses;
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,
    fontSize:11,fontVariantNumeric:"tabular-nums",flexShrink:0}}>
    <span style={{color:T.green,fontWeight:600}}>{wins}V</span>
    <span style={{color:T.ink3,fontSize:9}}>·</span>
    <span style={{color:T.red,fontWeight:600}}>{losses}D</span>
    <span style={{color:T.ink3,fontSize:10}}>/{t}</span>
  </span>;
}

// Wilson badge 3 niveaux : ✦✦✦ fiable · ✦✦ correct · ✦ insuffisant
function WilsonBadge({wins,total}){
  const score=wilson(wins,total);
  const level=score>=0.55?"high":score>=0.30?"mid":"low";
  const label=level==="high"?"✦✦✦ Fiable":level==="mid"?"✦✦ Correct":"✦ Limité";
  const color=level==="high"?T.green:level==="mid"?T.amber:T.ink3;
  return <span style={{fontSize:10,color,fontWeight:600,letterSpacing:0.2,flexShrink:0}}>
    {label}
  </span>;
}

// Bouton copie Discord — copie le nom de la compo dans le presse-papiers
function CopyBtn({text}){
  const [copied,setCopied]=useState(false);
  const copy=e=>{
    e.stopPropagation();
    navigator.clipboard?.writeText(text).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false),1500);
    });
  };
  return <button onClick={copy} title="Copier pour Discord"
    style={{background:"none",border:`1px solid ${T.line}`,borderRadius:5,
      padding:"2px 7px",color:copied?T.green:T.ink3,fontSize:10,cursor:"pointer",
      fontFamily:FONT,flexShrink:0,transition:`color 0.2s`}}>
    {copied?"✓":"📋"}
  </button>;
}

function GhostBtn({children,onClick,color,small,style={}}){
  return <button onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:4,
    background:"transparent",border:`1px solid ${T.line}`,borderRadius:7,
    padding:small?"4px 9px":"6px 12px",color:color||T.ink2,
    fontSize:small?11:12,fontWeight:500,cursor:"pointer",fontFamily:FONT,...style}}>
    {children}</button>;
}
function PrimaryBtn({children,onClick,style={}}){
  return <button onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:5,
    background:T.indigo,border:"none",borderRadius:8,padding:"7px 14px",
    color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FONT,...style}}>
    {children}</button>;
}
function Inp({value,onChange,placeholder,list,style={},autoFocus,onKeyDown}){
  return <input autoFocus={autoFocus} list={list} value={value} onChange={onChange}
    onKeyDown={onKeyDown} placeholder={placeholder}
    style={{background:T.s3,border:`1px solid ${T.line}`,borderRadius:8,color:T.ink1,
      padding:"8px 12px",fontSize:13,outline:"none",fontFamily:FONT,
      width:"100%",boxSizing:"border-box",...style}}/>;
}
function Sel({value,onChange,children,style={}}){
  return <select value={value} onChange={onChange}
    style={{background:T.s3,border:`1px solid ${T.line}`,borderRadius:8,color:T.ink1,
      padding:"7px 10px",fontSize:12,outline:"none",fontFamily:FONT,cursor:"pointer",...style}}>
    {children}</select>;
}
function Card({children,style={}}){
  return <div style={{background:T.s1,border:`1px solid ${T.line}`,borderRadius:12,
    padding:"14px 16px",...style}}>{children}</div>;
}
function SH({title,sub,right}){
  return <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
    gap:8,marginBottom:10}}>
    <div>
      <div style={{fontSize:12,fontWeight:600,color:T.ink1,letterSpacing:-0.1}}>{title}</div>
      {sub&&<div style={{fontSize:10,color:T.ink3,marginTop:2}}>{sub}</div>}
    </div>
    {right&&<div style={{flexShrink:0}}>{right}</div>}
  </div>;
}
function Empty({children}){
  return <div style={{padding:"16px 0",textAlign:"center",color:T.ink3,fontSize:12}}>{children}</div>;
}
const ROW={display:"flex",alignItems:"center",gap:8,padding:"7px 2px",borderBottom:`1px solid ${T.line}`};

function SliderControl({value,onChange,max}){
  return <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
    <input type="range" min={20} max={max||2000} step={10} value={value}
      onChange={e=>onChange(+e.target.value)}
      style={{width:70,accentColor:T.indigo}}/>
    <input type="number" min={20} max={max||2000} step={10} value={value}
      onChange={e=>onChange(Math.min(+e.target.value,max||2000))}
      style={{width:52,background:T.s3,border:`1px solid ${T.line}`,borderRadius:6,
        color:T.ink1,padding:"3px 6px",fontSize:11,outline:"none",
        textAlign:"center",fontVariantNumeric:"tabular-nums"}}/>
  </div>;
}

/* ─── GHOST LIST ─────────────────────────────────────────────────────────── */
function GhostList({items,renderItem,onItemClick,max=30}){
  const [openIdx,setOpenIdx]=useState(null);
  const [visible,setVisible]=useState(12);
  const shown=items.slice(0,visible);
  return <div>
    {shown.map((item,i)=>(
      <div key={item.name||i}
        style={{...ROW,cursor:onItemClick?"pointer":"default",
          opacity:openIdx!==null&&openIdx!==i?0.35:1,
          filter:openIdx!==null&&openIdx!==i?"blur(0.4px)":"none",
          transition:`opacity 0.18s ${EASE},filter 0.18s ${EASE}`}}
        onClick={()=>{
          if(onItemClick){onItemClick(item,i);return;}
          setOpenIdx(openIdx===i?null:i);
        }}>
        {renderItem(item,i,openIdx===i)}
      </div>
    ))}
    {items.length>visible&&(
      <button onClick={()=>setVisible(v=>Math.min(v+10,max))}
        style={{width:"100%",marginTop:4,padding:"5px",background:"none",
          border:"none",color:T.ink3,fontSize:11,cursor:"pointer",fontFamily:FONT}}>
        ▾ {items.length-visible} de plus
      </button>
    )}
  </div>;
}

/* ─── OFFENSES PANEL (popup clic sur défense) ────────────────────────────── */
function OffensesPanel({title,items,onClose}){
  return <div className="panel-fixed" style={{position:"fixed",top:"50%",left:"50%",
    transform:"translate(-50%,-50%)",zIndex:2000,
    background:T.s1,border:`1px solid ${T.lineM}`,borderRadius:14,
    padding:0,width:"min(520px,96vw)",maxHeight:"82vh",
    display:"flex",flexDirection:"column",
    boxShadow:"0 24px 64px rgba(0,0,0,0.7)"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"14px 18px",borderBottom:`1px solid ${T.line}`}}>
      <div style={{fontSize:12,fontWeight:600,color:T.ink1,paddingRight:12}}>{title}</div>
      <button onClick={onClose} style={{background:"none",border:"none",
        color:T.ink3,cursor:"pointer",fontSize:18,lineHeight:1,padding:"0 4px"}}>×</button>
    </div>
    <div style={{overflowY:"auto",padding:"8px 0"}}>
      {items.map((o,i)=>(
        <div key={o.name} style={{padding:"9px 18px",borderBottom:`1px solid ${T.line}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
            <span style={{color:T.ink3,width:20,fontSize:11,textAlign:"right",flexShrink:0}}>{i+1}</span>
            <span style={{flex:1,fontSize:12,color:T.ink1,fontWeight:600,overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{o.name}</span>
            <VDScore wins={o.wins} losses={o.losses||o.total-o.wins} total={o.total}/>
            <WRBadge rate={o.wr}/>
            <WilsonBadge wins={o.wins} total={o.total}/>
            <CopyBtn text={o.rawName||o.name}/>
          </div>
          <div style={{paddingLeft:28,marginTop:4}}>
            <CompoChips compo={o.rawName||o.name} size={18}/>
          </div>
        </div>
      ))}
    </div>
    <div style={{padding:"8px 18px",borderTop:`1px solid ${T.line}`}}>
      <span style={{fontSize:10,color:T.ink3}}>{items.length} résultats</span>
    </div>
  </div>;
}
function Overlay({onClick}){
  return <div onClick={onClick} style={{position:"fixed",inset:0,zIndex:1999,
    background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)"}}/>;
}

/* ══════════════════════════════════════════════════════════════════════════
   SEARCH WIDGET — Contre-pick redesigné
   Section 1 : Résultats DIRECTS (DB exacte)
   Section 2 : Variantes ÉLÉMENTAIRES (élargissement par archétype)
   Distinction visuelle claire entre les deux
══════════════════════════════════════════════════════════════════════════ */

// Calcule les offenses contre un ensemble de défenses
function computeOffensesForDefs(scope,defSet,minWR,minUses){
  const map={};
  scope.filter(d=>defSet.has(d.defense)).forEach(d=>{
    const n=d.offense;
    if(!map[n])map[n]={name:n,rawName:d.offenseRaw||d.offense,wins:0,losses:0,total:0};
    map[n].total++;if(d.victoire)map[n].wins++;else map[n].losses++;
  });
  return Object.values(map)
    .map(x=>({...x,wr:wr(x.wins,x.total),reliability:wilson(x.wins,x.total)}))
    .filter(x=>x.wr>=minWR&&x.total>=minUses)
    .sort((a,b)=>b.reliability-a.reliability);
}

// Trouve les défenses dont les monstres ont des éléments similaires
function findElemVariants(scope,directDefs,query){
  if(!MONSTER_CACHE_LOADED||MONSTER_CACHE.size===0)return[];
  // Extraire les monstres de la requête et leurs éléments
  const qWords=query.trim().split(/\s+/).filter(w=>w.length>=2);
  const qElems=qWords.map(w=>monsterElement(w)).filter(Boolean);
  if(!qElems.length)return[];

  // Pour chaque défense directe, extraire les éléments de ses monstres
  const directElemsSet=new Set();
  directDefs.forEach(def=>{
    def.split(" ").forEach(w=>{ const e=monsterElement(w); if(e)directElemsSet.add(e); });
  });
  const directElems=[...directElemsSet];
  if(!directElems.length)return[];

  // Trouver les contre-éléments et éléments du même groupe
  const relevantElems=new Set(directElems);
  directElems.forEach(e=>{
    if(COUNTER_ELEM[e])relevantElems.add(COUNTER_ELEM[e]);
    SAME_ELEM_GROUP.forEach(g=>{ if(g.includes(e))g.forEach(x=>relevantElems.add(x)); });
  });

  // Défenses variantes : contiennent des monstres avec ces éléments
  // mais ne sont PAS dans les résultats directs
  const variantDefs=new Set();
  scope.forEach(d=>{
    if(directDefs.has(d.defense))return;
    const defWords=d.defense.split(" ").filter(w=>w.length>=2);
    const defElems=defWords.map(w=>monsterElement(w)).filter(Boolean);
    // Vérifier si au moins N monstres communs par nom
    const qWordSet=new Set(qWords.map(w=>w.toLowerCase()));
    const commonNames=defWords.filter(w=>qWordSet.has(w.toLowerCase())).length;
    if(commonNames>=1&&defElems.some(e=>relevantElems.has(e))){
      variantDefs.add(d.defense);
    }
  });
  return variantDefs;
}

// Carte résultat offense (réutilisée)
function OffenseCard({r,idx,histWarning,medals,isVariant}){
  const colors=isVariant
    ?{border:T.amberMid,bg:"rgba(245,158,11,0.06)",shadow:"none"}
    :{border:idx===0?T.indigoMid:T.line,bg:idx===0?"rgba(99,102,241,0.06)":T.s2,
      shadow:idx===0?T.indigoGlow:"none"};
  return(
    <div style={{background:colors.bg,border:`1px solid ${colors.border}`,
      boxShadow:colors.shadow,borderRadius:10,padding:"10px 12px",
      position:"relative"}}>
      {isVariant&&(
        <div style={{position:"absolute",top:8,right:8,fontSize:9,fontWeight:700,
          color:T.amber,background:T.amberDim,borderRadius:4,padding:"1px 6px",
          letterSpacing:0.5,textTransform:"uppercase"}}>
          {ELEM_ICON[r.mainElem]||"~"} Axe de réflexion
        </div>
      )}
      <div style={{fontSize:12,marginBottom:3,color:T.ink3}}>{medals[idx]||`#${idx+1}`}</div>
      <div style={{fontSize:12,fontWeight:600,color:T.ink1,marginBottom:8,
        lineHeight:1.35,paddingRight:isVariant?48:0}}>{r.name}</div>
      <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
        <WRBadge rate={r.wr}/>
        <VDScore wins={r.wins} losses={r.losses} total={r.total}/>
      </div>
      {idx===0&&histWarning&&(
        <div style={{fontSize:10,color:T.red,padding:"2px 6px",
          background:T.redDim,borderRadius:4,marginBottom:4}}>{histWarning}</div>
      )}
      {/* Images des monstres de l'offense */}
      <div style={{marginBottom:6}}>
        <CompoChips compo={r.rawName||r.name}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <CopyBtn text={r.rawName||r.name}/>
      </div>
    </div>
  );
}

function SearchWidget({data,liveGuild}){
  const [query,setQuery]=useState("");
  const [searchMode,setSearchMode]=useState("compo");
  const [minWR,setMinWR]=useState(55);
  const [minUses,setMinUses]=useState(2);

  const allDefs=useMemo(()=>computeStats(data,"defense").map(x=>x.name),[data]);
  const allMonsters=useMemo(()=>{
    const freq={};
    data.forEach(d=>{
      if(!d.defense)return;
      d.defense.split(" ").forEach(w=>{if(w.length>=3)freq[w]=(freq[w]||0)+1;});
    });
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,60);
  },[data]);

  const prediction=useMemo(()=>{
    const q=query.trim();
    if(!q||searchMode!=="compo")return null;
    const freq={};
    data.filter(d=>d.defense.toLowerCase().startsWith(q.toLowerCase()))
      .forEach(d=>{freq[d.defense]=(freq[d.defense]||0)+1;});
    const top=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
    return top&&top[0]!==q?top[0]:null;
  },[data,query,searchMode]);

  const scope=useMemo(()=>liveGuild?data.filter(d=>d.guildeAdverse===liveGuild):data,[data,liveGuild]);

  // ── Résultats DIRECTS ──────────────────────────────────────────────────
  const {directDefs,directResults}=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return{directDefs:new Set(),directResults:[]};
    let defs;
    if(searchMode==="compo"){
      defs=new Set(scope.filter(d=>d.defense.toLowerCase().includes(q)).map(d=>d.defense));
    } else {
      const words=q.split(/\s+/).filter(w=>w.length>=2);
      defs=new Set(scope.filter(d=>words.every(w=>d.defense.toLowerCase().includes(w))).map(d=>d.defense));
    }
    return{directDefs:defs,directResults:computeOffensesForDefs(scope,defs,minWR,minUses)};
  },[scope,query,searchMode,minWR,minUses]);

  // ── Résultats VARIANTES ÉLÉMENTAIRES ──────────────────────────────────
  const elemResults=useMemo(()=>{
    const q=query.trim();
    if(!q||!MONSTER_CACHE_LOADED)return[];
    const variantDefs=findElemVariants(scope,directDefs,q);
    if(!variantDefs.size)return[];
    const results=computeOffensesForDefs(scope,variantDefs,minWR,minUses);
    // Exclure ceux déjà dans directResults
    const directNames=new Set(directResults.map(r=>r.name));
    return results.filter(r=>!directNames.has(r.name)).map(r=>{
      // Trouver l'élément dominant des variantes
      const elems={};
      [...variantDefs].forEach(def=>{
        def.split(" ").forEach(w=>{const e=monsterElement(w);if(e)elems[e]=(elems[e]||0)+1;});
      });
      const mainElem=Object.entries(elems).sort((a,b)=>b[1]-a[1])[0]?.[0];
      return{...r,mainElem};
    });
  },[scope,query,directDefs,directResults,minWR,minUses]);

  const histWarning=useMemo(()=>{
    if(!liveGuild||!directResults.length)return null;
    const top=directResults[0];
    const l=data.filter(d=>d.offense===top.name&&d.guildeAdverse===liveGuild&&!d.victoire).length;
    return l>0?`${l}✗ historique face à ${liveGuild}`:null;
  },[data,directResults,liveGuild]);

  const medals=["🥇","🥈","🥉"];

  return <div>
    {/* ── Barre de recherche ── */}
    <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{display:"flex",border:`1px solid ${T.line}`,borderRadius:8,overflow:"hidden",flexShrink:0}}>
        {[["compo",t("defMode")],["monstre",t("monMode")]].map(([m,label])=>(
          <button key={m} onClick={()=>setSearchMode(m)} style={{padding:"7px 12px",border:"none",
            cursor:"pointer",fontSize:11,fontFamily:FONT,fontWeight:searchMode===m?600:400,
            background:searchMode===m?T.indigoDim:"transparent",
            color:searchMode===m?T.indigo:T.ink3,transition:`all 0.12s ${EASE}`}}>
            {label}
          </button>
        ))}
      </div>

      <div style={{flex:1,minWidth:200,position:"relative"}}>
        <Inp list="sw-lst" value={query} onChange={e=>setQuery(e.target.value)}
          placeholder={searchMode==="compo"?t("placeholder_compo"):t("placeholder_mon")}
          onKeyDown={e=>e.key==="Tab"&&prediction&&(e.preventDefault(),setQuery(prediction))}
          style={{fontSize:14,padding:"10px 14px"}}/>
        {prediction&&(
          <div style={{position:"absolute",top:0,left:0,right:0,padding:"10px 14px",
            fontSize:14,color:T.ink3,pointerEvents:"none",fontFamily:FONT,
            whiteSpace:"nowrap",overflow:"hidden"}}>
            <span style={{opacity:0}}>{query}</span>
            <span>{prediction.slice(query.length)}</span>
            <span style={{fontSize:9,marginLeft:6,opacity:0.4}}>Tab↹</span>
          </div>
        )}
        <datalist id="sw-lst">
          {(searchMode==="compo"?allDefs:allMonsters).map(n=><option key={n} value={n}/>)}
        </datalist>
      </div>

      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
        <span style={{fontSize:10,color:T.ink3}}>{t("wrMin")}</span>
        <input type="number" min={0} max={100} value={minWR} onChange={e=>setMinWR(+e.target.value)}
          style={{width:44,background:T.s3,border:`1px solid ${T.line}`,borderRadius:6,
            color:T.ink1,padding:"5px 6px",fontSize:11,outline:"none",textAlign:"center"}}/>
        <span style={{fontSize:10,color:T.ink3}}>{t("attMin")}</span>
        <input type="number" min={1} max={30} value={minUses} onChange={e=>setMinUses(+e.target.value)}
          style={{width:38,background:T.s3,border:`1px solid ${T.line}`,borderRadius:6,
            color:T.ink1,padding:"5px 6px",fontSize:11,outline:"none",textAlign:"center"}}/>
      </div>
      {query&&<GhostBtn onClick={()=>setQuery("")} color={T.ink3} small>✕</GhostBtn>}
    </div>

    {liveGuild&&<div style={{fontSize:10,color:T.amber,marginBottom:8}}>⚡ {t("cpLive")} {liveGuild}</div>}

    {/* ── Section RÉSULTATS DIRECTS ── */}
    {directResults.length>0&&(
      <div style={{marginBottom:16}}>
        {/* Header section directe */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{flex:1,height:1,background:T.indigoMid}}/>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:T.indigo}}/>
            <span style={{fontSize:10,fontWeight:700,color:T.indigo,
              textTransform:"uppercase",letterSpacing:1}}>{t("directResults")}</span>
          </div>
          <div style={{flex:1,height:1,background:T.indigoMid}}/>
        </div>
        <div style={{fontSize:10,color:T.ink3,marginBottom:10,textAlign:"center"}}>
          {t("directSub")} · {directDefs.size} défense{directDefs.size>1?"s":""}
        </div>

        {/* Podium top 3 directs */}
        <div style={{display:"grid",
          gridTemplateColumns:`repeat(${Math.min(directResults.length,3)},1fr)`,
          gap:8,marginBottom:directResults.slice(3).length>0?10:0}}>
          {directResults.slice(0,3).map((r,i)=>(
            <OffenseCard key={r.name} r={r} idx={i} medals={medals}
              histWarning={i===0?histWarning:null} isVariant={false}/>
          ))}
        </div>

        {/* Autres directs */}
        {directResults.slice(3).length>0&&(
          <div>
            <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",
              letterSpacing:1,marginBottom:6}}>{t("others")}</div>
            {directResults.slice(3,12).map(r=>(
              <div key={r.name} style={{...ROW,cursor:"default"}}>
                <span style={{flex:1,fontSize:12,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</span>
                <VDScore wins={r.wins} losses={r.losses} total={r.total}/>
                <WRBadge rate={r.wr}/>
                <CopyBtn text={r.rawName||r.name}/>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* ── Section VARIANTES ÉLÉMENTAIRES ── */}
    {elemResults.length>0&&(
      <div>
        {/* Header section élémentaire */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{flex:1,height:1,background:T.amberMid}}/>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:T.amber}}/>
            <span style={{fontSize:10,fontWeight:700,color:T.amber,
              textTransform:"uppercase",letterSpacing:1}}>{lang==="fr"?"Axes de réflexion":"Lines of thought"}</span>
          </div>
          <div style={{flex:1,height:1,background:T.amberMid}}/>
        </div>
        <div style={{fontSize:10,color:T.ink3,marginBottom:10,textAlign:"center"}}>
          {t("elemSub")}
        </div>

        <div style={{display:"grid",
          gridTemplateColumns:`repeat(${Math.min(elemResults.length,3)},1fr)`,gap:8}}>
          {elemResults.slice(0,3).map((r,i)=>(
            <OffenseCard key={r.name} r={r} idx={i} medals={medals}
              histWarning={null} isVariant={true}/>
          ))}
        </div>

        {elemResults.slice(3).length>0&&(
          <div style={{marginTop:10}}>
            {elemResults.slice(3,8).map(r=>(
              <div key={r.name} style={{...ROW,opacity:0.8}}>
                <span style={{fontSize:9,color:T.amber,flexShrink:0}}>
                  {ELEM_ICON[r.mainElem]||"~"}
                </span>
                <span style={{flex:1,fontSize:12,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap",paddingLeft:4}}>{r.name}</span>
                <VDScore wins={r.wins} losses={r.losses} total={r.total}/>
                <WRBadge rate={r.wr}/>
                <CopyBtn text={r.rawName||r.name}/>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {query.trim()&&directResults.length===0&&elemResults.length===0&&(
      <div style={{padding:"14px 0",fontSize:12,color:T.ink3,textAlign:"center"}}>
        {t("noResult")}
      </div>
    )}
  </div>;
}


/* ─── WORST DEFS CARD — compact, max 8 lignes par défaut ────────────────── */
function WorstDefsCard({worstDefs,data,openDef,setOpenDef,worstN,setWorstN,maxN}){
  const [showAll,setShowAll]=useState(false);
  const shown=showAll?worstDefs:worstDefs.slice(0,8);
  return <Card>
    <SH title=t("worstTitle")
      sub=t("worstSub")
      right={<SliderControl value={worstN} onChange={setWorstN} max={maxN}/>}/>
    {worstDefs.length===0
      ?<Empty>Aucune défense (min 3 attaques sur cette fenêtre)</Empty>
      :<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
          {shown.map(s=>(
            <ExpandableDef key={s.name} s={s} data={data}
              isOpen={openDef===s.name}
              dimmed={openDef!==null&&openDef!==s.name}
              onOpen={()=>setOpenDef(openDef===s.name?null:s.name)}/>
          ))}
        </div>
        {worstDefs.length>8&&(
          <button onClick={()=>setShowAll(v=>!v)}
            style={{width:"100%",marginTop:8,padding:"5px",background:"none",
              border:`1px solid ${T.line}`,borderRadius:6,
              color:T.ink3,fontSize:11,cursor:"pointer",fontFamily:FONT}}>
            {showAll?`▲ Réduire`:`▾ ${worstDefs.length-8} de plus`}
          </button>
        )}
      </>}
  </Card>;
}

/* ══════════════════════════════════════════════════════════════════════════
   EXPANDABLE DEF — Défenses qui nous battent
══════════════════════════════════════════════════════════════════════════ */
function ExpandableDef({s,data,isOpen,onOpen,dimmed}){
  const offenses=useMemo(()=>{
    if(!isOpen)return[];
    const map={};
    data.filter(d=>d.defense===s.name).forEach(d=>{
      if(!map[d.offense])map[d.offense]={name:d.offense,wins:0,losses:0,total:0};
      map[d.offense].total++;
      if(d.victoire)map[d.offense].wins++;else map[d.offense].losses++;
    });
    return Object.values(map).map(x=>({...x,wr:wr(x.wins,x.total),reliability:wilson(x.wins,x.total)}))
      .sort((a,b)=>b.reliability-a.reliability);
  },[isOpen,data,s.name]);

  // Couleur selon danger (rouge si >60% défaite ET volume significatif)
  const dangerColor=s.lossRate>=65?T.red:s.lossRate>=45?T.amber:T.ink2;

  return <div style={{borderBottom:`1px solid ${T.line}`,
    opacity:dimmed?0.30:1,transition:`opacity 0.18s ${EASE}`}}>
    <div onClick={onOpen} style={{display:"flex",alignItems:"center",gap:10,
      padding:"6px 2px",cursor:"pointer",userSelect:"none"}}>
      <span style={{fontSize:9,color:T.ink3,width:12,flexShrink:0,textAlign:"center"}}>
        {isOpen?"▾":"▸"}</span>
      {/* Nom */}
      <span style={{flex:1,fontSize:12,color:T.ink1,overflow:"hidden",
        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
      {/* Stats claires : V puis D puis total */}
      <span style={{fontSize:11,color:T.green,fontWeight:600,
        fontVariantNumeric:"tabular-nums",flexShrink:0}}>{s.wins}V</span>
      <span style={{fontSize:10,color:T.ink3,flexShrink:0}}>·</span>
      <span style={{fontSize:11,color:T.red,fontWeight:600,
        fontVariantNumeric:"tabular-nums",flexShrink:0}}>{s.losses}D</span>
      <span style={{fontSize:10,color:T.ink3,fontVariantNumeric:"tabular-nums",
        flexShrink:0}}>/{s.total}</span>
      {/* Badge % défaite coloré */}
      <span style={{fontSize:11,fontWeight:700,color:dangerColor,
        background:s.lossRate>=65?T.redDim:s.lossRate>=45?T.amberDim:"transparent",
        borderRadius:4,padding:"1px 6px",fontVariantNumeric:"tabular-nums",flexShrink:0}}>
        {s.lossRate}%✗
      </span>
    </div>
    {isOpen&&(
      <div style={{margin:"2px 0 8px 20px",background:T.s2,borderRadius:8,padding:"8px 12px"}}>
        <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
          Offenses gagnantes contre cette défense
        </div>
        {offenses.length===0
          ?<div style={{fontSize:11,color:T.ink3}}>{t("noVictory")}</div>
          :offenses.map(o=>(
            <div key={o.name} style={{display:"flex",alignItems:"center",gap:8,
              padding:"5px 0",borderBottom:`1px solid ${T.line}`}}>
              <span style={{flex:1,fontSize:11,color:T.ink2,overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.name}</span>
              <span style={{fontSize:10,color:T.green,fontVariantNumeric:"tabular-nums"}}>{o.wins}V</span>
              <span style={{fontSize:10,color:T.red,fontVariantNumeric:"tabular-nums"}}>{o.losses}D</span>
              <WRBadge rate={o.wr} small/>
            </div>
          ))}
      </div>
    )}
  </div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   CLUSTERING
══════════════════════════════════════════════════════════════════════════ */
function buildClusters(defStats){
  const parsed=defStats.map(d=>({
    ...d,monsters:new Set(d.name.split(" ").filter(w=>w.length>=3))
  }));
  const clusterOf=new Array(parsed.length).fill(-1);
  const clusters=[];
  for(let i=0;i<parsed.length;i++){
    if(clusterOf[i]>=0)continue;
    clusterOf[i]=clusters.length;
    clusters.push({members:[i],monsters:new Set(parsed[i].monsters)});
  }
  for(let pass=0;pass<2;pass++){
    for(let i=0;i<parsed.length;i++){
      const mi=parsed[i].monsters;
      let bestCid=-1,bestShared=1;
      for(let c=0;c<clusters.length;c++){
        if(clusterOf[i]===c)continue;
        let shared=0;
        for(const m of mi)if(clusters[c].monsters.has(m))shared++;
        if(shared>bestShared){bestShared=shared;bestCid=c;}
      }
      if(bestCid>=0){
        const old=clusterOf[i];
        clusters[old].members=clusters[old].members.filter(x=>x!==i);
        clusterOf[i]=bestCid;
        clusters[bestCid].members.push(i);
        for(const m of mi)clusters[bestCid].monsters.add(m);
      }
    }
  }
  return clusters.filter(c=>c.members.length>0).map(c=>{
    const members=c.members.map(i=>parsed[i]);
    const totalAtt=members.reduce((s,m)=>s+m.total,0);
    const totalWin=members.reduce((s,m)=>s+m.wins,0);
    const totalLoss=members.reduce((s,m)=>s+m.losses,0);
    const common=[...members[0].monsters].filter(m=>members.every(x=>x.monsters.has(m)));
    const label=common.length>=2?common.slice(0,3).join(" · "):[...c.monsters].slice(0,3).join(" · ");
    return{label,total:totalAtt,wins:totalWin,losses:totalLoss,
      wr:wr(totalWin,totalAtt),lossRate:Math.round((totalLoss/totalAtt)*100),
      count:members.length,members:members.sort((a,b)=>b.total-a.total)};
  }).filter(c=>c.total>=3).sort((a,b)=>b.total-a.total);
}

function ClusterCard({cluster,isOpen,onToggle,dimmed,data,onDefClick}){
  return <div style={{borderBottom:`1px solid ${T.line}`,
    opacity:dimmed?0.30:1,filter:dimmed?"blur(0.3px)":"none",
    transition:`opacity 0.18s ${EASE}`}}>
    <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:8,
      padding:"8px 2px",cursor:"pointer",userSelect:"none"}}>
      <span style={{fontSize:9,color:T.ink3,width:12,textAlign:"center",flexShrink:0}}>
        {isOpen?"▾":"▸"}</span>
      <span style={{fontSize:10,color:T.amber,background:T.amberDim,
        border:`1px solid ${T.amberMid}`,borderRadius:4,
        padding:"1px 5px",flexShrink:0,fontVariantNumeric:"tabular-nums"}}>
        {cluster.count}v</span>
      <span style={{flex:1,fontSize:12,fontWeight:600,color:T.ink1,
        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cluster.label}</span>
      <VDScore wins={cluster.wins} losses={cluster.losses} total={cluster.total}/>
      <WRBadge rate={cluster.wr} small/>
    </div>
    {isOpen&&(
      <div style={{margin:"2px 0 8px 20px",display:"flex",flexDirection:"column",gap:4}}>
        {cluster.members.map(m=>(
          <div key={m.name} onClick={()=>onDefClick&&onDefClick(m)}
            style={{display:"flex",alignItems:"center",gap:8,
              background:T.s2,borderRadius:7,padding:"6px 10px",
              cursor:onDefClick?"pointer":"default",border:`1px solid ${T.line}`}}>
            <span style={{flex:1,fontSize:11,color:T.ink2,overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
            <span style={{fontSize:10,color:T.ink3,fontVariantNumeric:"tabular-nums",flexShrink:0}}>
              {m.total}att</span>
            <WRBadge rate={m.wr} small/>
          </div>
        ))}
        <div style={{fontSize:10,color:T.ink3,paddingLeft:2}}>
          Clic sur une variante → offenses gagnantes
        </div>
      </div>
    )}
  </div>;
}

function DefenseClusters({clusters,data,onDefClick}){
  const [openIdx,setOpenIdx]=useState(null);
  const [visible,setVisible]=useState(10);
  const shown=clusters.slice(0,visible);
  return <div>
    {shown.map((c,i)=>(
      <ClusterCard key={c.label+i} cluster={c} isOpen={openIdx===i}
        dimmed={openIdx!==null&&openIdx!==i}
        onToggle={()=>setOpenIdx(openIdx===i?null:i)}
        data={data} onDefClick={onDefClick}/>
    ))}
    {clusters.length>visible&&(
      <button onClick={()=>setVisible(v=>v+10)}
        style={{width:"100%",marginTop:6,padding:"5px",background:"none",
          border:"none",color:T.ink3,fontSize:11,cursor:"pointer",fontFamily:FONT}}>
        ▾ {clusters.length-visible} de plus
      </button>
    )}
  </div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   SMART DOCK
══════════════════════════════════════════════════════════════════════════ */
function SmartDock({tab,setTab,data,onImport,importMsg,fileRef}){
  const [scrolled,setScrolled]=useState(false);
  const [hovered,setHovered]=useState(false);
  useEffect(()=>{
    const h=()=>setScrolled(window.scrollY>40);
    window.addEventListener("scroll",h,{passive:true});
    return()=>window.removeEventListener("scroll",h);
  },[]);
  const [lang,setLang]=useState("fr");
  const toggleLang=()=>{
    const nl=lang==="fr"?"en":"fr";
    CURRENT_LANG=nl;setLang(nl);
  };
  const TABS=[
    {id:"counterpick",label:lang==="fr"?"Contre-pick":"Counter-pick",icon:"⚡"},
    {id:"analyse",    label:lang==="fr"?"Analyse":"Analysis",         icon:"▤"},
    {id:"guilde",     label:t("guilde"),             icon:"◈"},
    {id:"combat",     label:lang==="fr"?"Détail":"Log",               icon:"≡"},
  ];
  const opacity=scrolled&&!hovered?0.14:1;
  return <div className="dock-wrap" style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",
    zIndex:1000,opacity,transition:`opacity 0.4s ${EASE}`}}
    onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
    <div style={{display:"flex",alignItems:"center",
      background:"rgba(8,8,12,0.82)",backdropFilter:"blur(24px) saturate(160%)",
      border:`1px solid ${T.line}`,borderRadius:40,padding:"4px 6px",
      boxShadow:"0 4px 32px rgba(0,0,0,0.7)"}}>
      <div style={{padding:"4px 12px 4px 10px",borderRight:`1px solid ${T.line}`,marginRight:4,flexShrink:0}}>
        <span style={{fontSize:11,fontWeight:700,color:T.ink1,letterSpacing:-0.3}}>SW Siege</span>
      </div>
      {TABS.map(tb=>{
        const active=tab===tb.id;
        return <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
          padding:"5px 13px",border:"none",cursor:"pointer",fontSize:12,
          fontWeight:active?600:400,fontFamily:FONT,whiteSpace:"nowrap",
          background:active?"rgba(99,102,241,0.15)":"transparent",
          color:active?T.indigo:T.ink2,borderRadius:30,
          transition:`all 0.12s ${EASE}`}}>
          <span className="hide-desktop">{tb.icon}</span>
          <span className="hide-mobile">{tb.label}</span>
        </button>;
      })}
      <div style={{width:1,height:18,background:T.line,margin:"0 6px",flexShrink:0}}/>
      <span style={{fontSize:11,color:T.ink3,padding:"0 4px",fontVariantNumeric:"tabular-nums",
        whiteSpace:"nowrap"}}>{data.length}</span>
      <button onClick={()=>fileRef.current.click()} style={{
        display:"flex",alignItems:"center",gap:4,padding:"5px 10px",
        border:`1px solid ${T.line}`,borderRadius:30,background:"transparent",
        color:T.ink2,fontSize:11,cursor:"pointer",fontFamily:FONT,marginLeft:4}}>
        {t("import")}</button>
      <input ref={fileRef} type="file" accept=".txt,.csv,.json" style={{display:"none"}} onChange={onImport}/>

      {/* Lang toggle */}
      <button onClick={toggleLang} style={{
        marginLeft:6,padding:"4px 9px",border:`1px solid ${T.line}`,borderRadius:30,
        background:"transparent",color:T.ink3,fontSize:10,cursor:"pointer",fontFamily:FONT}}>
        {lang==="fr"?"EN":"FR"}
      </button>
    </div>
    {importMsg&&(
      <div style={{marginTop:8,padding:"6px 16px",borderRadius:20,textAlign:"center",
        background:importMsg.startsWith("✓")?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.12)",
        border:`1px solid ${importMsg.startsWith("✓")?"rgba(16,185,129,0.2)":"rgba(239,68,68,0.2)"}`,
        color:importMsg.startsWith("✓")?T.green:T.red,
        fontSize:11,fontWeight:500,boxShadow:"0 4px 16px rgba(0,0,0,0.4)"}}>
        {importMsg}
      </div>
    )}
  </div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   LIVE PANEL
══════════════════════════════════════════════════════════════════════════ */
function LivePanel({data,setData,liveGuild,setLiveGuild,onClose}){
  const lastSession=useMemo(()=>{const s=[...new Set(data.map(d=>d.session))];return s[s.length-1]||"Import";},[data]);
  const lastGuild =useMemo(()=>{for(let i=data.length-1;i>=0;i--)if(data[i].guildeAdverse)return data[i].guildeAdverse;return "";},[data]);
  const guilds    =useMemo(()=>[...new Set(data.filter(d=>d.guildeAdverse).map(d=>d.guildeAdverse))].sort(),[data]);
  const allP      =useMemo(()=>[...new Set(data.map(d=>d.joueur))].sort(),[data]);
  const allD      =useMemo(()=>computeStats(data,"defense").map(x=>x.name),[data]);
  const playerOff =useCallback(j=>{
    const freq={};data.filter(d=>d.joueur===j).forEach(d=>{freq[d.offense]=(freq[d.offense]||0)+1;});
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  },[data]);
  const [form,setForm]=useState({joueur:"",offense:"",defense:"",
    resultat:"Victoire",guildeAdverse:lastGuild,session:lastSession});
  const allO=useMemo(()=>form.joueur?playerOff(form.joueur):computeStats(data,"offense").map(x=>x.name),[form.joueur,data,playerOff]);
  const flashWarn=useMemo(()=>{
    if(!form.offense||!form.guildeAdverse)return false;
    return data.some(d=>d.offense===form.offense&&d.guildeAdverse===form.guildeAdverse&&!d.victoire);
  },[form.offense,form.guildeAdverse,data]);
  const submit=()=>{
    if(!form.joueur||!form.offense)return;
    setData(d=>[...d,{...form,id:d.length,membreGuilde:form.joueur,
      victoire:form.resultat==="Victoire"?"Oui":"",defaite:form.resultat==="Défaite"?"Oui":"",
      date:new Date().toISOString().split("T")[0]}]);
    setForm(f=>({...f,offense:"",defense:"",resultat:"Victoire"}));
  };
  return <div style={{background:T.s1,borderBottom:`1px solid ${T.indigoMid}`,
    padding:"10px 14px 12px",display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
    <div style={{width:"100%",display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:11,fontWeight:700,color:T.indigo}}>⚔ MODE LIVE</span>
      <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:"auto"}}>
        <span style={{fontSize:10,color:T.ink3}}>Guilde adverse</span>
        <Sel value={form.guildeAdverse}
          onChange={e=>{setForm(f=>({...f,guildeAdverse:e.target.value}));setLiveGuild(e.target.value);}}
          style={{fontSize:11,padding:"4px 8px"}}>
          <option value="">—</option>
          {guilds.map(g=><option key={g} value={g}>{g}</option>)}
        </Sel>
      </div>
    </div>
    {[["Joueur","joueur",allP],["Défense","defense",allD]].map(([l,k,opts])=>(
      <div key={k} style={{display:"flex",flexDirection:"column",gap:3,flex:"1 1 130px"}}>
        <label style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1}}>{l}</label>
        <Inp list={`lv-${k}`} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={l}/>
        <datalist id={`lv-${k}`}>{opts.map(o=><option key={o} value={o}/>)}</datalist>
      </div>
    ))}
    <div style={{display:"flex",flexDirection:"column",gap:3,flex:"2 1 190px"}}>
      <label style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1}}>Offense</label>
      <Inp list="lv-off" value={form.offense} onChange={e=>setForm(f=>({...f,offense:e.target.value}))}
        placeholder="Offense"
        style={{borderColor:flashWarn?T.red:T.line,boxShadow:flashWarn?`0 0 0 1px ${T.red}`:"none"}}/>
      <datalist id="lv-off">{allO.map(o=><option key={o} value={o}/>)}</datalist>
      {flashWarn&&<span style={{fontSize:10,color:T.red}}>Échec historique face à {form.guildeAdverse}</span>}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <label style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1}}>Résultat</label>
      <Sel value={form.resultat} onChange={e=>setForm(f=>({...f,resultat:e.target.value}))} style={{width:120}}>
        <option>Victoire</option><option>Défaite</option>
      </Sel>
    </div>
    <PrimaryBtn onClick={submit}>+ OK</PrimaryBtn>
    <GhostBtn onClick={onClose} color={T.red}>Fermer</GhostBtn>
  </div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════════════════════════════════════ */
export default function App(){
  const [tab,setTab]=useState("counterpick");
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [liveGuild,setLiveGuild]=useState("");
  const [importMsg,setImportMsg]=useState("");
  const fileRef=useRef();

  useEffect(()=>{
    // Charge les données combat ET le cache images en parallèle
    Promise.all([
      dbLoad(),
      loadMonsterCache(),
    ]).then(([rows])=>{setData(rows);setLoading(false);})
      .catch(()=>{setData([]);setLoading(false);});
  },[]);
  useEffect(()=>{
    const t=setInterval(()=>{
      dbLoad().then(rows=>{if(rows.length)setData(rows);}).catch(()=>{});
    },60000);
    return()=>clearInterval(t);
  },[]);

  const handleImport=e=>{
    const file=e.target.files[0];if(!file)return;
    const sessionLabel=window.prompt("Nom de la session ?","Session-import")||"Import";
    const reader=new FileReader();
    reader.onload=async ev=>{
      try{
        let parsed=file.name.endsWith(".json")?JSON.parse(ev.target.result):parseCSV(ev.target.result);
        if(!file.name.endsWith(".json"))parsed=parsed.map(r=>({...r,session:sessionLabel}));
        setImportMsg("⏳ Envoi…");
        await dbReplace(parsed);
        const fresh=await dbLoad();
        setData(fresh);
        setImportMsg(`✓ ${parsed.length} combats partagés — « ${sessionLabel} »`);
        setTimeout(()=>setImportMsg(""),5000);
      }catch(err){
        setImportMsg("⚠ "+err.message);
        setTimeout(()=>setImportMsg(""),6000);
      }
    };
    reader.readAsText(file,"windows-1252");
    e.target.value="";
  };

  if(loading)return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:FONT}}>
      <span style={{fontSize:13,color:T.ink3}}>Chargement…</span>
    </div>
  );

  return <div style={{minHeight:"100vh",background:T.bg,color:T.ink1,fontFamily:FONT}}>
    <style>{`
      @media(max-width:700px){
        .grid-2col{grid-template-columns:1fr!important;}
        .hide-mobile{display:none!important;}
        .hide-desktop{display:inline!important;}
        .panel-fixed{position:fixed;top:0!important;left:0!important;
          transform:none!important;width:100vw!important;height:100vh!important;
          max-height:100vh!important;border-radius:0!important;}
        .dock-wrap{top:8px!important;}
        .page-pad{padding-top:64px!important;padding-left:10px!important;padding-right:10px!important;}
        .combat-grid{grid-template-columns:1fr!important;}
      }
      @media(min-width:701px){
        .hide-desktop{display:none!important;}
      }
    `}</style>
    <SmartDock tab={tab} setTab={setTab} data={data} onImport={handleImport}
      importMsg={importMsg} fileRef={fileRef}/>

    <div style={{maxWidth:1160,width:"100%",margin:"0 auto",
      padding:"80px 14px 40px",boxSizing:"border-box"}}
      className="page-pad">
      {tab==="counterpick"&&<CounterpickPage data={data} liveGuild={liveGuild}/>}
      {tab==="analyse"    &&<AnalysePage    data={data} liveGuild={liveGuild}/>}
      {tab==="guilde"     &&<Guilde         data={data}/>}
      {tab==="combat"     &&<DetailCombat   data={data} setData={setData}/>}
    </div>
  </div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
   COUNTERPICK PAGE — Feature principale, pleine largeur
══════════════════════════════════════════════════════════════════════════ */
function CounterpickPage({data,liveGuild}){
  const totalW=data.filter(d=>d.victoire).length;
  const totalWR=wr(totalW,data.length);
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>

    {/* Hero — Contre-pick pleine largeur */}
    <div style={{background:`linear-gradient(160deg,rgba(99,102,241,0.12) 0%,rgba(99,102,241,0.02) 100%)`,
      border:`1.5px solid ${T.indigoMid}`,borderRadius:16,padding:"22px 24px",
      boxShadow:T.indigoGlow}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:T.ink1,letterSpacing:-0.5}}>
            {t("counterpick")}
          </div>
          <div style={{fontSize:12,color:T.ink3,marginTop:3}}>
            {liveGuild?`${t("cpLive")} ${liveGuild}`:t("cpSub")}
          </div>
        </div>
        {/* Mini stats */}
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          {liveGuild&&<span style={{fontSize:11,color:T.amber,background:T.amberDim,
            border:`1px solid ${T.amberMid}`,borderRadius:20,padding:"3px 10px",fontWeight:600}}>
            ⚡ {liveGuild}</span>}
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:22,fontWeight:800,color:totalWR>=55?T.green:T.red,
              fontVariantNumeric:"tabular-nums",lineHeight:1}}>{totalWR}%</div>
            <div style={{fontSize:10,color:T.ink3,marginTop:2}}>
              {totalW}V · {data.length-totalW}D
            </div>
          </div>
        </div>
      </div>
      {/* SearchWidget pleine largeur */}
      <SearchWidget data={data} liveGuild={liveGuild}/>
    </div>

  </div>;
}

function AnalysePage({data,liveGuild}){
  const [globalN,setGlobalN]=useState(1250);
  const [offN,setOffN]      =useState(1250);
  const [defN,setDefN]      =useState(1250);
  const [worstN,setWorstN]  =useState(1250);
  const [openDef,setOpenDef]=useState(null);
  const [panel,setPanel]    =useState(null);

  const totalW  =data.filter(d=>d.victoire).length;
  const totalWR =wr(totalW,data.length);

  const offStats   =useMemo(()=>computeStats(data.slice(-offN),"offense"),[data,offN]);
  const recentDef  =useMemo(()=>computeStats(data.slice(-defN),"defense"),[data,defN]);

  // Défenses qui nous battent — score pondéré danger
  const worstDefs=useMemo(()=>
    computeStats(data.slice(-worstN),"defense")
      .filter(s=>s.total>=3)
      .map(s=>({...s,
        lossRate:Math.round((s.losses/s.total)*100),
        danger:dangerScore(s.losses,s.total)
      }))
      .sort((a,b)=>b.danger-a.danger),
  [data,worstN]);

  const handleDefClick=useCallback(item=>{
    const map={};
    data.filter(d=>d.defense===item.name).forEach(d=>{
      if(!map[d.offense])map[d.offense]={name:d.offense,rawName:d.offenseRaw||d.offense,wins:0,losses:0,total:0};
      map[d.offense].total++;if(d.victoire)map[d.offense].wins++;else map[d.offense].losses++;
    });
    const items=Object.values(map).map(x=>({...x,wr:wr(x.wins,x.total),reliability:wilson(x.wins,x.total)}))
      .sort((a,b)=>b.reliability-a.reliability);
    setPanel({title:`Offenses vs : ${item.name}`,items});
  },[data]);

  const handleOffClick=useCallback(item=>{
    const map={};
    data.filter(d=>d.offense===item.name).forEach(d=>{
      if(!map[d.defense])map[d.defense]={name:d.defense,rawName:d.defenseRaw||d.defense,wins:0,losses:0,total:0};
      map[d.defense].total++;if(d.victoire)map[d.defense].wins++;else map[d.defense].losses++;
    });
    const items=Object.values(map).map(x=>({...x,wr:wr(x.wins,x.total)}))
      .sort((a,b)=>b.total-a.total);
    setPanel({title:`Défenses rencontrées avec : ${item.name}`,items});
  },[data]);

  const setAllN=v=>{setGlobalN(v);setOffN(v);setDefN(v);setWorstN(v);};

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>

    {panel&&<><Overlay onClick={()=>setPanel(null)}/><OffensesPanel title={panel.title} items={panel.items} onClose={()=>setPanel(null)}/></>}

    {/* ── LIGNE 2 : Top Offenses + Top Défenses ── */}
    <div className="grid-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <Card>
        <SH title=t("topOffTitle") sub="clic → défenses rencontrées"
          right={<SliderControl value={offN} onChange={setOffN} max={data.length||2000}/>}/>
        <GhostList items={offStats} max={30} onItemClick={handleOffClick} renderItem={(item,i)=><>
          <span style={{color:T.ink3,width:18,fontSize:10,textAlign:"right",flexShrink:0,
            fontVariantNumeric:"tabular-nums"}}>{i+1}</span>
          <div style={{flex:1,minWidth:0,padding:"0 6px"}}>
            <div style={{fontSize:12,overflow:"hidden",textOverflow:"ellipsis",
              whiteSpace:"nowrap",marginBottom:3}}>{item.name}</div>
            <CompoChips compo={item.rawName||item.name} size={16}/>
          </div>
          <VDScore wins={item.wins} losses={item.losses} total={item.total}/>
          <WRBadge rate={item.wr} small/>
        </>}/>
      </Card>

      <Card>
        <SH title=t("topDefTitle") sub="clic → meilleures offenses"
          right={<SliderControl value={defN} onChange={setDefN} max={data.length||2000}/>}/>
        <GhostList items={recentDef} max={30} onItemClick={handleDefClick} renderItem={(item,i)=><>
          <span style={{color:T.ink3,width:18,fontSize:10,textAlign:"right",flexShrink:0,
            fontVariantNumeric:"tabular-nums"}}>{i+1}</span>
          <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",
            whiteSpace:"nowrap",padding:"0 6px"}}>{item.name}</span>
          <span style={{fontSize:10,color:T.ink3,fontVariantNumeric:"tabular-nums",flexShrink:0}}>
            {item.total}att</span>
        </>}/>
      </Card>
    </div>

    {/* ── LIGNE 3 : Défenses qui nous battent ── */}
    <WorstDefsCard worstDefs={worstDefs} data={data}
      openDef={openDef} setOpenDef={setOpenDef} worstN={worstN} setWorstN={setWorstN}
      maxN={data.length||2000}/>

  </div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   GUILDE
══════════════════════════════════════════════════════════════════════════ */
function Guilde({data}){
  const [view,setView]=useState("membres");
  const [minC,setMinC]=useState(3);
  const [sortBy,setSortBy]=useState("wr");
  const [search,setSearch]=useState("");
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [selectedGuild,setSelectedGuild]=useState(null);
  const [guildSearch,setGuildSearch]=useState("");

  const stats=useMemo(()=>{
    const map={};
    data.forEach(d=>{
      const p=d.joueur||d.membreGuilde;if(!p)return;
      if(!map[p])map[p]={name:p,wins:0,total:0,offs:{}};
      map[p].total++;if(d.victoire)map[p].wins++;
      map[p].offs[d.offense]=(map[p].offs[d.offense]||0)+1;
    });
    const byP={};
    data.forEach(d=>{const p=d.joueur;if(p){if(!byP[p])byP[p]=[];byP[p].push(!!d.victoire);}});
    return Object.values(map).map(p=>{
      const res=byP[p.name]||[];
      const last=res[res.length-1];
      let streak=0;for(let i=res.length-1;i>=0;i--){if(res[i]===last)streak++;else break;}
      return{...p,wr:wr(p.wins,p.total),
        streak:streak*(last?1:-1)};
    });
  },[data]);

  const sorted=useMemo(()=>{
    let f=stats.filter(p=>p.total>=minC);
    if(search.trim())f=f.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
    if(sortBy==="wr")return[...f].sort((a,b)=>b.wr-a.wr);
    if(sortBy==="total")return[...f].sort((a,b)=>b.total-a.total);
    if(sortBy==="streak")return[...f].sort((a,b)=>Math.abs(b.streak)-Math.abs(a.streak));
    return f;
  },[stats,minC,sortBy,search]);

  const guildPerf=useMemo(()=>{
    const map={};
    data.forEach(d=>{
      const g=d.guildeAdverse;if(!g)return;
      if(!map[g])map[g]={name:g,wins:0,total:0,history:[]};
      map[g].total++;
      if(d.victoire){map[g].wins++;map[g].history.push(1);}else map[g].history.push(0);
    });
    return Object.values(map).map(x=>({...x,wr:wr(x.wins,x.total)}))
      .filter(x=>x.total>=2).sort((a,b)=>b.total-a.total);
  },[data]);

  const filteredGuilds=useMemo(()=>
    guildSearch?guildPerf.filter(g=>g.name.toLowerCase().includes(guildSearch.toLowerCase())):guildPerf,
  [guildPerf,guildSearch]);

  const thS={padding:"6px 10px",color:T.ink3,textAlign:"left",fontWeight:500,
    fontSize:10,textTransform:"uppercase",letterSpacing:0.7,cursor:"pointer",
    userSelect:"none",whiteSpace:"nowrap"};

  return <div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      {["membres","guildes"].map(v=>(
        <button key={v} onClick={()=>{setView(v);setSelectedPlayer(null);setSelectedGuild(null);}}
          style={{padding:"6px 16px",borderRadius:30,
            border:`1px solid ${view===v?T.indigo:T.line}`,
            background:view===v?T.indigoDim:"transparent",
            color:view===v?T.indigo:T.ink2,fontSize:12,fontWeight:view===v?600:400,
            cursor:"pointer",fontFamily:FONT}}>
          {v==="membres"?t("members"):t("rivalries")}
        </button>
      ))}
    </div>

    {/* ── MEMBRES ── */}
    {view==="membres"&&(
      <div className="grid-2col" style={{display:"grid",gridTemplateColumns:selectedPlayer?"minmax(0,1fr) 360px":"1fr",gap:12}}>
        <Card>
          <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
            <Inp value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={t("searchPlayer")}
              style={{flex:1,minWidth:160,fontSize:12,padding:"6px 10px"}}/>
            <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
              <span style={{fontSize:10,color:T.ink3}}>min</span>
              <input type="number" min={1} max={50} value={minC}
                onChange={e=>setMinC(+e.target.value)}
                style={{width:40,background:T.s3,border:`1px solid ${T.line}`,borderRadius:6,
                  color:T.ink1,padding:"4px 5px",fontSize:11,outline:"none",textAlign:"center"}}/>
              <span style={{fontSize:10,color:T.ink3}}>att.</span>
            </div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${T.line}`}}>
                  {[["#",""],["Joueur",""],["Att","total"],["WR","wr"],["V",""],["D",""],["Streak","streak"]].map(([h,s])=>(
                    <th key={h} onClick={s?()=>setSortBy(s):undefined}
                      style={{...thS,color:sortBy===s?T.indigo:T.ink3}}>
                      {h}{sortBy===s?" ↓":""}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p,i)=>{
                  const sc=p.streak>0?T.green:p.streak<0?T.red:T.ink3;
                  const isSel=selectedPlayer===p.name;
                  return <tr key={p.name}
                    onClick={()=>setSelectedPlayer(isSel?null:p.name)}
                    style={{borderBottom:`1px solid ${T.line}`,cursor:"pointer",
                      background:isSel?T.indigoDim:"transparent",
                      opacity:selectedPlayer&&!isSel?0.38:1,
                      transition:`opacity 0.15s,background 0.15s`}}>
                    <td style={{padding:"8px 10px",color:T.ink3,fontSize:11}}>
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</td>
                    <td style={{padding:"8px 10px",fontWeight:600,
                      color:isSel?T.indigo:T.ink1}}>{p.name}</td>
                    <td style={{padding:"8px 10px",color:T.ink2,fontVariantNumeric:"tabular-nums"}}>{p.total}</td>
                    <td style={{padding:"8px 10px"}}><WRBadge rate={p.wr}/></td>
                    <td style={{padding:"8px 10px",color:T.green,fontVariantNumeric:"tabular-nums"}}>{p.wins}</td>
                    <td style={{padding:"8px 10px",color:T.red,fontVariantNumeric:"tabular-nums"}}>{p.total-p.wins}</td>
                    <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:sc}}>
                      {p.streak>0?`▲${p.streak}W`:p.streak<0?`▼${Math.abs(p.streak)}L`:"—"}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </Card>
        {selectedPlayer&&<PlayerCard player={selectedPlayer} data={data} onClose={()=>setSelectedPlayer(null)}/>}
      </div>
    )}

    {/* ── RIVALITÉS ── */}
    {view==="guildes"&&(
      <div style={{display:"grid",gridTemplateColumns:selectedGuild?"minmax(0,1fr) 400px":"1fr",gap:12}}>
        <Card>
          <div style={{marginBottom:12}}>
            <Inp value={guildSearch} onChange={e=>setGuildSearch(e.target.value)}
              placeholder={t("searchGuild")}
              style={{fontSize:12,padding:"6px 10px"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8}}>
            {filteredGuilds.map(g=>{
              const isSel=selectedGuild===g.name;
              return <div key={g.name}
                onClick={()=>setSelectedGuild(isSel?null:g.name)}
                style={{background:isSel?T.indigoDim:T.s2,
                  border:`1px solid ${isSel?T.indigoMid:T.line}`,
                  borderRadius:10,padding:"12px 14px",cursor:"pointer",
                  opacity:selectedGuild&&!isSel?0.4:1,
                  transition:`opacity 0.15s,background 0.15s`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{flex:1,fontSize:13,fontWeight:600,
                    color:isSel?T.indigo:T.ink1,overflow:"hidden",
                    textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</span>
                  <WRBadge rate={g.wr}/>
                </div>
                <div style={{display:"flex",gap:12,marginBottom:8}}>
                  <span style={{fontSize:11,color:T.ink2,fontVariantNumeric:"tabular-nums"}}>
                    <span style={{fontWeight:600}}>{g.total}</span> att.
                  </span>
                  <span style={{fontSize:11,color:T.green,fontVariantNumeric:"tabular-nums"}}>{g.wins}V</span>
                  <span style={{fontSize:11,color:T.red,fontVariantNumeric:"tabular-nums"}}>{g.total-g.wins}D</span>
                </div>
                <Sparkline values={g.history.slice(-16).map((v,i,a)=>{
                  const w=a.slice(0,i+1).filter(x=>x).length;
                  return Math.round((w/(i+1))*100);
                })} width={110} height={20}/>
              </div>;
            })}
            {filteredGuilds.length===0&&<Empty>{t("noGuild")}</Empty>}
          </div>
        </Card>
        {selectedGuild&&<GuildDetail guild={selectedGuild} data={data} onClose={()=>setSelectedGuild(null)}/>}
      </div>
    )}
  </div>;
}

/* ─── SPARKLINE ─────────────────────────────────────────────────────────── */
function Sparkline({values,width=80,height=24}){
  if(!values||values.length<2)return null;
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const pts=values.map((v,i)=>`${(i/(values.length-1))*width},${height-(((v-min)/range)*(height-4)+2)}`).join(" ");
  const c=values[values.length-1]>=values[0]?T.green:T.red;
  return <svg width={width} height={height} style={{flexShrink:0}}>
    <polyline points={pts} fill="none" stroke={c} strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" opacity={0.85}/>
  </svg>;
}

/* ─── PLAYER CARD ────────────────────────────────────────────────────────── */
function PlayerCard({player,data,onClose}){
  const playerData=useMemo(()=>data.filter(d=>d.joueur===player),[data,player]);
  const maxN=playerData.length;
  const [n,setN]=useState(Math.min(maxN,200));
  const scope=useMemo(()=>playerData.slice(-n),[playerData,n]);
  const wins=scope.filter(d=>d.victoire).length;
  const playerWR=wr(wins,scope.length);
  const worstDefs=useMemo(()=>
    computeStats(scope,"defense").filter(x=>x.total>=1)
      .map(x=>({...x,lossRate:Math.round((x.losses/x.total)*100),danger:dangerScore(x.losses,x.total)}))
      .sort((a,b)=>b.danger-a.danger),
  [scope]);
  const topOffs=useMemo(()=>computeStats(scope,"offense"),[scope]);

  return <Card style={{borderLeft:`2px solid ${T.indigo}`}}>
    <SH title={player}
      right={<div style={{display:"flex",alignItems:"center",gap:8}}>
        <SliderControl value={n} onChange={v=>setN(Math.min(v,maxN))} max={maxN}/>
        <button onClick={onClose} style={{background:"none",border:"none",
          color:T.ink3,cursor:"pointer",fontSize:16,padding:"0 4px",lineHeight:1}}>×</button>
      </div>}/>
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {[[`${playerWR}%`,"WR",playerWR>=55?T.green:T.red],
        [wins,"V",T.green],[scope.length-wins,"D",T.red],[scope.length,"Att",T.ink2]].map(([v,l,c])=>(
        <div key={l} style={{flex:"1 1 55px",background:T.s2,borderRadius:8,padding:"8px 10px"}}>
          <div style={{fontSize:9,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
          <div style={{fontSize:18,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{marginBottom:12}}>
      <div style={{fontSize:10,color:T.red,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:600}}>
        Défenses difficiles
      </div>
      {worstDefs.slice(0,7).map(d=>(
        <div key={d.name} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{flex:1,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</span>
          <div style={{width:32,height:3,background:T.s3,borderRadius:2,flexShrink:0}}>
            <div style={{width:`${Math.min(d.lossRate,100)}%`,height:"100%",
              background:d.lossRate>=70?T.red:T.amber,borderRadius:2}}/>
          </div>
          <span style={{fontSize:11,color:T.red,fontWeight:700,fontVariantNumeric:"tabular-nums",width:36,textAlign:"right"}}>{d.lossRate}%</span>
          <span style={{fontSize:10,color:T.ink3,fontVariantNumeric:"tabular-nums"}}>{d.losses}D/{d.total}</span>
        </div>
      ))}
    </div>
    <div>
      <div style={{fontSize:10,color:T.green,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:600}}>
        Offenses
      </div>
      {topOffs.slice(0,6).map((o,i)=>(
        <div key={o.name} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{color:T.ink3,fontSize:10,width:14,flexShrink:0}}>{i+1}</span>
          <span style={{flex:1,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.name}</span>
          <span style={{fontSize:11,color:T.ink3,fontVariantNumeric:"tabular-nums"}}>{o.total}att</span>
          <WRBadge rate={o.wr} small/>
        </div>
      ))}
    </div>
  </Card>;
}

/* ─── GUILD DETAIL ───────────────────────────────────────────────────────── */
function GuildDetail({guild,data,onClose}){
  const [n,setN]=useState(150);
  const scope=useMemo(()=>data.filter(d=>d.guildeAdverse===guild).slice(-n),[data,guild,n]);
  const wins=scope.filter(d=>d.victoire).length;
  const defStats=useMemo(()=>
    computeStats(scope,"defense").map(x=>({...x,lossRate:Math.round((x.losses/x.total)*100)})),
  [scope]);
  return <Card style={{borderLeft:`2px solid ${T.indigo}`}}>
    <SH title={guild}
      sub={`${scope.length} att. · ${wr(wins,scope.length)}% WR`}
      right={<div style={{display:"flex",alignItems:"center",gap:8}}>
        <SliderControl value={n} onChange={setN} max={data.length||2000}/>
        <button onClick={onClose} style={{background:"none",border:"none",
          color:T.ink3,cursor:"pointer",fontSize:16,padding:"0 4px",lineHeight:1}}>×</button>
      </div>}/>
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {[[scope.length,"Att",T.ink2],[wins,"V",T.green],[scope.length-wins,"D",T.red],
        [`${wr(wins,scope.length)}%`,"WR",wr(wins,scope.length)>=50?T.green:T.red]]
        .map(([v,l,c])=>(
        <div key={l} style={{flex:"1 1 55px",background:T.s2,borderRadius:8,padding:"8px 10px"}}>
          <div style={{fontSize:9,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
          <div style={{fontSize:18,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:8,fontWeight:600}}>
      Défenses les plus utilisées
    </div>
    <div style={{maxHeight:360,overflowY:"auto"}}>
      {defStats.length===0?<Empty>Aucune donnée</Empty>
        :defStats.map((d,i)=>(
        <div key={d.name} style={{display:"flex",alignItems:"center",gap:8,
          padding:"6px 2px",borderBottom:`1px solid ${T.line}`}}>
          <span style={{color:T.ink3,width:18,fontSize:10,textAlign:"right",flexShrink:0}}>{i+1}</span>
          <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",
            whiteSpace:"nowrap",padding:"0 6px"}}>{d.name}</span>
          <span style={{fontSize:10,color:T.ink3,fontVariantNumeric:"tabular-nums",flexShrink:0}}>{d.total}att</span>
          <span style={{fontSize:11,color:T.red,fontWeight:600,
            fontVariantNumeric:"tabular-nums",flexShrink:0}}>{d.lossRate}%✗</span>
          <WRBadge rate={d.wr} small/>
        </div>
      ))}
    </div>
  </Card>;
}


/* ══════════════════════════════════════════════════════════════════════════
   COMBAT CARDS — Accordéon mobile-friendly (remplace le tableau)
══════════════════════════════════════════════════════════════════════════ */
function CombatCards({rows}){
  const [openId,setOpenId]=useState(null);
  if(!rows.length)return <Empty>Aucun combat</Empty>;
  return(
    <div className="combat-grid" style={{display:"grid",
      gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:8}}>
      {rows.map(d=>{
        const isOpen=openId===d.id;
        const winColor=d.victoire?T.green:T.red;
        return(
          <div key={d.id}
            onClick={()=>setOpenId(isOpen?null:d.id)}
            style={{background:T.s2,border:`1px solid ${isOpen?T.lineM:T.line}`,
              borderRadius:10,padding:"10px 12px",cursor:"pointer",
              borderLeft:`3px solid ${winColor}`,
              transition:`border-color 0.15s`}}>
            {/* Header card */}
            <div style={{display:"flex",alignItems:"center",
              justifyContent:"space-between",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:11,fontWeight:700,color:T.ink1}}>{d.joueur}</span>
                <span style={{fontSize:10,color:T.ink3}}>{d.session}</span>
              </div>
              <span style={{fontSize:10,fontWeight:700,color:winColor,
                background:d.victoire?T.greenDim:T.redDim,
                borderRadius:4,padding:"1px 7px"}}>
                {d.victoire?"✓ Victoire":"✗ Défaite"}
              </span>
            </div>
            {/* Offense */}
            <div style={{fontSize:12,color:T.ink1,overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>
              {d.offense}
            </div>
            {/* Defense */}
            <div style={{fontSize:11,color:T.ink3,overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              vs {d.defense}
            </div>
            {/* Détails accordéon */}
            {isOpen&&(
              <div style={{marginTop:10,paddingTop:10,
                borderTop:`1px solid ${T.line}`,
                display:"flex",flexDirection:"column",gap:6}}>
                <CompoChips compo={d.offenseRaw||d.offense}/>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {d.joueurAdverse&&(
                    <span style={{fontSize:10,color:T.ink3}}>
                      vs <span style={{color:T.ink2}}>{d.joueurAdverse}</span>
                    </span>
                  )}
                  {d.guildeAdverse&&(
                    <span style={{fontSize:10,color:T.ink3}}>
                      Guilde : <span style={{color:T.ink2}}>{d.guildeAdverse}</span>
                    </span>
                  )}
                  {d.date&&(
                    <span style={{fontSize:10,color:T.ink3}}>{d.date}</span>
                  )}
                </div>
                <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                  <CopyBtn text={d.offense}/>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DÉTAIL COMBAT
══════════════════════════════════════════════════════════════════════════ */
function DetailCombat({data,setData}){
  const sessions=useMemo(()=>[...new Set(data.map(d=>d.session))].sort(),[data]);
  const players =useMemo(()=>[...new Set(data.map(d=>d.joueur))].sort(),[data]);
  const allO=useMemo(()=>[...new Set(data.map(d=>d.offense))].sort(),[data]);
  const allD=useMemo(()=>[...new Set(data.map(d=>d.defense))].sort(),[data]);
  const [sess,setSess]=useState("");
  const [fPl,setFPl]=useState("");
  const [fRes,setFRes]=useState("");
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({joueur:"",offense:"",defense:"",resultat:"Victoire",guildeAdverse:"",session:""});

  const filtered=useMemo(()=>data
    .filter(d=>(!sess||d.session===sess)&&(!fPl||d.joueur===fPl)&&(!fRes||d.resultat===fRes)),
  [data,sess,fPl,fRes]);

  const exportCSV=rows=>{
    const h=["joueur","offense","defense","resultat","session","date","guildeAdverse","joueurAdverse"];
    const csv=[h.join(";"),...rows.map(r=>h.map(k=>`"${(r[k]||"").replace(/"/g,'""')}"`).join(";"))].join("\n");
    const a=document.createElement("a");
    a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download="siege_export.csv";a.click();
  };

  const addCombat=()=>{
    setData(d=>[...d,{...form,id:d.length,membreGuilde:form.joueur,
      victoire:form.resultat==="Victoire"?"Oui":"",defaite:form.resultat==="Défaite"?"Oui":"",
      date:new Date().toISOString().split("T")[0]}]);
    setShowForm(false);
  };

  return <Card>
    <SH title=t("detailTitle")
      right={<div style={{display:"flex",gap:6}}>
        <PrimaryBtn onClick={()=>setShowForm(v=>!v)}>+ Saisir</PrimaryBtn>
        <GhostBtn onClick={()=>exportCSV(filtered)} color={T.indigo}>↓ Export</GhostBtn>
      </div>}/>
    {/* Chips filtres résultat */}
    <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
      {["","Victoire","Défaite"].map(r=>(
        <button key={r} onClick={()=>setFRes(r)}
          style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${
            fRes===r?(r==="Victoire"?T.green:r==="Défaite"?T.red:T.indigo):T.line}`,
            background:fRes===r?(r==="Victoire"?T.greenDim:r==="Défaite"?T.redDim:T.indigoDim):"transparent",
            color:fRes===r?(r==="Victoire"?T.green:r==="Défaite"?T.red:T.indigo):T.ink3,
            fontSize:11,fontWeight:fRes===r?600:400,cursor:"pointer",fontFamily:FONT,
            transition:`all 0.12s ${EASE}`}}>
          {r||"Tous"}
        </button>
      ))}
      <div style={{width:1,height:16,background:T.line,margin:"0 2px"}}/>
      {/* Chips joueurs */}
      {players.slice(0,8).map(p=>(
        <button key={p} onClick={()=>setFPl(fPl===p?"":p)}
          style={{padding:"5px 12px",borderRadius:20,
            border:`1px solid ${fPl===p?T.indigo:T.line}`,
            background:fPl===p?T.indigoDim:"transparent",
            color:fPl===p?T.indigo:T.ink3,
            fontSize:11,fontWeight:fPl===p?600:400,cursor:"pointer",fontFamily:FONT}}>
          {p}
        </button>
      ))}
      {players.length>8&&(
        <Sel value={fPl} onChange={e=>setFPl(e.target.value)} style={{fontSize:11,padding:"4px 8px"}}>
          <option value="">+ autres</option>
          {players.slice(8).map(p=><option key={p} value={p}>{p}</option>)}
        </Sel>
      )}
      <div style={{width:1,height:16,background:T.line,margin:"0 2px"}}/>
      {/* Sessions */}
      <Sel value={sess} onChange={e=>setSess(e.target.value)} style={{fontSize:11,padding:"4px 8px"}}>
        <option value="">Toutes sessions</option>
        {sessions.map(s=><option key={s} value={s}>{s}</option>)}
      </Sel>
      <span style={{fontSize:11,color:T.ink3,marginLeft:"auto",fontVariantNumeric:"tabular-nums"}}>
        {filtered.length} combats</span>
    </div>
    {showForm&&<div style={{background:T.s2,border:`1px solid ${T.line}`,borderRadius:9,
      padding:12,marginBottom:12,display:"grid",
      gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>
      {[["Joueur","joueur",players],["Offense","offense",allO],
        ["Défense","defense",allD],["Session","session",sessions]].map(([l,k,opts])=>(
        <div key={k} style={{display:"flex",flexDirection:"column",gap:3}}>
          <label style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1}}>{l}</label>
          <Inp list={`hf-${k}`} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
          <datalist id={`hf-${k}`}>{opts.map(o=><option key={o} value={o}/>)}</datalist>
        </div>
      ))}
      <div style={{display:"flex",flexDirection:"column",gap:3}}>
        <label style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1}}>Résultat</label>
        <Sel value={form.resultat} onChange={e=>setForm(f=>({...f,resultat:e.target.value}))}>
          <option>Victoire</option><option>Défaite</option>
        </Sel>
      </div>
      <div style={{display:"flex",alignItems:"flex-end",gap:6}}>
        <PrimaryBtn onClick={addCombat}>OK</PrimaryBtn>
        <GhostBtn onClick={()=>setShowForm(false)} color={T.red}>Annuler</GhostBtn>
      </div>
    </div>}
    <CombatCards rows={filtered.slice().reverse().slice(0,300)}/>
  </Card>;
}
