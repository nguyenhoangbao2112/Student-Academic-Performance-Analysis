// ─── Config ───────────────────────────────────────────────────────────────────

const fileCSV = "US_police_shootings_cleaned.csv";

const MAP_WIDTH = 900;
const MAP_HEIGHT = 600;
const CHART_WIDTH = 450;
const CHART_HEIGHT = 300;

// ─── Global State ─────────────────────────────────────────────────────────────

let currentYear = "All";
let fullData = [];
let geoDataGlobal = null;
let centered = null;

// ─── SVG & D3 Setup ───────────────────────────────────────────────────────────

const svg = d3.select("#map-panel")
    .append("svg")
    .attr("viewBox", `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("preserveAspectRatio", "xMidYMid meet");

const g = svg.append("g");
const projection = d3.geoAlbersUsa();
const path = d3.geoPath().projection(projection);

const tooltip = d3.select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("opacity", 0);

// ─── Row Converter ────────────────────────────────────────────────────────────

function rowConverter(d) {
    return {
        year: +d.date.substring(0, 4),
        age: +d.age,
        death: d.manner_of_death,
        gender: d.gender,
        race: d.race,
        state: d.state,
        mentalIllness: d.signs_of_mental_illness === "True",
        threatLevel: d.threat_level,
        flee: d.flee,
        bodyCamera: d.body_camera === "True"
    };
}

// ─── Info Panel ───────────────────────────────────────────────────────────────

function drawInfoPanel(data) {
    const panel = d3.select("#info-panel");
    panel.selectAll("*").remove();

    const totalCases = data.length;
    const averageAge = d3.mean(data, d => d.age)?.toFixed(1) ?? "N/A";
    const mentalPct = totalCases > 0
        ? ((data.filter(d => d.mentalIllness).length / totalCases) * 100).toFixed(1)
        : 0;
    const bodyCamPct = totalCases > 0
        ? ((data.filter(d => d.bodyCamera).length / totalCases) * 100).toFixed(1)
        : 0;

    const infoData = [
        { label: "Total Cases", value: totalCases.toLocaleString() },
        { label: "Average Age", value: averageAge },
        { label: "Mental Illness", value: `${mentalPct}%` },
        { label: "Body Cam Rate", value: `${bodyCamPct}%` }
    ];

    const cards = panel.selectAll(".info-card")
        .data(infoData)
        .enter()
        .append("div")
        .attr("class", "info-card");

    cards.append("div").attr("class", "info-label").text(d => d.label);
    cards.append("div").attr("class", "info-value").text(d => d.value);
}

// ─── Map Drawing ──────────────────────────────────────────────────────────────

function drawMap(geoData, csvData) {
    const totalNationalCases = csvData.length;
    const stateCounts = d3.rollup(csvData, v => v.length, d => d.state);

    geoData.features.forEach(f => {
        const abbr = Object.keys(stateNameMap).find(k => stateNameMap[k] === f.properties.name);
        f.properties.value = stateCounts.get(abbr);
        f.properties.abbr = abbr;
    });

    projection.fitSize([MAP_WIDTH, MAP_HEIGHT], geoData);

    const color = d3.scaleSequential()
        .domain([0, d3.max(geoData.features, d => d.properties.value)])
        .interpolator(d3.interpolateYlOrRd);

    g.append("rect")
        .attr("class", "background")
        .attr("width",  MAP_WIDTH)
        .attr("height", MAP_HEIGHT)
        .attr("fill",   "none")
        .attr("pointer-events", "all")
        .on("click", event => clicked(event, null));

    const stateGroups = g.append("g")
        .selectAll("g")
        .data(geoData.features)
        .join("g");

    stateGroups.append("path")
        .attr("d", path)
        .attr("fill", d => color(d.properties.value))
        .attr("stroke", "#1f2e44")
        .attr("cursor", "pointer")
        .on("mouseover", function(event, d) {
            const pct = ((d.properties.value / totalNationalCases) * 100).toFixed(1);
            d3.select(this).attr("stroke", "#00e5c8").attr("stroke-width", 2);
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <strong>${d.properties.name}</strong>
                Cases: ${d.properties.value}<br/>
                % of National: ${pct}%
            `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 32) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke", "#1f2e44").attr("stroke-width", 1);
            tooltip.transition().duration(400).style("opacity", 0);
        })
        .on("click", (event, d) => clicked(event, d, geoData, csvData));

    stateGroups.append("text")
        .attr("transform", d => {
            const centroid = path.centroid(d);
            return (centroid && !isNaN(centroid[0])) ? `translate(${centroid})` : null;
        })
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("fill", "#1a1a1a")
        .style("pointer-events", "none") 
        .style("opacity", 0.8)
        .text(d => d.properties.abbr);
}

