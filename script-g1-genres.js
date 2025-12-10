// this file is for the genres graph (graph 1)

// global time range
let globalTimeRange = [1920, 2020];

// Load the CSV
d3.csv("merged_tracks.csv").then(data => {

    // Filter out empty genres
    data = data.filter(d => d.track_genre && d.track_genre.trim() !== "");

    // Convert release_year to number and add popularity
    data.forEach(d => {
        d.release_year = +d.release_year;
        d.popularity = +d.popularity_x;
    });

    const allData = data; // store all data

    const svg = d3.select("#genres");
    const svgWidth = svg.node().clientWidth;
    const svgHeight = svg.node().clientHeight;
    
    // margins
    const margin = { top: 20, right: 20, bottom: 80, left: 60 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // append a group for chart content
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Predefined genre order
    const topGenres = [
        "hard-rock", "metal", "punk", "classical",
        "hip-hop", "electronic", "alternative",
        "folk", "pop", "alt-rock"
    ];

    // X scale (categorical)
    const x = d3.scaleBand()
        .domain(topGenres)
        .range([0, width])
        .padding(0.4);

    // Y scale (years)
    const y = d3.scaleLinear()
        .domain([1920, 2020])
        .nice()
        .range([height, 0]);

    // cohesive color pallette to go with other graphs
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

    // color scale
    const color = d3.scaleOrdinal()
        .domain(topGenres)
        .range(topGenres.map(g => genreColors[g]));

    // X-axis
    const xAxis = g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    // Y-axis (years, no commas)
    g.append("g")
        .call(d3.axisLeft(y).tickFormat(d3.format("d")));

    // Jitter function for horizontal scatter
    const jitter = () => (Math.random() - 0.5) * x.bandwidth() * 0.7;

    // Tooltip div
    const tooltip = d3.select("#tooltip");

    // variables for graph interaction
    let selectedDot = null;
    let selectedGenre = null;
    let tooltipLocked = false;
    let popularityFilter = null;

    // Create groups for dots, error bars, and mean points
    const dotGroup = g.append("g").attr("class", "dot-group");
    const errorBarGroup = g.append("g").attr("class", "error-bar-group");
    const meanPointGroup = g.append("g").attr("class", "mean-point-group");

    function updateGenreChart() {
        const [minYear, maxYear] = globalTimeRange;
        
        // Filter data by time range
        const topData = allData.filter(d => 
            topGenres.includes(d.track_genre) &&
            d.release_year >= minYear &&
            d.release_year <= maxYear
        );

        // Update dots
        const dots = dotGroup.selectAll("circle.dot")
            .data(topData, d => `${d.track_name}-${d.artists_x}-${d.release_year}`);

        // Remove old dots
        dots.exit()
            .transition()
            .duration(300)
            .attr("r", 0)
            .remove();

        // Add new dots
        const dotsEnter = dots.enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.track_genre) + x.bandwidth()/2 + jitter())
            .attr("cy", d => y(d.release_year))
            .attr("r", 0)
            .attr("fill", d => color(d.track_genre));

        // Merge and update
        const dotsMerged = dotsEnter.merge(dots);

        dotsMerged
            .transition()
            .duration(300)
            .attr("r", 5);

        // Attach event handlers (only to newly entered elements)
        dotsEnter
            .on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                    .html(`<strong>Track Name:</strong> "${d.track_name}" <br/><strong>Artist Name:</strong> ${d.artists_x}<br/><strong>Popularity:</strong> ${d.popularity}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mousemove", (event, d) => {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", (event, d) => {
                if (!tooltipLocked) {
                    tooltip.style("opacity", 0);
                }
            })
            .on("click", (event, d) => {
                if (selectedDot === d) {
                    selectedDot = null;
                    tooltipLocked = false;
                    tooltip.style("opacity", 0);

                    window.dispatchEvent(new CustomEvent('trackSelected', {
                        detail: { track: null, source: 'genre' }
                    }));

                    if (selectedGenre) {
                        dotGroup.selectAll("circle.dot")
                            .attr("opacity", dot => dot.track_genre === selectedGenre ? 1 : 0.2)
                            .attr("stroke", dot => dot.track_genre === selectedGenre ? "black" : null)
                            .attr("stroke-width", dot => dot.track_genre === selectedGenre ? 1.5 : 0);
                    } else {
                        dotGroup.selectAll("circle.dot")
                            .attr("opacity", 1)
                            .attr("stroke", null)
                            .attr("stroke-width", 0);
                    }
                } else {
                    selectedDot = d;
                    tooltipLocked = true;

                    window.dispatchEvent(new CustomEvent('trackSelected', {
                        detail: { track: d, source: 'genre' }
                    }));

                    dotGroup.selectAll("circle.dot")
                        .attr("opacity", dot => dot === d ? 1 : 0.3)
                        .attr("stroke", dot => dot === d ? "black" : null)
                        .attr("stroke-width", dot => dot === d ? 2 : 0);

                    tooltip.style("opacity", 1)
                        .html(`<strong>Track Name:</strong> "${d.track_name}" <br/><strong>Artist Name:</strong> ${d.artists_x}<br/><strong>Popularity:</strong> ${d.popularity}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
                }
            });

        // Apply current filters to all dots
        if (selectedGenre) {
            dotsMerged
                .attr("opacity", d => d.track_genre === selectedGenre ? 1 : 0.2)
                .attr("stroke", d => d.track_genre === selectedGenre ? "black" : null)
                .attr("stroke-width", d => d.track_genre === selectedGenre ? 1.5 : 0);
        }

        if (popularityFilter) {
            const { popMin, popMax } = popularityFilter;
            dotsMerged
                .transition()
                .duration(300)
                .attr("r", d => {
                    const inRange = d.popularity >= popMin && d.popularity <= popMax;
                    const genreMatch = !selectedGenre || d.track_genre === selectedGenre;
                    return (inRange && genreMatch) ? 7 : 5;
                })
                .attr("opacity", d => {
                    const inRange = d.popularity >= popMin && d.popularity <= popMax;
                    const genreMatch = !selectedGenre || d.track_genre === selectedGenre;
                    return (inRange && genreMatch) ? 1 : 0.2;
                })
                .attr("stroke", d => {
                    const inRange = d.popularity >= popMin && d.popularity <= popMax;
                    const genreMatch = !selectedGenre || d.track_genre === selectedGenre;
                    return (inRange && genreMatch) ? "#000" : null;
                })
                .attr("stroke-width", d => {
                    const inRange = d.popularity >= popMin && d.popularity <= popMax;
                    const genreMatch = !selectedGenre || d.track_genre === selectedGenre;
                    return (inRange && genreMatch) ? 2.5 : 0;
                });
        }

        // Compute summary statistics for error bars
        const stats = topGenres.map(genre => {
            const vals = topData.filter(d => d.track_genre === genre).map(d => d.release_year);
            if (vals.length === 0) {
                return null;
            }
            const mean = d3.mean(vals);
            const std = Math.sqrt(d3.variance(vals));
            return {
                genre,
                mean,
                std,
                min: mean - std,
                max: mean + std
            };
        }).filter(d => d !== null);

        // Update error bars
        const errorBars = errorBarGroup.selectAll("line.error-bar")
            .data(stats, d => d.genre);

        errorBars.exit()
            .transition()
            .duration(300)
            .attr("opacity", 0)
            .remove();

        const errorBarsEnter = errorBars.enter()
            .append("line")
            .attr("class", "error-bar")
            .attr("x1", d => x(d.genre) + x.bandwidth()/2)
            .attr("x2", d => x(d.genre) + x.bandwidth()/2)
            .attr("y1", d => y(d.mean))
            .attr("y2", d => y(d.mean))
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .attr("opacity", 0);

        errorBarsEnter.merge(errorBars)
            .transition()
            .duration(300)
            .attr("y1", d => y(d.min))
            .attr("y2", d => y(d.max))
            .attr("opacity", 1);

        errorBarGroup.selectAll("line.error-bar")
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

        // Update mean points
        const meanPoints = meanPointGroup.selectAll("circle.mean")
            .data(stats, d => d.genre);

        meanPoints.exit()
            .transition()
            .duration(300)
            .attr("r", 0)
            .remove();

        const meanPointsEnter = meanPoints.enter()
            .append("circle")
            .attr("class", "mean")
            .attr("cx", d => x(d.genre) + x.bandwidth()/2)
            .attr("cy", d => y(d.mean))
            .attr("r", 0)
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .style("cursor", "pointer");

        meanPointsEnter.merge(meanPoints)
            .transition()
            .duration(300)
            .attr("cy", d => y(d.mean))
            .attr("r", 6);

        meanPointGroup.selectAll("circle.mean")
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
    }

    // make x-axis labels clickable
    xAxis.selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end")
        .style("cursor", "pointer")
        .style("fill", "#333")
        .on("mouseover", function() {
            d3.select(this)
                .style("fill", "#000")
                .style("font-weight", "bold");
        })
        .on("mouseout", function(event, d) {
            const isSelected = selectedGenre === d;
            d3.select(this)
                .style("fill", isSelected ? "#000" : "#333")
                .style("font-weight", isSelected ? "bold" : "normal");
        })
        .on("click", function(event, clickedGenre) {
            event.stopPropagation();
            
            if (selectedGenre === clickedGenre) {
                selectedGenre = null;
                selectedDot = null;
                tooltipLocked = false;
                tooltip.style("opacity", 0);
                
                dotGroup.selectAll("circle.dot")
                    .attr("opacity", 1)
                    .attr("stroke", null)
                    .attr("stroke-width", 0);
                
                xAxis.selectAll("text")
                    .style("fill", "#333")
                    .style("font-weight", "normal");

                window.dispatchEvent(new CustomEvent('genreSelected', { 
                    detail: { genre: null } 
                }));
            } else {
                selectedGenre = clickedGenre;
                selectedDot = null;
                tooltipLocked = false;
                
                dotGroup.selectAll("circle.dot")
                    .attr("opacity", d => d.track_genre === clickedGenre ? 1 : 0.2)
                    .attr("stroke", d => d.track_genre === clickedGenre ? "black" : null)
                    .attr("stroke-width", d => d.track_genre === clickedGenre ? 1.5 : 0);
                
                xAxis.selectAll("text")
                    .style("fill", d => d === clickedGenre ? "#000" : "#333")
                    .style("font-weight", d => d === clickedGenre ? "bold" : "normal");
                
                const [minYear, maxYear] = globalTimeRange;
                const genreData = allData.filter(d => 
                    d.track_genre === clickedGenre &&
                    d.release_year >= minYear &&
                    d.release_year <= maxYear
                );
                
                tooltip.style("opacity", 1)
                    .html(`
                        <strong>${clickedGenre}</strong><br/>
                        Total Tracks: ${genreData.length}<br/>
                        Click genre again to deselect
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");

                window.dispatchEvent(new CustomEvent('genreSelected', { 
                    detail: { genre: clickedGenre } 
                }));
            }
        });

    // X-axis label
    g.append("text")
        .attr("class", "x-axis-label")
        .attr("x", width /2)
        .attr("y", height + 70)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Genre");

    // Y-axis label
    g.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height/2)
        .attr("y", -margin.left + 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Release Year");

    // Click whitespace to deselect
    svg.on("click", (event) => {
        const clickedElement = event.target;
        if (!clickedElement.closest("circle.dot") && !clickedElement.closest("text")) {
            selectedDot = null;
            selectedGenre = null;
            tooltipLocked = false;
            tooltip.style("opacity", 0);
            
            window.dispatchEvent(new CustomEvent('trackSelected', {
                detail: { track: null, source: 'genre' }
            }));
            
            dotGroup.selectAll("circle.dot")
                .attr("opacity", 1)
                .attr("stroke", null)
                .attr("stroke-width", 0);
            
            xAxis.selectAll("text")
                .style("fill", "#333")
                .style("font-weight", "normal");

            window.dispatchEvent(new CustomEvent('genreSelected', { 
                detail: { genre: null } 
            }));
        }
    });

    // Listen for track selection from technical graph
    window.addEventListener('trackSelected', function(e) {
        const track = e.detail.track;
        
        if (e.detail.source === 'genre') {
            return;
        }
        
        if (!track) {
            selectedDot = null;
            tooltipLocked = false;
            tooltip.style("opacity", 0);
            
            if (selectedGenre) {
                dotGroup.selectAll("circle.dot")
                    .attr("opacity", d => d.track_genre === selectedGenre ? 1 : 0.2)
                    .attr("stroke", d => d.track_genre === selectedGenre ? "black" : null)
                    .attr("stroke-width", d => d.track_genre === selectedGenre ? 1.5 : 0);
            } else {
                dotGroup.selectAll("circle.dot")
                    .attr("opacity", 1)
                    .attr("stroke", null)
                    .attr("stroke-width", 0);
            }
        } else {
            const [minYear, maxYear] = globalTimeRange;
            const topData = allData.filter(d => 
                topGenres.includes(d.track_genre) &&
                d.release_year >= minYear &&
                d.release_year <= maxYear
            );
            
            const matchingDot = topData.find(d => 
                d.track_name === track.track_name && 
                d.artists_x === track.artists_x &&
                d.release_year === track.year
            );
            
            if (matchingDot) {
                selectedDot = matchingDot;
                tooltipLocked = false;
                
                dotGroup.selectAll("circle.dot")
                    .attr("opacity", d => d === matchingDot ? 1 : 0.3)
                    .attr("stroke", d => d === matchingDot ? "black" : null)
                    .attr("stroke-width", d => d === matchingDot ? 2 : 0);
                
                tooltip.style("opacity", 0);
            }
        }
    });

    // Listen for popularity bucket selection
    window.addEventListener('popularityBucketSelected', function(e) {
        const { popMin, popMax, genre } = e.detail;
        popularityFilter = popMin !== null ? { popMin, popMax, genre } : null;
        
        if (!popularityFilter) {
            if (selectedGenre) {
                dotGroup.selectAll("circle.dot")
                    .transition()
                    .duration(300)
                    .attr("r", 5)
                    .attr("opacity", d => d.track_genre === selectedGenre ? 1 : 0.2)
                    .attr("stroke", d => d.track_genre === selectedGenre ? "black" : null)
                    .attr("stroke-width", d => d.track_genre === selectedGenre ? 1.5 : 0);
            } else {
                dotGroup.selectAll("circle.dot")
                    .transition()
                    .duration(300)
                    .attr("r", 5)
                    .attr("opacity", 1)
                    .attr("stroke", null)
                    .attr("stroke-width", 0);
            }
        } else {
            dotGroup.selectAll("circle.dot")
                .transition()
                .duration(300)
                .attr("r", d => {
                    const inRange = d.popularity >= popMin && d.popularity <= popMax;
                    const genreMatch = !selectedGenre || d.track_genre === selectedGenre;
                    return (inRange && genreMatch) ? 7 : 5;
                })
                .attr("opacity", d => {
                    const inRange = d.popularity >= popMin && d.popularity <= popMax;
                    const genreMatch = !selectedGenre || d.track_genre === selectedGenre;
                    return (inRange && genreMatch) ? 1 : 0.2;
                })
                .attr("stroke", d => {
                    const inRange = d.popularity >= popMin && d.popularity <= popMax;
                    const genreMatch = !selectedGenre || d.track_genre === selectedGenre;
                    return (inRange && genreMatch) ? "#000" : null;
                })
                .attr("stroke-width", d => {
                    const inRange = d.popularity >= popMin && d.popularity <= popMax;
                    const genreMatch = !selectedGenre || d.track_genre === selectedGenre;
                    return (inRange && genreMatch) ? 2.5 : 0;
                });
        }
    });

    // listen for time range changes
    window.addEventListener('timeRangeChanged', function(e) {
        globalTimeRange = e.detail.timeRange;
        console.log("Genre graph received time range:", globalTimeRange);
        updateGenreChart();
    });

    // init render
    updateGenreChart();
});