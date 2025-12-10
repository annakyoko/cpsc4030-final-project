// this file is for the technical features graph

// margins
const margin = {top: 50, right: 20, bottom: 70, left: 60};

// make svg
const svgContainer = d3.select("#technical")

// dimensions
const width = svgContainer.node().clientWidth - margin.left - margin.right;
const height = svgContainer.node().clientHeight - margin.top - margin.bottom;

// append a group for margins on svg
const svg = svgContainer.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// create a clip path to keep contours within bounds
svg.append("defs")
    .append("clipPath")
    .attr("id", "chart-clip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height);

// create a group for contours (behind points) with clipping
const contourGroup = svg.append("g")
    .attr("class", "contour-group")
    .attr("clip-path", "url(#chart-clip)");
// create a group for points (in front of contours)
const pointGroup = svg.append("g").attr("class", "point-group");

// scales --> domains set after data loads
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
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", '600')
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

// global variables
let globalSelectedGenre = null;
let globalTimeRange = [1920, 2020];
let popularityFilter = null;
let allData = [];
let contourData = null; // store contour data
let selectedTrack = null; // track selected point

// time slider
const timeSlider = d3.select("#time-slider");
const timeDisplay = d3.select("#time-display");

if (timeSlider.node()) {
    timeSlider.on("input", function() {
        const minYear = +this.value;
        globalTimeRange = [minYear, 2020];
        timeDisplay.text(`${minYear} - 2020`);
        updateChart();
    });
}

// load CSV
d3.csv("merged_tracks.csv").then(data => {
    console.log("First row:", data[0]);
    console.log("Column names:", Object.keys(data[0]));

    // create a separate tooltip for tech graph (so it persists when mouse moves on genre graph)
    const technicalTooltip = d3.select("body").append("div")
        .attr("id", "technical-tooltip")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid black")
        .style("padding", "5px 8px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", 1000);

    // parse numeric fields
    data.forEach(d => {
        d.year = +d.release_year;
        d.duration = +d.duration_ms_x / 60000; // convert ms to min
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

    // function to draw contour plot
    function drawContours(selectedAttr, timeRange) {
        const [minYear, maxYear] = timeRange;
        
        // filter data by time range only
        let filteredData = allData.filter(d => 
            d.year >= minYear && 
            d.year <= maxYear &&
            d[selectedAttr] != null &&
            !isNaN(d[selectedAttr]) &&
            d.popularity != null &&
            !isNaN(d.popularity)
        );

        if (filteredData.length === 0) {
            contourGroup.selectAll("*").remove();
            return;
        }

        // update y-axis domain
        const yMin = d3.min(filteredData, d => d[selectedAttr]);
        const yMax = d3.max(filteredData, d => d[selectedAttr]);
        yScale.domain([yMin, yMax]).nice();
        yAxis.transition().duration(500).call(d3.axisLeft(yScale));

        // prepare data for contours
        const contourPoints = filteredData.map(d => [
            xScale(d.popularity),
            yScale(d[selectedAttr])
        ]);

        // create density data using d3.contourDensity
        const density = d3.contourDensity()
            .x(d => d[0])
            .y(d => d[1])
            .size([width, height])
            .bandwidth(20) // smoothness
            .thresholds(15) // number contour levels
            (contourPoints);

        // color scale for contours
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, d3.max(density, d => d.value)]);

        // draw contours
        contourGroup.selectAll("path")
            .data(density)
            .join("path")
            .attr("d", d3.geoPath())
            .attr("fill", d => colorScale(d.value))
            .attr("stroke", "none")
            .attr("opacity", globalSelectedGenre ? 0.3 : 0.7)
            .transition()
            .duration(300);

        return filteredData;
    }

    // function to update chart
    function updateChart() {
        const selectedAttr = yDropdown.node().value;

        console.log(`Updating chart: ${selectedAttr}, genre: ${globalSelectedGenre}`);

        // update y-axis label with corresponding units to attribute
        let label = selectedAttr.charAt(0).toUpperCase() + selectedAttr.slice(1).replace('_', ' ');
        if (selectedAttr === "duration") {
            label += " (min)";
        }
        if (selectedAttr === "tempo") {
            label += " (BPM)"
        }
        if (selectedAttr === "loudness") {
            label += " (dB)"
        }
        if (selectedAttr === "time_signature") {
            label += " (beats/bar)"
        }
        yAxisLabel.text(label);

        // draw contours
        const allFilteredData = drawContours(selectedAttr, globalTimeRange);

        // if no genre selected, just show contours
        if (!globalSelectedGenre) {
            pointGroup.selectAll("circle").remove();
            // make contours more opaque
            contourGroup.selectAll("path")
                .transition()
                .duration(300)
                .attr("opacity", 0.7);
            return;
        }

        // make contours more transparent when genre is selected
        contourGroup.selectAll("path")
            .transition()
            .duration(300)
            .attr("opacity", 0.3);

        // filter by time range and genre
        const [minYear, maxYear] = globalTimeRange;
        let genreData = allData.filter(d => 
            d.year >= minYear && 
            d.year <= maxYear &&
            d.genre === globalSelectedGenre &&
            d[selectedAttr] != null &&
            !isNaN(d[selectedAttr]) &&
            d.popularity != null &&
            !isNaN(d.popularity)
        );

        console.log(`Genre data points: ${genreData.length}`);

        if (genreData.length === 0) {
            pointGroup.selectAll("circle").remove();
            return;
        }

        // use genre color
        const pointColor = genreColors[globalSelectedGenre] || "#3182bd";

        // bind data to circles
        const circles = pointGroup.selectAll("circle").data(genreData, d => d.track_name + d.year);

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

        // apply popularity filter if active
        merged
            .attr("opacity", d => {
                // check if track is selected
                if (selectedTrack && d.track_name === selectedTrack.track_name && 
                    d.artists_x === selectedTrack.artists_x && d.year === selectedTrack.year) {
                    return 1;
                }
                if (!popularityFilter) return 0.6;
                const inRange = d.popularity >= popularityFilter.popMin && 
                               d.popularity <= popularityFilter.popMax;
                return inRange ? 1 : 0.2;
            })
            .attr("stroke", d => {
                // check if track is selected
                if (selectedTrack && d.track_name === selectedTrack.track_name && 
                    d.artists_x === selectedTrack.artists_x && d.year === selectedTrack.year) {
                    return "#000";
                }
                if (!popularityFilter) return "#333";
                const inRange = d.popularity >= popularityFilter.popMin && 
                               d.popularity <= popularityFilter.popMax;
                return inRange ? "#000" : "#333";
            })
            .attr("stroke-width", d => {
                // check if track is selected
                if (selectedTrack && d.track_name === selectedTrack.track_name && 
                    d.artists_x === selectedTrack.artists_x && d.year === selectedTrack.year) {
                    return 3;
                }
                if (!popularityFilter) return 0.5;
                const inRange = d.popularity >= popularityFilter.popMin && 
                               d.popularity <= popularityFilter.popMax;
                return inRange ? 2.5 : 0.5;
            });

        // transition attributes
        merged.transition()
            .duration(300)
            .attr("cx", d => xScale(d.popularity))
            .attr("cy", d => yScale(d[selectedAttr]))
            .attr("r", d => {
                // check if track selected
                if (selectedTrack && d.track_name === selectedTrack.track_name && 
                    d.artists_x === selectedTrack.artists_x && d.year === selectedTrack.year) {
                    return 6;
                }
                if (!popularityFilter) return 3.5;
                const inRange = d.popularity >= popularityFilter.popMin && 
                               d.popularity <= popularityFilter.popMax;
                return inRange ? 5 : 3.5;
            })
            .attr("fill", pointColor);

        // attach tooltip and click events
        merged
            .style("cursor", "pointer")
            .on("click", function(event, d) {
                event.stopPropagation();
                
                // toggle selection
                if (selectedTrack && d.track_name === selectedTrack.track_name && 
                    d.artists_x === selectedTrack.artists_x && d.year === selectedTrack.year) {
                    selectedTrack = null;
                    technicalTooltip.style("opacity", 0);
                    
                    // dispatch event to deselect in genre graph
                    window.dispatchEvent(new CustomEvent('trackSelected', {
                        detail: { track: null, source: 'technical' }
                    }));
                } else {
                    selectedTrack = {
                        track_name: d.track_name,
                        artists_x: d.artists_x,
                        year: d.year
                    };
                    
                    // show tooltip at fixed position
                    let attrDisplay = selectedAttr.charAt(0).toUpperCase() + selectedAttr.slice(1).replace('_', ' ');
                    let attrValue;
                    let attrUnit = '';
                    
                    if (selectedAttr === 'duration') {
                        const totalSeconds = Math.round(d[selectedAttr] * 60);
                        const mins = Math.floor(totalSeconds / 60);
                        const secs = totalSeconds % 60;
                        attrValue = `${mins}:${secs.toString().padStart(2, '0')}`;
                        attrUnit = '';
                    } else {
                        attrValue = d[selectedAttr].toFixed(2);
                        if (selectedAttr === 'tempo') {
                            attrUnit = ' BPM';
                        } else if (selectedAttr === 'loudness') {
                            attrUnit = ' dB';
                        } else if (selectedAttr === 'time_signature') {
                            attrUnit = ' beats/bar'
                        }
                    }
                    
                    const bbox = svgContainer.node().getBoundingClientRect();
                    console.log("Showing tooltip, bbox:", bbox);
                    technicalTooltip
                        .style("opacity", 1)
                        .html(`
                            <strong>Track:</strong> ${d.track_name || 'N/A'}<br/>
                            <strong>Artist:</strong> ${d.artists_x || 'N/A'}<br/>
                            <strong>Year:</strong> ${d.year}<br/>
                            <strong>${attrDisplay}:</strong> ${attrValue}${attrUnit}<br/>
                            <strong>Popularity:</strong> ${d.popularity}
                        `)
                        .style("left", (bbox.right - 220) + "px")
                        .style("top", (bbox.top + 10) + "px");
                    
                    // dispatch event to highlight in genre graph
                    window.dispatchEvent(new CustomEvent('trackSelected', {
                        detail: { track: d, source: 'technical' }
                    }));
                }
                
                updateChart();
            })
            .on("mouseover", (event, d) => {
                // only show hover tooltip if no track is selected
                if (!selectedTrack) {
                    // format attribute name with proper capitalization and units
                    let attrDisplay = selectedAttr.charAt(0).toUpperCase() + selectedAttr.slice(1).replace('_', ' ');
                    let attrValue;
                    let attrUnit = '';
                    
                    if (selectedAttr === 'duration') {
                        // convert decimal minutes to M:SS format
                        const totalSeconds = Math.round(d[selectedAttr] * 60);
                        const mins = Math.floor(totalSeconds / 60);
                        const secs = totalSeconds % 60;
                        attrValue = `${mins}:${secs.toString().padStart(2, '0')}`;
                        attrUnit = '';
                    } else {
                        attrValue = d[selectedAttr].toFixed(2);
                        if (selectedAttr === 'tempo') {
                            attrUnit = ' BPM';
                        } else if (selectedAttr === 'loudness') {
                            attrUnit = ' dB';
                        } else if (selectedAttr === 'time_signature') {
                            attrUnit = ' beats/bar'
                        }
                    }
                    
                    d3.select("#tooltip")
                        .style("opacity", 1)
                        .html(`
                            <strong>Track:</strong> ${d.track_name || 'N/A'}<br/>
                            <strong>Artist:</strong> ${d.artists_x || 'N/A'}<br/>
                            <strong>Year:</strong> ${d.year}<br/>
                            <strong>${attrDisplay}:</strong> ${attrValue}${attrUnit}<br/>
                            <strong>Popularity:</strong> ${d.popularity}<br/>
                            <em>Click to highlight in genre graph</em>
                        `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 25) + "px")
                        .style("pointer-events", "none");
                }
            })
            .on("mousemove", (event, d) => {
                // only update position if no track is selected (hover mode)
                if (!selectedTrack) {
                    d3.select("#tooltip")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 25) + "px");
                }
            })
            .on("mouseout", (event, d) => {
                // don't hide tooltip if track is selected
                if (!selectedTrack) {
                    d3.select("#tooltip").style("opacity", 0);
                }
                // if selectedTrack exists, do nothing (tooltpi stays visible)
            });
    }

    // click empty space to deselect
    svg.on("click", function(event) {
        if (event.target === this || event.target.tagName === 'g' || event.target.tagName === 'path') {
            selectedTrack = null;
            technicalTooltip.style("opacity", 0);
            window.dispatchEvent(new CustomEvent('trackSelected', {
                detail: { track: null, source: 'technical' }
            }));
            updateChart();
        }
    });

    // make updateChart global
    window.updateTechnicalChart = updateChart;

    // initial render - show contours for all data
    yDropdown.property("value", "duration");
    updateChart();

    // update when y-dropdown changes
    yDropdown.on("change", updateChart);

    // listen for genre selection from graph 1
    window.addEventListener('genreSelected', function(e) {
        globalSelectedGenre = e.detail.genre;
        popularityFilter = null; // reset popularity filter when genre changes
        selectedTrack = null; // reset track selection
        console.log("Technical graph received genre:", globalSelectedGenre);
        updateChart();
    });

    // listen for track selection from genre graph
    window.addEventListener('trackSelected', function(e) {
        const track = e.detail.track;
        
        // ignore events that from this graph
        if (e.detail.source === 'technical') {
            return;
        }
        
        if (!track) {
            selectedTrack = null;
            technicalTooltip.style("opacity", 0);
        } else {
            // set selected track - matching by track name, artist, and year
            selectedTrack = {
                track_name: track.track_name,
                artists_x: track.artists_x,
                year: track.release_year
            };
        }
        
        // update chart
        updateChart();
        // then show tooltip
        if (track) {
            setTimeout(() => {
                const selectedAttr = yDropdown.node().value;
                
                // find the data point to get attribute values
                const dataPoint = allData.find(d => 
                    d.track_name === track.track_name && 
                    d.artists_x === track.artists_x &&
                    d.year === track.release_year
                );
                
                if (dataPoint && dataPoint[selectedAttr] != null) {
                    let attrDisplay = selectedAttr.charAt(0).toUpperCase() + selectedAttr.slice(1).replace('_', ' ');
                    let attrValue;
                    let attrUnit = '';
                    
                    if (selectedAttr === 'duration') {
                        const totalSeconds = Math.round(dataPoint[selectedAttr] * 60);
                        const mins = Math.floor(totalSeconds / 60);
                        const secs = totalSeconds % 60;
                        attrValue = `${mins}:${secs.toString().padStart(2, '0')}`;
                        attrUnit = '';
                    } else {
                        attrValue = dataPoint[selectedAttr].toFixed(2);
                        if (selectedAttr === 'tempo') {
                            attrUnit = ' BPM';
                        } else if (selectedAttr === 'loudness') {
                            attrUnit = ' dB';
                        } else if (selectedAttr === 'time_signature') {
                            attrUnit = ' beats/bar'
                        }
                    }
                    
                    const bbox = svgContainer.node().getBoundingClientRect();
                    console.log("Showing tooltip from genre selection, bbox:", bbox);
                    console.log("Track info:", dataPoint);
                    technicalTooltip
                        .style("opacity", 1)
                        .html(`
                            <strong>Track:</strong> ${dataPoint.track_name || 'N/A'}<br/>
                            <strong>Artist:</strong> ${dataPoint.artists_x || 'N/A'}<br/>
                            <strong>Year:</strong> ${dataPoint.year}<br/>
                            <strong>${attrDisplay}:</strong> ${attrValue}${attrUnit}<br/>
                            <strong>Popularity:</strong> ${dataPoint.popularity}
                        `)
                        .style("left", (bbox.right - 220) + "px")
                        .style("top", (bbox.top + 10) + "px");
                } else {
                    // if we can't find datapoint attribute, still show basic info
                    const bbox = svgContainer.node().getBoundingClientRect();
                    console.log("Showing fallback tooltip, bbox:", bbox);
                    console.log("Track info (fallback):", track);
                    technicalTooltip
                        .style("opacity", 1)
                        .html(`
                            <strong>Track:</strong> ${track.track_name || 'N/A'}<br/>
                            <strong>Artist:</strong> ${track.artists_x || 'N/A'}<br/>
                            <strong>Year:</strong> ${track.release_year}<br/>
                            <strong>Popularity:</strong> ${track.popularity}
                        `)
                        .style("left", (bbox.right - 220) + "px")
                        .style("top", (bbox.top + 10) + "px");
                }
            });
        }
    });

    // listen for popularity bucket selection from perceptive graph
    window.addEventListener('popularityBucketSelected', function(e) {
        const { popMin, popMax, genre } = e.detail;
        
        if (popMin !== null && (!genre || genre === globalSelectedGenre)) {
            popularityFilter = { popMin, popMax };
            console.log("Technical graph received popularity filter:", popularityFilter);
        } else {
            popularityFilter = null;
            console.log("Technical graph cleared popularity filter");
        }
        
        updateChart();
    });

});