// ─── Map Zoom ─────────────────────────────────────────────────────────────────

function clicked(event, d) {
    let x, y, k;

    if (d && centered !== d) {
        const centroid = path.centroid(d);
        x = centroid[0];
        y = centroid[1];
        k = 4;
        centered = d;
    } else {
        x = MAP_WIDTH / 2;
        y = MAP_HEIGHT / 2;
        k = 1;
        centered = null;
    }

    updateDashboard(currentYear);

    g.transition()
        .duration(750)
        .attr("transform",
            `translate(${MAP_WIDTH / 2},${MAP_HEIGHT / 2})scale(${k})translate(${-x},${-y})`
        );
}

// ─── Data Filtering & Dashboard Update ───────────────────────────────────────

function filterDataByYear(year) {
    return year === "All"
        ? fullData
        : fullData.filter(d => d.year === parseInt(year));
}

function updateDashboard(year) {
    currentYear = year;
    const filteredData = filterDataByYear(year);

    d3.select("#year-display").text(year);

    let displayData = filteredData;
    let locationName = "National";
    const yearLabel = year === "All" ? "All Years" : year;

    if (centered) {
        displayData = filteredData.filter(d => d.state === centered.properties.abbr);
        locationName = centered.properties.name;
    }

    const title = `${locationName} Statistics (${yearLabel})`;
    d3.select("#dashboard-title").text(title);

    updateMap(filteredData);
    updateAllCharts(displayData, title);
}

// ─── Map Color Update ─────────────────────────────────────────────────────────

