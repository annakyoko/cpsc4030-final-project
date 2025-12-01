// this file is for the technical features graph

// margins
const margin = {top: 50, right: 50, bottom: 70, left: 80};

// make svg
const svgContainer = d3.select("#technical")

// dimensions
const width = svgContainer.node().clientWidth - margin.left - margin.right;
const height = svgContainer.node().clientHeight - margin.top - margin.bottom;

// append a group for margins on svg
const svg = svgContainer.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// scales --> domains set after svg loads
const xScale = d3.scaleLinear().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);

// cohesive color scheme - 5 level step gradient
const popularityThresholds = [0, 20, 40, 60, 80, 100];
const defaultColors = ["#f0f0f0", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"];

// genre color mapping - matches genre graph
const genreColors = {
    "hard-rock": "#e63946",
    "metal": "#6a0572",
    "punk": "#ff006e",
    "classical": "#8338ec",
    "hip-hop": "#fb5607",
    "electronic": "#3a86ff",
    "alternative": "#06a77d",
    "folk": "#52b788",
    "pop": "#ff006e",
    "alt-rock": "#4361ee"
};

// function to create stepped colors for a base color
function createSteppedColors(baseColor) {
    const base = d3.rgb(baseColor);
    return [
        base.brighter(1.5).toString(),
        base.brighter(0.8).toString(),
        baseColor,
        base.darker(0.5).toString(),
        base.darker(1.2).toString()
    ];
}

// function to get color based on popularity (stepped)
function getPopularityColor(popularity, colors) {
    if (popularity <= 20) return colors[0];
    if (popularity <= 40) return colors[1];
    if (popularity <= 60) return colors[2];
    if (popularity <= 80) return colors[3];
    return colors[4];
}

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

// create legend for popularity levels
const legend = svg.append("g")
    .attr("id", "popularity-legend")
    .attr("transform", `translate(${width - 120}, 20)`);

legend.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .text("Popularity");

const legendData = [
    { range: "0-20", color: defaultColors[0] },
    { range: "21-40", color: defaultColors[1] },
    { range: "41-60", color: defaultColors[2] },
    { range: "61-80", color: defaultColors[3] },
    { range: "81-100", color: defaultColors[4] }
];

let currentLegendColors = defaultColors;

// dropdowns
const yAttributes = ["duration", "tempo", "time_signature", "explicit", "loudness"];
const yDropdown = d3.select("#y-dropdown");
yDropdown.selectAll("option")
    .data(yAttributes)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d);

// global variable to track genre
let globalSelectedGenre = null;

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
        const selectedGenre = globalSelectedGenre;

        // update y-axis label
        yAxisLabel.text(selectedAttr.charAt(0).toUpperCase() + selectedAttr.slice(1));

        // filter by genre if selected
        let filteredData = data;
        if (selectedGenre && selectedGenre.trim() !== "") {
            filteredData = data.filter(d => d.genre === selectedGenre);
            console.log(`Filtering to genre: ${selectedGenre}, found ${filteredData.length} tracks`);
        } else {
            console.log(`Showing all genres: ${filteredData.length} tracks`);
        }

        const aggData = aggregateByYear(filteredData, selectedAttr)
            .filter(d => d.y != null && !isNaN(d.y)); // filter out invalid data

        console.log("Aggregated data points:", aggData.length);
        console.log("Sample aggregated data:", aggData.slice(0, 5));

        // Check if we have data
        if (aggData.length === 0) {
            console.warn("No data to display after filtering!");
            return;
        }

        // update y-axis domain dynamically
        const yMin = d3.min(aggData, d => d.y);
        const yMax = d3.max(aggData, d => d.y);
        yScale.domain([yMin, yMax]);
        yAxis.transition().duration(500).call(d3.axisLeft(yScale));

        // determine colors based on genre selection
        let colorsToUse;
        
        if (selectedGenre && genreColors[selectedGenre]) {
            // use stepped colors based on genre
            colorsToUse = createSteppedColors(genreColors[selectedGenre]);
        } else {
            // use default gradient
            colorsToUse = defaultColors;
        }

        // update legend
        currentLegendColors = colorsToUse;
        updateLegend();

        // bind data to circles
        const circles = svg.selectAll("circle").data(aggData, d => d.year);

        // exit - remove old circles
        circles.exit()
            .transition()
            .duration(500)
            .attr("r", 0)
            .remove();

        // enter + merge
        const merged = circles.enter()
            .append("circle")
            .attr("r", 0)
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.y))
            .merge(circles);

        // transition attributes
        merged.transition()
            .duration(500)
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.y))
            .attr("r", 5)
            .attr("fill", d => getPopularityColor(d.popularity, colorsToUse))
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);

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
    }

    // fucntion to update legend
    function updateLegend() {
        // remove old legend stuff
        legend.selectAll(".legend-item").remove();

        // add new legend items
        legendData.forEach((d, i) => {
            const item = legend.append("g")
                .attr("class", "legend-item")
                .attr("transform", `translate(0, ${i * 20})`);

            item.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", currentLegendColors[i])
                .attr("stroke", "#333")
                .attr("stroke-width", 0.5);

            item.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .attr("font-size", "11px")
                .text(d.range);
        });
    }

    // initial render
    yDropdown.property("value", "duration");
    updateLegend(); // init legend
    updateChart();

    // update when y-dropdown changes
    yDropdown.on("change", updateChart);

    window.addEventListener('genreSelected', function(e) {
        globalSelectedGenre = e.detail.genre; // update the global variable
        console.log("Technical graph received genre:", globalSelectedGenre);
        updateChart(); // re-render with new genre filter
    });

});