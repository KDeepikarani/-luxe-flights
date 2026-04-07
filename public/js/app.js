// ===== API =====
const API = {
  token(){ return localStorage.getItem('lx_token'); },
  user(){ try{ return JSON.parse(localStorage.getItem('lx_user')); }catch{ return null; } },
  setAuth(token,user){ localStorage.setItem('lx_token',token); localStorage.setItem('lx_user',JSON.stringify(user)); },
  clear(){ localStorage.removeItem('lx_token'); localStorage.removeItem('lx_user'); },
  isAuth(){ return !!this.token(); },
  isAdmin(){ const u=this.user(); return u&&u.role==='admin'; },
  async req(endpoint, opts={}){
    const t=this.token();
    const res=await fetch('/api'+endpoint,{
      headers:{'Content-Type':'application/json',...(t&&{Authorization:`Bearer ${t}`}),...(opts.headers||{})},
      ...opts
    });
    const data=await res.json();
    if(res.status===401&&!endpoint.includes('/auth/')){ this.clear(); location.href='/login'; }
    return {ok:res.ok,status:res.status,data};
  },
  get(e){ return this.req(e); },
  post(e,b){ return this.req(e,{method:'POST',body:JSON.stringify(b)}); },
  put(e,b){ return this.req(e,{method:'PUT',body:JSON.stringify(b)}); },
  del(e){ return this.req(e,{method:'DELETE'}); }
};

