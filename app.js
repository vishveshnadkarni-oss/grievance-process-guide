(function () {
  'use strict';

  var TYPE_LABEL = { start: 'Start', action: 'Action', decision: 'Decision', escalation: 'Escalation', closure: 'Closure' };
  var FIELDS = [
    ['owner', 'Owner'],
    ['action', 'What to do'],
    ['system', 'System / tool'],
    ['docs', 'Documents needed'],
    ['tat', 'TAT'],
    ['notes', 'Notes / templates']
  ];
  var EDIT = location.hash === '#edit';
  var DRAFT_KEY = 'grievance-flow-draft-v1';
  var W = 230, H = 84, GX = 80, GY = 28, PAD = 24;

  var FLOW = null;
  var view = EDIT ? 'map' : 'walk';
  var path = [];
  var selected = null;
  var zoom = 1;
  var scrollTo = null;

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return 'n' + Math.random().toString(36).slice(2, 8); }
  function nodeList() { return Object.keys(FLOW.nodes).map(function (k) { return FLOW.nodes[k]; }); }

  function normalize() {
    var ids = Object.keys(FLOW.nodes);
    ids.forEach(function (id) {
      var n = FLOW.nodes[id];
      n.id = id;
      if (!TYPE_LABEL[n.type]) n.type = 'action';
      n.title = n.title || 'Untitled step';
      n.details = n.details || {};
      n.next = (n.next || []).filter(function (e) { return e && typeof e === 'object'; });
    });
    if (!FLOW.nodes[FLOW.startId]) FLOW.startId = ids[0];
    FLOW.title = FLOW.title || 'Grievance Process Guide';
  }

  function load() {
    var f = null;
    if (EDIT) {
      try { var d = localStorage.getItem(DRAFT_KEY); if (d) f = JSON.parse(d); } catch (e) { f = null; }
    }
    if (!f && window.FLOW_DATA) f = clone(window.FLOW_DATA);
    FLOW = f;
    if (FLOW && FLOW.nodes && Object.keys(FLOW.nodes).length) normalize(); else FLOW = null;
  }

  function saveDraft() {
    if (!EDIT) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(FLOW)); } catch (e) { /* ignore */ }
  }

  // ---------- layout ----------
  function layout() {
    var nodes = FLOW.nodes, start = FLOW.startId;
    var order = [], st = {};
    function topo(id) {
      st[id] = 1;
      (nodes[id].next || []).forEach(function (e) { if (nodes[e.to] && !st[e.to]) topo(e.to); });
      st[id] = 2;
      order.push(id);
    }
    topo(start);
    Object.keys(nodes).forEach(function (id) { if (!st[id]) topo(id); });
    order.reverse();
    var idx = {};
    order.forEach(function (id, i) { idx[id] = i; });
    var depth = {};
    order.forEach(function (id) { depth[id] = depth[id] || 0; });
    order.forEach(function (id) {
      (nodes[id].next || []).forEach(function (e) {
        if (nodes[e.to] && idx[e.to] > idx[id]) depth[e.to] = Math.max(depth[e.to], depth[id] + 1);
      });
    });
    var pos = {}, seen = {}, row = 0;
    function visit(id) {
      if (seen[id]) return pos[id] ? pos[id].row : null;
      seen[id] = true;
      var ys = [];
      (nodes[id].next || []).forEach(function (e) {
        if (nodes[e.to]) { var y = visit(e.to); if (y !== null) ys.push(y); }
      });
      var r = ys.length ? (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2 : row++;
      pos[id] = { row: r, col: depth[id] };
      return r;
    }
    visit(start);
    Object.keys(nodes).forEach(function (id) { if (!seen[id]) visit(id); });
    var maxCol = 0, maxRow = 0;
    Object.keys(pos).forEach(function (id) {
      var p = pos[id];
      p.x = PAD + p.col * (W + GX);
      p.y = PAD + p.row * (H + GY);
      maxCol = Math.max(maxCol, p.col);
      maxRow = Math.max(maxRow, p.row);
    });
    return { pos: pos, w: PAD * 2 + (maxCol + 1) * W + maxCol * GX, h: PAD * 2 + (maxRow + 1) * H + maxRow * GY };
  }

  function wrap(t, max, lines) {
    var words = String(t).split(/\s+/), out = [], cur = '';
    words.forEach(function (w) {
      var test = (cur + ' ' + w).trim();
      if (test.length > max && cur) { out.push(cur); cur = w; } else { cur = test; }
    });
    if (cur) out.push(cur);
    if (out.length > lines) {
      out.length = lines;
      out[lines - 1] = out[lines - 1].replace(/.{0,2}$/, '') + '…';
    }
    return out;
  }

  // ---------- map ----------
  function mapSVG() {
    var L = layout(), pos = L.pos, nodes = FLOW.nodes;
    var onPath = {}, onEdge = {};
    path.forEach(function (id, i) {
      onPath[id] = true;
      if (i > 0) onEdge[path[i - 1] + '>' + id] = true;
    });
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (L.w * zoom) + '" height="' + (L.h * zoom) + '" viewBox="0 0 ' + L.w + ' ' + L.h + '">';
    s += '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#98a2b3"/></marker></defs>';
    var edges = '', labels = '';
    nodeList().forEach(function (n) {
      var p = pos[n.id];
      n.next.forEach(function (e) {
        var q = pos[e.to];
        if (!q) return;
        var x1 = p.x + W, y1 = p.y + H / 2, x2 = q.x, y2 = q.y + H / 2;
        var dx = Math.max(36, Math.abs(x2 - x1) / 2);
        var hot = onEdge[n.id + '>' + e.to] ? ' onpath' : '';
        edges += '<path class="edge' + hot + '" d="M' + x1 + ' ' + y1 + ' C' + (x1 + dx) + ' ' + y1 + ' ' + (x2 - dx) + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" marker-end="url(#ah)"/>';
        if (e.label) {
          var lx = (x1 + x2) / 2, ly = (y1 + y2) / 2 - 5;
          var lab = e.label.length > 26 ? e.label.slice(0, 25) + '…' : e.label;
          labels += '<text class="elabel" x="' + lx + '" y="' + ly + '" text-anchor="middle">' + esc(lab) + '</text>';
        }
      });
    });
    s += edges + labels;
    nodeList().forEach(function (n) {
      var p = pos[n.id];
      var cls = 'node t-' + n.type + (n.placeholder ? ' ph' : '') + (onPath[n.id] ? ' onpath' : '') + (selected === n.id ? ' sel' : '');
      s += '<g class="' + cls + '" data-act="select" data-id="' + esc(n.id) + '" transform="translate(' + p.x + ' ' + p.y + ')">';
      s += '<rect class="box" width="' + W + '" height="' + H + '" rx="10"/>';
      s += '<rect class="bar" width="6" height="' + H + '" rx="3"/>';
      s += '<text class="tag" x="16" y="20">' + TYPE_LABEL[n.type] + (n.placeholder ? ' · to be added' : '') + '</text>';
      wrap(n.title, 28, 3).forEach(function (line, i) {
        s += '<text class="ttl" x="16" y="' + (40 + i * 16) + '">' + esc(line) + '</text>';
      });
      s += '</g>';
    });
    return s + '</svg>';
  }

  function legend() {
    return '<div class="legend">' + Object.keys(TYPE_LABEL).map(function (k) {
      return '<span class="t-' + k + '"><i></i>' + TYPE_LABEL[k] + '</span>';
    }).join('') + '</div>';
  }

  // ---------- walk-through ----------
  function detailsHTML(n) {
    var d = n.details || {}, h = '';
    FIELDS.forEach(function (f) {
      if (d[f[0]] && String(d[f[0]]).trim()) {
        h += '<div class="f"><div class="fl">' + f[1] + '</div><div class="fv">' + esc(d[f[0]]) + '</div></div>';
      }
    });
    return h || '<p class="mute">No details added yet.</p>';
  }

  function walkHTML() {
    path = path.filter(function (id) { return FLOW.nodes[id]; });
    if (!path.length) path = [FLOW.startId];
    var n = FLOW.nodes[path[path.length - 1]];
    if (EDIT) selected = n.id;
    var h = '<div class="crumbs">';
    path.forEach(function (id, i) {
      h += '<button data-act="crumb" data-i="' + i + '" title="Go back to this step">' + (i + 1) + '. ' + esc(FLOW.nodes[id].title) + '</button>';
    });
    h += '</div><div class="card t-' + n.type + '">';
    h += '<span class="badge">' + TYPE_LABEL[n.type] + '</span>';
    h += '<h2>' + esc(n.title) + '</h2>';
    if (n.placeholder) h += '<div class="todo">This step has not been written yet. Details will be added soon.</div>';
    h += detailsHTML(n);
    var nx = n.next.filter(function (e) { return FLOW.nodes[e.to]; });
    if (!nx.length) {
      h += '<div class="end">End of this path. Use "Start over" to try another route.</div>';
    } else if (n.type === 'decision' && n.choiceStyle === 'dropdown') {
      h += '<div class="choices"><label class="fl" for="choiceSel">Select an option</label><select id="choiceSel">';
      nx.forEach(function (e, i) { h += '<option value="' + esc(e.to) + '">' + esc(e.label || FLOW.nodes[e.to].title) + '</option>'; });
      h += '</select><button class="btn primary" data-act="goSel">Continue</button></div>';
    } else {
      h += '<div class="choices">';
      nx.forEach(function (e) {
        var lab = e.label || (nx.length === 1 ? 'Next step' : FLOW.nodes[e.to].title);
        h += '<button class="btn' + (nx.length === 1 ? ' primary' : '') + '" data-act="choose" data-id="' + esc(e.to) + '">' + esc(lab) + (nx.length === 1 && !e.label ? ' →' : '') + '</button>';
      });
      h += '</div>';
    }
    h += '<div class="row">';
    if (path.length > 1) h += '<button class="btn" data-act="back">← Back</button>';
    h += '<button class="btn" data-act="restart">Start over</button></div></div>';
    return h;
  }

  function mapViewHTML() {
    return '<div class="toolbar"><button class="btn" data-act="zoomOut">−</button><button class="btn" data-act="zoomReset">100%</button><button class="btn" data-act="zoomIn">+</button>' + legend() + '</div><div id="mapwrap">' + mapSVG() + '</div>';
  }

  // ---------- side panel ----------
  function viewPanel(n) {
    var h = '<span class="badge t-' + n.type + '">' + TYPE_LABEL[n.type] + '</span><h2>' + esc(n.title) + '</h2>';
    if (n.placeholder) h += '<div class="todo">This step has not been written yet.</div>';
    h += detailsHTML(n);
    var nx = n.next.filter(function (e) { return FLOW.nodes[e.to]; });
    if (nx.length) {
      h += '<div class="f"><div class="fl">Next</div><ul class="nx">';
      nx.forEach(function (e) {
        h += '<li><button class="link" data-act="select" data-id="' + esc(e.to) + '">' + (e.label ? esc(e.label) + ' → ' : '') + esc(FLOW.nodes[e.to].title) + '</button></li>';
      });
      h += '</ul></div>';
    }
    h += '<div class="row"><button class="btn primary" data-act="startFrom" data-id="' + esc(n.id) + '">Walk through from here</button></div>';
    return h;
  }

  function editorHTML(n) {
    var d = n.details || {};
    var opts = nodeList().filter(function (x) { return x.id !== n.id; }).sort(function (a, b) { return a.title.localeCompare(b.title); });
    var typeSel = Object.keys(TYPE_LABEL).map(function (k) {
      return '<option value="' + k + '"' + (n.type === k ? ' selected' : '') + '>' + TYPE_LABEL[k] + '</option>';
    }).join('');
    var styleSel = [['buttons', 'Buttons'], ['dropdown', 'Dropdown list']].map(function (k) {
      return '<option value="' + k[0] + '"' + ((n.choiceStyle || 'buttons') === k[0] ? ' selected' : '') + '>' + k[1] + '</option>';
    }).join('');
    var h = '<span class="badge t-' + n.type + '">Editing</span>';
    h += '<label>Title</label><input type="text" data-f="title" value="' + esc(n.title) + '">';
    h += '<label>Type</label><select data-f="type">' + typeSel + '</select>';
    h += '<label>How options are shown (if this step has several next steps)</label><select data-f="choiceStyle">' + styleSel + '</select>';
    h += '<div class="chk"><input type="checkbox" id="ph" data-f="placeholder"' + (n.placeholder ? ' checked' : '') + '><label for="ph" style="margin:0;text-transform:none;letter-spacing:0;font-size:14px;font-weight:400">Mark as "to be added"</label></div>';
    FIELDS.forEach(function (f) {
      var long = f[0] === 'action' || f[0] === 'notes' || f[0] === 'docs';
      h += '<label>' + f[1] + '</label>';
      h += long
        ? '<textarea data-f="d.' + f[0] + '">' + esc(d[f[0]] || '') + '</textarea>'
        : '<input type="text" data-f="d.' + f[0] + '" value="' + esc(d[f[0]] || '') + '">';
    });
    h += '<label>Next steps (each row is one branch)</label><div class="edgeform">';
    if (!n.next.length) h += '<p class="mute">No next steps. This path ends here.</p>';
    n.next.forEach(function (e, i) {
      h += '<div class="edge"><input type="text" data-e="' + i + '" data-k="label" value="' + esc(e.label) + '" placeholder="Label, e.g. Yes / Reason A">';
      h += '<select data-e="' + i + '" data-k="to"><option value="">— choose step —</option>';
      opts.forEach(function (o) { h += '<option value="' + esc(o.id) + '"' + (e.to === o.id ? ' selected' : '') + '>' + esc(o.title) + '</option>'; });
      h += '</select><button class="ic" data-act="openEdge" data-i="' + i + '" title="Open that step">→</button><button class="ic" data-act="delEdge" data-i="' + i + '" title="Remove branch">✕</button></div>';
    });
    h += '</div><div class="row"><button class="btn primary" data-act="addBranch">+ Add branch (new step)</button><button class="btn" data-act="addLink">+ Link to existing step</button></div>';
    h += '<div class="row">';
    if (FLOW.startId !== n.id) h += '<button class="btn" data-act="makeStart">Make this the first step</button><button class="btn danger" data-act="delNode">Delete step</button>';
    else h += '<span class="mute">This is the first step.</span>';
    h += '</div>';
    return h;
  }

  function panelHTML() {
    var n = selected && FLOW.nodes[selected];
    if (!n) return '<div class="empty">Click a step on the map to see its details.</div>';
    return EDIT ? editorHTML(n) : viewPanel(n);
  }

  // ---------- render ----------
  function renderHeader() {
    $('ttl').textContent = FLOW.title;
    $('sub').textContent = 'Training material · no customer data' + (FLOW.updated ? ' · updated ' + FLOW.updated : '');
    $('tabs').innerHTML = '<button data-act="tab" data-v="walk" class="' + (view === 'walk' ? 'on' : '') + '">Walk-through</button><button data-act="tab" data-v="map" class="' + (view === 'map' ? 'on' : '') + '">Full map</button>';
    var t = '';
    if (EDIT) {
      t += '<button class="btn" data-act="newNode">+ New step</button>';
      t += '<button class="btn primary" data-act="export">Export flow.js</button>';
      t += '<button class="btn" data-act="import">Import</button>';
      t += '<button class="btn danger" data-act="discard">Discard changes</button>';
    }
    $('tools').innerHTML = t;
    var b = $('banner');
    if (EDIT) {
      b.hidden = false;
      b.textContent = 'Edit mode. Changes are saved in this browser only. To publish, click Export flow.js and replace flow.js in the GitHub repo.';
    } else { b.hidden = true; }
    $('foot').textContent = 'For training purposes only. Do not enter customer data.';
  }

  function renderMain() {
    $('main').innerHTML = view === 'walk' ? walkHTML() : mapViewHTML();
  }
  function renderPanel() { $('panel').innerHTML = panelHTML(); }

  function renderAll() {
    document.body.dataset.view = view;
    document.body.dataset.edit = EDIT ? '1' : '0';
    renderHeader();
    renderMain();
    renderPanel();
    if (scrollTo && view === 'map') {
      var wrapEl = $('mapwrap'), p = layout().pos[scrollTo];
      if (wrapEl && p) {
        wrapEl.scrollLeft = Math.max(0, p.x * zoom - 40);
        wrapEl.scrollTop = Math.max(0, p.y * zoom - 40);
      }
    }
    scrollTo = null;
  }

  // ---------- search ----------
  function doSearch(q) {
    var box = $('results');
    q = q.trim().toLowerCase();
    if (!q) { box.style.display = 'none'; return; }
    var hits = nodeList().filter(function (n) {
      var hay = (n.title + ' ' + Object.keys(n.details).map(function (k) { return n.details[k]; }).join(' ') + ' ' + n.next.map(function (e) { return e.label; }).join(' ')).toLowerCase();
      return hay.indexOf(q) !== -1;
    }).slice(0, 8);
    box.innerHTML = hits.length
      ? hits.map(function (n) { return '<button data-act="goto" data-id="' + esc(n.id) + '">' + esc(n.title) + '</button>'; }).join('')
      : '<div class="none">No matching steps.</div>';
    box.style.display = 'block';
  }

  // ---------- export / import ----------
  function download(name, text) {
    var blob = new Blob([text], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function exportFlow() {
    FLOW.updated = new Date().toISOString().slice(0, 10);
    var txt = '// Grievance process flow. Edit in the app (open index.html#edit), export, and replace this file.\nwindow.FLOW_DATA = ' + JSON.stringify(FLOW, null, 2) + ';\n';
    download('flow.js', txt);
    saveDraft();
    renderHeader();
  }

  function importText(text) {
    var s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s < 0 || e < 0) { alert('Could not find a flow in that file.'); return; }
    try {
      var obj = JSON.parse(text.slice(s, e + 1));
      if (!obj.nodes || !Object.keys(obj.nodes).length) throw new Error('no nodes');
      FLOW = obj;
      normalize();
      path = []; selected = null;
      saveDraft();
      renderAll();
    } catch (err) {
      alert('That file could not be read as a flow.');
    }
  }

  // ---------- events ----------
  function curNode() { return selected && FLOW.nodes[selected]; }

  function onFieldInput(t) {
    var n, f, i, k;
    if (t.dataset.f !== undefined) {
      n = curNode(); if (!n) return;
      f = t.dataset.f;
      if (f.indexOf('d.') === 0) n.details[f.slice(2)] = t.value;
      else if (f === 'placeholder') n.placeholder = t.checked;
      else n[f] = t.value;
      saveDraft(); renderMain();
    } else if (t.dataset.e !== undefined) {
      n = curNode(); if (!n) return;
      i = parseInt(t.dataset.e, 10); k = t.dataset.k;
      if (n.next[i]) { n.next[i][k] = t.value; saveDraft(); renderMain(); }
    }
  }
  document.addEventListener('input', function (e) {
    if (e.target.id === 'search') { doSearch(e.target.value); return; }
    if (EDIT) onFieldInput(e.target);
  });
  document.addEventListener('change', function (e) {
    if (EDIT && e.target.id === 'importFile') {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var r = new FileReader();
      r.onload = function () { importText(String(r.result)); };
      r.readAsText(file);
      e.target.value = '';
      return;
    }
    if (EDIT) onFieldInput(e.target);
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) { $('results').style.display = 'none'; return; }
    var a = b.dataset.act, id = b.dataset.id, n = curNode(), i;
    switch (a) {
      case 'tab': view = b.dataset.v; renderAll(); break;
      case 'select': selected = id; scrollTo = null; renderAll(); break;
      case 'goto':
        $('results').style.display = 'none'; $('search').value = '';
        selected = id; view = 'map'; scrollTo = id; renderAll(); break;
      case 'choose': path.push(id); renderAll(); break;
      case 'goSel': path.push($('choiceSel').value); renderAll(); break;
      case 'crumb': path = path.slice(0, parseInt(b.dataset.i, 10) + 1); renderAll(); break;
      case 'back': path.pop(); renderAll(); break;
      case 'restart': path = [FLOW.startId]; renderAll(); break;
      case 'startFrom': path = [id]; view = 'walk'; renderAll(); break;
      case 'zoomIn': zoom = Math.min(2, zoom + 0.15); renderMain(); break;
      case 'zoomOut': zoom = Math.max(0.4, zoom - 0.15); renderMain(); break;
      case 'zoomReset': zoom = 1; renderMain(); break;
      default: if (EDIT) editAction(a, b, n); break;
    }
  });

  function editAction(a, b, n) {
    var i, id;
    switch (a) {
      case 'export': exportFlow(); break;
      case 'import': $('importFile').click(); break;
      case 'discard':
        if (confirm('Discard all changes made in this browser and go back to the published flow?')) {
          try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
          load(); path = []; selected = null; renderAll();
        }
        break;
      case 'newNode':
        id = uid();
        FLOW.nodes[id] = { id: id, type: 'action', title: 'New step', placeholder: true, details: {}, next: [] };
        selected = id; saveDraft(); renderAll(); break;
      case 'addBranch':
        if (!n) return;
        id = uid();
        FLOW.nodes[id] = { id: id, type: 'action', title: 'New step', placeholder: true, details: {}, next: [] };
        n.next.push({ label: n.next.length || n.type === 'decision' ? 'New option' : '', to: id });
        saveDraft(); renderAll(); break;
      case 'addLink':
        if (!n) return;
        n.next.push({ label: '', to: '' });
        saveDraft(); renderPanel(); break;
      case 'delEdge':
        if (!n) return;
        n.next.splice(parseInt(b.dataset.i, 10), 1);
        saveDraft(); renderAll(); break;
      case 'openEdge':
        if (!n) return;
        i = parseInt(b.dataset.i, 10);
        if (n.next[i] && FLOW.nodes[n.next[i].to]) { selected = n.next[i].to; renderAll(); }
        break;
      case 'makeStart':
        if (!n) return;
        FLOW.startId = n.id; path = []; saveDraft(); renderAll(); break;
      case 'delNode':
        if (!n || n.id === FLOW.startId) return;
        if (!confirm('Delete "' + n.title + '"? Branches pointing to it will be removed.')) return;
        delete FLOW.nodes[n.id];
        nodeList().forEach(function (x) { x.next = x.next.filter(function (e) { return e.to !== n.id; }); });
        selected = null; path = path.filter(function (p) { return FLOW.nodes[p]; });
        saveDraft(); renderAll(); break;
    }
  }

  // ---------- init ----------
  load();
  if (!FLOW) {
    $('main').innerHTML = '<div class="card">The flow data could not be loaded. Make sure flow.js is in the same folder as index.html.</div>';
    return;
  }
  path = [FLOW.startId];
  renderAll();
})();