function updateMap(filteredData) {
    const totalNationalCases = filteredData.length;
    const stateCounts = d3.rollup(filteredData, v => v.length, d => d.state);

    const color = d3.scaleSequential()
        .domain([0, d3.max(stateCounts.values()) || 1])
        .interpolator(d3.interpolateYlOrRd);

    g.selectAll("path")
        .transition()
        .duration(500)
        .attr("fill", d => {
            const count = stateCounts.get(d.properties?.abbr) || 0;
            return count > 0 ? color(count) : "#1b2538";
        })
        .on("end", function() {
            d3.select(this).each(function(d) {
                if (!d.properties) return;
                d.properties.currentValue = stateCounts.get(d.properties.abbr);
                d.properties.currentTotal = totalNationalCases;
            });
        });

    g.selectAll("path").on("mouseover", function(event, d) {
        if (!d.properties) return;
        const count = stateCounts.get(d.properties.abbr) || 0;
        const pct = totalNationalCases > 0
            ? ((count / totalNationalCases) * 100).toFixed(1)
            : "0.0";

        d3.select(this).attr("stroke", "#00e5c8").attr("stroke-width", 2);
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
            <strong>${d.properties.name}</strong>
            Cases (${currentYear}): ${count}<br/>
            % of Period Total: ${pct}%
        `);
    });
}

// ─── Slider Initialization ────────────────────────────────────────────────────

function initSlider(csvData) {
    const years = [...new Set(csvData.map(d => d.year))].sort();
    const slider = d3.select("#year-slider");

    slider
        .attr("min", 0)
        .attr("max", years.length)
        .attr("value", 0);

    slider.on("input", function() {
        const val = +this.value;
        currentYear = val === 0 ? "All" : years[val - 1];
        updateDashboard(currentYear);
    });
}

// ─── Chart Navigation State ───────────────────────────────────────────────────

let activeChart = "states";

const chartTitles = {
    states:  () => `Top 5 States by Cases`,
    race:    () => { const loc = centered ? centered.properties.name : "National"; return `Race Distribution: ${loc}`; },
    threat:  () => { const loc = centered ? centered.properties.name : "National"; return `Threat Levels: ${loc}`; },
    age:     () => { const loc = centered ? centered.properties.name : "National"; return `Age by Race: ${loc}`; },
    mental:  () => { const loc = centered ? centered.properties.name : "National"; return `Mental Health vs Fleeing: ${loc}`; }
};

function renderActiveChart() {
    const panel = "#chart-active-panel";
    d3.select(panel).html("");
    d3.select("#chart-active-title").text(chartTitles[activeChart]());

    const filteredData = filterDataByYear(currentYear);
    let displayData = centered
        ? filteredData.filter(d => d.state === centered.properties.abbr)
        : filteredData;

    switch (activeChart) {
        case "states":  drawTopStatesChart(panel, filteredData); break;
        case "race":    drawBarChart(panel, displayData, "race"); break;
        case "threat":  drawThreatChart(panel, displayData); break;
        case "age":     drawBoxPlot(panel, displayData); break;
        case "mental":  drawStackedBar(panel, displayData); break;
    }
}

function initChartNav() {
    document.querySelectorAll(".chart-nav-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".chart-nav-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            activeChart = this.dataset.chart;
            renderActiveChart();
        });
    });
}

// ─── Chart Orchestration ──────────────────────────────────────────────────────

function updateAllCharts(data, title) {
    drawInfoPanel(data, title);
    renderActiveChart();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyMessage(container, msg = "No data available for this selection") {
    d3.select(container).html("")
        .append("div")
        .style("color", "var(--text-dim)")
        .style("text-align", "center")
        .style("padding", "20px")
        .style("font-size", "0.75rem")
        .text(msg);
}

// ─── Top States Line Chart ─────────────────────────────────────────────────────

function drawTopStatesChart(container, data) {
    d3.select(container).selectAll("*").remove();

    const margin = { top: 15, right: 35, bottom: 30, left: 35 };
    const width = CHART_WIDTH - margin.left - margin.right;
    const height = CHART_HEIGHT - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg")
        .attr("width", "100%")
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const totalCounts = d3.rollup(fullData, v => v.length, d => d.state);
    const top5Abbrs = Array.from(totalCounts, ([abbr, value]) => ({abbr, value}))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map(d => d.abbr);

    const startYear = 2015;
    const endYear = (currentYear === "All") ? 2022 : parseInt(currentYear);
    
    const activeYears = [];
    for (let y = startYear; y <= endYear; y++) {
        activeYears.push(y);
    }

    const lineData = top5Abbrs.map(abbr => ({
        abbr: abbr,
        name: stateNameMap[abbr] || abbr,
        values: activeYears.map(yr => ({
            year: yr,
            count: fullData.filter(d => d.state === abbr && d.year === yr).length
        }))
    }));

    const x = d3.scaleLinear()
        .domain([startYear, endYear === startYear ? startYear + 0.1 : endYear]) 
        .range([0, width]);

    const maxY = d3.max(lineData, s => d3.max(s.values, v => v.count)) || 1;
    const y = d3.scaleLinear().domain([0, maxY * 1.1]).range([height, 0]);
    const color = d3.scaleOrdinal(d3.schemeSet2).domain(top5Abbrs);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .ticks(activeYears.length === 1 ? 1 : activeYears.length - 1)
            .tickFormat(d3.format("d")))
        .attr("color", "var(--text-dim)");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .attr("color", "var(--text-dim)");

    const lineGen = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);

    svg.selectAll(".state-path")
        .data(lineData)
        .join("path")
        .attr("class", "state-path")
        .attr("d", d => lineGen(d.values))
        .attr("fill", "none")
        .attr("stroke", d => color(d.abbr))
        .attr("stroke-width", 2)
        .style("opacity", activeYears.length > 1 ? 0.8 : 0);

    const groups = svg.selectAll(".state-group")
        .data(lineData)
        .join("g")
        .attr("class", "state-group")
        .attr("fill", d => color(d.abbr));

    groups.selectAll("circle")
        .data(d => d.values)
        .join("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", 3.5)
        .attr("stroke", "var(--bg-color)")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            const stateInfo = d3.select(this.parentNode).datum();
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${stateInfo.name}</strong>Year: ${d.year}<br/>Cases: ${d.count}`);
        })
        .on("mousemove", event => {
            tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(400).style("opacity", 0));

    const legend = svg.append("g").attr("transform", `translate(${width + 5}, 0)`);
    top5Abbrs.forEach((abbr, i) => {
        legend.append("text")
            .attr("y", i * 14)
            .style("fill", color(abbr))
            .style("font-size", "10px")
            .style("font-weight", "bold")
            .text(abbr);
    });
}

