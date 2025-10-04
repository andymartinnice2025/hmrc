'use strict';

var state = {
  authed: false,
  customer: { name: '—', niMasked: '—', taxYear: '—', balance: 0, dueDate: '' },
  eligibility: 'Unknown',
  options: [],
  schedule: [],
  lastSeries: []
};

function fmtGBP(v){
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);
}

function renderOverview(){
  var authed = state.authed;
  document.getElementById('name').textContent      = authed ? 'Alex Taylor' : '—';
  document.getElementById('ni').textContent        = authed ? 'QQ123***A'   : '—';
  document.getElementById('taxYear').textContent   = authed ? '2024/25'     : '—';
  document.getElementById('balance').textContent   = authed ? fmtGBP(1240.5) : '—';
  document.getElementById('dueDate').textContent   = authed ? new Date('2026-01-31').toLocaleDateString('en-GB') : '—';
  document.getElementById('eligibilityBadge').textContent = 'Eligibility: ' + (authed ? state.eligibility : '—');
  document.getElementById('authState').textContent = authed ? 'Signed in as Alex Taylor' : 'Signed out';
  if (authed){
    state.customer = { name: 'Alex Taylor', niMasked: 'QQ123***A', taxYear: '2024/25', balance: 1240.5, dueDate: '2026-01-31' };
  }
}

function renderOptions(){
  var wrap = document.getElementById('planOptions');
  wrap.innerHTML = '';
  if(state.options.length === 0){
    wrap.innerHTML = '<p class="text-sm text-gray-600">Use the buttons in the Assistant to populate options.</p>';
    return;
  }
  for(var i=0; i<state.options.length; i++){
    var opt = state.options[i];
    var tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'text-left rounded-xl border border-gray-200 hover:border-gov-blue hover:shadow p-4 transition duration-300 ease-out opacity-0 translate-y-2';
    tile.innerHTML =
      '<div class="text-xs text-gray-600">' + opt.months + ' months</div>' +
      '<div class="text-2xl font-bold">' + fmtGBP(opt.monthly) + '</div>' +
      '<div class="text-xs text-gray-600 mt-1">1st payment ' + new Date(opt.firstPayment).toLocaleDateString('en-GB') + '</div>' +
      '<div class="mt-3 text-sm">Total: <strong>' + fmtGBP(opt.total) + '</strong></div>';

    (function(months, firstPayment, el, idx){
      el.addEventListener('click', function(){
        el.classList.add('scale-95');
        setTimeout(function(){ el.classList.remove('scale-95'); }, 120);
        buildSchedule(months, state.customer.balance, firstPayment);
        setTimeout(function(){
          document.getElementById('scheduleCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      });
      setTimeout(function(){ el.classList.remove('opacity-0','translate-y-2'); }, 40 * idx);
    })(opt.months, opt.firstPayment, tile, i);

    wrap.appendChild(tile);
  }
}

function buildSchedule(months, total, firstDate){
  var per = Math.round((total / months) * 100) / 100;
  var start = new Date(firstDate);
  var rows = [];
  for (var i = 0; i < months; i++){
    var d = new Date(start);
    d.setMonth(d.getMonth() + i);
    var amt = (i === months - 1) ? Math.round((total - per * (months - 1)) * 100) / 100 : per;
    rows.push({ n: i + 1, date: d, amount: amt, status: 'Scheduled' });
  }
  state.schedule = rows;
  renderSchedule();

  var next = [];
  var running = total;
  next.push(running);
  for(var j=0; j<rows.length; j++){
    running = Math.max(0, +(running - rows[j].amount).toFixed(2));
    next.push(running);
  }
  animateBalanceSeries(state.lastSeries.length ? state.lastSeries : next, next);
  state.lastSeries = next.slice();
}

function renderSchedule(){
  var card = document.getElementById('scheduleCard');
  var body = document.getElementById('scheduleBody');
  body.innerHTML = '';
  for(var i=0; i<state.schedule.length; i++){
    var row = state.schedule[i];
    var tr = document.createElement('tr');
    tr.className = 'transition duration-300 ease-out opacity-0 translate-y-2';
    tr.innerHTML =
      '<td class="py-2 pr-6">' + row.n + '</td>' +
      '<td class="py-2 pr-6">' + row.date.toLocaleDateString('en-GB') + '</td>' +
      '<td class="py-2 pr-6">' + fmtGBP(row.amount) + '</td>' +
      '<td class="py-2 pr-6 text-gray-600">' + row.status + '</td>';
    (function(el, idx){
      setTimeout(function(){ el.classList.remove('opacity-0','translate-y-2'); }, 20 * idx);
    })(tr, i);
    body.appendChild(tr);
  }
  if(state.schedule.length > 0){ showCard(card); } else { card.hidden = true; }
}

function addTranscript(role, text){
  var t = document.getElementById('transcript');
  var who = role === 'bot' ? 'Assistant' : (role === 'user' ? 'You' : 'System');
  var line = document.createElement('div');
  line.className = 'my-1';
  line.innerHTML = '<strong>' + who + ':</strong> ' + text;
  t.appendChild(line);
  t.scrollTop = t.scrollHeight;
}

function wireDemoButtons(){
  var buttons = document.querySelectorAll('.demo-btn');
  for(var i=0; i<buttons.length; i++){
    (function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        var action = btn.getAttribute('data-demo');
        if (action === 'authenticate'){
          state.authed = true;
          state.eligibility = 'Unknown';
          renderOverview();
          addTranscript('system', 'Signed in via GOV.UK One Login (mock).');
        }
        if (action === 'eligibility'){
          if(!state.authed){ addTranscript('bot', 'Please sign in first to check eligibility.'); return; }
          state.eligibility = 'Likely';
          renderOverview();
          addTranscript('bot', 'You are likely eligible for a Time to Pay arrangement.');
        }
        if (action === 'options'){
          if(!state.authed){ addTranscript('bot', 'Please sign in first to see plan options.'); return; }
          var first = new Date(); first.setMonth(first.getMonth() + 1); first.setDate(1);
          state.options = [
            { months: 6, monthly: 216.75, firstPayment: first.toISOString(), total: 1240.5 },
            { months: 9, monthly: 144.50, firstPayment: first.toISOString(), total: 1240.5 },
            { months: 12, monthly: 108.38, firstPayment: first.toISOString(), total: 1240.5 }
          ];
          renderOptions();
          addTranscript('bot', 'Here are some plan options. Click one to preview the schedule.');
        }
        if (action === 'confirm'){
          addTranscript('user', 'Let’s go with 9 months.');
        }
      });
    })(buttons[i]);
  }
}

function renderBalanceCanvas(series){
  var card = document.getElementById('chartCard');
  var canvas = document.getElementById('balanceCanvas');
  if(!canvas){ return; }
  if(!series || series.length === 0){ card.hidden = true; return; }
  showCard(card);

  var dpr = window.devicePixelRatio || 1;
  var cssWidth = canvas.clientWidth || 600;
  var cssHeight = 180;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  var pad = { left: 56, right: 12, top: 16, bottom: 36 };
  var w = cssWidth - pad.left - pad.right;
  var h = cssHeight - pad.top - pad.bottom;

  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + h);
  ctx.lineTo(pad.left + w, pad.top + h);
  ctx.stroke();

  var maxY = 0; for(var i=0;i<series.length;i++){ if(series[i]>maxY) maxY=series[i]; }
  if(maxY <= 0){ maxY = 1; }
  var stepX = series.length > 1 ? w / (series.length - 1) : 0;

  // Grid labels
  var ticks = [0, 0.5*maxY, maxY];
  ctx.fillStyle = '#6b7280'; ctx.font = '12px Arial';
  for(var t=0; t<ticks.length; t++){
    var tv = ticks[t];
    var y = pad.top + h - (tv / maxY) * h;
    ctx.fillText('£' + tv.toFixed(0), 6, y + 4);
    ctx.strokeStyle = '#f3f4f6'; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + w, y); ctx.stroke();
  }

  // Line
  ctx.strokeStyle = '#1d70b8'; ctx.lineWidth = 2; ctx.beginPath();
  for(var j=0; j<series.length; j++){
    var v = series[j]; var x = pad.left + j * stepX; var yv = pad.top + h - (v / maxY) * h;
    if(j === 0){ ctx.moveTo(x, yv); } else { ctx.lineTo(x, yv); }
  }
  ctx.stroke();

  // Points + labels
  ctx.fillStyle = '#1d70b8';
  ctx.font = '11px Arial'; ctx.textAlign = 'center';
  for(var k=0; k<series.length; k++){
    var vv = series[k]; var px = pad.left + k * stepX; var py = pad.top + h - (vv / maxY) * h;
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI*2, false); ctx.fill();
    ctx.fillStyle = '#374151'; ctx.fillText('£' + vv.toFixed(0), px, py - 8); ctx.fillStyle = '#1d70b8';
  }

  // X labels
  ctx.fillStyle = '#6b7280'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
  for(var m=0; m<series.length; m++){
    var lx = pad.left + m * stepX; var ly = pad.top + h + 18;
    var label = (m === 0) ? 'Start' : ('M' + m);
    ctx.fillText(label, lx, ly);
  }
}

