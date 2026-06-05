import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ─── SUPABASE ───────────────────────────────────────────────────────────── */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function dbLoad(){
  // Utilise la fonction SQL get_all_combats() — pas de limite de lignes
  const { data, error } = await sb.rpc("get_all_combats");
  if(error) throw new Error(error.message);
  const all = data || [];
  return all.map(r=>({
    id:           r.id,
    joueur:       r.joueur||"",
    membreGuilde: r.joueur||"",
    offense:      r.offense||"",
    defense:      r.defense||"",
    resultat:     r.resultat||"",
    victoire:     r.victoire||"",
    defaite:      r.defaite||"",
    session:      r.session||"",
    date:         r.date||"",
    joueurAdverse: r.joueur_adverse||"",
    guildeAdverse: r.guilde_adverse||"",
  }));
}

async function dbReplace(rows){
  // Vide la table puis insère les nouvelles lignes par batch de 500
  const { error: delErr } = await sb.from("combats").delete().gte("id", 0);
  if(delErr) throw new Error(delErr.message);
  const batch = 500;
  for(let i=0; i<rows.length; i+=batch){
    const chunk = rows.slice(i, i+batch).map(r=>({
      joueur:        r.joueur||"",
      offense:       r.offense||"",
      defense:       r.defense||"",
      resultat:      r.resultat||"",
      victoire:      r.victoire||"",
      defaite:       r.defaite||"",
      session:       r.session||"",
      date:          r.date||"",
      joueur_adverse: r.joueurAdverse||"",
      guilde_adverse: r.guildeAdverse||"",
    }));
    const { error } = await sb.from("combats").insert(chunk);
    if(error) throw new Error(error.message);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   SW SIEGE TRACKER — Absolute Dark v5
   Lisibilité renforcée · Palettes clarifiées · Stats V/D intuitives
══════════════════════════════════════════════════════════════════════════ */

const T={
  bg:"#07070A",
  s1:"#0F0F14",       // surface principale — plus de contrast vs bg
  s2:"#16161D",       // surface secondaire
  s3:"#1E1E27",       // inputs, tags
  s4:"#26262F",       // hover
  line:"rgba(255,255,255,0.09)",
  lineM:"rgba(255,255,255,0.15)",
  ink1:"#EEEAE0",     // texte primaire — chaud, lisible
  ink2:"rgba(238,234,224,0.70)", // texte secondaire — 70% (était 55%)
  ink3:"rgba(238,234,224,0.45)", // tertiaire — 45% (était 28%)
  indigo:"#6366F1",indigoDim:"rgba(99,102,241,0.12)",indigoMid:"rgba(99,102,241,0.28)",
  indigoGlow:"0 0 24px rgba(99,102,241,0.20),0 0 6px rgba(99,102,241,0.10)",
  green:"#10B981",greenDim:"rgba(16,185,129,0.12)",
  red:"#EF4444",redDim:"rgba(239,68,68,0.12)",
  amber:"#F59E0B",amberDim:"rgba(245,158,11,0.10)",amberMid:"rgba(245,158,11,0.22)",
};
const FONT=`'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif`;
const EASE="cubic-bezier(0.4,0,0.2,1)";

/* ─── DEMO DATA ─────────────────────────────────────────────────────────── */
const OFFENSES=["Ian Mihyang Yeonhong","Jeogun Seara Sonia","Elucia Loren Mimirr","Aaliyah Feng Velajuel Yan","Adriana Mihyang Rigna","Harmonia Nora Rica","Ariel Feng Rakan Yan","Chilling Mihyang Mork","Isillen Kinki Tetra","Carcano Shamann Tetra","Jultan Malite Tetra","Ashour Kumar Racuni","Betta Hwadam Misty","Kumar Parjanya Shahat","Akroma Racuni Veromos","Ashour Racuni Veromos","Cayde Juno Lucia","Camilla Riley Tesarion","Angela Aya Leo Wind","Betta Platy Shihwa"];
const DEFENSES=["Amber Tarnisha Triton","Amber Tarnisha Woonsa","Fiona Fuuki Orion","Driana Fiona Lora","Berghild Layla Tarnisha","Hraesvelg Iris Solveig","Jaara Mimirr Triton","Guillaume Morris Orion","Driana Eshir Fiona","Shahat Tarnisha Theomars","Dark Lora Maximilian Werner","Driana Lora Maximilian","Lora Tarnisha Xiana","Lamiella Platy Shahat","Lamiella Mimirr Triton","Fiona Orion Fuuki","Tarnisha Berghild Layla","Celestara Tarnisha Triton","Nephthys Triton Amber","Tarnisha Woonsa Amber"];
const PLAYERS=["Syrus","Aeryon","Silver","Chef-kebabier","Dohming","GZ-Ço6","Rox","Baxter","Nyla","Zeph"];
const GUILDS=["Ascensiøn","PinkVoid","ShadowFist","IronWolves","VoidWalkers"];
const SESSIONS=["S-01","S-02","S-03","S-04","S-05","S-06","S-07","S-08"];

function genData(){
  const rows=[];
  for(let i=0;i<320;i++){
    const p=PLAYERS[Math.floor(Math.random()*PLAYERS.length)];
    const off=OFFENSES[Math.floor(Math.random()*OFFENSES.length)];
    const def=DEFENSES[Math.floor(Math.random()*DEFENSES.length)];
    const win=Math.random()<0.38+Math.random()*0.38;
    rows.push({id:i,joueur:p,membreGuilde:p,offense:off,defense:def,
      victoire:win?"Oui":"",defaite:win?"":"Oui",resultat:win?"Victoire":"Défaite",
      guildeAdverse:GUILDS[Math.floor(Math.random()*GUILDS.length)],
      joueurAdverse:"Adv"+Math.floor(Math.random()*30),
      session:SESSIONS[Math.floor(i/40)],
      date:new Date(2025,0,1+Math.floor(i/5)).toISOString().split("T")[0]});
  }
  return rows;
}
const DEMO_DATA=genData();

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */
const wr=(w,t)=>t?Math.round((w/t)*100):0;
const reliabilityScore=(wins,total)=>{
  if(!total)return 0;
  const p=wins/total,z=1.65;
  return(p+(z*z)/(2*total)-z*Math.sqrt((p*(1-p)+z*z/(4*total))/total))/(1+z*z/total);
};
function computeStats(data,field){
  const map={};
  data.forEach(d=>{
    const n=d[field];if(!n)return;
    if(!map[n])map[n]={name:n,wins:0,losses:0,total:0};
    map[n].total++;
    if(d.victoire)map[n].wins++;else map[n].losses++;
  });
  return Object.values(map)
    .map(x=>({...x,wr:wr(x.wins,x.total),reliability:reliabilityScore(x.wins,x.total)}))
    .sort((a,b)=>b.total-a.total);
}

/* ─── PARSER SÉCURISÉ ────────────────────────────────────────────────────── */
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
    for(const n of names){
      let i=headers.indexOf(n);if(i>=0)return i;
      i=headers.findIndex(h=>norm(h)===norm(n));if(i>=0)return i;
    }return -1;
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
    result.push({id:result.length,joueur,membreGuilde:joueur,
      joueurAdverse:get(c,iNA)||get(c,iJA).split("\n")[0].trim(),
      guildeAdverse:get(c,iGA),resultat:isW?"Victoire":"Défaite",
      offense:off,defense:def,victoire:isW?"Oui":"",defaite:isW?"":"Oui",
      session:"Import",date:new Date().toISOString().split("T")[0]});
  }
  if(!result.length)throw new Error("Aucun combat valide trouvé");
  return result;
}

/* ══════════════════════════════════════════════════════════════════════════
   DESIGN ATOMS
══════════════════════════════════════════════════════════════════════════ */

/* WR badge coloré */
function WRBadge({rate}){
  const c=rate>=70?T.green:rate>=50?T.amber:T.red;
  const bg=rate>=70?T.greenDim:rate>=50?T.amberDim:T.redDim;
  return <span style={{display:"inline-flex",alignItems:"center",background:bg,color:c,
    borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:700,
    fontVariantNumeric:"tabular-nums",flexShrink:0}}>{rate}%</span>;
}

