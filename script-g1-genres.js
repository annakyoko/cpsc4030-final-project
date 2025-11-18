// Load the CSV
d3.csv("merged_tracks.csv").then(data => {

    // Filter out empty genres
    data = data.filter(d => d.track_genre && d.track_genre.trim() !== "");

    // Convert release_year to number
    data.forEach(d => d.release_year = +d.release_year);

    const svg = d3.select("#genres");
    const width = +svg.attr("width") || 900;   // fallback width
    const height = +svg.attr("height") || 500; // fallback height
    const margin = { top: 40, right: 30, bottom: 120, left: 70 };

    // Predefined genre order
    const topGenres = [
        "hard-rock", "metal", "punk", "classical",
        "hip-hop", "electronic", "alternative",
        "folk", "pop", "alt-rock"
    ];

    // Filter data to only these genres
    const topData = data.filter(d => topGenres.includes(d.track_genre));

    // X scale (categorical)
    const x = d3.scaleBand()
        .domain(topGenres)
        .range([margin.left, width - margin.right])
        .padding(0.4);

    // Y scale (years)
    const y = d3.scaleLinear()
        .domain(d3.extent(topData, d => d.release_year))
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Color scale
    const color = d3.scaleOrdinal()
        .domain(topGenres)
        .range(d3.schemeCategory10);

    // X-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");

    // Y-axis (years, no commas)
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickFormat(d3.format("d")));

    // Jitter function for horizontal scatter
    const jitter = () => (Math.random() - 0.5) * x.bandwidth() * 0.7;

    // Tooltip div
    const tooltip = d3.select("#tooltip");

    // Draw points with tooltip
    svg.append("g")
        .selectAll("circle")
        .data(topData)
        .enter()
        .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.track_genre) + x.bandwidth()/2 + jitter())
            .attr("cy", d => y(d.release_year))
            .attr("r", 5)
            .attr("fill", d => color(d.track_genre))
            .on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                       .html(`<strong>${d.track_name}</strong>`)
                       .style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 20) + "px");
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("opacity", 0);
            });

    // Compute summary statistics (mean + std) for each genre
    const stats = topGenres.map(genre => {
        const vals = topData.filter(d => d.track_genre === genre).map(d => d.release_year);
        const mean = d3.mean(vals);
        const std = Math.sqrt(d3.variance(vals));
        return {
            genre,
            mean,
            std,
            min: mean - std,
            max: mean + std
        };
    });

    // Draw clickable error bars
svg.append("g")
    .selectAll("line.error-bar")
    .data(stats)
    .enter()
    .append("line")
        .attr("class", "error-bar")
        .attr("x1", d => x(d.genre) + x.bandwidth()/2)
        .attr("x2", d => x(d.genre) + x.bandwidth()/2)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.max))
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .style("cursor", "pointer") // show pointer on hover
        .on("click", (event, d) => {
            tooltip.style("opacity", 1)
            .html(`
                <strong>${d.genre}</strong><br/>
                Mean Year: ${d.mean.toFixed(1)}<br/>
                Std Dev: ${d.std.toFixed(1)}<br/>
                Min: ${d.min.toFixed(0)}<br/>
                Max: ${d.max.toFixed(0)}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        });


    // Draw mean points (white with black stroke)
    svg.append("g")
    .selectAll("circle.mean")
    .data(stats)
    .enter()
    .append("circle")
        .attr("cx", d => x(d.genre) + x.bandwidth()/2)
        .attr("cy", d => y(d.mean))
        .attr("r", 6)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")   // show pointer
        .on("click", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`
                    <strong>${d.genre}</strong><br/>
                    Mean Year: ${d.mean.toFixed(1)}<br/>
                    Std Dev: ${d.std.toFixed(1)}<br/>
                    Min: ${d.min.toFixed(0)}<br/>
                    Max: ${d.max.toFixed(0)}
                `)
                .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 20) + "px");
        });
        // X-axis label
svg.append("text")
    .attr("class", "x-axis-label")
    .attr("x", (width + margin.left - margin.right) / 2)  // center of the chart
    .attr("y", height - 40)  // below the axis
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Genre");

// Y-axis label
svg.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height - margin.top - margin.bottom) / 2 - margin.top)  // center of the y-axis
    .attr("y", 20)  // distance from the axis
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Release Year");
});
