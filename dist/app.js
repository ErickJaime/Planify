const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',calendar:'M4 5h16v16H4z M8 2v6 M16 2v6 M4 10h16',list:'M9 6h12 M9 12h12 M9 18h12 M3 6h1 M3 12h1 M3 18h1',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',chart:'M4 3v18h18 M8 16v-5 M13 16V6 M18 16v-8',history:'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v6l4 2',help:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M9 8a3 3 0 1 1 4 3c-1 1-1 1-1 3 M12 17h.01',plus:'M12 5v14 M5 12h14',search:'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M16 16l6 6',check:'M5 12l4 4L19 6',arrow:'M5 12h14 M13 6l6 6-6 6',chevron:'M9 5l7 7-7 7',clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 6v6l4 2',flag:'M5 22V3c5-4 9 4 14 0v10c-5 4-9-4-14 0',close:'M6 6l12 12 M6 18L18 6',menu:'M3 6h18 M3 12h18 M3 18h18',settings:'M4 7h16 M4 17h16 M8 3v8 M16 13v8',logout:'M9 3H3v18h6 M10 12h12 M17 7l5 5-5 5',book:'M3 3h7l2 2 2-2h7v17h-7l-2 2-2-2H3z M12 5v17',sun:'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M20 4l-2 2 M6 18l-2 2'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[n]||paths.grid}"/></svg>`;
const cats=['Tareas','Juntas y reuniones','Trabajos y proyectos','Quehaceres','Eventos importantes'],colors=['#6f9bc2','#ac91c3','#61a9ab','#b1a16d','#d19487'],priorities=['Crítica','Alta','Media','Baja'],statuses=['Pendiente','Completada'];
const now=new Date(),today=localDate(now);function localDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}function relative(n){let d=new Date(today+'T12:00:00');d.setDate(d.getDate()+n);return localDate(d)}
let currentUser = null;

function emptyData() {
  return {
    activities: [],
    profile: { name: 'Usuario', email: '' },
    prefs: {
      reminders: true,
      anticipation: '1440',
      theme: 'Claro'
    },
    read: [],
    history: []
  };
}

