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

// genre color mapping - matches genre graph
const genreColors = {
    "hard-rock": "#ff2e2e",
    "metal": "#6a0572",
    "punk": "#ff006e",
    "classical": "#8338ec",
    "hip-hop": "#ff7f3f",
    "electronic": "#3a86ff",
    "alternative": "#7ce04d",
    "folk": "#f4d35e",
    "pop": "#9381ff",
    "alt-rock": "#4361ee"
};


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
    .text("Popularity");

const yAxisLabel = svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .attr("id", "y-axis-label")
    .text("Duration");

// add placeholder text to show when no genre filter
const placeholderText = svg.append("text")
    .attr("class", "placeholder-text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .attr("fill", "#999")
    .style("font-style", "italic")
    .text("← Select a genre from the left graph to explore");

// dropdowns
const yAttributes = ["duration", "tempo", "time_signature", "explicit", "loudness"];
const yDropdown = d3.select("#y-dropdown");
yDropdown.selectAll("option")
    .data(yAttributes)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d);

// global variables
let globalSelectedGenre = null;
let globalTimeRange = [1920, 2020]; // default to all years
let allData = []; // store data globally

// time slider
const timeSlider = d3.select("#time-slider");
const timeDisplay = d3.select("#time-display");

if (timeSlider.node()) {
    timeSlider.on("input", function() {
        const minYear = +this.value;
        globalTimeRange = [minYear, 2020];
        timeDisplay.text(`${minYear} - 2020`);
        if (globalSelectedGenre) {
            updateChart(); // only update if genre selected
        }
    });
}

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

    allData = data;
    console.log("Loaded data, total tracks:", allData.length);

    // set x-axis domain (popularity 0-100)
    xScale.domain([0, 100]);
    xAxis.call(d3.axisBottom(xScale));

    // function to update chart
    function updateChart() {
        const selectedAttr = yDropdown.node().value;
        const [minYear, maxYear] = globalTimeRange;

        // if no genre selected, show placeholder
        if (!globalSelectedGenre) {
            placeholderText.style("display", "block");
            svg.selectAll("circle").remove();
            return;
        }

        // hide placeholder
        placeholderText.style("display", "none");

        console.log(`Updating chart: ${selectedAttr}, years ${minYear}-${maxYear}, genre: ${globalSelectedGenre}`);

        // update y-axis label
        yAxisLabel.text(selectedAttr.charAt(0).toUpperCase() + selectedAttr.slice(1));

        // filter by time range and genre
        let filteredData = allData.filter(d => 
            d.year >= minYear && 
            d.year <= maxYear &&
            d.genre === globalSelectedGenre &&
            d[selectedAttr] != null &&
            !isNaN(d[selectedAttr]) &&
            d.popularity != null &&
            !isNaN(d.popularity)
        );

        console.log(`Filtered data points: ${filteredData.length}`);

        // check for data
        if (filteredData.length === 0) {
            console.warn("No data to display after filtering!");
            svg.selectAll("circle").remove();
            
            // show "no data" message
            svg.selectAll(".no-data-text").remove();
            svg.append("text")
                .attr("class", "no-data-text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .attr("fill", "#999")
                .text(`No ${globalSelectedGenre} tracks found in selected time range`);
            return;
        }

        // remove no-data message if it exists
        svg.selectAll(".no-data-text").remove();

        // update y-axis domain dynamically based on filtered data
        const yMin = d3.min(filteredData, d => d[selectedAttr]);
        const yMax = d3.max(filteredData, d => d[selectedAttr]);
        yScale.domain([yMin, yMax]).nice();
        yAxis.transition().duration(500).call(d3.axisLeft(yScale));

        // use genre color
        const pointColor = genreColors[globalSelectedGenre] || "#3182bd";

        // bind data to circles
        const circles = svg.selectAll("circle").data(filteredData, d => d.track_name + d.year);

        // exit - remove old circles
        circles.exit()
            .transition()
            .duration(300)
            .attr("r", 0)
            .remove();

        // enter and merge
        const merged = circles.enter()
            .append("circle")
            .attr("r", 0)
            .attr("cx", d => xScale(d.popularity))
            .attr("cy", d => yScale(d[selectedAttr]))
            .merge(circles);

        // transition attributes
        merged.transition()
            .duration(300)
            .attr("cx", d => xScale(d.popularity))
            .attr("cy", d => yScale(d[selectedAttr]))
            .attr("r", 3.5)
            .attr("fill", pointColor)
            .attr("opacity", 0.6)
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5);

        // attach tooltip events outside transition
        merged
            .on("mouseover", (event, d) => {
                d3.select("#tooltip")
                    .style("opacity", 1)
                    .html(`
                        <strong>Track:</strong> ${d.track_name || 'N/A'}<br/>
                        <strong>Artist:</strong> ${d.artists_x || 'N/A'}<br/>
                        <strong>Year:</strong> ${d.year}<br/>
                        <strong>${selectedAttr}:</strong> ${d[selectedAttr].toFixed(2)}<br/>
                        <strong>Popularity:</strong> ${d.popularity}
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

    // make updateChart global
    window.updateTechnicalChart = updateChart;

    // initial render (will show placeholder since no genre selected)
    yDropdown.property("value", "duration");
    updateChart();

    // update when y-dropdown changes
    yDropdown.on("change", updateChart);

    // listen for genre selection from graph 1
    window.addEventListener('genreSelected', function(e) {
        globalSelectedGenre = e.detail.genre;
        console.log("Technical graph received genre:", globalSelectedGenre);
        updateChart();
    });

});