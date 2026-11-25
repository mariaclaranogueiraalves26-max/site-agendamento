const SERVICES=[
  {id:"corte",name:"Corte de cabelo",dur:"45 min",price:55},
  {id:"barba",name:"Barba",dur:"30 min",price:35},
  {id:"combo",name:"Corte + barba",dur:"1h15",price:80},
  {id:"mani",name:"Manicure",dur:"1h",price:45},
  {id:"massagem",name:"Massagem relaxante",dur:"1h",price:120},
  {id:"sobrancelha",name:"Design de sobrancelha",dur:"30 min",price:40}
];
const MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const DIAS=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const $=id=>document.getElementById(id);
const today=new Date();today.setHours(0,0,0,0);
const state={service:null,date:null,time:null,month:new Date(today.getFullYear(),today.getMonth(),1)};
let booked=new Set();
let mine={};
try{mine=JSON.parse(localStorage.getItem("reservas")||"{}")}catch(e){}
function saveMine(){try{localStorage.setItem("reservas",JSON.stringify(mine))}catch(e){}}

const key=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const brl=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

function baseSlots(d){
  const wd=d.getDay();if(wd===0)return[];
  const end=wd===6?14:18,out=[];
  for(let m=9*60;m<end*60;m+=30){
    if(m>=12*60&&m<13*60&&wd!==6)continue;
    out.push(String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"));
  }
  return out;
}
function hash(s){let h=7;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h%100}
function slotStatus(d,t){
  const k=key(d)+" "+t;
  if(mine[k])return "mine";
  if(booked.has(k)||hash(k)<32)return "taken"; // ocupados (simulação)
  if(d.getTime()===today.getTime()){
    const now=new Date(),[h,m]=t.split(":").map(Number);
    if(h*60+m<=now.getHours()*60+now.getMinutes())return "past";
  }
  return "free";
}
const isFree=(d,t)=>slotStatus(d,t)==="free";
const freeSlots=d=>baseSlots(d).filter(t=>isFree(d,t));

function renderServices(){
  const box=$("services");box.innerHTML="";
  SERVICES.forEach(s=>{
    const b=document.createElement("button");b.className="svc";b.type="button";
    b.setAttribute("aria-pressed",state.service===s);
    b.innerHTML="<b></b><span></span>";
    b.firstChild.textContent=s.name;b.lastChild.textContent=s.dur+" · "+brl(s.price);
    b.onclick=()=>{state.service=s;renderServices();renderSummary()};
    box.appendChild(b);
  });
}
function renderCal(){
  const m=state.month,cal=$("cal");cal.innerHTML="";
  $("monthLabel").textContent=MESES[m.getMonth()]+" de "+m.getFullYear();
  ["D","S","T","Q","Q","S","S"].forEach((l,i)=>{const e=document.createElement("div");e.className="dow";e.textContent=l;e.setAttribute("aria-label",DIAS[i]);cal.appendChild(e)});
  for(let i=0;i<m.getDay();i++)cal.appendChild(document.createElement("div"));
  const n=new Date(m.getFullYear(),m.getMonth()+1,0).getDate();
  const limit=new Date(today);limit.setDate(limit.getDate()+60);
  for(let i=1;i<=n;i++){
    const d=new Date(m.getFullYear(),m.getMonth(),i),b=document.createElement("button");
    b.type="button";b.className="day";b.textContent=i;
    const free=d<today||d>limit?0:freeSlots(d).length;
    b.disabled=free===0;
    if(d.getTime()===today.getTime())b.classList.add("today");
    if(free>0&&free<=3)b.classList.add("few");
    b.setAttribute("aria-pressed",!!state.date&&key(state.date)===key(d));
    b.setAttribute("aria-label",i+" de "+MESES[d.getMonth()]+(free?", "+free+" horários livres":", indisponível"));
    b.onclick=()=>{state.date=d;state.time=null;renderCal();renderSlots();renderSummary()};
    cal.appendChild(b);
  }
  $("prev").disabled=m<=new Date(today.getFullYear(),today.getMonth(),1);
  $("next").disabled=new Date(m.getFullYear(),m.getMonth()+1,1)>limit;
}
function renderSlots(){
  const box=$("slots");box.innerHTML="";
  if(!state.date){box.innerHTML='<p class="hint">Escolha uma data para ver os horários.</p>';$("taken").hidden=true;return}
  const all=baseSlots(state.date);
  [["Manhã",t=>+t.slice(0,2)<12],["Tarde",t=>+t.slice(0,2)>=12]].forEach(([title,fn])=>{
    const list=all.filter(fn);if(!list.length)return;
    const g=document.createElement("div");g.className="slot-group";
    g.innerHTML="<h3></h3><div class='slots'></div>";g.firstChild.textContent=title;
    list.forEach(t=>{
      const b=document.createElement("button"),st=slotStatus(state.date,t);b.type="button";b.className="slot"+(st==="free"?"":" "+st);
      b.textContent=t;b.disabled=st!=="free";
      if(st!=="free"){const s=document.createElement("small");s.textContent={taken:"ocupado",past:"encerrado",mine:"seu horário"}[st];b.appendChild(s)}
      b.setAttribute("aria-pressed",state.time===t);
      b.onclick=()=>{state.time=t;renderSlots();renderSummary()};
      g.lastChild.appendChild(b);
    });
    box.appendChild(g);
  });
  renderTaken();
}
function renderTaken(){
  const p=$("taken"),list=baseSlots(state.date).map(t=>[t,slotStatus(state.date,t)]).filter(x=>x[1]==="taken"||x[1]==="mine");
  p.hidden=false;p.innerHTML="";
  const h=document.createElement("h3");h.textContent=list.length?"Já agendados neste dia ("+list.length+")":"Nenhum horário agendado neste dia";p.appendChild(h);
  const c=document.createElement("div");c.className="chips";
  list.forEach(([t,s])=>{const e=document.createElement("span");e.className="chip"+(s==="mine"?" mine":"");e.textContent=s==="mine"?t+" · você":t;c.appendChild(e)});
  p.appendChild(c);
}
function renderMine(){
  const ks=Object.keys(mine).sort(),ul=$("mineList");
  $("mineCard").hidden=!ks.length;ul.innerHTML="";
  ks.forEach(k=>{
    const [d,t]=k.split(" "),[y,m,da]=d.split("-"),li=document.createElement("li"),w=document.createElement("div"),b=document.createElement("button"),s=document.createElement("small");
    w.textContent=da+"/"+m+" às "+t;s.textContent=mine[k].service;w.appendChild(s);
    b.type="button";b.className="link";b.textContent="Cancelar";b.setAttribute("aria-label","Cancelar agendamento de "+da+"/"+m+" às "+t);
    b.onclick=()=>{delete mine[k];saveMine();renderCal();renderSlots();renderMine()};
    li.append(w,b);ul.appendChild(li);
  });
}
function dateText(d){return DIAS[d.getDay()]+", "+d.getDate()+" de "+MESES[d.getMonth()]}
function renderSummary(){
  $("sSvc").textContent=state.service?state.service.name:"—";
  $("sDate").textContent=state.date?dateText(state.date):"—";
  $("sTime").textContent=state.time||"—";
  $("sPrice").textContent=state.service?brl(state.service.price):"—";
  $("confirm").disabled=!(state.service&&state.date&&state.time);
  renderMine();
}
$("prev").onclick=()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);renderCal()};
$("next").onclick=()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);renderCal()};
$("confirm").onclick=()=>{
  const name=$("name").value.trim(),phone=$("phone").value.replace(/\D/g,"");
  if(name.length<2){$("err").textContent="Informe seu nome.";$("name").focus();return}
  if(phone.length<10){$("err").textContent="Informe um WhatsApp com DDD.";$("phone").focus();return}
  $("err").textContent="";
  mine[key(state.date)+" "+state.time]={service:state.service.name,name};saveMine();
  $("doneText").textContent=name+", seu horário de "+state.service.name.toLowerCase()+" está reservado para "+dateText(state.date)+", às "+state.time+".";
  $("summaryCard").hidden=true;$("done").hidden=false;renderMine();renderCal();renderSlots();
};
$("again").onclick=()=>{
  state.service=null;state.date=null;state.time=null;
  $("name").value="";$("phone").value="";
  $("done").hidden=true;$("summaryCard").hidden=false;
  renderServices();renderCal();renderSlots();renderSummary();
};
renderServices();renderCal();renderSlots();renderSummary();
