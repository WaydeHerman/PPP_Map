function loanMap(option) {
  // Extract options
  const el = option.el;
  const height = option.height;
  const width = option.width || "";
  var data = option.data;
  const sectors = option.sectors;
  const zip_json = option.zip_json;
  const industry_json = option.industry_json;

  console.log("data", data);

  var mapType = "Heatmap";
  var point_width = 4;
  var heatData, json_copy;

  const container = d3.select(el).classed("migration-map-viz", true);
  container.append("p").attr("id", "map");

  if (width === "") {
    d3.select("#map")
      .style("left", "0px")
      .style("margin-top", "0px")
      .style("width", "100vw");
  } else {
    d3.select("#map").style("width", width + "px");
  }

  if (height === "") {
    d3.select("#map")
      .style("height", "100vh")
      .style("top", "0px")
      .style("position", "absolute");
  } else {
    d3.select("#map").style("height", height + "px");
  }

  const accessToken =
    "pk.eyJ1Ijoic3RlbmluamEiLCJhIjoiSjg5eTMtcyJ9.g_O2emQF6X9RV69ibEsaIw";

  var map = new L.Map("map", {
    center: [47.8, -110.9],
    zoom: 4,
    minZoom: 3,
    maxZoom: 11,
  }).addLayer(
    new L.TileLayer(
      "https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/{z}/{x}/{y}?access_token=" +
        accessToken,
      {
        attribution:
          '© <a href="https://apps.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    )
  );

  var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");

  var transform = d3.geoTransform({ point: projectPoint }),
    path = d3.geoPath().projection(transform);

  console.log("sectors", sectors);

  function plot() {
    heatData = [];
    json_copy = JSON.parse(JSON.stringify(zip_json));

    // get coordinates for points
    data.forEach(function (v) {
      if (zip_json[+v.Zip]) {
        v.location = [zip_json[+v.Zip][0], zip_json[+v.Zip][1]];
        v.point = map.latLngToLayerPoint(
          new L.LatLng(v.location[0], v.location[1])
        );
      }
    });

    data = data.filter(function (d) {
      return d.point != null;
    });

    // process heat data

    featureCircle = g
      .selectAll(".feature-circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "feature-circle");
  }

  plot();
  map.on("viewreset", reset);

  reset();

  var legendContainer = d3
    .select("#map")
    .append("div")
    .attr("class", "legend-container")
    .attr("id", "legend-container")
    .style("top", "20px")
    .style("left", document.getElementById("map").clientWidth - 420 + "px")
    .style("height", window.innerHeight - 40 + "px");

  var noScrollTarget = document.getElementById("legend-container");
  L.DomEvent.disableScrollPropagation(noScrollTarget);

  var legendHeader = legendContainer
    .append("div")
    .attr("class", "legend-header");

  legendHeader.append("div").attr("class", "legend-title").text("title");

  legendHeader.append("div").attr("class", "legend-area-title").text("");

  var sectorPickerContainer = legendHeader
    .append("div")
    .attr("class", "flow-picker-container");

  sectorPickerContainer.append("div").attr("class", "dropdown-flow");

  d3.select(".dropdown-flow")
    .append("div")
    .attr("class", "dropdown-content")
    .attr("id", "flow-selector");

  d3.select(".dropdown-flow")
    .append("button")
    .attr("class", "dropbtn")
    .html(
      "Select Sector" + " <i class='fas dropbtn-icon fa-chevron-down'></i>"
    );

  var sectors_object = d3
    .nest()
    .key(function (d) {
      return d.ds_naics_sector;
    })
    .sortKeys(d3.ascending)
    .entries(Object.values(industry_json));

  var sectors_array = sectors_object.map(function (d) {
    return d.key;
  });

  sectors_array.unshift("All Sectors");

  console.log("sectors_object", sectors_object);

  d3.select("#flow-selector")
    .selectAll("a")
    .data(sectors_array)
    .enter()
    .append("text")
    .html(function (d) {
      return "<a href='#'>" + d + "</a>";
    })
    .on("click", function (d) {
      var list_of_naicscodes;
      sectors_object.forEach(function (v) {
        if (v.key == d) {
          // this is the chosen sector
          list_of_naicscodes = v.values.map(function (w) {
            return +w.cd_industry;
          });
        }
      });
      console.log(list_of_naicscodes);
      featureCircle.style("display", function (w) {
        if (d == "All Sectors") {
          return "block";
        } else {
          if (list_of_naicscodes.indexOf(+w.NAICSCode) >= 0) {
            return "block";
          } else {
            return "none";
          }
        }
      });
    });

  function reset() {
    data.forEach(function (v) {
      v.point = map.latLngToLayerPoint(
        new L.LatLng(v.location[0], v.location[1])
      );
    });

    var bounds = path.bounds(),
      topLeft = [
        d3.min(data, function (v) {
          return v.point.x;
        }),
        d3.min(data, function (v) {
          return v.point.y;
        }),
      ];
    bottomRight = [
      d3.max(data, function (v) {
        return v.point.x;
      }),
      d3.max(data, function (v) {
        return v.point.y;
      }),
    ];

    /*
        top left [26, -284]
        bottom right [1218, 671]
      */

    console.log("topLeft", topLeft);
    console.log("bottomRight", bottomRight);

    map.eachLayer(function (d) {
      if (d._heat) {
        map.removeLayer(d);
      }
    });

    if (mapType !== "Heatmap") {
      map.eachLayer(function (d) {
        if (d._heat) {
          map.removeLayer(d);
        }
      });
    }

    if (mapType === "Heatmap") {
      var heat = L.heatLayer(heatData, {
        maxZoom: 11,
        minOpacity: 0.2,
        radius: 20,
      }).addTo(map);
    }

    svg
      .attr("width", bottomRight[0] - topLeft[0] + 100)
      .attr("height", bottomRight[1] - topLeft[1] + 100)
      .style("left", topLeft[0] + "px")
      .style("top", topLeft[1] + "px");

    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

    featureCircle
      .attr("opacity", 1)
      .attr("cx", function (d) {
        return d.point.x;
      })
      .attr("cy", function (d) {
        return d.point.y;
      })
      .attr("r", point_width)
      .on("mouseover", function (d) {
        elementMouseOver(d);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", elementMouseOut);
  }

  // Tooltip
  const tooltip = d3
    .select("#map")
    .append("div")
    .attr("class", "chart-tooltip");
  tooltip.append("div").attr("class", "tooltip-business_name");
  tooltip.append("div").attr("class", "tooltip-address");
  tooltip.append("div").attr("class", "tooltip-industry");
  tooltip.append("div").attr("class", "tooltip-amount");
  tooltip.append("div").attr("class", "tooltip-date_approved");

  // Use Leaflet to implement a D3 geometric transformation.
  function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }

  function elementMouseOver(d) {
    showTooltip(d);
  }

  function showTooltip(d) {
    var business_name = d.BusinessName;
    var address = d.Address;
    var industry = industry_json[d.NAICSCode].ds_naics_industry;
    var amount = d.LoanRange;
    var date_approved = d.DateApproved;

    tooltip.select(".tooltip-business_name").text(business_name);
    tooltip.select(".tooltip-address").text(address);
    tooltip.select(".tooltip-industry").text("Industry: " + industry);
    tooltip.select(".tooltip-amount").text("Loan Amount: " + amount);
    tooltip
      .select(".tooltip-date_approved")
      .text("Date Approved: " + date_approved);
    tooltip.transition().style("opacity", 1);

    const { width, height } = tooltip.node().getBoundingClientRect();
    tooltip.datum({ width, height });
  }

  function moveTooltip() {
    let padding = 10;
    const { width, height } = tooltip.datum();
    let x = d3.event.clientX;
    if (x + padding + width > window.innerWidth) {
      x = x - padding - width;
    } else {
      x = x + padding;
    }
    let y = d3.event.clientY;
    if (y + padding + height > window.innerHeight) {
      y = y - padding - height;
    } else {
      y = y + padding;
    }
    tooltip.style("transform", `translate(${x}px,${y}px)`);
  }

  function elementMouseOut() {
    tooltip.transition().style("opacity", 0);
  }
}
