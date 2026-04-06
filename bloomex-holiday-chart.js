// Bloomex Holiday Annotated Chart — Looker Studio Custom Visualization
// Uses Google's dscc (Data Studio Component Communication) library + Chart.js

(function() {

// ─── Holiday definitions ────────────────────────────────────────────────────
// week:      2026 week number (what your data uses)
// week2025:  where this holiday sat in 2025
// shifted:   true = timing moved between 2025 and 2026
// label:     annotation text shown on the chart
const HOLIDAYS = [
  { week: 7,  week2025: 7,  shifted: false, label: "Valentine's Day" },
  { week: 10, week2025: 10, shifted: false, label: "Women's Day" },
  { week: 12, week2025: 13, shifted: true,  label: "Eid al-Fitr ↑" },
  { week: 14, week2025: 16, shifted: true,  label: "Easter ↑" },
  { week: 17, week2025: 17, shifted: false, label: "Admin Day" },
  { week: 19, week2025: 19, shifted: false, label: "Mother's Day" },
  { week: 51, week2025: 51, shifted: false, label: "Christmas" }
];

// ─── Chart.js CDN ────────────────────────────────────────────────────────────
function loadScript(src, cb) {
  var s = document.createElement('script');
  s.src = src;
  s.onload = cb;
  document.head.appendChild(s);
}

// ─── Container setup ─────────────────────────────────────────────────────────
var container = document.createElement('div');
container.style.cssText = 'width:100%;height:100%;position:relative;font-family:Google Sans,Roboto,sans-serif;';
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(container);

var canvas = document.createElement('canvas');
canvas.id = 'bloomexChart';
container.appendChild(canvas);

var chartInstance = null;

// ─── Main draw function ───────────────────────────────────────────────────────
function drawViz(data) {
  var style    = data.style;
  var tables   = data.tables.DEFAULT;
  var fields   = data.fields;

  // Style values with fallbacks
  var showHolidays    = style.show_holidays    ? style.show_holidays.value    : true;
  var showLabels      = style.show_holiday_labels ? style.show_holiday_labels.value : true;
  var shiftedColor    = (style.shifted_color   && style.shifted_color.value)   ? style.shifted_color.value.color   : '#EF9F27';
  var stableColor     = (style.stable_color    && style.stable_color.value)    ? style.stable_color.value.color    : '#378ADD';
  var actualsColor    = (style.actuals_color   && style.actuals_color.value)   ? style.actuals_color.value.color   : '#1D9E75';
  var projectedColor  = (style.projected_color && style.projected_color.value) ? style.projected_color.value.color : '#5B8FD4';
  var prevYearColor   = (style.prev_year_color && style.prev_year_color.value) ? style.prev_year_color.value.color : '#F0997B';
  var showPrevYear    = style.show_prev_year   ? style.show_prev_year.value    : true;

  // Parse rows
  var labels      = [];
  var weekNums    = [];
  var actuals     = [];
  var projected   = [];
  var prevYear    = [];

  tables.forEach(function(row) {
    labels.push(row.week_label[0]);

    // Week number — try to parse from label if field not present
    var wn = row.week_number ? parseInt(row.week_number[0]) : null;
    if (!wn) {
      var m = (row.week_label[0] || '').match(/\d+/);
      wn = m ? parseInt(m[0]) : null;
    }
    weekNums.push(wn);

    var act  = row.actuals   ? parseFloat(row.actuals[0])   : null;
    var proj = row.projected ? parseFloat(row.projected[0]) : null;
    var prev = row.orders_2025 ? parseFloat(row.orders_2025[0]) : null;

    actuals.push(  (act  && act  > 0) ? act  : null);
    projected.push((proj && proj > 0) ? proj : null);
    prevYear.push( (prev && prev > 0) ? prev : null);
  });

  // ─── Build annotation plugin ──────────────────────────────────────────────
  // Custom Chart.js plugin to draw vertical lines + labels for holidays
  var holidayAnnotationPlugin = {
    id: 'holidayAnnotations',
    afterDraw: function(chart) {
      if (!showHolidays) return;

      var ctx    = chart.ctx;
      var xAxis  = chart.scales.x;
      var yAxis  = chart.scales.y;
      var top    = yAxis.top;
      var bottom = yAxis.bottom;

      HOLIDAYS.forEach(function(h) {
        // Find the index in our weekNums array that matches this holiday week
        var idx = weekNums.indexOf(h.week);
        if (idx === -1) return;

        // Get pixel position for this index on x-axis
        var xPos = xAxis.getPixelForValue(idx);
        if (xPos === undefined || isNaN(xPos)) return;

        var color = h.shifted ? shiftedColor : stableColor;

        // Draw vertical dashed line
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.85;
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.stroke();

        // Draw label if enabled
        if (showLabels) {
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          ctx.font = '10px Google Sans, Roboto, sans-serif';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';

          // Rotate text so it reads vertically, positioned near top
          ctx.save();
          ctx.translate(xPos - 4, top + 6);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(h.label, 0, 0);
          ctx.restore();

          // Small diamond marker at top of line
          ctx.beginPath();
          ctx.fillStyle = color;
          var d = 4;
          ctx.moveTo(xPos,     top + d);
          ctx.lineTo(xPos + d, top + d * 2);
          ctx.lineTo(xPos,     top + d * 3);
          ctx.lineTo(xPos - d, top + d * 2);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });
    }
  };

  // ─── Build datasets ───────────────────────────────────────────────────────
  var datasets = [
    {
      label: 'Actual Orders',
      data: actuals,
      borderColor: actualsColor,
      backgroundColor: actualsColor + '15',
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 5,
      tension: 0.3,
      spanGaps: false,
      fill: false,
      order: 1
    },
    {
      label: 'Projected',
      data: projected,
      borderColor: projectedColor,
      borderDash: [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
      fill: false,
      order: 2
    }
  ];

  if (showPrevYear) {
    datasets.push({
      label: '2025 Orders',
      data: prevYear,
      borderColor: prevYearColor,
      borderWidth: 1.5,
      borderDash: [2, 2],
      pointRadius: 0,
      tension: 0.3,
      fill: false,
      order: 3
    });
  }

  // ─── Render / update chart ────────────────────────────────────────────────
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  canvas.width  = container.offsetWidth;
  canvas.height = container.offsetHeight;

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    plugins: [holidayAnnotationPlugin],
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: { top: 60, right: 16, bottom: 8, left: 8 }
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'start',
          labels: {
            boxWidth: 12,
            boxHeight: 2,
            font: { size: 11, family: 'Google Sans, Roboto, sans-serif' },
            color: '#3c4043',
            padding: 16,
            usePointStyle: false
          }
        },
        tooltip: {
          backgroundColor: '#fff',
          titleColor: '#3c4043',
          bodyColor: '#5f6368',
          borderColor: '#dadce0',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: function(items) {
              return items[0].label;
            },
            afterBody: function(items) {
              var idx = items[0].dataIndex;
              var wn  = weekNums[idx];
              var h   = HOLIDAYS.find(function(hh) { return hh.week === wn; });
              if (!h) return [];
              return [
                '',
                (h.shifted ? '⚠ ' : '● ') + h.label + (h.shifted ? ' (shifted from Wk ' + h.week2025 + ')' : '')
              ];
            },
            labelColor: function(item) {
              var colors = [actualsColor, projectedColor, prevYearColor];
              return { borderColor: colors[item.datasetIndex], backgroundColor: colors[item.datasetIndex] };
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: 13,
            font: { size: 10, family: 'Google Sans, Roboto, sans-serif' },
            color: '#5f6368'
          },
          grid: {
            color: 'rgba(0,0,0,0.06)',
            drawBorder: false
          }
        },
        y: {
          ticks: {
            font: { size: 10, family: 'Google Sans, Roboto, sans-serif' },
            color: '#5f6368',
            callback: function(v) {
              if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
              return v;
            }
          },
          grid: {
            color: 'rgba(0,0,0,0.06)',
            drawBorder: false
          }
        }
      }
    }
  });

  // ─── Holiday legend below chart ───────────────────────────────────────────
  var existing = document.getElementById('holidayLegend');
  if (existing) existing.remove();

  if (showHolidays) {
    var legend = document.createElement('div');
    legend.id = 'holidayLegend';
    legend.style.cssText = 'position:absolute;bottom:6px;left:12px;display:flex;gap:12px;flex-wrap:wrap;font-size:10px;font-family:Google Sans,Roboto,sans-serif;';
    legend.innerHTML =
      '<span style="display:flex;align-items:center;gap:4px;">' +
        '<span style="width:12px;height:2px;background:' + stableColor + ';border-radius:1px;display:inline-block;"></span>' +
        '<span style="color:#5f6368;">Holiday (same week as 2025)</span>' +
      '</span>' +
      '<span style="display:flex;align-items:center;gap:4px;">' +
        '<span style="width:12px;height:2px;background:' + shiftedColor + ';border-radius:1px;display:inline-block;"></span>' +
        '<span style="color:#5f6368;">Holiday (shifted vs 2025)</span>' +
      '</span>';
    container.appendChild(legend);
  }
}

// ─── Boot: load Chart.js then subscribe to dscc ───────────────────────────────
loadScript(
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  function() {
    // dscc is injected by Looker Studio at runtime
    if (typeof dscc !== 'undefined') {
      dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });
    } else {
      // Dev/preview fallback — renders a placeholder message
      container.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#5f6368;font-family:Google Sans,Roboto,sans-serif;font-size:13px;">' +
        'Connect this viz to your Looker Studio data source to preview.' +
        '</div>';
    }
  }
);

})();