// ─── Race Bar Chart ───────────────────────────────────────────────────────────

function drawBarChart(container, data, key) {
    if (data.length === 0) { emptyMessage(container); return; }

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = CHART_WIDTH - margin.left - margin.right;
    const height = CHART_HEIGHT - margin.top  - margin.bottom;

    const svg = d3.select(container).html("").append("svg")
        .attr("width", "100%")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const counts = d3.rollup(data, v => v.length, d => d[key]);
    const plotData = Array.from(counts, ([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(plotData.map(d => d.name))
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, d3.max(plotData, d => d.value)])
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    svg.append("g").call(d3.axisLeft(y).ticks(5));

    svg.selectAll("rect")
        .data(plotData)
        .enter().append("rect")
        .attr("x", d => x(d.name))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.value))
        .attr("height", d => height - y(d.value))
        .attr("fill", "#00e5c8")
        .attr("rx", 2)
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${raceNameMap[d.name]}</strong>Cases: ${d.value}<br/>Dominance: ${((d.value / data.length) * 100).toFixed(1)}%`);
        })
        .on("mousemove", event => {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top",  (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#00e5c8");
            tooltip.transition().duration(400).style("opacity", 0);
        });
}

// ─── Threat Donut Chart ───────────────────────────────────────────────────────

function drawThreatChart(container, data) {
    if (data.length === 0) { emptyMessage(container); return; }

    const width = CHART_WIDTH;
    const height = CHART_HEIGHT;
    const margin = 20;
    const radius = Math.min(width, height) / 2 - margin;
    const categories = ["attack", "other", "undetermined"];

    const svg = d3.select(container).html("").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${width / 2.5},${height / 2})`);

    const counts = d3.rollup(data, v => v.length, d => d.threatLevel);
    const plotData = categories.map(cat => ({ key: cat, value: counts.get(cat) }));

    const color = d3.scaleOrdinal()
        .domain(categories)
        .range(["#ff4757", "#54a0ff", "#feca57"]);

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);

    svg.selectAll("path")
        .data(pie(plotData))
        .join("path")
        .attr("d",    arc)
        .attr("fill", d => color(d.data.key))
        .attr("stroke", "var(--surface-1)")
        .style("stroke-width", "2px")
        .on("mouseover", function(event, d) {
            d3.select(this).transition().duration(200)
                .attr("d", d3.arc().innerRadius(radius * 0.5).outerRadius(radius * 1.1));
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <strong>Threat: ${d.data.key}</strong>
                Cases: ${d.data.value}<br/>
                Dominance: ${((d.data.value / data.length) * 100).toFixed(1)}%
            `);
        })
        .on("mousemove", event => {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top",  (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).transition().duration(200).attr("d", arc);
            tooltip.transition().duration(400).style("opacity", 0);
        });

    const legend = svg.append("g")
        .attr("transform", `translate(${radius + 20}, ${-radius + 20})`);

    categories.forEach((key, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 25})`);
        row.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("rx", 2)
            .attr("fill", color(key));
        row.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .attr("fill", "var(--text-sub)")
            .style("font-size", "11px")
            .style("text-transform", "capitalize")
            .text(key);
    });
}