/* Score V/D lisible — "12V · 5D" avec couleurs */
function VDScore({wins,losses,total}){
  const t=total||wins+losses;
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,
    fontSize:11,fontVariantNumeric:"tabular-nums",flexShrink:0}}>
    <span style={{color:T.green,fontWeight:600}}>{wins}V</span>
    <span style={{color:T.ink3,fontSize:9}}>·</span>
    <span style={{color:T.red,fontWeight:600}}>{losses}D</span>
    {t>0&&<span style={{color:T.ink3,fontSize:10}}>/{t}</span>}
  </span>;
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
    <div style={{minWidth:0}}>
      <div style={{fontSize:12,fontWeight:600,color:T.ink1,letterSpacing:-0.1}}>{title}</div>
      {sub&&<div style={{fontSize:10,color:T.ink3,marginTop:2}}>{sub}</div>}
    </div>
    {right&&<div style={{flexShrink:0}}>{right}</div>}
  </div>;
}

function Empty({children}){
  return <div style={{padding:"18px 0",textAlign:"center",color:T.ink3,fontSize:12}}>{children}</div>;
}

const ROW={display:"flex",alignItems:"center",gap:8,padding:"7px 2px",borderBottom:`1px solid ${T.line}`};

/* ─── SLIDER CONTROL ─────────────────────────────────────────────────────── */
function SliderControl({value,onChange,max,label}){
  return <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
    {label&&<span style={{fontSize:10,color:T.ink3}}>{label}</span>}
    <input type="range" min={20} max={max||300} step={10} value={value}
      onChange={e=>onChange(+e.target.value)}
      style={{width:90,accentColor:T.indigo}}/>
    <span style={{fontSize:11,fontWeight:600,color:T.ink2,
      fontVariantNumeric:"tabular-nums",minWidth:32}}>
      {value}</span>
  </div>;
}

/* ─── SPARKLINE ──────────────────────────────────────────────────────────── */
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