let data = emptyData();
let page='dashboard',category='',special='',query='',priority='',status='',dashTab='Hoy',calMode='Mes',calDate=new Date(today+'T12:00:00'),statsPeriod='Todo',historyDate='',historyCategory='';
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
const pending=a=>a.status!=='Completada',due=a=>new Date(a.date+'T'+a.end),overdue=a=>pending(a)&&due(a)<new Date(),upcoming=a=>pending(a)&&due(a)>=new Date()&&a.date<=relative(7);const sorted=arr=>[...arr].sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));const fmt=(d,opts={day:'numeric',month:'short'})=>new Date(d+'T12:00:00').toLocaleDateString('es-MX',opts),fullDate=d=>fmt(d,{weekday:'long',day:'numeric',month:'long',year:'numeric'});const catColor=c=>colors[cats.indexOf(c)]||colors[0];
function go(p,c='',s=''){page=p;category=c;special=s;query='';priority='';status='';document.body.classList.remove('menu-open');render();window.scrollTo(0,0)}function navBtn(p,label,i,count=''){return `<button onclick="go('${p}')" class="${page===p?'nav-active':''}">${icon(i)}${label}${count!==''?`<span class="count">${count}</span>`:''}</button>`}
function sidebar(){return `<div class="brand"><span class="brandmark">${icon('check')}</span>planify<sup>β</sup></div><nav><div class="nav-label">MI ESPACIO</div>${navBtn('dashboard','Panel principal','grid')}${navBtn('calendar','Calendario','calendar')}${navBtn('activities','Mis actividades','list')}${navBtn('notifications','Avisos','bell',notices().filter(a=>!data.read.includes(a.id)).length)}<div class="nav-label">CATEGORÍAS</div>${cats.map((c,i)=>`<button class="category-nav ${category===c?'nav-active':''}" onclick="go('activities',cats[${i}])"><span class="dot" style="background:${colors[i]}"></span>${c}</button>`).join('')}<div class="nav-label">MI PROGRESO</div>${navBtn('stats','Estadísticas','chart')}${navBtn('history','Historial','history')}</nav><div class="sidebar-bottom"><div class="prototype-note"><strong>Un espacio para tus planes</strong>Organiza lo importante.<br>Avanza a tu propio ritmo.</div><button class="category-nav" onclick="go('help')">${icon('help')} Ayuda y guía de uso</button><button class="user" onclick="go('settings')"><span class="avatar">${esc(data.profile.name.substring(0,2).toUpperCase())}</span><div><strong style="font-size:12px">${esc(data.profile.name)}</strong><p class="muted small">Mi cuenta</p></div><span>${icon('settings')}</span></button></div>`}
const pageNames={dashboard:'Panel principal',calendar:'Calendario',activities:'Mis actividades',notifications:'Centro de avisos',stats:'Estadísticas',history:'Historial',settings:'Mi perfil',help:'Ayuda y guía'};
function render(){document.body.classList.toggle('dark',data.prefs.theme==='Oscuro');$('#sidebar').innerHTML=sidebar();$('#topbar').innerHTML=`<div class="breadcrumb"><button class="mobile-menu" aria-label="Abrir menú" onclick="document.body.classList.toggle('menu-open')">${icon('menu')}</button>Mi espacio <span style="color:#c3cdd0">/</span><span style="color:var(--ink)">${pageNames[page]}</span></div><div class="top-actions"><form class="top-search" onsubmit="event.preventDefault();globalSearch(this.q.value)">${icon('search')}<input name="q" aria-label="Buscar actividades" placeholder="Buscar una actividad..."></form><span class="small muted">${fmt(today,{day:'numeric',month:'short',year:'numeric'})}</span><button class="icon-btn notification" aria-label="Abrir avisos" onclick="go('notifications')">${icon('bell')}</button></div>`;const views={dashboard,calendar,activities,notifications,stats,history,settings,help};$('#main').innerHTML=views[page]()}
function heading(title,subtitle,action=true){return `<div class="page-heading"><div><div class="eyebrow">${page==='dashboard'?fullDate(today):'TU ORGANIZACIÓN PERSONAL'}</div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action?`<button class="btn primary" onclick="activityForm()">${icon('plus')} Nueva actividad</button>`:''}</div>`}
function stat(label,value,sub,i,action=''){return `<button class="stat" ${action?`onclick="${action}"`:''}><div class="stat-top">${label}<span class="stat-icon">${icon(i)}</span></div><div class="stat-value">${String(value).padStart(2,'0')}</div><div class="stat-bottom">${sub}</div></button>`}
function summaryStats(arr=data.activities){return `<div class="stats">${stat('Actividades de hoy',arr.filter(a=>a.date===today).length,'Tu agenda para este día','calendar',"go('activities','','today')")}${stat('Pendientes',arr.filter(pending).length,'Actividades por completar','clock',"go('activities','','pending')")}${stat('Completadas',arr.filter(a=>!pending(a)).length,'<b>Cada avance cuenta</b>','check',"go('activities','','completed')")}${stat('Vencidas',arr.filter(overdue).length,'Pendientes por retomar','flag',"go('activities','','overdue')")}</div>`}
function row(a){return `<div class="task-row"><button class="check ${pending(a)?'':'done'}" aria-label="${pending(a)?'Completar':'Reabrir'} ${esc(a.title)}" onclick="toggle(${a.id})">${pending(a)?'':icon('check')}</button><button class="task-title ${pending(a)?'':'finished'}" onclick="detail(${a.id})"><strong>${esc(a.title)}</strong><span class="meta"><span class="dot" style="background:${catColor(a.category)}"></span>${esc(a.category)} <span>·</span> ${esc(a.status)} ${overdue(a)?'<span style="color:var(--red)">· Vencida</span>':''}</span></button><span class="badge priority-${a.priority}"><span class="dot" style="background:currentColor;width:4px;height:4px"></span>${a.priority}</span><span class="time">${page==='dashboard'?a.start:fmt(a.date)}</span><button class="muted" aria-label="Ver detalle" onclick="detail(${a.id})">${icon('chevron')}</button></div>`}
function rows(arr){return arr.length?arr.map(row).join(''):'<div class="empty">No hay actividades para esta selección.<br><button class="text-btn" style="margin-top:12px" onclick="activityForm()">Crear una actividad</button></div>'}
function dashboard(){const day=data.activities.filter(a=>a.date===today),done=day.filter(a=>!pending(a)).length,pct=day.length?Math.round(done/day.length*100):0;let selected=dashTab==='Hoy'?day:dashTab==='Próximas'?data.activities.filter(upcoming):data.activities.filter(a=>!pending(a));let next=sorted(data.activities.filter(upcoming)).slice(0,3);return heading(`Tu día, en perspectiva.`,`Hola, ${data.profile.name}. Dale espacio a lo que realmente importa.`)+`<section class="hero"><div><div class="eyebrow">MENOS RUIDO, MÁS CLARIDAD</div><h2>Cada gran plan comienza<br>con un pequeño paso.</h2><p>Tienes ${day.filter(pending).length} actividades pendientes para hoy. Vamos una a la vez.</p></div><div class="hero-art" aria-hidden="true"><div class="art-ring"></div><div class="art-card"><div style="font-size:9px;color:#718d92;margin-bottom:12px">MI PLAN DE HOY</div>${[1,2,3].map((_,i)=>`<div style="display:flex;gap:7px;align-items:center"><span style="color:#15919f;font-size:12px">${i===0?'✓':'□'}</span><div class="line" style="width:${65-i*8}px"></div></div>`).join('')}</div><div class="art-check">${icon('check')}</div></div></section>${summaryStats()}<div class="dashboard-grid"><div><section class="card"><div class="card-head"><div><h2>Tu agenda</h2><p>Pequeños pasos, grandes avances.</p></div><button class="text-btn" onclick="go('activities')">Ver todas ↗</button></div><div class="tabs">${['Hoy','Próximas','Completadas'].map(t=>`<button class="${dashTab===t?'active':''}" onclick="dashTab='${t}';render()">${t} <span class="small">${t==='Hoy'?day.length:t==='Próximas'?data.activities.filter(upcoming).length:data.activities.filter(a=>!pending(a)).length}</span></button>`).join('')}</div>${rows(sorted(selected).slice(0,6))}<div class="agenda-summary"><span>${selected.length} actividades · ${dashTab.toLowerCase()}</span><button onclick="go('calendar')">Abrir calendario →</button></div></section><section class="progress-card"><div class="progress-circle" style="--p:${pct}%"><span>${pct}%</span></div><div class="progress-copy"><h3>Así va tu día</h3><p>${done} de ${day.length} actividades completadas. ${pct===100?'¡Buen trabajo!':'Tú marcas el ritmo.'}</p></div><button class="text-btn" onclick="go('stats')">Ver progreso ↗</button></section></div><div><section class="card"><div class="card-head"><h3 style="text-transform:capitalize">${fmt(localDate(calDate),{month:'long',year:'numeric'})}</h3><div><button aria-label="Mes anterior" onclick="shiftMonth(-1)">‹</button><button aria-label="Mes siguiente" onclick="shiftMonth(1)">›</button></div></div>${miniCalendar(calDate.getFullYear(),calDate.getMonth())}</section><section class="card soon"><div class="card-head"><div><h3>En el horizonte</h3><p>Lo que viene en los próximos días.</p></div>${icon('flag')}</div>${next.map(a=>`<button class="deadline" style="width:100%;text-align:left" onclick="detail(${a.id})"><div class="datebox"><small>${fmt(a.date,{month:'short'})}</small>${Number(a.date.slice(-2))}</div><div><strong>${esc(a.title)}</strong><p>${a.start} · ${a.priority}</p></div><span class="dot" style="background:${catColor(a.category)}"></span></button>`).join('')||'<p class="empty">Sin próximos vencimientos.</p>'}<div style="padding:16px 22px"><button class="text-btn" onclick="go('activities','','upcoming')">Ver próximos vencimientos →</button></div></section></div></div>`}
function monthDays(y,m){let start=new Date(y,m,1),offset=(start.getDay()+6)%7;start.setDate(1-offset);return Array.from({length:42},(_,i)=>{let d=new Date(start);d.setDate(start.getDate()+i);return d})}function miniCalendar(y,m){return `<div class="mini-calendar"><div class="weekdays">${['L','M','M','J','V','S','D'].map(d=>`<span>${d}</span>`).join('')}</div><div class="mini-grid">${monthDays(y,m).map(d=>{let ds=localDate(d);return `<button class="${d.getMonth()!==m?'outside ':''}${ds===today?'today ':''}${data.activities.some(a=>a.date===ds)?'has-event':''}" aria-label="Abrir ${fullDate(ds)}" onclick="openDay('${ds}')">${d.getDate()}</button>`}).join('')}</div></div>`}
function shiftMonth(n){calDate=new Date(calDate.getFullYear(),calDate.getMonth()+n,1,12);render()}function openDay(ds){calDate=new Date(ds+'T12:00:00');page='calendar';calMode='Día';render()}function shiftCalendar(n){if(calMode==='Año')calDate.setFullYear(calDate.getFullYear()+n);else if(calMode==='Mes')calDate=new Date(calDate.getFullYear(),calDate.getMonth()+n,1,12);else calDate.setDate(calDate.getDate()+n*(calMode==='Semana'?7:1));render()}
function chip(a){return `<button class="event-chip" style="--c:${catColor(a.category)}" onclick="detail(${a.id})" title="${esc(a.title)}">${a.start} ${esc(a.title)}${!pending(a)?' ✓':''}</button>`}
function calendar(){let y=calDate.getFullYear(),m=calDate.getMonth(),ds=localDate(calDate);let title=calMode==='Año'?String(y):calMode==='Día'?fullDate(ds):fmt(ds,{month:'long',year:'numeric'});let content='';if(calMode==='Año'){content=`<div class="year-grid">${Array.from({length:12},(_,i)=>`<div class="card"><button onclick="calDate=new Date(${y},${i},1,12);calMode='Mes';render()"><h3>${fmt(`${y}-${String(i+1).padStart(2,'0')}-01`,{month:'long'})} ↗</h3></button>${miniCalendar(y,i)}</div>`).join('')}</div>`}else if(calMode==='Mes'){content=`<div class="card scroll"><div class="calendar-grid">${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d=>`<div class="day-label">${d}</div>`).join('')}${monthDays(y,m).map(d=>{let date=localDate(d);return `<div class="calendar-cell ${d.getMonth()!==m?'outside':''}"><button class="calendar-date ${date===today?'today':''}" onclick="openDay('${date}')">${d.getDate()}</button>${sorted(data.activities.filter(a=>a.date===date)).map(chip).join('')}<button class="small muted" aria-label="Crear actividad el ${date}" onclick="activityForm(null,'${date}')">＋</button></div>`}).join('')}</div></div>`}else if(calMode==='Semana'){let start=new Date(calDate);start.setDate(start.getDate()-((start.getDay()+6)%7));content=`<div class="card scroll"><div class="week-grid">${Array.from({length:7},(_,i)=>{let d=new Date(start);d.setDate(d.getDate()+i);let date=localDate(d);return `<div class="week-day"><h3><button onclick="openDay('${date}')">${fmt(date,{weekday:'short',day:'numeric',month:'short'})}</button></h3>${sorted(data.activities.filter(a=>a.date===date)).map(chip).join('')}<button class="btn small" onclick="activityForm(null,'${date}')">＋ Agregar</button></div>`}).join('')}</div></div><p class="small muted" style="margin-top:12px">Las actividades se ordenan por hora. Los horarios coincidentes permanecen visibles.</p>`}else{let day=sorted(data.activities.filter(a=>a.date===ds));content=`<div class="card"><div class="card-head"><h2>Agenda del día</h2><button class="text-btn" onclick="activityForm(null,'${ds}')">＋ Agregar a este día</button></div><div class="timeline">${day.length?day.map(a=>`<div class="timeline-row"><span>${a.start}<br>${a.end}</span><div style="flex:1">${chip(a)}<p class="small muted">${esc(a.category)} · ${a.priority} · ${a.status}</p></div></div>`).join(''):'<div class="empty">Un día con espacio para tus planes.</div>'}</div></div>`}return heading('Tu calendario','Un lugar para ver cada plan en su momento.')+`<div class="calendar-tools"><div style="display:flex;align-items:center;gap:12px"><button class="icon-btn" aria-label="Periodo anterior" onclick="shiftCalendar(-1)">‹</button><button class="icon-btn" aria-label="Periodo siguiente" onclick="shiftCalendar(1)">›</button><h2 style="text-transform:capitalize">${title}</h2><button class="btn" onclick="calDate=new Date(today+'T12:00:00');render()">Hoy</button></div><div class="segmented">${['Año','Mes','Semana','Día'].map(v=>`<button class="${calMode===v?'active':''}" onclick="calMode='${v}';render()">${v}</button>`).join('')}</div></div>${content}<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:20px">${cats.map((c,i)=>`<span class="small muted"><span class="dot" style="background:${colors[i]};margin-right:5px"></span>${c}</span>`).join('')}</div>`}
const specials={today:'Actividades de hoy',process:'Actividades pendientes',completed:'Actividades completadas',overdue:'Actividades vencidas',upcoming:'Próximos vencimientos',critical:'Prioridad crítica y alta'};
function filtered(){return sorted(data.activities.filter(a=>(!category||a.category===category)&&(!priority||a.priority===priority)&&(!status||a.status===status)&&(!query||(a.title+' '+a.description).toLowerCase().includes(query.toLowerCase()))&&(!special||(special==='today'?a.date===today:special==='pending'?pending(a):special==='completed'?!pending(a):special==='overdue'?overdue(a):special==='upcoming'?upcoming(a):special==='critical'?pending(a)&&['Crítica','Alta'].includes(a.priority):true))))}
function options(arr,sel,empty){return (empty?`<option value="">${empty}</option>`:'')+arr.map(c=>`<option ${sel===c?'selected':''} value="${esc(c)}">${esc(c)}</option>`).join('')}
function activities(){return heading(category||specials[special]||'Todas tus actividades','Encuentra lo que necesitas y decide tu siguiente paso.')+`<div class="toolbar"><input id="filterSearch" aria-label="Buscar por título o descripción" placeholder="Buscar por título o descripción…" value="${esc(query)}" oninput="query=this.value;updateRows()"><select aria-label="Categoría" onchange="category=this.value;updateRows()">${options(cats,category,'Todas las categorías')}</select><select aria-label="Prioridad" onchange="priority=this.value;updateRows()">${options(priorities,priority,'Toda prioridad')}</select><select aria-label="Estado" onchange="status=this.value;updateRows()">${options(statuses,status,'Todos los estados')}</select><button class="btn" onclick="go('activities')">Limpiar</button></div><div class="toolbar">${[['','Todas'],['critical','Críticas y altas'],['upcoming','Próximas'],['overdue','Vencidas'],['completed','Completadas']].map(([s,l])=>`<button class="btn ${special===s?'soft':''}" onclick="special='${s}';render()">${l}</button>`).join('')}</div><section class="card"><div class="card-head"><h3>Listado de actividades</h3><span id="resultCount" class="small muted">${filtered().length} resultados</span></div><div id="activityRows">${rows(filtered())}</div></section>`}
function updateRows(){$('#activityRows').innerHTML=rows(filtered());$('#resultCount').textContent=filtered().length+' resultados'}function globalSearch(q){go('activities');query=q;render()}
async function toggle(id) {
  const activity = data.activities.find(a => a.id === id);

  if (!activity) return;

  const newStatus = pending(activity) ? 'Completada' : 'Pendiente';
  let saved = false;

  try {
    await apiRequest(`/api/activities/${id}/status`, 'PATCH', {
      status: newStatus
    });

    saved = true;

    await reloadActivities();
    render();

    toast(
      newStatus === 'Completada'
        ? 'Actividad completada'
        : 'Actividad reabierta'
    );
  } catch (error) {
    toast(saved
      ? 'El estado se guardó. Recarga para actualizar el listado.'
      : error.message
    );
  }
}
function modal(title,body){$('#modal').innerHTML=`<div class="modal-head"><h2>${title}</h2><button aria-label="Cerrar ventana" onclick="closeModal()">${icon('close')}</button></div><div class="modal-body">${body}</div>`;if(!$('#modal').open)$('#modal').showModal()}function closeModal(){$('#modal').close()}$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal()}});
function activityForm(id=null,date=null){let a=id?data.activities.find(x=>x.id===id):{title:'',description:'',date:date||today,start:'12:00',end:'13:00',category:category||cats[0],priority:'Media',status:'Pendiente'};modal(id?'Editar actividad':'Un nuevo paso en tu agenda',`<form class="form" onsubmit="event.preventDefault();submitActivity(this,${id})"><label>Título de la actividad <input name="title" required maxlength="150" placeholder="¿Qué tienes en mente?" value="${esc(a.title)}"></label><label>Descripción <textarea name="description" maxlength="2000" placeholder="Detalles que te ayuden a recordarlo…">${esc(a.description)}</textarea><span class="field-note">Opcional</span></label><div class="row"><label>Fecha <input type="date" name="date" required value="${a.date}"></label><label>Categoría <select name="category">${options(cats,a.category)}</select></label></div><div class="row"><label>Hora de inicio <input type="time" name="start" required value="${a.start}"></label><label>Hora de fin <input type="time" name="end" required value="${a.end}"></label></div><div class="row"><label>Prioridad <select name="priority">${options(priorities,a.priority)}</select></label><label><input type="hidden" name="status" value="${esc(a.status)}">
  </div><div id="formError" class="error" role="alert"></div><div class="modal-foot"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary">${id?'Guardar cambios':'Crear actividad'}</button></div></form>`)}