function showCard(card){
  if(card.hidden){
    card.hidden = false;
    card.classList.add('opacity-0','translate-y-2','transition','duration-300','ease-out');
    requestAnimationFrame(function(){ card.classList.remove('opacity-0','translate-y-2'); });
  }
}

function sampleSeries(arr, n){
  if(!arr || arr.length === 0){
    var zeros = []; for(var i=0;i<n;i++){ zeros.push(0); } return zeros;
  }
  if(arr.length === n){ return arr.slice(); }
  var out = []; var lastIdx = arr.length - 1;
  for(var i=0;i<n;i++){
    var pos = i * lastIdx / (n - 1);
    var i0 = Math.floor(pos); var i1 = Math.min(lastIdx, i0 + 1);
    var frac = pos - i0;
    out.push(arr[i0] * (1 - frac) + arr[i1] * frac);
  }
  return out;
}

function animateBalanceSeries(prev, next){
  var duration = 350;
  var startTs = null;
  var target = next.slice();
  var from = sampleSeries(prev, target.length);
  function step(ts){
    if(startTs === null) startTs = ts;
    var t = (ts - startTs) / duration; if(t > 1) t = 1;
    var cur = [];
    for(var i=0;i<target.length;i++){ cur[i] = from[i] * (1 - t) + target[i] * t; }
    renderBalanceCanvas(cur);
    if(t < 1){ requestAnimationFrame(step); }
  }
  requestAnimationFrame(step);
}

window.addEventListener('DOMContentLoaded', function(){
  renderOverview();
  renderOptions();
  wireDemoButtons();
  addTranscript('system', 'Demo ready. Use the buttons to simulate bot actions.');
  window.addEventListener('resize', function(){
    if(state.lastSeries.length > 0){ renderBalanceCanvas(state.lastSeries); }
  });
});