// ─── Box Plot (Age by Race) ───────────────────────────────────────────────────

function drawBoxPlot(container, data) {
    if (data.length === 0) { emptyMessage(container); return; }

    const margin = { top: 10, right: 30, bottom: 45, left: 40 };
    const width = CHART_WIDTH - margin.left - margin.right;
    const height = CHART_HEIGHT - margin.top  - margin.bottom;

    const totalW = width  + margin.left + margin.right;
    const totalH = height + margin.top  + margin.bottom;

    const svg = d3.select(container).html("").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${totalW} ${totalH}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const sumstat = d3.rollups(data, v => {
        const ages = v.map(g => g.age).filter(a => !isNaN(a)).sort(d3.ascending);
        const q1 = d3.quantile(ages, 0.25);
        const med = d3.quantile(ages, 0.5);
        const q3 = d3.quantile(ages, 0.75);
        const iqr = q3 - q1;
        return { q1, median: med, q3, iqr, min: Math.max(0, q1 - 1.5 * iqr), max: q3 + 1.5 * iqr, n: v.length };
    }, d => d.race);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(sumstat.map(d => d[0]))
        .padding(0.4);

    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(0))
        .style("color", "var(--text-dim)");

    xAxis.selectAll(".tick").each(function(raceKey) {
        const stat = sumstat.find(d => d[0] === raceKey);
        const n = stat ? stat[1].n : 0;
        d3.select(this).append("text")
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .style("font-family", "Courier New") 
            .style("font-weight", "bold")
            .style("color", "var(--text-dim)")
            .text(`N=${n}`);
    });

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .style("color", "var(--text-dim)");

    svg.selectAll(".whisker")
        .data(sumstat).enter().append("line")
        .attr("x1", d => x(d[0]) + x.bandwidth() / 2)
        .attr("x2", d => x(d[0]) + x.bandwidth() / 2)
        .attr("y1", d => y(d[1].min))
        .attr("y2", d => y(d[1].max))
        .attr("stroke", "var(--text-dim)");

    svg.selectAll(".box")
        .data(sumstat).enter().append("rect")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d[1].q3))
        .attr("height", d => y(d[1].q1) - y(d[1].q3))
        .attr("width", x.bandwidth())
        .attr("stroke", "var(--border-light)")
        .style("fill", "var(--surface-3)")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <strong>${raceNameMap[d[0]]} Race</strong>
                Max: ${d[1].max.toFixed(0)}<br/>
                Median: ${d[1].median.toFixed(0)}<br/>
                Min: ${d[1].min.toFixed(0)}<br/>
                Cases: ${data.filter(g => g.race === d[0]).length}
            `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(400).style("opacity", 0);
        });

    svg.selectAll(".median")
        .data(sumstat).enter().append("line")
        .attr("x1", d => x(d[0]))
        .attr("x2", d => x(d[0]) + x.bandwidth())
        .attr("y1", d => y(d[1].median))
        .attr("y2", d => y(d[1].median))
        .attr("stroke", "#ff4757")
        .attr("stroke-width", 2);
}

// ─── Grouped Stacked Bar Chart (Mental Illness vs Fleeing) ────────────────────────────

function drawStackedBar(container, data) {
    if (data.length === 0) { emptyMessage(container); return; }

    const margin = { top: 10, right: 10, bottom: 30, left: 45 };
    const width = CHART_WIDTH - margin.left - margin.right;
    const height = CHART_HEIGHT - margin.top - margin.bottom;
    const totalW = width + margin.left + margin.right;
    const totalH = height + margin.top + margin.bottom;

    const svg = d3.select(container).html("").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${totalW} ${totalH}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const subGroups = ["Mental Illness", "No Mental Illness"];
    const categories = ["Not fleeing", "Fleeing"];
    
    const formattedData = categories.map(cat => {
        const sub = data.filter(d => cat === "Not fleeing" ? d.flee === cat : d.flee !== "Not fleeing");
        
        const total = sub.length;
        const illness = sub.filter(d => d.mentalIllness).length;
        
        const illnessPct = total > 0 ? (illness / total) * 100 : 0;
        const noIllnessPct = total > 0 ? ((total - illness) / total) * 100 : 0;

        return {
            status: cat,
            "Mental Illness": illnessPct,
            "No Mental Illness": noIllnessPct,
            total: total, 
            counts: {
                "Mental Illness": illness,
                "No Mental Illness": total - illness
            }
        };
    });

    const stackGen = d3.stack().keys(subGroups);
    const stackedSeries = stackGen(formattedData);

    const x = d3.scaleBand().domain(categories).range([0, width - 50]).padding(0.4);
    const y = d3.scaleLinear().domain([0, 100]).range([height - 30, 0]);
    const color = d3.scaleOrdinal().domain(subGroups).range(["#ff4757", "#2f3f5a"]);

    const g_chart = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    g_chart.append("g")
        .selectAll("g")
        .data(stackedSeries)
        .join("g")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d.map(item => ({ ...item, key: d.key })))
        .join("rect")
        .attr("x", d => x(d.data.status))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .on("mouseover", function(event, d) {
            const val = d[1] - d[0];
            const count = d.data.counts[d.key];
            
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <strong>${d.key}</strong>
                ${d.key}: ${val.toFixed(1)}%<br/>
                Cases: ${count}
            `);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(400).style("opacity", 0);
        });

    g_chart.append("g")
        .attr("transform", `translate(0,${height - 30})`)
        .call(d3.axisBottom(x))
        .style("color", "var(--text-dim)");

    g_chart.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"))
        .style("color", "var(--text-dim)");

    g_chart.selectAll(".n-label")
        .data(formattedData)
        .join("text")
        .attr("class", "n-label")
        .attr("x", d => x(d.status) + x.bandwidth() / 2) 
        .attr("y", height + 15) 
        .attr("text-anchor", "middle")
        .style("font-family", "Courier New") 
        .style("font-weight", "bold")
        .style("color", "var(--text-dim)")
        .text(d => `N = ${d.total.toLocaleString()}`);
}