// ===== TOAST =====
const Toast = {
  show(msg,type='info',duration=4000){
    let c=document.getElementById('toast-root');
    if(!c){ c=document.createElement('div'); c.id='toast-root'; c.className='toasts'; document.body.appendChild(c); }
    const icons={success:'✓',error:'✕',info:'ℹ'};
    const t=document.createElement('div');
    t.className=`toast toast-${type}`;
    t.innerHTML=`<span class="toast-icon">${icons[type]||'ℹ'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{ t.style.animation='toastIn 0.3s ease reverse'; setTimeout(()=>t.remove(),300); },duration);
  }
};

// ===== FORMAT =====
const fmt = {
  currency(n,currency='INR'){ return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(n); },
  date(d){ if(!d) return '—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); },
  datetime(d){ if(!d) return '—'; return new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); },
  ago(d){ const diff=Date.now()-new Date(d).getTime(); const m=Math.floor(diff/60000),h=Math.floor(m/60),dy=Math.floor(h/24); return dy>0?`${dy}d ago`:h>0?`${h}h ago`:m>0?`${m}m ago`:'just now'; },
  reason(r){ const m={change_of_plans:'Change of Plans',found_better_deal:'Better Deal Found',emergency:'Emergency',weather_conditions:'Weather',health_issues:'Health Issues',travel_restrictions:'Travel Restrictions',double_booking:'Double Booking',work_commitment:'Work Commitment',visa_issues:'Visa Issues',family_emergency:'Family Emergency',other:'Other'}; return m[r]||r; },
  class(c){ const m={Economy:'✈ Economy',Business:'💼 Business','First Class':'👑 First Class'}; return m[c]||c; },
  stops(n){ return n===0?'Direct':n===1?'1 Stop':`${n} Stops`; }
};

// ===== AUTH GUARD =====
function requireAuth(){ if(!API.isAuth()){ location.href='/login'; return false; } return true; }
function requireAdmin(){ if(!API.isAuth()||!API.isAdmin()){ location.href='/login'; return false; } return true; }

// ===== MODAL =====
function openModal(id){ const m=document.getElementById(id); if(m){ m.classList.add('open'); document.body.style.overflow='hidden'; } }
function closeModal(id){ const m=document.getElementById(id); if(m){ m.classList.remove('open'); document.body.style.overflow=''; } }
document.addEventListener('click',e=>{ if(e.target.classList.contains('modal-overlay')){ e.target.classList.remove('open'); document.body.style.overflow=''; } });

// ===== SIDEBAR =====
function buildSidebar(active){
  const user=API.user(); if(!user) return;
  const isAdmin=user.role==='admin';

  const userNav=[
    {icon:'⬡',label:'Dashboard',href:'/dashboard'},
    {icon:'✈',label:'Search Flights',href:'/flights'},
    {icon:'◈',label:'My Bookings',href:'/my-bookings'},
    {icon:'↩',label:'Refunds',href:'/refunds'},
    {icon:'◎',label:'Track Flight',href:'/track'},
    {icon:'💬',label:'Support',href:'/support'},
    {icon:'◇',label:'Profile',href:'/profile'},
  ];
  const adminNav=[
    {icon:'⬡',label:'Dashboard',href:'/admin'},
    {icon:'✈',label:'Manage Flights',href:'/admin?tab=flights'},
    {icon:'◈',label:'Bookings',href:'/admin?tab=bookings'},
    {icon:'↩',label:'Refunds',href:'/admin?tab=refunds'},
    {icon:'◉',label:'Users',href:'/admin?tab=users'},
    {icon:'💬',label:'Support Tickets',href:'/admin?tab=support',badge:'unread'},
    {icon:'◇',label:'Profile',href:'/profile'},
  ];
  const nav=isAdmin?adminNav:userNav;
  const el=document.getElementById('sidebar'); if(!el) return;

  el.innerHTML=`
    <div class="sb-logo">
      <div class="sb-logo-icon">✈</div>
      <div class="sb-logo-text">Luxe Flights</div>
      <div class="sb-logo-sub">Premium Aviation</div>
    </div>
    <nav class="sb-nav">
      <div class="sb-section">
        <div class="sb-section-label">${isAdmin?'Admin Panel':'Navigation'}</div>
        ${nav.map(n=>`
          <a href="${n.href}" class="sb-item ${location.pathname===n.href.split('?')[0]&&(active?active===n.label:true)?'active':''}">
            <span class="sb-icon">${n.icon}</span>
            <span>${n.label}</span>
            ${n.badge==='unread'?`<span class="sb-badge" id="sb-unread" style="display:none">0</span>`:''}
          </a>
        `).join('')}
      </div>
    </nav>
    <div class="sb-user">
      <div class="sb-user-card" onclick="location.href='/profile'">
        <div class="sb-avatar">${user.avatar?`<img src="${user.avatar}" onerror="this.parentElement.textContent='${user.name.charAt(0)}'">`:user.name.charAt(0).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div class="sb-uname" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.name}</div>
          <div class="sb-urole">${isAdmin?'👑 Admin':'✦ Member'}</div>
        </div>
        <span style="color:var(--text3);cursor:pointer;font-size:18px" onclick="event.stopPropagation();doLogout()">⏻</span>
      </div>
    </div>
  `;

  // Mobile hamburger
  const header=document.getElementById('page-header');
  if(header){
    const ham=document.createElement('div');
    ham.className='hamburger'; ham.id='hamburger';
    ham.innerHTML='<span></span><span></span><span></span>';
    ham.onclick=toggleSidebar;
    header.prepend(ham);
  }
}

function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const ov=document.getElementById('sb-overlay');
  sb.classList.toggle('open');
  if(ov) ov.classList.toggle('open');
}

function doLogout(){ API.clear(); Toast.show('Signed out','info',1500); setTimeout(()=>location.href='/login',600); }

// Background particles
function initParticles(){
  const wrap=document.getElementById('particles'); if(!wrap) return;
  for(let i=0;i<20;i++){
    const p=document.createElement('div');
    p.className='particle';
    p.style.cssText=`left:${Math.random()*100}%;animation-duration:${8+Math.random()*12}s;animation-delay:${Math.random()*10}s;opacity:${0.1+Math.random()*0.4}`;
    wrap.appendChild(p);
  }
}
document.addEventListener('DOMContentLoaded', initParticles);
