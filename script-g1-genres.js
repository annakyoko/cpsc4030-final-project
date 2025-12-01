// this file is for the genres graph (graph 1)

// Load the CSV
d3.csv("merged_tracks.csv").then(data => {

    // Filter out empty genres
    data = data.filter(d => d.track_genre && d.track_genre.trim() !== "");

    // Convert release_year to number
    data.forEach(d => d.release_year = +d.release_year);

    const svg = d3.select("#genres");
    // const width = +svg.attr("width") || 900;   // fallback width
    // const height = +svg.attr("height") || 500; // fallback height
    const svgWidth = svg.node().clientWidth;
    const svgHeight = svg.node().clientHeight;
    
    // margins
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
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

    // Filter data to only these genres
    const topData = data.filter(d => topGenres.includes(d.track_genre));

    // X scale (categorical)
    const x = d3.scaleBand()
        .domain(topGenres)
        .range([0, width])
        .padding(0.4);

    // Y scale (years)
    const y = d3.scaleLinear()
        .domain(d3.extent(topData, d => d.release_year))
        .nice()
        //.range([height - margin.bottom, margin.top]);
        .range([height, 0]);

    // cohesive color pallette to go with other graphs
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

    // color scale
    const color = d3.scaleOrdinal()
        .domain(topGenres)
        .range(topGenres.map(g => genreColors[g]));

    // X-axis
    const xAxis = g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        
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
            // check if genre is currently selected
            const isSelected = selectedGenre === d;
            d3.select(this)
                .style("fill", isSelected ? "#000" : "#333")
                .style("font-weight", isSelected ? "bold" : "normal");
        })
        .on("click", function(event, clickedGenre) {
            event.stopPropagation();
            
            // if clicking the already-selected genre, deselect it
            if (selectedGenre === clickedGenre) {
                selectedGenre = null;
                selectedDot = null;
                tooltipLocked = false;
                tooltip.style("opacity", 0);
                
                // reset dots
                g.selectAll("circle.dot")
                    .attr("opacity", 1)
                    .attr("stroke", null)
                    .attr("stroke-width", 0);
                
                // reset labels
                xAxis.selectAll("text")
                    .style("fill", "#333")
                    .style("font-weight", "normal");

                // dispatch event - genre deselected
                window.dispatchEvent(new CustomEvent('genreSelected', { 
                    detail: { genre: null } 
                }));
                console.log("Dispatched event: genre deselected");
            } else {
                // select new genre
                selectedGenre = clickedGenre;
                selectedDot = null;
                tooltipLocked = false;
                
                // highlight dots in selected genre
                g.selectAll("circle.dot")
                    .attr("opacity", d => d.track_genre === clickedGenre ? 1 : 0.2)
                    .attr("stroke", d => d.track_genre === clickedGenre ? "black" : null)
                    .attr("stroke-width", d => d.track_genre === clickedGenre ? 1.5 : 0);
                
                // highlight selected label
                xAxis.selectAll("text")
                    .style("fill", d => d === clickedGenre ? "#000" : "#333")
                    .style("font-weight", d => d === clickedGenre ? "bold" : "normal");
                
                // show tooltip w/ genre info
                const genreData = topData.filter(d => d.track_genre === clickedGenre);
                tooltip.style("opacity", 1)
                    .html(`
                        <strong>${clickedGenre}</strong><br/>
                        Total Tracks: ${genreData.length}<br/>
                        Click genre again to deselect
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");

                // dispatch event - genre selected
                window.dispatchEvent(new CustomEvent('genreSelected', { 
                    detail: { genre: clickedGenre } 
                }));
                console.log("Dispatched event: genre selected -", clickedGenre);
            }
        });

    // Y-axis (years, no commas)
    // svg.append("g")
        // .attr("transform", `translate(${margin.left},0)`)
        // .call(d3.axisLeft(y).tickFormat(d3.format("d")));
        // .attr("transform", `translate(${margin.left},0)`)  // only if you need margin shift
        // .call(d3.axisLeft(y).tickFormat(d3.format("d")));
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

    g.append("g")
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
                .html(`<strong>Track Name:</strong> "${d.track_name}" <br/><strong>Artist Name:</strong> ${d.artists_x}`)
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
    // if the clicked dot is already selected, deselect it
      if (selectedDot === d) {
          selectedDot = null;
          tooltipLocked = false;
          tooltip.style("opacity", 0);

          // if genre is selected, restore genre selection state
            if (selectedGenre) {
                g.selectAll("circle.dot")
                    .attr("opacity", dot => dot.track_genre === selectedGenre ? 1 : 0.2)
                    .attr("stroke", dot => dot.track_genre === selectedGenre ? "black" : null)
                    .attr("stroke-width", dot => dot.track_genre === selectedGenre ? 1.5 : 0);
            } else {
                g.selectAll("circle.dot")
                    .attr("opacity", 1)
                    .attr("stroke", null)
                    .attr("stroke-width", 0);
            }
      } else {
          // select clicked dot
          selectedDot = d;
          tooltipLocked = true;

          g.selectAll("circle.dot")
            .attr("opacity", dot => dot === d ? 1 : 0.3)
            .attr("stroke", dot => dot === d ? "black" : null)
            .attr("stroke-width", dot => dot === d ? 2 : 0);

          tooltip.style("opacity", 1)
                 .html(`<strong>Track Name:</strong> "${d.track_name}" <br/><strong>Artist Name:</strong> ${d.artists_x}`)
                 .style("left", (event.pageX + 10) + "px")
                 .style("top", (event.pageY - 20) + "px");
      }
    });

    // function to click anywhere else in whitespace to deselect dot
    svg.on("click", (event) => {
        const clickedElement = event.target;
        if (!clickedElement.closest("circle.dot") && !clickedElement.closest("text")) {
            selectedDot = null;
            selectedGenre = null;
            tooltipLocked = false;
            tooltip.style("opacity", 0);
            
            g.selectAll("circle.dot")
                .attr("opacity", 1)
                .attr("stroke", null)
                .attr("stroke-width", 0);
            
            // Reset all x-axis labels
            xAxis.selectAll("text")
                .style("fill", "#333")
                .style("font-weight", "normal");

            window.dispatchEvent(new CustomEvent('genreSelected', { 
            detail: { genre: null } 
            }));
            console.log("Dispatched event: genre deselected (whitespace click)");
        }
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
    g.append("g")
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
    g.append("g")
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
    g.append("text")
        .attr("class", "x-axis-label")
        //.attr("x", (width + margin.left - margin.right) / 2)  // center of the chart
        .attr("x", width /2)
        //.attr("y", height - 40)  // below the axis
        .attr("y", height + 70)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Genre");

    // Y-axis label
    g.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        //.attr("x", -(height - margin.top - margin.bottom) / 2 - margin.top)  // center of the y-axis
        //.attr("y", 20)  // distance from the axis
        .attr("x", -height/2)
        .attr("y", -margin.left + 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Release Year");
});
