/**
 * TailAdmin-inspired SVG charts & visual analytics renderer for SOROTI WebWorks Dashboard.
 * Loaded as a standard script so both js/dashboard.js (HTTP) and js/theme.js (file://)
 * share one implementation with zero duplicated rendering logic.
 * Uses only safe DOM / SVG NS APIs — never innerHTML.
 */
(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] !== undefined && attrs[k] !== null) {
          node.setAttribute(k, String(attrs[k]));
        }
      });
    }
    if (text !== undefined && text !== null) {
      node.textContent = String(text);
    }
    return node;
  }

  function htmlEl(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function formatCompactUgx(amount) {
    var val = Number(amount || 0);
    if (!Number.isFinite(val) || val <= 0) return 'UGX 0';
    if (val >= 1000000) return 'UGX ' + (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (val >= 1000) return 'UGX ' + Math.round(val / 1000) + 'k';
    return 'UGX ' + val.toLocaleString('en-UG');
  }

  function getLastSixMonths() {
    var months = [];
    var now = new Date();
    for (var i = 5; i >= 0; i -= 1) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
        label: d.toLocaleDateString('en-GB', { month: 'short' }),
      });
    }
    return months;
  }

  function monthKeyOf(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function attachTooltip(targetEl, containerEl, label, detail) {
    var tip = containerEl.querySelector('.sw-ta-chart-tooltip');
    if (!tip) {
      tip = htmlEl('div', 'sw-ta-chart-tooltip d-none');
      containerEl.appendChild(tip);
    }
    targetEl.style.cursor = 'pointer';
    targetEl.addEventListener('mouseenter', function () {
      tip.replaceChildren(
        htmlEl('div', 'sw-ta-tip-title', label),
        htmlEl('div', 'sw-ta-tip-val', detail)
      );
      tip.classList.remove('d-none');
    });
    targetEl.addEventListener('mouseleave', function () {
      tip.classList.add('d-none');
    });
  }

  function renderBarChart(containerEl, state, mode) {
    if (!containerEl) return;
    var users = state.users || [];
    var enrollments = state.enrollments || [];
    var trainings = state.trainings || [];

    var categories = [];
    if (mode === 'level') {
      var categoriesCfg = [
        { key: 'Package', label: 'Packages' },
        { key: 'Core Web', label: 'Core Web' },
        { key: 'E-Commerce & Apps', label: 'E-Commerce' },
        { key: 'Visibility & Care', label: 'SEO & Care' },
      ];
      categories = categoriesCfg.map(function (lvl) {
        var matchingTrainings = trainings.filter(function (t) {
          return String(t.level || '').toLowerCase() === lvl.key.toLowerCase();
        });
        var trIds = new Set(matchingTrainings.map(function (t) { return t.id; }));
        var enrCount = enrollments.filter(function (e) {
          return trIds.has(e.training_id) || (e.trainings && String(e.trainings.level || '').toLowerCase() === lvl.key.toLowerCase());
        }).length;
        return {
          label: lvl.label,
          primary: matchingTrainings.length,
          secondary: enrCount,
          pLabel: 'Services',
          sLabel: 'Orders',
        };
      });
    } else {
      var months = getLastSixMonths();
      categories = months.map(function (m) {
        var uCount = users.filter(function (u) { return monthKeyOf(u.created_at) === m.key; }).length;
        var eCount = enrollments.filter(function (e) { return monthKeyOf(e.created_at) === m.key; }).length;
        return {
          label: m.label,
          primary: uCount,
          secondary: eCount,
          pLabel: 'Users',
          sLabel: 'Orders',
        };
      });
    }

    var maxVal = 4;
    categories.forEach(function (c) {
      if (c.primary > maxVal) maxVal = c.primary;
      if (c.secondary > maxVal) maxVal = c.secondary;
    });
    var yTop = Math.ceil(maxVal / 2) * 2;

    var W = 560;
    var H = 235;
    var padL = 36;
    var padR = 16;
    var padT = 18;
    var padB = 34;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'sw-ta-svg-chart',
      role: 'img',
      'aria-label': mode === 'level' ? 'Services and orders by category' : 'Monthly users and service orders bar chart',
    });

    // Horizontal dashed gridlines & Y ticks
    for (var g = 0; g <= 4; g += 1) {
      var tickVal = Math.round((yTop * g) / 4);
      var y = padT + plotH - (plotH * g) / 4;
      svg.appendChild(svgEl('line', {
        x1: padL,
        y1: y,
        x2: W - padR,
        y2: y,
        class: 'sw-ta-gridline',
        'stroke-dasharray': g === 0 ? null : '4 4',
      }));
      svg.appendChild(svgEl('text', {
        x: padL - 8,
        y: y + 4,
        'text-anchor': 'end',
        class: 'sw-ta-axis-text',
      }, String(tickVal)));
    }

    var groupW = plotW / Math.max(1, categories.length);
    var barW = Math.min(20, Math.max(10, groupW * 0.24));
    var gap = Math.max(4, barW * 0.3);

    categories.forEach(function (cat, idx) {
      var cx = padL + idx * groupW + groupW / 2;
      var pH = cat.primary > 0 ? Math.max(6, (cat.primary / yTop) * plotH) : 3;
      var sH = cat.secondary > 0 ? Math.max(6, (cat.secondary / yTop) * plotH) : 3;

      var rectP = svgEl('rect', {
        x: cx - barW - gap / 2,
        y: padT + plotH - pH,
        width: barW,
        height: pH,
        rx: 5,
        class: cat.primary > 0 ? 'sw-ta-bar-primary' : 'sw-ta-bar-muted',
      });
      attachTooltip(rectP, containerEl, cat.label + ' · ' + cat.pLabel, String(cat.primary));
      svg.appendChild(rectP);

      var rectS = svgEl('rect', {
        x: cx + gap / 2,
        y: padT + plotH - sH,
        width: barW,
        height: sH,
        rx: 5,
        class: cat.secondary > 0 ? 'sw-ta-bar-secondary' : 'sw-ta-bar-muted',
      });
      attachTooltip(rectS, containerEl, cat.label + ' · ' + cat.sLabel, String(cat.secondary));
      svg.appendChild(rectS);

      svg.appendChild(svgEl('text', {
        x: cx,
        y: H - 10,
        'text-anchor': 'middle',
        class: 'sw-ta-axis-text',
      }, cat.label));
    });

    var legend = htmlEl('div', 'sw-ta-legend mt-2');
    var leg1 = htmlEl('span', 'sw-ta-legend-item');
    leg1.appendChild(htmlEl('span', 'sw-ta-dot sw-ta-dot-primary'));
    leg1.appendChild(document.createTextNode(mode === 'level' ? 'Active Services' : 'New Users'));
    var leg2 = htmlEl('span', 'sw-ta-legend-item');
    leg2.appendChild(htmlEl('span', 'sw-ta-dot sw-ta-dot-secondary'));
    leg2.appendChild(document.createTextNode('Service Orders'));
    legend.appendChild(leg1);
    legend.appendChild(leg2);

    containerEl.replaceChildren(svg, legend);
  }

  function renderRadialGauge(containerEl, state) {
    if (!containerEl) return;
    var enrollments = state.enrollments || [];
    var totalApps = enrollments.length;
    var paidOrConfirmed = enrollments.filter(function (e) {
      return e.payment_status === 'paid' || e.status === 'confirmed';
    }).length;
    var expectedUgx = 0;
    var collectedUgx = 0;
    enrollments.forEach(function (e) {
      var fee = Number((e.trainings && e.trainings.fee_ugx) || 0);
      expectedUgx += fee;
      if (e.payment_status === 'paid') {
        collectedUgx += Number(e.amount_paid_ugx > 0 ? e.amount_paid_ugx : fee);
      }
    });

    var pct = totalApps > 0 ? Math.round((paidOrConfirmed / totalApps) * 100) : 0;
    var R = 82;
    var cx = 110;
    var cy = 104;
    var arcLen = Math.PI * R;
    var dashFill = (arcLen * pct) / 100;
    var arcPath = 'M ' + (cx - R) + ' ' + cy + ' A ' + R + ' ' + R + ' 0 0 1 ' + (cx + R) + ' ' + cy;

    var svg = svgEl('svg', {
      viewBox: '0 0 220 128',
      class: 'sw-ta-gauge-svg',
      role: 'img',
      'aria-label': 'Confirmation and settlement gauge ' + pct + ' percent',
    });

    svg.appendChild(svgEl('path', {
      d: arcPath,
      fill: 'none',
      'stroke-width': 16,
      'stroke-linecap': 'round',
      class: 'sw-ta-gauge-track',
    }));

    svg.appendChild(svgEl('path', {
      d: arcPath,
      fill: 'none',
      'stroke-width': 16,
      'stroke-linecap': 'round',
      'stroke-dasharray': dashFill.toFixed(2) + ' ' + arcLen.toFixed(2),
      class: 'sw-ta-gauge-fill',
    }));

    svg.appendChild(svgEl('text', {
      x: cx,
      y: cy - 18,
      'text-anchor': 'middle',
      class: 'sw-ta-gauge-pct',
    }, pct + '%'));

    svg.appendChild(svgEl('text', {
      x: cx,
      y: cy + 4,
      'text-anchor': 'middle',
      class: 'sw-ta-gauge-sub',
    }, totalApps > 0 ? paidOrConfirmed + ' of ' + totalApps + ' settled' : 'Awaiting orders'));

    var wrap = htmlEl('div', 'sw-ta-gauge-wrap text-center');
    wrap.appendChild(svg);

    var pillText = totalApps > 0
      ? (pct >= 50 ? 'Healthy Conversion' : 'Pending Verification / Consultation')
      : 'Ready for Service Bookings';
    var pill = htmlEl('span', 'sw-ta-pill sw-ta-pill-info mt-1 mb-3', pillText);
    wrap.appendChild(pill);

    var footer = htmlEl('div', 'sw-ta-gauge-footer row no-gutters pt-3 border-top');
    var cols = [
      { label: 'Pipeline', val: formatCompactUgx(expectedUgx) },
      { label: 'Collected', val: formatCompactUgx(collectedUgx) },
      { label: 'Confirmed', val: String(enrollments.filter(function (e) { return e.status === 'confirmed'; }).length) },
    ];
    cols.forEach(function (c, idx) {
      var col = htmlEl('div', 'col-4 text-center' + (idx < 2 ? ' border-right' : ''));
      col.appendChild(htmlEl('div', 'small text-muted', c.label));
      col.appendChild(htmlEl('div', 'font-weight-bold sw-ta-tabular', c.val));
      footer.appendChild(col);
    });

    containerEl.replaceChildren(wrap, footer);
  }

  function buildSmoothPath(points) {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return 'M ' + points[0].x + ' ' + points[0].y;
    var d = 'M ' + points[0].x.toFixed(1) + ' ' + points[0].y.toFixed(1);
    for (var i = 0; i < points.length - 1; i += 1) {
      var p0 = points[i];
      var p1 = points[i + 1];
      var midX = ((p0.x + p1.x) / 2).toFixed(1);
      d += ' C ' + midX + ' ' + p0.y.toFixed(1) + ', ' + midX + ' ' + p1.y.toFixed(1) + ', ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1);
    }
    return d;
  }

  function renderAreaChart(containerEl, state) {
    if (!containerEl) return;
    var months = getLastSixMonths();
    var users = state.users || [];
    var enrollments = state.enrollments || [];
    var messages = state.messages || [];

    var seriesUsers = [];
    var seriesActivity = [];
    var maxVal = 4;

    months.forEach(function (m) {
      var uCount = users.filter(function (u) { return monthKeyOf(u.created_at) === m.key; }).length;
      var aCount =
        enrollments.filter(function (e) { return monthKeyOf(e.created_at) === m.key; }).length +
        messages.filter(function (msg) { return monthKeyOf(msg.created_at) === m.key; }).length;
      if (uCount > maxVal) maxVal = uCount;
      if (aCount > maxVal) maxVal = aCount;
      seriesUsers.push({ label: m.label, val: uCount });
      seriesActivity.push({ label: m.label, val: aCount });
    });

    var yTop = Math.ceil(maxVal / 2) * 2;
    var W = 500;
    var H = 220;
    var padL = 34;
    var padR = 16;
    var padT = 16;
    var padB = 32;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'sw-ta-svg-chart',
      role: 'img',
      'aria-label': '6-month users and activity area chart',
    });

    var defs = svgEl('defs');
    var grad = svgEl('linearGradient', { id: 'swTaAreaGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#2563eb', 'stop-opacity': '0.32' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#2563eb', 'stop-opacity': '0.02' }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    for (var g = 0; g <= 4; g += 1) {
      var y = padT + plotH - (plotH * g) / 4;
      svg.appendChild(svgEl('line', {
        x1: padL,
        y1: y,
        x2: W - padR,
        y2: y,
        class: 'sw-ta-gridline',
        'stroke-dasharray': g === 0 ? null : '4 4',
      }));
      svg.appendChild(svgEl('text', {
        x: padL - 8,
        y: y + 4,
        'text-anchor': 'end',
        class: 'sw-ta-axis-text',
      }, String(Math.round((yTop * g) / 4))));
    }

    var mapPoints = function (arr) {
      return arr.map(function (pt, idx) {
        var x = padL + (idx * plotW) / Math.max(1, arr.length - 1);
        var y = padT + plotH - (pt.val / yTop) * plotH;
        return { x: x, y: y, label: pt.label, val: pt.val };
      });
    };

    var ptsU = mapPoints(seriesUsers);
    var ptsA = mapPoints(seriesActivity);

    var lineU = buildSmoothPath(ptsU);
    var areaU = lineU + ' L ' + ptsU[ptsU.length - 1].x.toFixed(1) + ' ' + (padT + plotH) + ' L ' + ptsU[0].x.toFixed(1) + ' ' + (padT + plotH) + ' Z';
    svg.appendChild(svgEl('path', { d: areaU, fill: 'url(#swTaAreaGrad)' }));
    svg.appendChild(svgEl('path', { d: lineU, fill: 'none', 'stroke-width': 2.75, class: 'sw-ta-line-primary' }));

    var lineA = buildSmoothPath(ptsA);
    svg.appendChild(svgEl('path', { d: lineA, fill: 'none', 'stroke-width': 2.5, class: 'sw-ta-line-emerald' }));

    ptsU.forEach(function (pt, idx) {
      var dotU = svgEl('circle', { cx: pt.x, cy: pt.y, r: 4, class: 'sw-ta-dot-svg-primary' });
      attachTooltip(dotU, containerEl, pt.label + ' · Registrations', String(pt.val));
      svg.appendChild(dotU);

      var ptA = ptsA[idx];
      var dotA = svgEl('circle', { cx: ptA.x, cy: ptA.y, r: 4, class: 'sw-ta-dot-svg-emerald' });
      attachTooltip(dotA, containerEl, ptA.label + ' · Applications & Messages', String(ptA.val));
      svg.appendChild(dotA);

      svg.appendChild(svgEl('text', {
        x: pt.x,
        y: H - 10,
        'text-anchor': 'middle',
        class: 'sw-ta-axis-text',
      }, pt.label));
    });

    var legend = htmlEl('div', 'sw-ta-legend mt-2');
    var leg1 = htmlEl('span', 'sw-ta-legend-item');
    leg1.appendChild(htmlEl('span', 'sw-ta-dot sw-ta-dot-primary'));
    leg1.appendChild(document.createTextNode('Registered Accounts'));
    var leg2 = htmlEl('span', 'sw-ta-legend-item');
    leg2.appendChild(htmlEl('span', 'sw-ta-dot sw-ta-dot-emerald'));
    leg2.appendChild(document.createTextNode('Applications & Inquiries'));
    legend.appendChild(leg1);
    legend.appendChild(leg2);

    containerEl.replaceChildren(svg, legend);
  }

  function renderDonutChart(containerEl, state) {
    if (!containerEl) return;
    var enrollments = state.enrollments || [];
    var buckets = [
      { key: 'paid', label: 'Paid', cls: 'sw-ta-seg-paid', dotCls: 'sw-ta-dot-emerald', count: 0 },
      { key: 'pending_verification', label: 'Verifying', cls: 'sw-ta-seg-verifying', dotCls: 'sw-ta-dot-primary', count: 0 },
      { key: 'pay_on_arrival', label: 'Pay on Arrival', cls: 'sw-ta-seg-arrival', dotCls: 'sw-ta-dot-amber', count: 0 },
      { key: 'unpaid', label: 'Unpaid / Other', cls: 'sw-ta-seg-unpaid', dotCls: 'sw-ta-dot-slate', count: 0 },
    ];

    enrollments.forEach(function (e) {
      var st = e.payment_status || 'unpaid';
      var found = buckets.find(function (b) { return b.key === st; });
      if (found) found.count += 1;
      else buckets[3].count += 1;
    });

    var total = enrollments.length;
    var R = 64;
    var C = 2 * Math.PI * R;

    var svg = svgEl('svg', {
      viewBox: '0 0 180 180',
      class: 'sw-ta-donut-svg',
      role: 'img',
      'aria-label': 'Payment status breakdown donut chart',
    });

    svg.appendChild(svgEl('circle', {
      cx: 90,
      cy: 90,
      r: R,
      fill: 'none',
      'stroke-width': 22,
      class: 'sw-ta-gauge-track',
    }));

    if (total > 0) {
      var offset = 0;
      buckets.forEach(function (b) {
        if (b.count <= 0) return;
        var segLen = (b.count / total) * C;
        var circle = svgEl('circle', {
          cx: 90,
          cy: 90,
          r: R,
          fill: 'none',
          'stroke-width': 22,
          'stroke-dasharray': segLen.toFixed(2) + ' ' + C.toFixed(2),
          'stroke-dashoffset': (-offset).toFixed(2),
          transform: 'rotate(-90 90 90)',
          class: b.cls,
        });
        attachTooltip(circle, containerEl, b.label, b.count + ' (' + Math.round((b.count / total) * 100) + '%)');
        svg.appendChild(circle);
        offset += segLen;
      });
    }

    svg.appendChild(svgEl('text', {
      x: 90,
      y: 86,
      'text-anchor': 'middle',
      class: 'sw-ta-donut-total',
    }, String(total)));
    svg.appendChild(svgEl('text', {
      x: 90,
      y: 105,
      'text-anchor': 'middle',
      class: 'sw-ta-gauge-sub',
    }, total === 1 ? 'Order' : 'Orders'));

    var layout = htmlEl('div', 'row align-items-center');
    var leftCol = htmlEl('div', 'col-sm-5 text-center mb-3 mb-sm-0');
    leftCol.appendChild(svg);

    var rightCol = htmlEl('div', 'col-sm-7');
    var list = htmlEl('div', 'sw-ta-donut-list');
    buckets.forEach(function (b) {
      var pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
      var item = htmlEl('div', 'sw-ta-donut-row');
      var left = htmlEl('div', 'd-flex align-items-center text-nowrap mr-2');
      left.appendChild(htmlEl('span', 'sw-ta-dot ' + b.dotCls));
      left.appendChild(htmlEl('span', 'small font-weight-bold', b.label));
      var right = htmlEl('span', 'small text-muted sw-ta-tabular text-nowrap', b.count + ' (' + pct + '%)');
      item.appendChild(left);
      item.appendChild(right);
      list.appendChild(item);
    });
    rightCol.appendChild(list);

    layout.appendChild(leftCol);
    layout.appendChild(rightCol);
    containerEl.replaceChildren(layout);
  }

  function updateKpiTrends(state) {
    var users = state.users || [];
    var enrollments = state.enrollments || [];
    var messages = state.messages || [];
    var projectsCount = Number(state.projectsCount || 0);

    var adminsCount = users.filter(function (u) { return u.role === 'admin'; }).length;
    var confirmedCount = enrollments.filter(function (e) { return e.status === 'confirmed'; }).length;
    var collectedUgx = 0;
    var paidCount = 0;
    enrollments.forEach(function (e) {
      if (e.payment_status === 'paid') {
        paidCount += 1;
        collectedUgx += Number(e.amount_paid_ugx > 0 ? e.amount_paid_ugx : (e.trainings && e.trainings.fee_ugx) || 0);
      }
    });
    var unreadMsgs = messages.filter(function (m) { return !m.is_read; }).length;

    var revEl = document.getElementById('statRevenueUgx');
    if (revEl) revEl.textContent = formatCompactUgx(collectedUgx);

    var uTrend = document.getElementById('kpiUsersTrend');
    if (uTrend) uTrend.textContent = adminsCount + ' Admin · ' + Math.max(0, users.length - adminsCount) + ' Client';

    var eTrend = document.getElementById('kpiEnrollTrend');
    if (eTrend) eTrend.textContent = confirmedCount + ' Confirmed';

    var rTrend = document.getElementById('kpiRevenueTrend');
    if (rTrend) rTrend.textContent = paidCount + ' Paid · ' + projectsCount + ' Projects';

    var mTrend = document.getElementById('kpiMessagesTrend');
    if (mTrend) mTrend.textContent = unreadMsgs > 0 ? unreadMsgs + ' Unread' : messages.length + ' Total Inbox';
  }

  window.SWDashboardUI = {
    renderAll: function (state, barMode) {
      updateKpiTrends(state);
      renderBarChart(document.getElementById('dashBarChartBox'), state, barMode || 'monthly');
      renderRadialGauge(document.getElementById('dashGaugeBox'), state);
      renderAreaChart(document.getElementById('dashAreaChartBox'), state);
      renderDonutChart(document.getElementById('dashDonutChartBox'), state);
    },
    renderBarOnly: function (state, barMode) {
      renderBarChart(document.getElementById('dashBarChartBox'), state, barMode || 'monthly');
    },
  };
})();
