
// Load trip data dynamically from JSON
fetch("trips.json")
  .then(response => response.json())
  .then(allTrips => {
    // Leaflet Map Initialization
    const map = L.map('map').setView([41.15, -8.61], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Add trips to map with tooltips
    allTrips.features.forEach(feature => {
      const trip = feature.properties;
      const coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) return;

      const line = L.polyline(coords.map(d => [d[1], d[0]]), { color: 'blue' }).addTo(map);
      line.bindTooltip(`Trip ID: ${trip.tripid}<br>Taxi ID: ${trip.taxiid}<br>Distance: ${trip.distance.toFixed(2)}m<br>Avg Speed: ${trip.avspeed.toFixed(2)} km/h`);

      L.circleMarker([coords[0][1], coords[0][0]], { radius: 5, color: 'green' }).addTo(map).bindTooltip("Start");
      L.circleMarker([coords.at(-1)[1], coords.at(-1)[0]], { radius: 5, color: 'red' }).addTo(map).bindTooltip("End");
    });

    // Build arrays for charts
    const summary = allTrips.features.map(f => ({
      tripid: f.properties.tripid,
      taxiid: f.properties.taxiid,
      distance: f.properties.distance,
      avspeed: f.properties.avspeed
    }));

    // Bar Chart: Distance by Taxi
    const barData = summary.slice(0, 10);
    const barMargin = { top: 20, right: 20, bottom: 50, left: 50 },
          barWidth = 600 - barMargin.left - barMargin.right,
          barHeight = 300 - barMargin.top - barMargin.bottom;

    const barSvg = d3.select("#bar-chart")
      .append("svg")
      .attr("viewBox", `0 0 ${barWidth + barMargin.left + barMargin.right} ${barHeight + barMargin.top + barMargin.bottom}`)
      .append("g")
      .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

    const x = d3.scaleBand().range([0, barWidth]).padding(0.1);
    const y = d3.scaleLinear().range([barHeight, 0]);

    x.domain(barData.map(d => d.taxiid));
    y.domain([0, d3.max(barData, d => d.distance)]);

    barSvg.selectAll(".bar")
      .data(barData)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.taxiid))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.distance))
      .attr("height", d => barHeight - y(d.distance))
      .attr("fill", "steelblue")
      .append("title")
      .text(d => `Taxi ID: ${d.taxiid}\nDistance: ${d.distance.toFixed(2)} m`);

    barSvg.append("g")
      .attr("transform", `translate(0,${barHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    barSvg.append("g").call(d3.axisLeft(y));

    // Line Chart: Average Speed by Trip
    const speedData = summary.slice(0, 10);
    const lineMargin = { top: 20, right: 20, bottom: 50, left: 50 },
          lineWidth = 600 - lineMargin.left - lineMargin.right,
          lineHeight = 300 - lineMargin.top - lineMargin.bottom;

    const lineSvg = d3.select("#speed-chart").append("svg")
      .attr("viewBox", `0 0 ${lineWidth + lineMargin.left + lineMargin.right} ${lineHeight + lineMargin.top + lineMargin.bottom}`)
      .append("g")
      .attr("transform", `translate(${lineMargin.left},${lineMargin.top})`);

    const xLine = d3.scalePoint().domain(speedData.map(d => d.tripid)).range([0, lineWidth]);
    const yLine = d3.scaleLinear().domain([0, d3.max(speedData, d => d.avspeed)]).range([lineHeight, 0]);

    const line = d3.line()
      .x(d => xLine(d.tripid))
      .y(d => yLine(d.avspeed));

    lineSvg.append("path")
      .datum(speedData)
      .attr("fill", "none")
      .attr("stroke", "orange")
      .attr("stroke-width", 2)
      .attr("d", line);

    lineSvg.selectAll("circle")
      .data(speedData)
      .enter().append("circle")
      .attr("cx", d => xLine(d.tripid))
      .attr("cy", d => yLine(d.avspeed))
      .attr("r", 3)
      .attr("fill", "red")
      .append("title")
      .text(d => `Trip ID: ${d.tripid}\nAvg Speed: ${d.avspeed.toFixed(2)} km/h`);

    lineSvg.append("g")
      .attr("transform", `translate(0,${lineHeight})`)
      .call(d3.axisBottom(xLine))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    lineSvg.append("g").call(d3.axisLeft(yLine));
  })
  .catch(err => {
    console.error("Failed to load trips.json", err);
  });
