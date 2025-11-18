// Triple/grouped bar chart: average valence, energy, danceability per popularity bucket (10 buckets)
// Assumptions: CSV has numeric columns named `popularity`, `valence`, `energy`, `danceability`.
// If your CSV uses slightly different names (e.g., `danceablity`), update the field names below.

const DATA_PATH = "merged_tracks.csv";

function toNumber(x) {
    const n = +x;
    return isNaN(n) ? null : n;
}

d3.csv(DATA_PATH).then(function(rows) {
    // Parse numeric fields
    const data = rows.map(d => ({
        popularity: toNumber(d.popularity),
        valence: toNumber(d.valence),
        energy: toNumber(d.energy),
        danceability: toNumber(d.danceability)
    })).filter(d => d.popularity !== null);

    if (!data.length) {
        d3.select('#perceptive').append('text').text('No numeric data found. Check CSV column names.');
        console.error('No numeric rows after parsing.');
        return;
    }

    // Determine popularity domain
    const pops = data.map(d => d.popularity);
    const popMin = d3.min(pops);
    const popMax = d3.max(pops);
    const range = popMax - popMin || 1;

    // Prepare 10 buckets
    const buckets = Array.from({length:10}, (_,i) => ({
        i,
        count: 0,
        sumValence: 0,
        sumEnergy: 0,
        sumDance: 0
    }));

    data.forEach(d => {
        // bucket index 0..9
        let idx = Math.floor((d.popularity - popMin) / range * 10);
        if (idx < 0) idx = 0;
        if (idx > 9) idx = 9;
        const b = buckets[idx];
        b.count += 1;
        if (d.valence != null) b.sumValence += d.valence;
        if (d.energy != null) b.sumEnergy += d.energy;
        if (d.danceability != null) b.sumDance += d.danceability;
    });

    // Compute averages and labels
    const bucketData = buckets.map((b, i) => {
        const bucketLow = popMin + (i * range / 10);
        const bucketHigh = popMin + ((i+1) * range / 10);
        return {
            bucket: i,
            label: `${Math.round(bucketLow)}–${Math.round(bucketHigh)}`,
            count: b.count,
            valence: b.count ? (b.sumValence / b.count) : 0,
            energy: b.count ? (b.sumEnergy / b.count) : 0,
            danceability: b.count ? (b.sumDance / b.count) : 0
        };
    });

    // Setup chart area
    const margin = {top: 40, right: 20, bottom: 80, left: 60};
    const width = 1000 - margin.left - margin.right;
    const height = 480 - margin.top - margin.bottom;

    const svg = d3.select('#perceptive')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const groups = bucketData.map(d => d.label);
    const keys = ['valence','energy','danceability'];

    const x0 = d3.scaleBand()
        .domain(groups)
        .range([0, width])
        .paddingInner(0.2);

    const x1 = d3.scaleBand()
        .domain(keys)
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bucketData, d => Math.max(d.valence, d.energy, d.danceability)) || 1])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(keys)
        .range(['#1f77b4', '#ff7f0e', '#2ca02c']);

    // Axes
    svg.append('g')
        .attr('class','x-axis')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x0))
        .selectAll('text')
        .attr('transform','rotate(-35)')
        .style('text-anchor','end');

    svg.append('g')
        .attr('class','y-axis')
        .call(d3.axisLeft(y).ticks(6));

    svg.append('text')
        .attr('x', -margin.left + 4)
        .attr('y', -10)
        .attr('fill', '#000')
        .style('font-weight','600')
        .text('Average (0–1 scale)');

    // Bars
    const group = svg.selectAll('g.bucket')
        .data(bucketData)
        .enter().append('g')
        .attr('class','bucket')
        .attr('transform', d => `translate(${x0(d.label)},0)`);

    group.selectAll('rect')
        .data(d => keys.map(key => ({key, value: d[key], count: d.count, label: d.label})))
        .enter().append('rect')
        .attr('class', d => `bar bar-${d.key}`)
        .attr('x', d => x1(d.key))
        .attr('y', d => y(d.value))
        .attr('width', x1.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('fill', d => color(d.key))
        .attr('stroke', '#333')
        .attr('stroke-width', 0.2)
        .on('mouseover', function(event, d) {
            const hoveredKey = d.key;
            
            // Function to create faded color (lighter + desaturated)
            const fadedColor = (c) => {
                const h = d3.hsl(c);
                h.s = h.s * 0.25; // reduce saturation
                h.l = Math.min(h.l + 0.35, 0.95); // increase lightness
                return h.toString();
            };
            
            // Lighten and desaturate bars of non-hovered variables (target only chart bars)
            d3.selectAll('rect.bar').attr('fill', function(barData) {
                return hoveredKey === barData.key ? color(barData.key) : fadedColor(color(barData.key));
            }).attr('opacity', function(barData) {
                return hoveredKey === barData.key ? 1 : 0.45;
            });
            
            // Apply same fading to trend lines
            keys.forEach(k => {
                d3.selectAll(`.trend-${k}`).attr('stroke', hoveredKey === k ? color(k) : fadedColor(color(k)))
                    .attr('opacity', hoveredKey === k ? 1 : 0.3);
            });
            
            // Apply same fading to points
            keys.forEach(k => {
                d3.selectAll(`.point-${k}`).attr('fill', hoveredKey === k ? color(k) : fadedColor(color(k)))
                    .attr('opacity', hoveredKey === k ? 1 : 0.35);
            });
            
            tooltip.style('display','block')
                .html(`<strong>${d.key}</strong><br/>avg: ${d.value.toFixed(3)}<br/>count: ${d.count}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY + 10) + 'px');
        })
        .on('mousemove', function(event){
            tooltip.style('left', (event.pageX + 10) + 'px')
                         .style('top', (event.pageY + 10) + 'px');
        })
        .on('mouseout', function(){
            d3.selectAll('rect.bar').attr('fill', d => color(d.key)).attr('opacity', 1);
            keys.forEach(k => {
                d3.selectAll(`.trend-${k}`).attr('stroke', color(k)).attr('opacity', 1);
                d3.selectAll(`.point-${k}`).attr('fill', color(k)).attr('opacity', 1);
            });
            tooltip.style('display','none');
        });

    // Show bucket counts under bars
    svg.append('g')
        .selectAll('text.count')
        .data(bucketData)
        .enter().append('text')
        .attr('x', d => x0(d.label) + x0.bandwidth()/2)
        .attr('y', height + 55)
        .attr('text-anchor','middle')
        .attr('fill','#444')
        .style('font-size','11px')
        .text(d => `${d.count} tracks`);

    // Legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 160}, -30)`);

    keys.forEach((k, i) => {
        const g = legend.append('g').attr('transform', `translate(0, ${i*18})`);
        g.append('rect').attr('width', 14).attr('height', 14).attr('fill', color(k)).attr('stroke','#333');
        g.append('text').attr('x',18).attr('y',12).text(k).style('font-size','12px');
    });

    // Trend lines (one per key) with points
    keys.forEach((k) => {
        const lineGen = d3.line()
            .x(d => x0(d.label) + x0.bandwidth() / 2)
            .y(d => y(d[k]))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(bucketData)
            .attr('fill', 'none')
            .attr('stroke', color(k))
            .attr('stroke-width', 2.5)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('d', lineGen)
            .attr('class', `trend-line trend-${k}`);

        // Add small points at each bucket average
        svg.selectAll(`.point-${k}`)
            .data(bucketData)
            .enter().append('circle')
            .attr('class', `point-${k}`)
            .attr('cx', d => x0(d.label) + x0.bandwidth() / 2)
            .attr('cy', d => y(d[k]))
            .attr('r', 3.5)
            .attr('fill', color(k))
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.8)
            .on('mouseover', function(event, d) {
                tooltip.style('display','block')
                    .html(`<strong>${k}</strong><br/>avg: ${d[k].toFixed(3)}<br/>count: ${d.count}`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY + 10) + 'px');
            })
            .on('mousemove', function(event){
                tooltip.style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY + 10) + 'px');
            })
            .on('mouseout', function(){
                tooltip.style('display','none');
            });
    });

    // Tooltip
    const tooltip = d3.select('body').append('div')
        .style('position','absolute')
        .style('background','#fff')
        .style('padding','6px 8px')
        .style('border','1px solid #ccc')
        .style('border-radius','4px')
        .style('box-shadow','0 1px 4px rgba(0,0,0,0.1)')
        .style('display','none')
        .style('pointer-events','none')
        .style('font-size','12px');

}).catch(err => {
    d3.select('#perceptive').append('text').text('Failed to load CSV. Open DevTools to see the error.');
    console.error('CSV load error:', err);
});