// ─── Data Load & Init ─────────────────────────────────────────────────────────

function loadData() {
    initChartNav();
    d3.csv(fileCSV, rowConverter).then(csvData => {
        fullData = csvData;
        initSlider(csvData);

        d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(geoData => {
            geoDataGlobal = topojson.feature(geoData, geoData.objects.states);
            drawMap(geoDataGlobal, csvData);
            updateDashboard("All");
        });
    });
}

loadData();

// ─── Lookup Tables ────────────────────────────────────────────────────────────

const stateNameMap = {
    AL: "Alabama",      AK: "Alaska",       AZ: "Arizona",      AR: "Arkansas",
    CA: "California",   CO: "Colorado",     CT: "Connecticut",  DE: "Delaware",
    FL: "Florida",      GA: "Georgia",      HI: "Hawaii",       ID: "Idaho",
    IL: "Illinois",     IN: "Indiana",      IA: "Iowa",         KS: "Kansas",
    KY: "Kentucky",     LA: "Louisiana",    ME: "Maine",        MD: "Maryland",
    MA: "Massachusetts",MI: "Michigan",     MN: "Minnesota",    MS: "Mississippi",
    MO: "Missouri",     MT: "Montana",      NE: "Nebraska",     NV: "Nevada",
    NH: "New Hampshire",NJ: "New Jersey",   NM: "New Mexico",   NY: "New York",
    NC: "North Carolina",ND: "North Dakota",OH: "Ohio",         OK: "Oklahoma",
    OR: "Oregon",       PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee",    TX: "Texas",        UT: "Utah",
    VT: "Vermont",      VA: "Virginia",     WA: "Washington",   WV: "West Virginia",
    WI: "Wisconsin",    WY: "Wyoming"
};

const raceNameMap = {
    W: "White",
    B: "Black",
    A: "Asian",
    H: "Hispanic",
    N: "Native American",
    O: "Other"
};