async function submitActivity(form, id) {
  const values = Object.fromEntries(new FormData(form));
  const errorBox = form.querySelector('#formError');
  const button = form.querySelector('button:not([type="button"])');

  errorBox.textContent = '';
  values.title = values.title.trim();

  if (!values.title) {
    errorBox.textContent = 'Escribe un título para tu actividad.';
    return;
  }

  if (values.end <= values.start) {
    errorBox.textContent =
      'La hora de fin debe ser posterior al inicio.';
    return;
  }

  delete values.status;
  button.disabled = true;

  let saved = false;

  try {
    const result = await apiRequest(
      id ? `/api/activities/${id}` : '/api/activities',
      id ? 'PATCH' : 'POST',
      values
    );

    saved = true;

    const activityId = id || result.id;
    data.read = data.read.filter(readId => readId !== activityId);

    await reloadActivities();

    closeModal();
    render();
    toast(id ? 'Cambios guardados' : 'Actividad creada');
  } catch (error) {
    if (saved) {
      closeModal();
      toast('Se guardó en MySQL. Recarga para actualizar el listado.');
    } else {
      errorBox.textContent = error.message;
    }
  } finally {
    button.disabled = false;
  }
}
function detail(id){let a=data.activities.find(x=>x.id===id);let remaining=due(a)-new Date(),hours=Math.ceil(Math.abs(remaining)/3600000),duration=hours>24?`${Math.ceil(hours/24)} días`:`${hours} h`;modal('Detalle de actividad',`<span class="badge priority-${a.priority}">${a.priority}</span> <span class="small muted">${esc(a.status)}</span><h2 class="detail-title">${esc(a.title)}</h2><p class="muted">${esc(a.description)||'Sin descripción.'}</p><div class="details"><div><small>FECHA</small><p>${fullDate(a.date)}</p></div><div><small>HORARIO</small><p>${a.start} – ${a.end}</p></div><div><small>CATEGORÍA</small><p><span class="dot" style="background:${catColor(a.category)}"></span> ${esc(a.category)}</p></div><div><small>${pending(a)?'VENCIMIENTO':'FINALIZACIÓN'}</small><p>${pending(a)?(remaining<0?'Vencida hace ':'Dentro de ')+duration: a.completedAt?new Date(a.completedAt).toLocaleString('es-MX'):'Completada'}</p></div></div><div class="modal-foot"><button class="btn" onclick="deleteActivity(${id})">Eliminar</button><button class="btn" onclick= "activityForm(${id})">Editar${overdue(a)?' / Reprogramar':''}</button><button class="btn primary" onclick="closeModal();toggle(${id})">${icon('check')}${pending(a)?'Completar':'Reabrir'}</button></div>`)}
function notices(){return data.prefs.reminders?sorted(data.activities.filter(a=>pending(a)&&(overdue(a)||(due(a)-new Date())/60000<=Number(data.prefs.anticipation)))):[]}
function notifications(){if (!data.prefs.reminders) {
  return heading(
    'Todo a su tiempo',
    'Avisos internos para que lo importante siga a la vista.',
    false
  ) + `
    <div class="notice">
      Los avisos internos están desactivados.
      <button class="text-btn" onclick="go('settings')">
        Configurar avisos →
      </button>
    </div>
  `;
}let ns=notices();return heading('Todo a su tiempo','Avisos internos para que lo importante siga a la vista.',false)+`<div class="notice">${data.prefs.reminders
  ? `Avisos activados · Anticipación: ${
      data.prefs.anticipation === '1440'
        ? '1 día'
        : data.prefs.anticipation + ' minutos'
    }. Se actualizan al consultar la aplicación.`
  : 'Los avisos internos están desactivados.'
}<button class="text-btn" onclick="go('settings')">Configurar avisos →</button></div><div class="toolbar"><button class="btn" onclick="markNoticesRead(notices().map(a => a.id))">Marcar todos como leídos</button><button class="btn" onclick="go('activities','','overdue')">Ver vencidas</button><button class="btn" onclick="go('activities','','critical')">Ver críticas y altas</button></div><section class="card">${ns.length?ns.map(a=>`<div class="task-row"><span class="stat-icon" style="color:${overdue(a)?'var(--red)':'var(--accent)'}">${icon(overdue(a)?'flag':'bell')}</span><button class="task-title" onclick="detail(${a.id})"><strong>${overdue(a)?'Actividad vencida':'Próximo vencimiento'}: ${esc(a.title)}</strong><span class="meta">${fmt(a.date)} · ${a.end} · ${a.priority}</span></button><span class="small muted">${data.read.includes(a.id)?'Leído':'Sin leer'}</span><button class="text-btn" onclick="markNoticesRead([${a.id}])">${data.read.includes(a.id)?'✓':'Marcar leído'}</button></div>`).join(''):'<div class="empty">No tienes avisos pendientes en este momento.</div>'}</section>`}
function stats(){let arr=data.activities.filter(a=>statsPeriod==='Todo'||(statsPeriod==='Esta semana'?a.date>=relative(-((now.getDay()+6)%7))&&a.date<=relative(6-((now.getDay()+6)%7)):a.date.slice(0,7)===today.slice(0,7))),done=arr.filter(a=>!pending(a)).length,pct=arr.length?Math.round(done/arr.length*100):0;return heading('Cada avance cuenta','Una mirada sencilla a tu organización personal.',false)+`<div class="toolbar"><select aria-label="Periodo de estadísticas" onchange="statsPeriod=this.value;render()">${options(['Todo','Esta semana','Este mes'],statsPeriod)}</select><span class="small muted">Periodo según la fecha programada de la actividad.</span></div>${summaryStats(arr)}<div class="settings-grid"><section class="card"><div class="card-head"><h2>Actividades por categoría</h2></div><div class="bars">${cats.map((c,i)=>{let n=arr.filter(a=>a.category===c).length;return `<div><div class="bar-head"><span>${c}</span><span>${n}</span></div><div class="bar-bg"><div class="bar-fill" style="width:${arr.length?n/arr.length*100:0}%;background:${colors[i]}"></div></div></div>`}).join('')}</div></section><section class="card" style="padding:28px"><h2>Tu progreso general</h2><div style="display:flex;align-items:center;gap:24px;padding:35px 0"><div class="progress-circle" style="--p:${pct}%;width:100px;height:100px"><span style="width:80px;height:80px;font-size:24px">${pct}%</span></div><div><h3>${done} de ${arr.length} completadas</h3><p class="muted small" style="margin-top:8px">Avanza a tu propio ritmo.<br>Cada actividad cuenta.</p></div></div><button class="btn soft" onclick="go('activities','','completed')">Consultar completadas →</button></section></div>`}
function history(){let h=data.history.filter(x=>(!historyDate||localDate(new Date(x.date))===historyDate)&&(!historyCategory||x.category===historyCategory));return heading('Tu camino, paso a paso','Consulta tus actividades a través del tiempo.',false)+`<div class="toolbar"><input aria-label="Fecha del historial" type="date" value="${historyDate}" onchange="historyDate=this.value;render()"><select aria-label="Categoría del historial" onchange="historyCategory=this.value;render()">${options(cats,historyCategory,'Todas las categorías')}</select><button class="btn" onclick="historyDate='';historyCategory='';render()">Limpiar</button><button class="btn soft" onclick="go('activities','','completed')">Ver actividades completadas</button></div><section class="card">${h.length?h.map(x=>`<div class="history-row">${icon('history')}<span>${new Date(x.date).toLocaleString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span><div><strong>${esc(x.title)}</strong><p class="muted small">${esc(x.action)} · ${esc(x.category)}</p></div></div>`).join(''):'<div class="empty">Aquí aparecerán los cambios que realices.<br>Crea, edita o completa una actividad para comenzar.</div>'}</section>`}
function settings() {
  return heading(
    'Tu espacio, a tu manera',
    'Ajusta tu perfil y elige cómo quieres organizarte.',
    false
  ) + `
    <div class="settings-grid">
      <section class="card">
        <form
          class="form"
          onsubmit="event.preventDefault();saveProfile(this)"
        >
          <h2>Mi perfil</h2>

          <label>
            Nombre
            <input
              required
              maxlength="80"
              name="name"
              value="${esc(data.profile.name)}"
            >
          </label>

          <label>
            Correo electrónico
            <input
              name="email"
              required
              type="email"
              value="${esc(data.profile.email)}"
            >
          </label>

          <p class="field-note">
            Los horarios usan automáticamente la zona horaria
            de tu ordenador.
          </p>

          <button class="btn primary">Guardar perfil</button>
        </form>

        <button
          class="text-btn"
          style="margin-top:25px"
          onclick="logoutAccount()"
        >
          ${icon('logout')} Cerrar sesión
        </button>
      </section>

      <section class="card">
        <form
          class="form"
          onsubmit="event.preventDefault();savePreferences(this)"
        >
          <h2>Preferencias</h2>

          <div class="setting-line">
            <div>
              <h3>Avisos internos</h3>
              <p>Alertas de actividades próximas o vencidas.</p>
            </div>
            <input
              aria-label="Activar avisos internos"
              name="reminders"
              type="checkbox"
              ${data.prefs.reminders ? 'checked' : ''}
            >
          </div>

          <label>
            Recordarme con anticipación
            <select name="anticipation">
              ${[
                ['30', '30 minutos'],
                ['60', '1 hora'],
                ['1440', '1 día'],
                ['4320', '3 días']
              ].map(([value, label]) => `
                <option
                  value="${value}"
                  ${value === data.prefs.anticipation ? 'selected' : ''}
                >
                  ${label}
                </option>
              `).join('')}
            </select>
          </label>

          <label>
            Apariencia
            <select name="theme">
              ${options(['Claro', 'Oscuro'], data.prefs.theme)}
            </select>
          </label>

          <p class="field-note">
            Los avisos se muestran dentro de Planify.
            No se envían correos, SMS ni notificaciones push.
          </p>

          <button class="btn primary">Guardar preferencias</button>
        </form>
      </section>
    </div>
  `;
}
function saveProfile(form) {
  const values = Object.fromEntries(new FormData(form));

  values.name = values.name.trim();
  values.email = values.email.trim().toLowerCase();

  if (!values.name) {
    toast('Escribe un nombre válido');
    return;
  }

  modal('Confirmar cambios de perfil', `
    <p>
      ¿Guardar el nombre <strong>${esc(values.name)}</strong>
      y el correo <strong>${esc(values.email)}</strong>?
    </p>

    <div id="profileError" class="error" role="alert"></div>

    <div class="modal-foot" style="margin-top:25px">
      <button class="btn" onclick="closeModal()">
        Cancelar
      </button>
      <button id="confirmProfile" class="btn primary">
        Confirmar y guardar
      </button>
    </div>
  `);

  const button = document.querySelector('#confirmProfile');
  const errorBox = document.querySelector('#profileError');

  button.onclick = async () => {
    button.disabled = true;
    errorBox.textContent = '';

    try {
      const result = await apiRequest(
        '/api/auth/profile',
        'PATCH',
        values
      );

      currentUser = result.user;

      data.profile = {
        name: result.user.name,
        email: result.user.email
      };

      closeModal();
      render();
      toast('Perfil actualizado');
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
}
function help(){return heading('Un poco de claridad','Todo lo que necesitas para empezar a usar Planify.',false)+`<div class="help-grid"><section class="card"><h3>01 · Crea tu primera actividad</h3><p>Selecciona «Nueva actividad». Añade un título, fecha, horario, categoría y prioridad. La descripción es opcional y la hora de fin debe ser posterior al inicio.</p><button class="btn soft" style="margin-top:20px" onclick="activityForm()">${icon('plus')} Probar ahora</button></section><section class="card"><h3>02 · Encuentra tu perspectiva</h3><p>Consulta el calendario anual, mensual, semanal o diario. Selecciona una fecha para abrir su agenda o una actividad para revisar sus detalles.</p><button class="btn soft" style="margin-top:20px" onclick="go('calendar')">${icon('calendar')} Abrir calendario</button></section><section class="card"><h3>03 · Ordena lo que importa</h3><p>Usa las cinco categorías para separar tus planes. Las prioridades Crítica, Alta, Media y Baja ayudan a decidir qué atender primero. Combina búsqueda y filtros en Mis actividades.</p></section><section class="card"><h3>04 · Edita, completa y retoma</h3><p>Abre una actividad para editarla o cambiar su estado. La casilla del listado permite completar o reabrir. Una actividad completada sale de los pendientes vencidos; su finalización se conserva.</p></section><section class="card"><h3>05 · Consulta tus avisos</h3><p>Los avisos son internos. Puedes marcarlos como leídos y ajustar su anticipación en Mi perfil. Se recalculan cuando consultas la aplicación.</p></section><section class="card"><h3>06 · Acerca de esta versión</h3><p>Organiza tus actividades con el calendario, las categorías y las prioridades. Consulta tus avisos, estadísticas e historial para dar seguimiento a tus pendientes. Los datos se guardan en este navegador y los horarios usan la zona horaria de tu ordenador.</p><button class="text-btn" style="margin-top:20px" onclick="showScope()">Consultar alcance →</button></section></div>`}
function showScope() {
  modal('Acerca de Planify', `
    <p>
      Organiza tus actividades personales, académicas y laborales
      mediante un calendario, categorías y prioridades.
    </p>

    <div class="notice" style="margin-top:20px">
      Crea, edita y completa actividades. Consulta tu calendario,
      tus avisos, estadísticas e historial.
    </div>

    <p class="muted small">
      Tus datos se guardan en este navegador.
      Aún no se sincronizan entre dispositivos.
    </p>

    <div class="modal-foot" style="margin-top:22px">
      <button class="btn primary" onclick="closeModal()">
        Entendido
      </button>
    </div>
  `);
}
function auth(mode = 'login') {
  document.querySelector('.auth-screen')?.remove();

  const registering = mode === 'register';
  const pane = document.createElement('div');

  pane.className = 'auth-screen';

  pane.innerHTML = `
    <div class="auth-intro">
      <div class="brand" style="padding:0">
        <span class="brandmark">${icon('check')}</span>
        planify
      </div>

      <div>
        <div class="eyebrow">HAZ ESPACIO PARA LO IMPORTANTE</div>
        <h1>Tus planes.<br>Tu tiempo.<br>Tu propio ritmo.</h1>
        <p>Organiza tus actividades y avanza con claridad.</p>
      </div>

      <p class="small">Un pequeño paso hoy.</p>
    </div>

    <div class="auth-form">
      <div class="auth-inner">
        <h2>${registering ? 'Crea tu cuenta' : 'Inicia sesión'}</h2>

        <form class="form" id="authForm">
          ${registering ? `
            <label>
              Nombre
              <input
                name="name"
                required
                maxlength="80"
                autocomplete="name"
              >
            </label>
          ` : ''}

          <label>
            Correo electrónico
            <input
              name="email"
              type="email"
              required
              maxlength="254"
              autocomplete="username"
            >
          </label>

          <label>
            Contraseña
            <input
              name="password"
              type="password"
              required
              minlength="${registering ? 12 : 1}"
              maxlength="128"
              autocomplete="${registering ? 'new-password' : 'current-password'}"
            >
          </label>

          ${registering ? `
            <span class="field-note">
              Usa entre 12 y 128 caracteres.
            </span>

            <label>
              Confirmar contraseña
              <input
                name="confirm"
                type="password"
                required
                minlength="12"
                maxlength="128"
                autocomplete="new-password"
              >
            </label>
          ` : ''}

          <div id="authError" class="error" role="alert"></div>
          <div id="authMessage" role="status"></div>

          <button type="submit" class="btn primary">
            ${registering ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <div class="auth-links">
          <button
            type="button"
            class="text-btn"
            onclick="auth('${registering ? 'login' : 'register'}')"
          >
            ${registering
              ? 'Ya tengo cuenta'
              : 'Crear una cuenta'}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(pane);

  const form = pane.querySelector('#authForm');
  const errorBox = pane.querySelector('#authError');
  const messageBox = pane.querySelector('#authMessage');
  const submitButton = form.querySelector('[type="submit"]');

  form.onsubmit = async event => {
    event.preventDefault();

    errorBox.textContent = '';
    messageBox.textContent = '';

    const values = Object.fromEntries(new FormData(form));

    if (registering && values.password !== values.confirm) {
      errorBox.textContent = 'Las contraseñas no coinciden.';
      return;
    }

    delete values.confirm;
    submitButton.disabled = true;

    try {
      const result = await authRequest(
        registering ? 'register' : 'login',
        values
      );

      form.reset();

      if (registering) {
        auth('login');

        document.querySelector('#authMessage').textContent =
          'Cuenta creada. Ya puedes iniciar sesión.';
      } else {
        await openAccount(result.user);
      }
    } catch (error) {
      errorBox.textContent = error instanceof TypeError
        ? 'No se pudo conectar con el servidor.'
        : error.message;
    } finally {
      submitButton.disabled = false;
    }
  };
}
async function initializeApp() {
  await auth('login');

  const form = document.querySelector('#authForm');
  const submitButton = form.querySelector('[type="submit"]');

  submitButton.disabled = true;

  try {
    const response = await fetch('/api/auth/me');
    const result = await response.json();

    if (response.ok) {
      await openAccount(result.user);
    } else if (response.status !== 401) {
      throw new Error('No se pudo consultar la sesión.');
    }
  } catch {
    document.querySelector('#authError').textContent =
      'No se pudo comprobar la sesión. Intenta recargar la página.';
  } finally {
    submitButton.disabled = false;
  }
}

async function logoutAccount() {
  try {
    await authRequest('logout');

    currentUser = null;
    data = emptyData();

    closeModal();

    document.querySelector('#sidebar').innerHTML = '';
    document.querySelector('#topbar').innerHTML = '';
    document.querySelector('#main').innerHTML = '';

    auth('login');
  } catch {
    toast('No se pudo cerrar la sesión. Intenta nuevamente.');
  }
}
initializeApp();
function deleteActivity(id) {
  const activity = data.activities.find(a => a.id === id);

  if (!activity) return;

  modal('Eliminar actividad', `
    <p>
      ¿Quieres eliminar <strong>${esc(activity.title)}</strong>?
    </p>

    <p class="muted small" style="margin-top:12px">
      Esta acción no se puede deshacer.
    </p>

    <div class="modal-foot" style="margin-top:24px">
      <button class="btn" onclick="detail(${id})">
        Cancelar
      </button>

      <button class="btn danger" onclick="confirmDeleteActivity(${id})">
        Sí, eliminar
      </button>
    </div>
  `);
}

async function confirmDeleteActivity(id) {
  const activity = data.activities.find(a => a.id === id);

  if (!activity) return;

  let deleted = false;

  try {
    await apiRequest(`/api/activities/${id}`, 'DELETE');
    deleted = true;

    data.read = data.read.filter(readId => readId !== id);
    

    closeModal();
    await reloadActivities();
    render();

    toast('Actividad eliminada');
  } catch (error) {
    if (deleted) {
      closeModal();
    }

    toast(deleted
      ? 'Se eliminó en MySQL. Recarga para actualizar el listado.'
      : error.message
    );
  }
}
async function authRequest(action, values = {}) {
  const response = await fetch(`/api/auth/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(values)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || 'No se pudo completar la solicitud.'
    );
  }

  return result;
}

async function openAccount(user) {
  currentUser = user;
  data = emptyData();

  data.profile = {
    name: user.name,
    email: user.email
  };

  await reloadActivities();

  const result = await apiRequest('/api/preferences');
  data.prefs = result.preferences;

  document.querySelector('.auth-screen')?.remove();
  go('dashboard');
}

async function apiRequest(path, method = 'GET', values) {
  const options = { method };

  if (values !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(values);
  }

  const response = await fetch(path, options);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error(
      `El servidor devolvió una respuesta inesperada (${response.status}).`
    );
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || `La solicitud falló (${response.status}).`
    );
  }

  return result;
}

async function reloadActivities() {
  const [activityResult, historyResult, readResult] = await Promise.all([
    apiRequest('/api/activities'),
    apiRequest('/api/history'),
    apiRequest('/api/notices/read')
  ]);

  data.activities = activityResult.activities;
  data.history = historyResult.history;
  data.read = readResult.read;
}

async function savePreferences(form) {
  const button = form.querySelector('button[type="submit"], button:not([type])');

  button.disabled = true;

  try {
    const result = await apiRequest('/api/preferences', 'PATCH', {
      reminders: form.elements.reminders.checked,
      anticipation: form.elements.anticipation.value,
      theme: form.elements.theme.value
    });

    data.prefs = result.preferences;

    render();
    toast('Preferencias guardadas');
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
}

async function markNoticesRead(activityIds) {
  if (!activityIds.length) {
    toast('No hay avisos para marcar');
    return;
  }

  try {
    await apiRequest('/api/notices/read', 'POST', {
      activityIds
    });

    const result = await apiRequest('/api/notices/read');
    data.read = result.read;

    render();
    toast('Avisos marcados como leídos');
  } catch (error) {
    toast(error.message);
  }
}