/* ─── OFFENSES PANEL — popup offenses contre une def ou d'une offense ────── */
function OffensesPanel({title,items,onClose}){
  if(!items||!items.length)return null;
  return <div style={{
    position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
    zIndex:2000,width:480,maxWidth:"90vw",maxHeight:"80vh",
    background:T.s1,border:`1px solid ${T.lineM}`,borderRadius:16,
    boxShadow:"0 24px 80px rgba(0,0,0,0.8)",display:"flex",flexDirection:"column"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"14px 18px",borderBottom:`1px solid ${T.line}`}}>
      <div style={{fontSize:13,fontWeight:700,color:T.ink1,lineHeight:1.3,paddingRight:16}}>
        {title}
      </div>
      <button onClick={onClose} style={{background:"none",border:"none",color:T.ink3,
        cursor:"pointer",fontSize:20,padding:"0 4px",lineHeight:1,flexShrink:0}}>×</button>
    </div>
    <div style={{overflowY:"auto",padding:"8px 0"}}>
      {items.map((o,i)=>(
        <div key={o.name} style={{display:"flex",alignItems:"center",gap:10,
          padding:"9px 18px",borderBottom:`1px solid ${T.line}`}}>
          <span style={{color:T.ink3,width:20,fontSize:11,textAlign:"right",flexShrink:0}}>
            {i+1}</span>
          <span style={{flex:1,fontSize:12,color:T.ink1,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.name}</span>
          <VDScore wins={o.wins} losses={o.losses||o.total-o.wins} total={o.total}/>
          <WRBadge rate={o.wr}/>
        </div>
      ))}
    </div>
    <div style={{padding:"8px 18px",borderTop:`1px solid ${T.line}`}}>
      <span style={{fontSize:10,color:T.ink3}}>{items.length} offenses listées</span>
    </div>
  </div>;
}

/* Overlay pour fermer le panel au clic extérieur */
function Overlay({onClick}){
  return <div onClick={onClick} style={{position:"fixed",inset:0,zIndex:1999,
    background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)"}}/>;
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
          transition:`opacity 0.2s ${EASE},filter 0.2s ${EASE}`}}
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

/* ─── EXPANDABLE DEF (Défenses qui nous battent) ─────────────────────────── */
function ExpandableDef({s,data,isOpen,onOpen,dimmed}){
  const offenses=useMemo(()=>{
    if(!isOpen)return[];
    const map={};
    data.filter(d=>d.defense===s.name).forEach(d=>{
      if(!map[d.offense])map[d.offense]={name:d.offense,wins:0,losses:0,total:0};
      map[d.offense].total++;
      if(d.victoire)map[d.offense].wins++;else map[d.offense].losses++;
    });
    return Object.values(map).map(x=>({...x,wr:wr(x.wins,x.total)}))
      .sort((a,b)=>b.wr-a.wr||b.total-a.total);
  },[isOpen,data,s.name]);

  return <div style={{borderBottom:`1px solid ${T.line}`,
    opacity:dimmed?0.35:1,filter:dimmed?"blur(0.4px)":"none",
    transition:`opacity 0.2s ${EASE},filter 0.2s ${EASE}`}}>
    <div onClick={onOpen} style={{display:"flex",alignItems:"center",gap:8,
      padding:"8px 0",cursor:"pointer",userSelect:"none"}}>
      <span style={{fontSize:9,color:T.ink3,width:12,flexShrink:0,textAlign:"center"}}>
        {isOpen?"▾":"▸"}</span>
      <span style={{flex:1,fontSize:12,color:T.ink1,overflow:"hidden",
        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
      {/* % défaite bien visible */}
      <span style={{fontSize:12,color:T.red,fontWeight:700,flexShrink:0,
        fontVariantNumeric:"tabular-nums"}}>{s.lossRate}% défaite</span>
      <span style={{fontSize:10,color:T.ink3,marginLeft:4,flexShrink:0,
        fontVariantNumeric:"tabular-nums"}}>{s.losses}D·{s.total} att.</span>
    </div>
    {isOpen&&(
      <div style={{margin:"0 0 8px 20px",background:T.s2,borderRadius:8,padding:"8px 12px"}}>
        <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
          Offenses gagnantes contre cette défense
        </div>
        {offenses.length===0
          ?<div style={{fontSize:11,color:T.ink3}}>Aucune victoire enregistrée</div>
          :offenses.map(o=>(
            <div key={o.name} style={{display:"flex",alignItems:"center",gap:8,
              padding:"5px 0",borderBottom:`1px solid ${T.line}`}}>
              <span style={{flex:1,fontSize:11,color:T.ink2,overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.name}</span>
              <VDScore wins={o.wins} losses={o.losses} total={o.total}/>
              <WRBadge rate={o.wr}/>
            </div>
          ))}
      </div>
    )}
  </div>;
}

/* ─── SEARCH WIDGET ──────────────────────────────────────────────────────── */
function SearchWidget({data,liveGuild}){
  const [query,setQuery]=useState("");
  const [mode,setMode]=useState("defense");
  const [minWR,setMinWR]=useState(65);
  const [minUses,setMinUses]=useState(2);

  const allDefs=useMemo(()=>computeStats(data,"defense").map(x=>x.name),[data]);
  const allOffs=useMemo(()=>computeStats(data,"offense").map(x=>x.name),[data]);

  const prediction=useMemo(()=>{
    const q=query.trim();
    if(!q||q.includes(" ")||mode!=="defense")return null;
    const freq={};
    data.filter(d=>d.defense.toLowerCase().startsWith(q.toLowerCase()))
      .forEach(d=>{freq[d.defense]=(freq[d.defense]||0)+1;});
    const top=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
    return top&&top[0]!==q?top[0]:null;
  },[data,query,mode]);

  const results=useMemo(()=>{
    const q=query.trim();if(!q)return[];
    const field=mode==="defense"?"defense":"offense";
    const counter=mode==="defense"?"offense":"defense";
    const scope=liveGuild?data.filter(d=>d.guildeAdverse===liveGuild):data;
    const map={};
    scope.filter(d=>d[field].toLowerCase().includes(q.toLowerCase())).forEach(d=>{
      const n=d[counter];if(!map[n])map[n]={name:n,wins:0,losses:0,total:0};
      map[n].total++;if(d.victoire)map[n].wins++;else map[n].losses++;
    });
    return Object.values(map).map(x=>({...x,wr:wr(x.wins,x.total),
      reliability:reliabilityScore(x.wins,x.total)}))
      .filter(x=>x.wr>=minWR&&x.total>=minUses)
      .sort((a,b)=>b.reliability-a.reliability);
  },[data,query,mode,minWR,minUses,liveGuild]);

  const histWarning=useMemo(()=>{
    if(!liveGuild||!results.length)return null;
    const top=results[0];
    const l=data.filter(d=>d.offense===top.name&&d.guildeAdverse===liveGuild&&!d.victoire).length;
    return l>0?`Échec historique (${l}D) face à ${liveGuild}`:null;
  },[data,results,liveGuild]);

  const medals=["🥇","🥈","🥉"];
  return <div>
    <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{display:"flex",border:`1px solid ${T.line}`,borderRadius:8,overflow:"hidden",flexShrink:0}}>
        {["defense","offense"].map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{padding:"7px 13px",border:"none",
            cursor:"pointer",fontSize:11,fontFamily:FONT,fontWeight:mode===m?600:400,
            background:mode===m?T.indigoDim:"transparent",
            color:mode===m?T.indigo:T.ink3,transition:`all 0.15s ${EASE}`}}>
            {m==="defense"?"Défense →":"Offense →"}
          </button>
        ))}
      </div>
      <div style={{flex:1,minWidth:180,position:"relative"}}>
        <Inp list="sw-lst" value={query} onChange={e=>setQuery(e.target.value)}
          placeholder={mode==="defense"?"Défense adverse…":"Offense à analyser…"}
          onKeyDown={e=>e.key==="Tab"&&prediction&&(e.preventDefault(),setQuery(prediction))}/>
        {prediction&&(
          <div style={{position:"absolute",top:0,left:0,right:0,padding:"8px 12px",
            fontSize:13,color:T.ink3,pointerEvents:"none",fontFamily:FONT,
            whiteSpace:"nowrap",overflow:"hidden"}}>
            <span style={{opacity:0}}>{query}</span>{prediction.slice(query.length)}
            <span style={{fontSize:10,marginLeft:8,opacity:0.4}}>Tab↹</span>
          </div>
        )}
        <datalist id="sw-lst">{(mode==="defense"?allDefs:allOffs).map(n=><option key={n} value={n}/>)}</datalist>
      </div>
      <span style={{fontSize:10,color:T.ink3}}>WR≥</span>
      <input type="number" min={0} max={100} value={minWR} onChange={e=>setMinWR(+e.target.value)}
        style={{width:44,background:T.s3,border:`1px solid ${T.line}`,borderRadius:6,
          color:T.ink1,padding:"5px 6px",fontSize:11,outline:"none",textAlign:"center"}}/>
      <span style={{fontSize:10,color:T.ink3}}>Att.≥</span>
      <input type="number" min={1} max={20} value={minUses} onChange={e=>setMinUses(+e.target.value)}
        style={{width:38,background:T.s3,border:`1px solid ${T.line}`,borderRadius:6,
          color:T.ink1,padding:"5px 6px",fontSize:11,outline:"none",textAlign:"center"}}/>
      {query&&<GhostBtn onClick={()=>setQuery("")} color={T.ink3} small>✕</GhostBtn>}
    </div>

    {liveGuild&&<div style={{fontSize:10,color:T.amber,marginBottom:8}}>⚡ Filtre : {liveGuild}</div>}

    {results.slice(0,3).length>0&&(
      <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(results.length,3)},1fr)`,
        gap:8,marginBottom:results.slice(3).length>0?10:0}}>
        {results.slice(0,3).map((r,i)=>(
          <div key={r.name} style={{background:T.s2,
            border:`1px solid ${i===0?T.indigoMid:T.line}`,
            boxShadow:i===0?T.indigoGlow:"none",
            borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:14,marginBottom:4}}>{medals[i]}</div>
            <div style={{fontSize:12,fontWeight:600,color:T.ink1,marginBottom:8,
              lineHeight:1.3,minHeight:32}}>{r.name}</div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <WRBadge rate={r.wr}/>
              <VDScore wins={r.wins} losses={r.losses} total={r.total}/>
            </div>
            {i===0&&histWarning&&(
              <div style={{fontSize:10,color:T.red,marginTop:6}}>{histWarning}</div>
            )}
          </div>
        ))}
      </div>
    )}
    {results.slice(3).length>0&&(
      <div>
        <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
          Autres options
        </div>
        {results.slice(3,12).map(r=>(
          <div key={r.name} style={ROW}>
            <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</span>
            <VDScore wins={r.wins} losses={r.losses} total={r.total}/>
            <WRBadge rate={r.wr}/>
          </div>
        ))}
      </div>
    )}
    {query.trim()&&results.length===0&&(
      <div style={{padding:"10px 0",fontSize:12,color:T.ink3}}>
        Aucun résultat — essaie un nom partiel ou baisse WR min
      </div>
    )}
  </div>;
}


/* ══════════════════════════════════════════════════════════════════════════
   MONSTER SEARCH — Chercher un monstre → compos offense/defense associées
   Utile quand plusieurs défenses partagent le même monstre clé
══════════════════════════════════════════════════════════════════════════ */
function MonsterSearch({data}){
  const [query,setQuery]=useState("");
  const [mode,setMode]=useState("defense"); // chercher dans défenses ou offenses

  // Extrait tous les monstres uniques depuis les compos
  const allMonsters=useMemo(()=>{
    const freq={};
    const field=mode==="defense"?"defense":"offense";
    data.forEach(d=>{
      if(!d[field])return;
      d[field].split(" ").forEach(word=>{
        if(word.length>=3) freq[word]=(freq[word]||0)+1;
      });
    });
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  },[data,mode]);

  const results=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return[];
    const field=mode==="defense"?"defense":"offense";
    // Toutes les compos qui contiennent ce monstre
    const map={};
    data.filter(d=>d[field]&&d[field].toLowerCase().includes(q)).forEach(d=>{
      const key=d[field];
      if(!map[key])map[key]={name:key,wins:0,losses:0,total:0};
      map[key].total++;
      if(d.victoire)map[key].wins++;else map[key].losses++;
    });
    return Object.values(map)
      .map(x=>({...x,wr:wr(x.wins,x.total)}))
      .sort((a,b)=>b.total-a.total);
  },[data,query,mode]);

  return <div>
    <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
      {/* Toggle défense / offense */}
      <div style={{display:"flex",border:`1px solid ${T.line}`,borderRadius:8,overflow:"hidden",flexShrink:0}}>
        {["defense","offense"].map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{padding:"6px 12px",border:"none",
            cursor:"pointer",fontSize:11,fontFamily:FONT,fontWeight:mode===m?600:400,
            background:mode===m?T.amberDim:"transparent",
            color:mode===m?T.amber:T.ink3,transition:`all 0.15s ${EASE}`}}>
            {m==="defense"?"Dans défenses":"Dans offenses"}
          </button>
        ))}
      </div>
      <div style={{flex:1,minWidth:160,position:"relative"}}>
        <Inp list="ms-lst" value={query} onChange={e=>setQuery(e.target.value)}
          placeholder="Nom d'un monstre (ex: Tarnisha, Driana…)"/>
        <datalist id="ms-lst">{allMonsters.slice(0,50).map(n=><option key={n} value={n}/>)}</datalist>
      </div>
      {query&&<GhostBtn onClick={()=>setQuery("")} color={T.ink3} small>✕</GhostBtn>}
    </div>

    {results.length>0&&(
      <div>
        <div style={{fontSize:10,color:T.ink3,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>
          {results.length} compo{results.length>1?"s":""} {mode==="defense"?"défense":"offense"} contenant «{query}»
        </div>
        <div style={{maxHeight:280,overflowY:"auto"}}>
          {results.map((r,i)=>(
            <div key={r.name} style={{display:"flex",alignItems:"center",gap:8,
              padding:"7px 2px",borderBottom:`1px solid ${T.line}`}}>
              <span style={{color:T.ink3,width:18,fontSize:10,textAlign:"right",
                flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{i+1}</span>
              <span style={{flex:1,fontSize:12,color:T.ink1,overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 6px"}}>{r.name}</span>
              <VDScore wins={r.wins} losses={r.losses} total={r.total}/>
              <WRBadge rate={r.wr}/>
            </div>
          ))}
        </div>
      </div>
    )}
    {query.trim()&&results.length===0&&(
      <div style={{padding:"10px 0",fontSize:12,color:T.ink3}}>
        Aucune compo trouvée avec ce monstre
      </div>
    )}
  </div>;
}


/* ══════════════════════════════════════════════════════════════════════════
   DEFENSE CLUSTERING
   Algorithme : deux compos sont dans le même cluster si elles partagent
   au moins 2 monstres sur 3 (ou 2 sur 4 pour les compos 4 monstres).
   Résultat : chaque cluster = un "archétype" de défense avec toutes ses
   variantes agrégées. Trie par fréquence totale du cluster.
══════════════════════════════════════════════════════════════════════════ */
function buildClusters(defStats){
  // Parse chaque compo en Set de monstres
  const parsed = defStats.map(d => ({
    ...d,
    monsters: new Set(d.name.split(" ").filter(w => w.length >= 3))
  }));

  const clusterOf = new Array(parsed.length).fill(-1);
  const clusters  = [];

  for(let i = 0; i < parsed.length; i++){
    if(clusterOf[i] >= 0) continue; // déjà assigné
    // Nouveau cluster — seed = compo i
    const cid = clusters.length;
    clusterOf[i] = cid;
    clusters.push({ members: [i], monsters: new Set(parsed[i].monsters) });
  }

  // Deux passes pour stabiliser les groupements
  for(let pass = 0; pass < 2; pass++){
    for(let i = 0; i < parsed.length; i++){
      const mi = parsed[i].monsters;
      let bestCid = -1, bestShared = 1; // seuil min = 2
      for(let c = 0; c < clusters.length; c++){
        if(clusterOf[i] === c) continue;
        // Compter les monstres partagés avec le cluster
        let shared = 0;
        for(const m of mi) if(clusters[c].monsters.has(m)) shared++;
        if(shared > bestShared){ bestShared = shared; bestCid = c; }
      }
      if(bestCid >= 0){
        // Retire du cluster actuel si besoin
        const old = clusterOf[i];
        clusters[old].members = clusters[old].members.filter(x => x !== i);
        // Ajoute au meilleur cluster
        clusterOf[i] = bestCid;
        clusters[bestCid].members.push(i);
        for(const m of mi) clusters[bestCid].monsters.add(m);
      }
    }
  }

  // Construit les résultats — un objet par cluster non vide
  return clusters
    .filter(c => c.members.length > 0)
    .map(c => {
      const members = c.members.map(i => parsed[i]);
      const totalAtt = members.reduce((s, m) => s + m.total, 0);
      const totalWin = members.reduce((s, m) => s + m.wins, 0);
      const totalLoss= members.reduce((s, m) => s + m.losses, 0);
      // Nom du cluster = les monstres communs à tous les membres
      const commonMonsters = [...members[0].monsters].filter(m =>
        members.every(x => x.monsters.has(m))
      );
      const label = commonMonsters.length >= 2
        ? commonMonsters.slice(0, 3).join(" · ")
        : [...c.monsters].slice(0, 3).join(" · ");
      return {
        label,
        total: totalAtt,
        wins:  totalWin,
        losses:totalLoss,
        wr:    wr(totalWin, totalAtt),
        lossRate: Math.round((totalLoss / totalAtt) * 100),
        count: members.length,
        members: members.sort((a,b) => b.total - a.total),
      };
    })
    .filter(c => c.total >= 2)
    .sort((a, b) => b.total - a.total);
}

/* ─── ClusterCard — un cluster accordéon ────────────────────────────────── */
function ClusterCard({cluster, idx, isOpen, onToggle, dimmed, data, onDefClick}){
  return (
    <div style={{
      borderBottom: `1px solid ${T.line}`,
      opacity: dimmed ? 0.35 : 1,
      filter: dimmed ? "blur(0.3px)" : "none",
      transition: `opacity 0.2s ${EASE}, filter 0.2s ${EASE}`,
    }}>
      {/* Header du cluster */}
      <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:8,
        padding:"9px 2px",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:9,color:T.ink3,width:12,textAlign:"center",flexShrink:0}}>
          {isOpen ? "▾" : "▸"}
        </span>
        {/* Badge nb variantes */}
        <span style={{fontSize:10,color:T.amber,background:T.amberDim,
          border:`1px solid ${T.amberMid}`,borderRadius:4,
          padding:"1px 6px",flexShrink:0,fontVariantNumeric:"tabular-nums"}}>
          {cluster.count}v
        </span>
        <span style={{flex:1,fontSize:12,fontWeight:600,color:T.ink1,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {cluster.label}
        </span>
        <VDScore wins={cluster.wins} losses={cluster.losses} total={cluster.total}/>
        <WRBadge rate={cluster.wr}/>
      </div>

      {/* Variantes dépliées */}
      {isOpen && (
        <div style={{margin:"2px 0 10px 20px",display:"flex",flexDirection:"column",gap:4}}>
          {cluster.members.map(m => {
            const mLossRate = Math.round((m.losses / m.total) * 100);
            return (
              <div key={m.name}
                onClick={()=>onDefClick&&onDefClick(m)}
                style={{display:"flex",alignItems:"center",gap:8,
                  background:T.s2,borderRadius:7,padding:"7px 10px",
                  cursor:onDefClick?"pointer":"default",
                  border:`1px solid ${T.line}`}}>
                <span style={{flex:1,fontSize:11,color:T.ink2,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
                <span style={{fontSize:10,color:T.ink3,fontVariantNumeric:"tabular-nums",
                  flexShrink:0}}>{m.total} att.</span>
                <span style={{fontSize:11,color:m.lossRate>=60?T.red:T.ink3,
                  fontWeight:m.lossRate>=60?700:400,fontVariantNumeric:"tabular-nums",
                  flexShrink:0}}>{mLossRate}%✗</span>
                <WRBadge rate={m.wr} small/>
              </div>
            );
          })}
          <div style={{fontSize:10,color:T.ink3,padding:"4px 2px"}}>
            → Clic sur une variante pour voir les offenses gagnantes
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── DefenseClusters — wrapper avec état ouvert/fermé ───────────────────── */
function DefenseClusters({clusters, data, onDefClick}){
  const [openIdx, setOpenIdx] = useState(null);
  const [visible, setVisible] = useState(10);
  const shown = clusters.slice(0, visible);

  return (
    <div>
      {shown.map((c, i) => (
        <ClusterCard key={c.label + i} cluster={c} idx={i}
          isOpen={openIdx === i}
          dimmed={openIdx !== null && openIdx !== i}
          onToggle={() => setOpenIdx(openIdx === i ? null : i)}
          data={data}
          onDefClick={onDefClick}/>
      ))}
      {clusters.length > visible && (
        <button onClick={() => setVisible(v => v + 10)}
          style={{width:"100%",marginTop:6,padding:"5px",background:"none",
            border:"none",color:T.ink3,fontSize:11,cursor:"pointer",fontFamily:FONT}}>
          ▾ {clusters.length - visible} clusters de plus
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SMART DOCK
══════════════════════════════════════════════════════════════════════════ */
function SmartDock({tab,setTab,data,onImport,liveOpen,setLiveOpen,importMsg,fileRef}){
  const [scrolled,setScrolled]=useState(false);
  const [hovered,setHovered]=useState(false);
  useEffect(()=>{
    const h=()=>setScrolled(window.scrollY>40);
    window.addEventListener("scroll",h,{passive:true});
    return()=>window.removeEventListener("scroll",h);
  },[]);

  const TABS=[{id:"dashboard",label:"Dashboard"},{id:"guilde",label:"Guilde"},{id:"combat",label:"Détail combat"}];
  const opacity=scrolled&&!hovered?0.15:1;

  return <div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",
    zIndex:1000,opacity,transition:`opacity 0.4s ${EASE}`}}
    onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
    <div style={{display:"flex",alignItems:"center",
      background:"rgba(10,10,14,0.80)",backdropFilter:"blur(24px) saturate(160%)",
      border:`1px solid ${T.line}`,borderRadius:40,padding:"4px 6px",
      boxShadow:"0 4px 32px rgba(0,0,0,0.7),0 1px 0 rgba(255,255,255,0.07) inset"}}>
      <div style={{padding:"4px 14px 4px 10px",
        borderRight:`1px solid ${T.line}`,marginRight:4,flexShrink:0}}>
        <span style={{fontSize:12,fontWeight:700,color:T.ink1,letterSpacing:-0.3}}>Siege Tracker</span>
      </div>
      {TABS.map(t=>{
        const active=tab===t.id;
        return <button key={t.id} onClick={()=>setTab(t.id)} style={{
          padding:"5px 14px",border:"none",cursor:"pointer",fontSize:12,
          fontWeight:active?600:400,fontFamily:FONT,whiteSpace:"nowrap",
          background:active?"rgba(99,102,241,0.15)":"transparent",
          color:active?T.indigo:T.ink2,borderRadius:30,transition:`all 0.15s ${EASE}`}}>
          {t.label}</button>;
      })}
      <div style={{width:1,height:18,background:T.line,margin:"0 6px",flexShrink:0}}/>
      <span style={{fontSize:11,color:T.ink3,padding:"0 4px",fontVariantNumeric:"tabular-nums"}}>
        {data.length}</span>
      <button onClick={()=>fileRef.current.click()} style={{display:"flex",alignItems:"center",
        gap:4,padding:"5px 11px",border:`1px solid ${T.line}`,borderRadius:30,
        background:"transparent",color:T.ink2,fontSize:11,fontWeight:500,
        cursor:"pointer",fontFamily:FONT,marginLeft:4}}>↑ Import</button>
      <input ref={fileRef} type="file" accept=".txt,.csv,.json"
        style={{display:"none"}} onChange={onImport}/>
      <button onClick={()=>setLiveOpen(v=>!v)} style={{display:"flex",alignItems:"center",
        gap:5,marginLeft:4,background:liveOpen?T.indigo:"rgba(99,102,241,0.12)",
        border:`1px solid ${liveOpen?T.indigo:T.indigoMid}`,
        borderRadius:30,padding:"5px 12px",color:liveOpen?"#fff":T.indigo,
        fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>⚔ Live</button>
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

/* ─── LIVE PANEL ─────────────────────────────────────────────────────────── */
function LivePanel({data,setData,liveGuild,setLiveGuild,onClose}){
  const lastSession=useMemo(()=>{const s=[...new Set(data.map(d=>d.session))];return s[s.length-1]||"Import";},[data]);
  const lastGuild=useMemo(()=>{for(let i=data.length-1;i>=0;i--){if(data[i].guildeAdverse)return data[i].guildeAdverse;}return "";},[data]);
  const guilds=useMemo(()=>[...new Set(data.filter(d=>d.guildeAdverse).map(d=>d.guildeAdverse))].sort(),[data]);
  const allP=useMemo(()=>[...new Set(data.map(d=>d.joueur))].sort(),[data]);
  const allD=useMemo(()=>computeStats(data,"defense").map(x=>x.name),[data]);
  const playerOffenses=useCallback((joueur)=>{
    const freq={};
    data.filter(d=>d.joueur===joueur).forEach(d=>{freq[d.offense]=(freq[d.offense]||0)+1;});
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  },[data]);
  const [form,setForm]=useState({joueur:"",offense:"",defense:"",
    resultat:"Victoire",guildeAdverse:lastGuild,session:lastSession});
  const allO=useMemo(()=>form.joueur?playerOffenses(form.joueur):computeStats(data,"offense").map(x=>x.name),
    [form.joueur,data,playerOffenses]);
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
    padding:"12px 14px 14px",display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
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
    <div style={{display:"flex",flexDirection:"column",gap:3,flex:"2 1 200px"}}>
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
  const [tab,setTab]=useState("dashboard");
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [liveOpen,setLiveOpen]=useState(false);
  const [liveGuild,setLiveGuild]=useState("");
  const [importMsg,setImportMsg]=useState("");
  const fileRef=useRef();
  /* Chargement initial depuis Supabase */
  useEffect(()=>{
    dbLoad()
      .then(rows=>{ setData(rows); setLoading(false); })
      .catch(err=>{ console.error("dbLoad error:",err); setData([]); setLoading(false); });
  },[]);

  /* Rafraîchissement auto toutes les 60s pour les membres de la guilde */
  useEffect(()=>{
    const t=setInterval(()=>{
      dbLoad().then(rows=>{ if(rows.length) setData(rows); }).catch(()=>{});
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
        setImportMsg("⏳ Envoi vers la base de données…");
        await dbReplace(parsed);
        const fresh=await dbLoad();
        setData(fresh);
        setImportMsg(`✓ ${parsed.length} combats partagés avec la guilde — « ${sessionLabel} »`);
        setTimeout(()=>setImportMsg(""),5000);
      }catch(err){
        setImportMsg("⚠ "+err.message);
        setTimeout(()=>setImportMsg(""),6000);
      }
    };
    reader.readAsText(file,"windows-1252");
    e.target.value="";
  };

  if(loading) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",
      justifyContent:"center",flexDirection:"column",gap:10,fontFamily:FONT}}>
      <div style={{fontSize:13,color:T.ink3,letterSpacing:0.2}}>Chargement…</div>
    </div>
  );

  return <div style={{minHeight:"100vh",background:T.bg,color:T.ink1,fontFamily:FONT,
    position:"relative",overflow:"hidden"}}>

    <SmartDock tab={tab} setTab={setTab} data={data} onImport={handleImport}
      liveOpen={liveOpen} setLiveOpen={setLiveOpen} importMsg={importMsg} fileRef={fileRef}/>
    {liveOpen&&<div style={{paddingTop:72}}>
      <LivePanel data={data} setData={setData} liveGuild={liveGuild}
        setLiveGuild={setLiveGuild} onClose={()=>setLiveOpen(false)}/>
    </div>}
    <div style={{maxWidth:1160,width:"100%",margin:"0 auto",
      padding:`${liveOpen?14:80}px 14px 32px`,boxSizing:"border-box",position:"relative",zIndex:1}}>
      {tab==="dashboard"&&<Dashboard data={data} liveGuild={liveGuild}/>}
      {tab==="guilde"   &&<Guilde    data={data}/>}
      {tab==="combat"   &&<DetailCombat data={data} setData={setData}/>}
    </div>
  </div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════════════════ */
function Dashboard({data,liveGuild}){
  /* curseur global partagé */
  const [globalN,setGlobalN]=useState(1250);
  const [offN,setOffN]    =useState(1250);
  const [defN,setDefN]    =useState(1250);
  const [worstN,setWorstN]=useState(1250);
  const [openDef,setOpenDef]=useState(null);
  /* panel offense popup */
  const [panel,setPanel]=useState(null); // {title, items}

  const totalW=data.filter(d=>d.victoire).length;
  const totalWR=wr(totalW,data.length);

  const offStats =useMemo(()=>computeStats(data.slice(-offN),"offense"),[data,offN]);
  const clusterN =Math.min(worstN, data.length);
  const defClusters=useMemo(()=>buildClusters(computeStats(data.slice(-clusterN),"defense")),[data,clusterN]);
  const recentDef=useMemo(()=>computeStats(data.slice(-defN),"defense"),[data,defN]);
  const worstDefs=useMemo(()=>
    computeStats(data.slice(-worstN),"defense")
      .filter(s=>s.total>=2)
      .map(s=>({...s,lossRate:Math.round((s.losses/s.total)*100)}))
      .sort((a,b)=>b.lossRate-a.lossRate),
  [data,worstN]);

  /* clic sur une Top Défense → offenses gagnantes */
  const handleDefClick=(item)=>{
    const map={};
    data.filter(d=>d.defense===item.name).forEach(d=>{
      if(!map[d.offense])map[d.offense]={name:d.offense,wins:0,losses:0,total:0};
      map[d.offense].total++;
      if(d.victoire)map[d.offense].wins++;else map[d.offense].losses++;
    });
    const items=Object.values(map).map(x=>({...x,wr:wr(x.wins,x.total)}))
      .sort((a,b)=>b.wr-a.wr||b.total-a.total);
    setPanel({title:`Offenses contre : ${item.name}`,items});
  };

  /* clic sur une Top Offense → défenses rencontrées avec WR */
  const handleOffClick=(item)=>{
    const map={};
    data.filter(d=>d.offense===item.name).forEach(d=>{
      if(!map[d.defense])map[d.defense]={name:d.defense,wins:0,losses:0,total:0};
      map[d.defense].total++;
      if(d.victoire)map[d.defense].wins++;else map[d.defense].losses++;
    });
    const items=Object.values(map).map(x=>({...x,wr:wr(x.wins,x.total)}))
      .sort((a,b)=>b.total-a.total);
    setPanel({title:`Défenses rencontrées avec : ${item.name}`,items});
  };

  /* Appliquer le curseur global à tous */
  const applyGlobal=()=>{setOffN(globalN);setDefN(globalN);setWorstN(globalN);};

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>

    {/* Panel popup */}
    {panel&&<><Overlay onClick={()=>setPanel(null)}/><OffensesPanel title={panel.title} items={panel.items} onClose={()=>setPanel(null)}/></>}

    {/* ── LIGNE 1 : Contre-pick (gauche large) + Stats (droite compacte) ── */}
    <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:14,alignItems:"start"}}>

      {/* Contre-pick — hero card, pas de logo inutile */}
      <div style={{background:`linear-gradient(160deg,rgba(99,102,241,0.11) 0%,rgba(99,102,241,0.03) 100%)`,
        border:`1.5px solid ${T.indigoMid}`,borderRadius:14,padding:"16px 18px",
        boxShadow:T.indigoGlow}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <span style={{fontSize:14,fontWeight:700,color:T.ink1}}>Contre-pick</span>
            <span style={{fontSize:11,color:T.ink3,marginLeft:10}}>
              {liveGuild?`Live · ${liveGuild}`:"défense adverse → meilleures offenses"}
            </span>
          </div>
          {liveGuild&&<span style={{fontSize:10,color:T.amber,background:T.amberDim,
            border:`1px solid ${T.amberMid}`,borderRadius:20,padding:"2px 9px",fontWeight:600}}>
            ⚡ {liveGuild}</span>}
        </div>
        <SearchWidget data={data} liveGuild={liveGuild}/>
      </div>

      {/* Stats globales — colonne droite, compact */}
      <div style={{display:"flex",flexDirection:"column",gap:6,minWidth:120}}>
        {/* Profondeur globale — intégrée ici, sobre */}
        <div style={{background:T.s2,border:`1px solid ${T.line}`,borderRadius:10,
          padding:"10px 14px",marginBottom:2}}>
          <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
            Profondeur
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <SliderControl value={globalN} onChange={v=>{setGlobalN(v);setOffN(v);setDefN(v);setWorstN(v);}} max={data.length||300}/>
          </div>
          <div style={{fontSize:10,color:T.ink3,marginTop:4,fontVariantNumeric:"tabular-nums"}}>
            {globalN} derniers combats
          </div>
        </div>
        {/* WR */}
        <div style={{background:T.s2,border:`1px solid ${T.line}`,borderRadius:10,padding:"10px 14px"}}>
          <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Win Rate</div>
          <div style={{fontSize:28,fontWeight:800,color:totalWR>=55?T.green:T.red,
            fontVariantNumeric:"tabular-nums",lineHeight:1,letterSpacing:-1}}>{totalWR}%</div>
        </div>
        {/* V/D */}
        <div style={{background:T.s2,border:`1px solid ${T.line}`,borderRadius:10,padding:"10px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:11,color:T.green,fontWeight:600}}>✓ {totalW}V</span>
            <span style={{fontSize:11,color:T.red,fontWeight:600}}>{data.length-totalW}D ✗</span>
          </div>
          <div style={{height:4,background:T.s4,borderRadius:2,overflow:"hidden"}}>
            <div style={{width:`${totalWR}%`,height:"100%",
              background:`linear-gradient(90deg,${T.green},${totalWR>=55?T.green:T.amber})`,
              borderRadius:2,transition:"width 0.3s"}}/>
          </div>
          <div style={{fontSize:10,color:T.ink3,marginTop:4,fontVariantNumeric:"tabular-nums",textAlign:"center"}}>
            {data.length} attaques
          </div>
        </div>
      </div>
    </div>

    {/* ── LIGNE 2 : Top Offenses + Top Défenses côte à côte ── */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <Card>
        <SH title="Top Offenses de la Guilde" sub="clic → défenses rencontrées"
          right={<SliderControl value={offN} onChange={setOffN} max={data.length||300}/>}/>
        <GhostList items={offStats} max={30} onItemClick={handleOffClick} renderItem={(item,i)=><>
          <span style={{color:T.ink3,width:18,fontSize:10,textAlign:"right",flexShrink:0,
            fontVariantNumeric:"tabular-nums"}}>{i+1}</span>
          <span style={{flex:1,fontSize:12,color:T.ink1,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 6px"}}>{item.name}</span>
          <VDScore wins={item.wins} losses={item.losses} total={item.total}/>
          <WRBadge rate={item.wr}/>
        </>}/>
      </Card>

      <Card>
        <SH title="Top Défenses rencontrées" sub="clic → meilleures offenses contre"
          right={<SliderControl value={defN} onChange={setDefN} max={data.length||300}/>}/>
        <GhostList items={recentDef} max={30} onItemClick={handleDefClick} renderItem={(item,i)=><>
          <span style={{color:T.ink3,width:18,fontSize:10,textAlign:"right",flexShrink:0,
            fontVariantNumeric:"tabular-nums"}}>{i+1}</span>
          <span style={{flex:1,fontSize:12,color:T.ink1,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 6px"}}>{item.name}</span>
          <span style={{fontSize:10,color:T.ink3,fontVariantNumeric:"tabular-nums",flexShrink:0}}>
            {item.total} att.</span>
        </>}/>
      </Card>
    </div>

    {/* ── LIGNE 3 : Défenses qui nous battent — pleine largeur ── */}
    <Card>
      <SH title="Défenses qui nous battent (% défaite)"
        sub="classées par taux de défaite · clic → offenses gagnantes"
        right={<SliderControl value={worstN} onChange={setWorstN} max={data.length||300}/>}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 28px"}}>
        {worstDefs.map(s=>(
          <ExpandableDef key={s.name} s={s} data={data}
            isOpen={openDef===s.name}
            dimmed={openDef!==null&&openDef!==s.name}
            onOpen={()=>setOpenDef(openDef===s.name?null:s.name)}/>
        ))}
      </div>
      {worstDefs.length===0&&<Empty>Aucune défense sur cette fenêtre</Empty>}
    </Card>

    {/* ── LIGNE 4 : Clusters — pleine largeur ── */}
    <Card>
      <SH title="Clusters de défenses"
        sub={`${defClusters.length} archétypes · compos partageant ≥2 monstres · clic pour variantes`}
        right={<SliderControl value={clusterN} onChange={setWorstN} max={data.length||300}/>}/>
      <DefenseClusters clusters={defClusters} data={data} onDefClick={handleDefClick}/>
    </Card>

      {/* Recherche par monstre — pleine largeur */}
      <Card style={{gridColumn:"1 / -1"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:24,height:24,borderRadius:6,background:T.amberDim,
            border:`1px solid ${T.amberMid}`,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:12,flexShrink:0}}>🔎</div>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:T.ink1}}>Recherche par monstre</div>
            <div style={{fontSize:10,color:T.ink3,marginTop:1}}>
              Tape un nom de monstre pour voir toutes les compos qui le contiennent
            </div>
          </div>
        </div>
        <MonsterSearch data={data}/>
      </Card>

    </div>
  </div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   PLAYER CARD
══════════════════════════════════════════════════════════════════════════ */
function PlayerCard({player,data,onClose}){
  /* Max = nombre réel d'attaques du joueur dans le fichier */
  const playerData=useMemo(()=>data.filter(d=>d.joueur===player),[data,player]);
  const maxN=playerData.length||20;
  const [n,setN]=useState(Math.min(150,maxN));
  const scope=useMemo(()=>playerData.slice(-n),[playerData,n]);
  const wins=scope.filter(d=>d.victoire).length;
  const playerWR=wr(wins,scope.length);
  const worstDefs=useMemo(()=>
    computeStats(scope,"defense").filter(x=>x.total>=1)
      .map(x=>({...x,lossRate:Math.round((x.losses/x.total)*100)}))
      .sort((a,b)=>b.lossRate-a.lossRate),
  [scope]);
  const topOffs=useMemo(()=>computeStats(scope,"offense"),[scope]);

  return <Card style={{borderLeft:`2px solid ${T.indigo}`}}>
    <SH title={player}
      right={<div style={{display:"flex",alignItems:"center",gap:8}}>
        <SliderControl value={n} onChange={v=>setN(Math.min(v,maxN)) } max={maxN}/>
        <button onClick={onClose} style={{background:"none",border:"none",
          color:T.ink3,cursor:"pointer",fontSize:18,padding:"0 4px",lineHeight:1}}>×</button>
      </div>}
      sub={`${scope.length} attaques analysées sur ${maxN} au total`}/>

    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>
      {[[`${playerWR}%`,"Win Rate",playerWR>=55?T.green:T.red],
        [wins,"Victoires",T.green],
        [scope.length-wins,"Défaites",T.red],
        [scope.length,"Attaques",T.ink2]].map(([v,l,c])=>(
        <div key={l} style={{background:T.s2,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
          <div style={{fontSize:18,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{v}</div>
        </div>
      ))}
    </div>

    {/* Défenses difficiles */}
    <div style={{marginBottom:12}}>
      <div style={{fontSize:10,color:T.red,textTransform:"uppercase",
        letterSpacing:1,marginBottom:6,fontWeight:600}}>Défenses difficiles</div>
      {worstDefs.length===0?<div style={{fontSize:11,color:T.ink3}}>Aucune donnée</div>
        :worstDefs.slice(0,8).map(d=>(
        <div key={d.name} style={{display:"flex",alignItems:"center",gap:8,
          padding:"5px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{flex:1,fontSize:11,color:T.ink1,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</span>
          <span style={{fontSize:11,color:T.red,fontWeight:700,fontVariantNumeric:"tabular-nums",flexShrink:0}}>
            {d.lossRate}% défaite</span>
          <span style={{fontSize:10,color:T.ink3,fontVariantNumeric:"tabular-nums",flexShrink:0}}>
            {d.losses}D·{d.total}</span>
        </div>
      ))}
    </div>

    {/* Offenses favorites */}
    <div>
      <div style={{fontSize:10,color:T.green,textTransform:"uppercase",
        letterSpacing:1,marginBottom:6,fontWeight:600}}>Offenses favorites</div>
      {topOffs.slice(0,6).map((o,i)=>(
        <div key={o.name} style={{display:"flex",alignItems:"center",gap:8,
          padding:"5px 0",borderBottom:`1px solid ${T.line}`}}>
          <span style={{color:T.ink3,fontSize:10,width:14,flexShrink:0}}>{i+1}</span>
          <span style={{flex:1,fontSize:11,color:T.ink1,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.name}</span>
          <VDScore wins={o.wins} losses={o.losses} total={o.total}/>
          <WRBadge rate={o.wr}/>
        </div>
      ))}
    </div>
  </Card>;
}

/* ══════════════════════════════════════════════════════════════════════════
   GUILD DETAIL
══════════════════════════════════════════════════════════════════════════ */
function GuildDetail({guild,data,onClose}){
  const guildData=useMemo(()=>data.filter(d=>d.guildeAdverse===guild),[data,guild]);
  const maxN=guildData.length||20;
  const [n,setN]=useState(Math.min(150,maxN));
  const scope=useMemo(()=>guildData.slice(-n),[guildData,n]);
  const wins=scope.filter(d=>d.victoire).length;
  const defStats=useMemo(()=>
    computeStats(scope,"defense").map(x=>({...x,lossRate:Math.round((x.losses/x.total)*100)})),
  [scope]);

  return <Card style={{borderLeft:`2px solid ${T.indigo}`}}>
    <SH title={guild}
      sub={`${scope.length} attaques · ${wr(wins,scope.length)}% WR`}
      right={<div style={{display:"flex",alignItems:"center",gap:8}}>
        <SliderControl value={n} onChange={v=>setN(Math.min(v,maxN))} max={maxN}/>
        <button onClick={onClose} style={{background:"none",border:"none",
          color:T.ink3,cursor:"pointer",fontSize:18,padding:"0 4px",lineHeight:1}}>×</button>
      </div>}/>

    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>
      {[[scope.length,"Attaques",T.ink2],[wins,"Victoires",T.green],
        [scope.length-wins,"Défaites",T.red],[`${wr(wins,scope.length)}%`,"Win Rate",wr(wins,scope.length)>=50?T.green:T.red]]
        .map(([v,l,c])=>(
        <div key={l} style={{background:T.s2,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
          <div style={{fontSize:9,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
          <div style={{fontSize:18,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{v}</div>
        </div>
      ))}
    </div>

    <div style={{fontSize:10,color:T.ink3,textTransform:"uppercase",
      letterSpacing:1,marginBottom:8,fontWeight:600}}>Défenses les plus utilisées</div>
    <div style={{maxHeight:340,overflowY:"auto"}}>
      {defStats.length===0?<Empty>Aucune donnée sur cette fenêtre</Empty>
        :defStats.map((d,i)=>(
        <div key={d.name} style={{display:"flex",alignItems:"center",gap:8,
          padding:"7px 2px",borderBottom:`1px solid ${T.line}`}}>
          <span style={{color:T.ink3,width:18,fontSize:10,textAlign:"right",
            flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{i+1}</span>
          <span style={{flex:1,fontSize:12,color:T.ink1,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 6px"}}>{d.name}</span>
          <span style={{fontSize:10,color:T.ink3,fontVariantNumeric:"tabular-nums",flexShrink:0}}>
            {d.total} att.</span>
          <span style={{fontSize:11,color:T.red,fontWeight:600,
            fontVariantNumeric:"tabular-nums",flexShrink:0}}>{d.lossRate}% déf.</span>
          <WRBadge rate={d.wr}/>
        </div>
      ))}
    </div>
  </Card>;
}

/* ══════════════════════════════════════════════════════════════════════════
   GUILDE
══════════════════════════════════════════════════════════════════════════ */
function Guilde({data}){
  const [view,setView]=useState("membres");
  const [minC,setMinC]=useState(3);
  const [sortBy,setSortBy]=useState("wr");
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [selectedGuild,setSelectedGuild]=useState(null);
  const [searchMembre,setSearchMembre]=useState("");
  const [searchGuilde,setSearchGuilde]=useState("");

  const stats=useMemo(()=>{
    const map={};
    data.forEach(d=>{
      const p=d.joueur||d.membreGuilde;if(!p)return;
      if(!map[p])map[p]={name:p,wins:0,total:0};
      map[p].total++;if(d.victoire)map[p].wins++;
    });
    const byP={};
    data.forEach(d=>{const p=d.joueur;if(p){if(!byP[p])byP[p]=[];byP[p].push(!!d.victoire);}});
    return Object.values(map).map(p=>{
      const res=byP[p.name]||[];
      const last=res[res.length-1];
      let streak=0;
      for(let i=res.length-1;i>=0;i--){if(res[i]===last)streak++;else break;}
      return{...p,wr:wr(p.wins,p.total),streak:streak*(last?1:-1)};
    });
  },[data]);

  const sorted=useMemo(()=>{
    const f=stats.filter(p=>p.total>=minC&&
      (!searchMembre||p.name.toLowerCase().includes(searchMembre.toLowerCase())));
    if(sortBy==="wr")return[...f].sort((a,b)=>b.wr-a.wr);
    if(sortBy==="total")return[...f].sort((a,b)=>b.total-a.total);
    if(sortBy==="streak")return[...f].sort((a,b)=>Math.abs(b.streak)-Math.abs(a.streak));
    return f;
  },[stats,minC,sortBy,searchMembre]);

  const guildPerf=useMemo(()=>{
    const map={};
    data.forEach(d=>{
      const g=d.guildeAdverse;if(!g)return;
      if(!map[g])map[g]={name:g,wins:0,total:0,history:[]};
      map[g].total++;
      if(d.victoire){map[g].wins++;map[g].history.push(1);}
      else map[g].history.push(0);
    });
    return Object.values(map).map(x=>({...x,wr:wr(x.wins,x.total)}))
      .filter(x=>x.total>=2).sort((a,b)=>b.total-a.total);
  },[data]);

  const filteredGuilds=useMemo(()=>
    guildPerf.filter(g=>!searchGuilde||g.name.toLowerCase().includes(searchGuilde.toLowerCase())),
  [guildPerf,searchGuilde]);

  const thS={padding:"6px 10px",color:T.ink3,textAlign:"left",fontWeight:500,
    fontSize:10,textTransform:"uppercase",letterSpacing:0.7,cursor:"pointer",
    userSelect:"none",whiteSpace:"nowrap"};

  return <div style={{display:"flex",flexDirection:"column",gap:12}}>

    {/* Toggle */}
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      {["membres","guildes"].map(v=>(
        <button key={v} onClick={()=>{setView(v);setSelectedPlayer(null);setSelectedGuild(null);}}
          style={{padding:"6px 16px",borderRadius:30,
            border:`1px solid ${view===v?T.indigo:T.line}`,
            background:view===v?T.indigoDim:"transparent",
            color:view===v?T.indigo:T.ink2,fontSize:12,fontWeight:view===v?600:400,
            cursor:"pointer",fontFamily:FONT}}>
          {v==="membres"?"Membres":"Rivalités"}
        </button>
      ))}
    </div>

    {/* ── MEMBRES ── */}
    {view==="membres"&&(
      <div style={{display:"grid",
        gridTemplateColumns:selectedPlayer?"minmax(0,1fr) 380px":"1fr",gap:12}}>
        <Card>
          {/* Barre de recherche + filtres */}
          <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:160,position:"relative"}}>
              <input value={searchMembre} onChange={e=>setSearchMembre(e.target.value)}
                placeholder="Rechercher un pseudo…"
                style={{width:"100%",boxSizing:"border-box",background:T.s3,
                  border:`1px solid ${T.line}`,borderRadius:8,color:T.ink1,
                  padding:"7px 12px",fontSize:12,outline:"none",fontFamily:FONT}}/>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
              <span style={{fontSize:10,color:T.ink3}}>min</span>
              <input type="number" min={1} max={50} value={minC}
                onChange={e=>setMinC(+e.target.value)}
                style={{width:40,background:T.s3,border:`1px solid ${T.line}`,borderRadius:6,
                  color:T.ink1,padding:"4px 5px",fontSize:11,outline:"none",textAlign:"center"}}/>
              <span style={{fontSize:10,color:T.ink3}}>attaques</span>
            </div>
          </div>

          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${T.line}`}}>
                  {[["#",""],["Joueur",""],["Attaques","total"],["WR","wr"],
                    ["Victoires",""],["Défaites",""],["Streak","streak"]].map(([h,s])=>(
                    <th key={h} onClick={s?()=>setSortBy(s):undefined}
                      style={{...thS,color:sortBy===s?T.indigo:T.ink3}}>
                      {h}{sortBy===s?" ↓":""}
                    </th>
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
                      color:isSel?T.indigo:i===0?T.indigo:T.ink1}}>{p.name}</td>
                    <td style={{padding:"8px 10px",color:T.ink2,
                      fontVariantNumeric:"tabular-nums"}}>{p.total}</td>
                    <td style={{padding:"8px 10px"}}><WRBadge rate={p.wr}/></td>
                    <td style={{padding:"8px 10px",color:T.green,
                      fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{p.wins}V</td>
                    <td style={{padding:"8px 10px",color:T.red,
                      fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{p.total-p.wins}D</td>
                    <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:sc}}>
                      {p.streak>0?`▲${p.streak}W`:p.streak<0?`▼${Math.abs(p.streak)}L`:"—"}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </Card>
        {selectedPlayer&&(
          <PlayerCard player={selectedPlayer} data={data}
            onClose={()=>setSelectedPlayer(null)}/>
        )}
      </div>
    )}

    {/* ── RIVALITÉS ── */}
    {view==="guildes"&&(
      <div style={{display:"grid",
        gridTemplateColumns:selectedGuild?"minmax(0,1fr) 420px":"1fr",gap:12}}>
        <Card>
          {/* Recherche guildes */}
          <div style={{marginBottom:12}}>
            <input value={searchGuilde} onChange={e=>setSearchGuilde(e.target.value)}
              placeholder="Rechercher une guilde…"
              style={{width:"100%",boxSizing:"border-box",background:T.s3,
                border:`1px solid ${T.line}`,borderRadius:8,color:T.ink1,
                padding:"7px 12px",fontSize:12,outline:"none",fontFamily:FONT}}/>
          </div>
          <SH title="Guildes adverses" sub="clic pour analyse détaillée"/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10}}>
            {filteredGuilds.map(g=>{
              const isSel=selectedGuild===g.name;
              return <div key={g.name}
                onClick={()=>setSelectedGuild(isSel?null:g.name)}
                style={{background:isSel?T.indigoDim:T.s2,
                  border:`1px solid ${isSel?T.indigoMid:T.line}`,
                  borderRadius:10,padding:"12px 14px",cursor:"pointer",
                  opacity:selectedGuild&&!isSel?0.4:1,
                  transition:`opacity 0.15s,background 0.15s,border-color 0.15s`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{flex:1,fontSize:13,fontWeight:600,
                    color:isSel?T.indigo:T.ink1,overflow:"hidden",
                    textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</span>
                  <WRBadge rate={g.wr}/>
                </div>
                {/* Attaques V/D lisibles */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:8}}>
                  <div style={{background:T.s3,borderRadius:6,padding:"4px 6px",textAlign:"center"}}>
                    <div style={{fontSize:8,color:T.ink3,marginBottom:1}}>Att.</div>
                    <div style={{fontSize:14,fontWeight:700,color:T.ink1,fontVariantNumeric:"tabular-nums"}}>{g.total}</div>
                  </div>
                  <div style={{background:T.greenDim,borderRadius:6,padding:"4px 6px",textAlign:"center"}}>
                    <div style={{fontSize:8,color:T.green,marginBottom:1}}>Victoires</div>
                    <div style={{fontSize:14,fontWeight:700,color:T.green,fontVariantNumeric:"tabular-nums"}}>{g.wins}</div>
                  </div>
                  <div style={{background:T.redDim,borderRadius:6,padding:"4px 6px",textAlign:"center"}}>
                    <div style={{fontSize:8,color:T.red,marginBottom:1}}>Défaites</div>
                    <div style={{fontSize:14,fontWeight:700,color:T.red,fontVariantNumeric:"tabular-nums"}}>{g.total-g.wins}</div>
                  </div>
                </div>
                <Sparkline values={g.history.slice(-16).map((v,i,a)=>{
                  const w=a.slice(0,i+1).filter(x=>x).length;
                  return Math.round((w/(i+1))*100);
                })} width={130} height={22}/>
              </div>;
            })}
            {filteredGuilds.length===0&&<Empty>Aucune guilde trouvée</Empty>}
          </div>
        </Card>
        {selectedGuild&&(
          <GuildDetail guild={selectedGuild} data={data} onClose={()=>setSelectedGuild(null)}/>
        )}
      </div>
    )}
  </div>;
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
  const [form,setForm]=useState({joueur:"",offense:"",defense:"",
    resultat:"Victoire",guildeAdverse:"",session:""});

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
    <SH title="Détail combat"
      right={<div style={{display:"flex",gap:6}}>
        <PrimaryBtn onClick={()=>setShowForm(v=>!v)}>+ Saisir</PrimaryBtn>
        <GhostBtn onClick={()=>exportCSV(filtered)} color={T.indigo}>↓ Export</GhostBtn>
      </div>}/>
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
      <Sel value={sess} onChange={e=>setSess(e.target.value)} style={{minWidth:100}}>
        <option value="">Toutes sessions</option>
        {sessions.map(s=><option key={s} value={s}>{s}</option>)}
      </Sel>
      <Sel value={fPl} onChange={e=>setFPl(e.target.value)} style={{minWidth:110}}>
        <option value="">Tous joueurs</option>
        {players.map(p=><option key={p} value={p}>{p}</option>)}
      </Sel>
      <Sel value={fRes} onChange={e=>setFRes(e.target.value)} style={{minWidth:100}}>
        <option value="">Tous résultats</option>
        <option>Victoire</option><option>Défaite</option>
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
          <Inp list={`hf-${k}`} value={form[k]}
            onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
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

    <div style={{overflowX:"auto",maxHeight:460,overflowY:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:600}}>
        <thead style={{position:"sticky",top:0,background:T.s1,zIndex:10}}>
          <tr style={{borderBottom:`1px solid ${T.line}`}}>
            {["Session","Joueur","Adversaire","Offense","Défense","Résultat","Guilde adv."].map(h=>(
              <th key={h} style={{padding:"6px 10px",color:T.ink3,textAlign:"left",
                fontWeight:500,fontSize:10,textTransform:"uppercase",
                letterSpacing:0.7,whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.slice().reverse().slice(0,300).map(d=>(
            <tr key={d.id} style={{borderBottom:`1px solid ${T.line}`}}>
              <td style={{padding:"6px 10px",color:T.ink3,whiteSpace:"nowrap"}}>{d.session}</td>
              <td style={{padding:"6px 10px",fontWeight:500,color:T.ink1,whiteSpace:"nowrap"}}>{d.joueur}</td>
              <td style={{padding:"6px 10px",color:T.ink3,whiteSpace:"nowrap"}}>{d.joueurAdverse||"—"}</td>
              <td style={{padding:"6px 10px",maxWidth:160,overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.offense}</td>
              <td style={{padding:"6px 10px",maxWidth:160,overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap",color:T.ink2}}>{d.defense}</td>
              <td style={{padding:"6px 10px",whiteSpace:"nowrap"}}>
                <span style={{color:d.victoire?T.green:T.red,fontWeight:600,fontSize:11}}>
                  {d.victoire?"✓ Victoire":"✗ Défaite"}</span></td>
              <td style={{padding:"6px 10px",color:T.ink3,whiteSpace:"nowrap"}}>{d.guildeAdverse}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>;
}
