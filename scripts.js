fetch("trips.json")
  .then(response => response.json())
  .then(allTrips => {
    const map = L.map('map').setView([41.15, -8.61], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const tripLayers = {};

    // Add all trips to the map initially and collect by Taxi ID
    allTrips.features.forEach(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) return;

      const polyline = L.polyline(coords.map(c => [c[1], c[0]]), { color: 'gray', weight: 2 }).addTo(map);
      polyline.bindTooltip(`Trip ID: ${props.tripid}<br>Taxi ID: ${props.taxiid}<br>Distance: ${props.distance.toFixed(1)}m<br>Avg Speed: ${props.avspeed.toFixed(1)} km/h`);

      if (!tripLayers[props.taxiid]) tripLayers[props.taxiid] = [];
      tripLayers[props.taxiid].push({ polyline, streetnames: props.streetnames });
    });

    const summary = allTrips.features.map(f => ({
      tripid: f.properties.tripid,
      taxiid: f.properties.taxiid,
      distance: f.properties.distance,
      avspeed: f.properties.avspeed
    }));

    const uniqueTaxiIDs = [...new Set(summary.map(s => s.taxiid))];
    const taxiTripCounts = uniqueTaxiIDs.map(tid => {
      return {
        taxiid: tid,
        count: summary.filter(s => s.taxiid === tid).length,
        distance: summary.filter(s => s.taxiid === tid).reduce((acc, curr) => acc + curr.distance, 0)
      };
    }).sort((a,b) => b.distance - a.distance).slice(0, 10);

    const barMargin = { top: 20, right: 20, bottom: 50, left: 50 },
          barWidth = 600 - barMargin.left - barMargin.right,
          barHeight = 300 - barMargin.top - barMargin.bottom;

    const barSvg = d3.select("#bar-chart")
      .append("svg")
      .attr("viewBox", `0 0 ${barWidth + barMargin.left + barMargin.right} ${barHeight + barMargin.top + barMargin.bottom}`)
      .append("g")
      .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

    const x = d3.scaleBand().range([0, barWidth]).padding(0.1)
      .domain(taxiTripCounts.map(d => d.taxiid));
    const y = d3.scaleLinear().range([barHeight, 0])
      .domain([0, d3.max(taxiTripCounts, d => d.distance)]);

    barSvg.selectAll(".bar")
      .data(taxiTripCounts)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.taxiid))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.distance))
      .attr("height", d => barHeight - y(d.distance))
      .attr("fill", "steelblue")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        Object.values(tripLayers).flat().forEach(obj => obj.polyline.setStyle({ color: 'gray' }));
        const selectedTrips = tripLayers[d.taxiid] || [];
        selectedTrips.forEach(obj => obj.polyline.setStyle({ color: 'orange', weight: 4 }));

        const allStreets = selectedTrips.flatMap(t => t.streetnames).filter(Boolean);
        const streetCounts = Array.from(
          allStreets.reduce((map, street) => map.set(street, (map.get(street) || 0) + 1), new Map())
        ).map(([street, count]) => { return { street, count }; });

        const pieWidth = 400, pieHeight = 300, radius = Math.min(pieWidth, pieHeight) / 2;

        d3.select("#pie-chart").html("");
        const pieSvg = d3.select("#pie-chart").append("svg")
          .attr("width", pieWidth)
          .attr("height", pieHeight)
          .append("g")
          .attr("transform", `translate(${pieWidth / 2},${pieHeight / 2})`);

        const pie = d3.pie().value(d => d.count);
        const arc = d3.arc().innerRadius(0).outerRadius(radius);
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        const pieData = pie(streetCounts);

        pieSvg.selectAll("path")
          .data(pieData)
          .enter().append("path")
          .attr("d", arc)
          .attr("fill", d => color(d.data.street))
          .append("title")
          .text(d => `${d.data.street}: ${d.data.count} trips`);

        pieSvg.selectAll("text")
          .data(pieData)
          .enter().append("text")
          .attr("transform", d => `translate(${arc.centroid(d)})`)
          .attr("dy", "0.35em")
          .style("text-anchor", "middle")
          .style("font-size", "10px")
          .text(d => d.data.street.slice(0, 10));
      });

    barSvg.append("g")
      .attr("transform", `translate(0,${barHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    barSvg.append("g").call(d3.axisLeft(y));
  })
  .catch(err => {
    console.error("Failed to load trips.json", err);
  });
