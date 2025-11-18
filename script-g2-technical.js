// this file is for the technical features graph

// margins and dimensions
const margin = {top: 50, right: 50, bottom: 70, left: 80};
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// append a group for margins on svg
const svg = d3.select("#technical")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// scales --> domains set after svg loads
const xScale = d3.scaleLinear().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);
const colorScale = d3.scaleLinear().range(["#eeeeee", "#1f77b4"]); // light gray --> blue

// axes
const xAxis = svg.append("g")
    .attr("transform", `translate(0, ${height})`);
const yAxis = svg.append("g");

// axis labels
svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Year");

const yAxisLabel = svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .attr("id", "y-axis-label")
    .text("Duration");

// dropdowns
const yAttributes = ["duration", "tempo", "time_signature", "explicit", "loudness"];
const yDropdown = d3.select("#y-dropdown");
yDropdown.selectAll("option")
    .data(yAttributes)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d);

const genreDropdown = d3.select("#genre-select");

// load CSV
d3.csv("merged_tracks.csv").then(data => {
    console.log("First row:", data[0]);
    console.log("Column names:", Object.keys(data[0]));

    // make sure numeric fields are numbers
    data.forEach(d => {
        d.year = +d.release_year;
        d.duration = +d.duration_ms_x;
        d.tempo = +d.tempo_x;
        d.time_signature = +d.time_signature_x;
        d.explicit = d.explicit_x === "true" || d.explicit_x === "True" || d.explicit_x == true ? 1 : 0;
        d.loudness = +d.loudness_x;
        d.popularity = +d.popularity_x;
        d.genre = d.track_genre;
    });

    console.log("After parsing - sample row:", data[0]);
    console.log("Year:", data[0].year, "Duration:", data[0].duration, "Genre:", data[0].genre);

    // set x-axis domain
    xScale.domain(d3.extent(data, d => d.year));
    xAxis.call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    // function to aggregate by year
    function aggregateByYear(filteredData, yAttribute) {
        const nested = d3.group(filteredData, d => d.year);
        return Array.from(nested, ([year, values]) => ({
            year: +year,
            y: d3.mean(values, d => d[yAttribute]),
            popularity: d3.mean(values, d => d.popularity)
        })).sort((a,b) => a.year - b.year);
    }

    // function to update chart
    function updateChart() {
        const selectedAttr = yDropdown.node().value;
        const selectedGenre = genreDropdown.node().value;

        // update y-axis label
        yAxisLabel.text(selectedAttr.charAt(0).toUpperCase() + selectedAttr.slice(1));

        // filter by genre if selected
        let filteredData = data;
        if (selectedGenre) {
            filteredData = data.filter(d => d.genre === selectedGenre);
        }

        const aggData = aggregateByYear(filteredData, selectedAttr)
            .filter(d => d.y != null && !isNaN(d.y)); // filter out invalid data

        console.log("Aggregated data points:", aggData.length);
        console.log("Sample aggregated data:", aggData.slice(0, 5));

        // update y-axis domain dynamically
        const yMin = d3.min(aggData, d => d.y);
        const yMax = d3.max(aggData, d => d.y);
        yScale.domain([yMin, yMax]);
        yAxis.transition().duration(500).call(d3.axisLeft(yScale));

        // update color scale based on popularity
        const popMax = d3.max(aggData, d => d.popularity);
        colorScale.domain([0, popMax]);

        // bind data to circles
        const circles = svg.selectAll("circle").data(aggData, d => d.year);

        // enter + merge
        const merged = circles.enter()
            .append("circle")
            .attr("r", 5)
            .merge(circles);

        // transition attributes
        merged.transition()
            .duration(500)
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.y))
            .attr("fill", d => colorScale(d.popularity));

        // attach tooltip events OUTSIDE transition
        merged
            .on("mouseover", (event, d) => {
                const selectedAttr = yDropdown.node().value;
                d3.select("#tooltip")
                    .style("opacity", 1)
                    .html(`
                        <strong>Year:</strong> ${d.year}<br/>
                        <strong>${selectedAttr}:</strong> ${d.y != null ? d.y.toFixed(2) : 'N/A'}<br/>
                        <strong>Popularity:</strong> ${d.popularity != null ? d.popularity.toFixed(1) : 'N/A'}
                    `);
            })
            .on("mousemove", (event) => {
                d3.select("#tooltip")
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 25) + "px");
            })
            .on("mouseout", () => {
                d3.select("#tooltip").style("opacity", 0);
            });

        // remove old circles
        circles.exit().remove();
    }

    // initial render
    yDropdown.property("value", "duration");
    updateChart();

    // update when dropdowns change
    yDropdown.on("change", updateChart);
    genreDropdown.on("change", updateChart);

});