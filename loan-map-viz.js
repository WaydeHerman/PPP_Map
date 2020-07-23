function loanMap(option) {
  // Extract options
  const el = option.el;
  const height = option.height;
  const width = option.width || "";
  var data = option.data;
  const sectors = option.sectors;
  const zip_json = option.zip_json;
  const industry_json = option.industry_json;

  console.log(data);

  test = d3
    .nest()
    .key(function (d) {
      return d.LoanRange;
    })
    .entries(data);

  console.log("test", test);

  var point_width = 4;
  var filter = "All Sectors";
  var list_of_naicscodes = [];
  var statsOpen = 1;
  var drill_key = [];
  var heatData,
    json_copy,
    bounds_NE,
    bounds_SW,
    featureCircle,
    global_drill_level,
    global_key;

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

  function plot() {
    document.getElementsByClassName("leaflet-zoom-hide").innerHTML = "";
    d3.selectAll(".feature-circle").remove();
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

    /*featureCircle = g
      .selectAll(".feature-circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "feature-circle");*/
  }

  plot();
  map.on("viewreset", reset);

  map.on("dragend", function (e) {
    reset();
  });

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

  d3.select("#flow-selector")
    .selectAll("a")
    .data(sectors_array)
    .enter()
    .append("text")
    .html(function (d) {
      return "<a href='#'>" + d + "</a>";
    })
    .on("click", function (d) {
      filter = d;
      sectors_object.forEach(function (v) {
        if (v.key == d) {
          // this is the chosen sector
          list_of_naicscodes = v.values.map(function (w) {
            return +w.cd_industry;
          });
        }
      });
      reset();
      updateStats(global_key, global_drill_level);
      /*featureCircle.style("display", function (w) {
        if (d == "All Sectors") {
          return "block";
        } else {
          if (list_of_naicscodes.indexOf(+w.NAICSCode) >= 0) {
            return "block";
          } else {
            return "none";
          }
        }
      });*/
    });

  var legendSubHeader = legendContainer
    .append("div")
    .attr("class", "legend-sub-header");

  var legendSVG = legendSubHeader
    .append("svg")
    .style("position", "relative")
    .attr("width", 180)
    .attr("height", 95);

  var legend_examples = [0, 1, 2, 3, 4];
  var colors = ["#540D6E", "#EE4266", "#FFD23F", "#3BCEAC", "#0EAD68"];
  var loan_range = [
    "$150,000-350,000",
    "$350,000-1 million",
    "$1-2 million",
    "$2-5 million",
    "$5-10 million",
  ];
  var loan_values = [0.015, 0.035, 0.1, 0.2, 1];

  var legendColorScale = d3.scaleOrdinal().domain(loan_range).range(colors);

  loanHeatmapScale = d3.scaleOrdinal().domain(loan_range).range(loan_values);

  legendSVG
    .selectAll(".legend-bars")
    .data(legend_examples)
    .enter()
    .append("rect")
    .attr("class", "legend-bars")
    .attr("y", function (d) {
      return d * 15 + 25;
    })
    .attr("fill", function (d) {
      return colors[d];
    })
    .attr("x", 35)
    .attr("width", 30)
    .attr("height", 10);

  legendSVG
    .selectAll(".legend-bars-label")
    .data(legend_examples)
    .enter()
    .append("text")
    .attr("class", "legend-bars-label")
    .attr("y", function (d) {
      return d * 15 + 34;
    })
    .attr("x", 75)
    .text(function (d) {
      return loan_range[d];
    });

  var statsContainer = legendContainer
    .append("div")
    .attr("class", "stats-container");

  statsContainer.append("div").attr("class", "stats-label").text("Stats");

  statsContainer
    .append("div")
    .attr("class", "stats-label-drill-1")
    .html("")
    .style("display", "none")
    .on("click", function () {
      updateStats("", 0);
    });

  statsContainer
    .append("div")
    .attr("class", "stats-label-drill-2")
    .html("")
    .style("display", "none")
    .on("click", function () {
      updateStats(drill_key[1], 1);
    });

  statsContainer
    .append("div")
    .attr("class", "stats-label-drill-3")
    .html("")
    .style("display", "none")
    .on("click", function () {
      updateStats(drill_key[2], 2);
    });

  statsContainer
    .append("div")
    .html("<i class='fas stats-toggle fa-chevron-up'></i>")
    .on("click", function () {
      if (statsOpen === 1) {
        statsOpen = 0;
        barSVG.style("display", "none");
        d3.select(".stats-toggle").attr(
          "class",
          "fas stats-toggle fa-chevron-down"
        );
        d3.select(".stats-label-drill-1").style("display", "none");
        d3.select(".stats-label-drill-2").style("display", "none");
        d3.select(".stats-label-drill-3").style("display", "none");
      } else {
        statsOpen = 1;
        barSVG.style("display", "block");
        d3.select(".stats-toggle").attr(
          "class",
          "fas stats-toggle fa-chevron-up"
        );
        d3.select(".stats-label-drill-1").style("display", "block");
        d3.select(".stats-label-drill-2").style("display", "block");
        d3.select(".stats-label-drill-3").style("display", "block");
      }
    });

  var barContainer = statsContainer
    .append("div")
    .attr("class", "stats-bar-container")
    .style("height", window.innerHeight - 320 + "px");

  barSVG = barContainer.append("svg").attr("width", 370);

  updateStats("", 0);

  reset();

  function updateStats(key, drill_level) {
    console.log("key", key);
    console.log("drill_level", drill_level);
    drill_key.push(key);
    global_key = key;
    global_drill_level = drill_level;
    global_key = global_key.slice(0, drill_level + 1);
    barSVG.selectAll("*").remove();

    bar_data = d3
      .nest()
      .key(function (d) {
        return d.State;
      })
      .key(function (d) {
        return d.City;
      })
      .key(function (d) {
        return d.Zip;
      })
      .entries(
        data.filter(function (v) {
          return (
            list_of_naicscodes.indexOf(+v.NAICSCode) >= 0 ||
            filter == "All Sectors"
          );
        })
      );

    console.log(bar_data);

    if (drill_level == 0) {
      results = bar_data;
    } else {
      if (drill_level == 1) {
        bar_data.forEach(function (v) {
          if (v.key == drill_key[1]) {
            results = v.values;
          }
        });
      } else {
        if (drill_level == 2) {
          bar_data.forEach(function (v) {
            if (v.key == drill_key[1]) {
              v.values.forEach(function (w) {
                if (w.key == drill_key[2]) {
                  results = w.values;
                }
              });
            }
          });
        } else {
          bar_data.forEach(function (v) {
            if (v.key == drill_key[1]) {
              v.values.forEach(function (w) {
                if (w.key == drill_key[2]) {
                  w.values.forEach(function (u) {
                    if (u.key == drill_key[3]) {
                      results = u.values;
                    }
                  });
                }
              });
            }
          });
        }
      }
    }

    if (drill_level == 0) {
      d3.select(".stats-label-drill-1").style("display", "none").html("");
      d3.select(".stats-label-drill-2").style("display", "none").html("");
      d3.select(".stats-label-drill-3").style("display", "none").html("");
      d3.select(".stats-toggle").style("top", "-10px");
    } else {
      if (drill_level == 1) {
        d3.select(".stats-label-drill-1")
          .style("display", "block")
          .html("States > " + key);
        d3.select(".stats-toggle").style("top", "-10px");
        d3.select(".stats-label-drill-2").style("display", "none").html("");
        d3.select(".stats-label-drill-3").style("display", "none").html("");
      } else {
        if (drill_level == 2) {
          d3.select(".stats-label-drill-2")
            .style("display", "block")
            .html("Cities > " + key);
          d3.select(".stats-toggle").style("top", "-10px");
          d3.select(".stats-label-drill-3").style("display", "none").html("");
        } else {
          d3.select(".stats-label-drill-3")
            .style("display", "block")
            .html("Zip Code > " + key);
          d3.select(".stats-toggle").style("top", "-10px");
        }
      }
    }

    var statsHeight = 20 + (5 + 20) * results.length;

    barSVG
      .selectAll(".bar-label")
      .data(results)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", 0)
      .attr("y", function (d, i) {
        return i * 25 + 15;
      })
      .text(function (d) {
        return d.key;
      })
      .style("cursor", "pointer")
      .on("click", function (d) {
        if (drill_level === 0) {
          updateStats(d.key, 1);
        } else {
          if (drill_level == 1) {
            updateStats(d.key, 2);
          } else {
            if (drill_level == 2) {
              updateStats(d.key, 3);
            }
          }
        }
      });
  }

  function reset() {
    bounds_NE = map.getBounds()._northEast;
    bounds_SW = map.getBounds()._southWest;
    if (featureCircle != null) {
      featureCircle.remove();
    }

    filtered_data = data.filter(function (v) {
      return (
        list_of_naicscodes.indexOf(+v.NAICSCode) >= 0 || filter == "All Sectors"
      );
    });

    console.log("filtered_data", filtered_data);

    heatData = [];
    filtered_data.forEach(function (v) {
      v.point = map.latLngToLayerPoint(
        new L.LatLng(v.location[0], v.location[1])
      );
      var tmp_val = doStuff(v.location[1], v.location[0]);
      tmp_val.push(loanHeatmapScale(v.LoanRange));
      heatData.push(tmp_val);
    });

    featureCircle = g
      .selectAll(".feature-circle")
      .data(filtered_data)
      .enter()
      .append("circle")
      .attr("class", "feature-circle");

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

    map.eachLayer(function (d) {
      if (d._heat) {
        map.removeLayer(d);
      }
    });

    svg
      .attr("width", bottomRight[0] - topLeft[0] + 100)
      .attr("height", bottomRight[1] - topLeft[1] + 100)
      .style("left", topLeft[0] + "px")
      .style("top", topLeft[1] + "px");

    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

    if (map._zoom < 7) {
      var heat = L.heatLayer(heatData, {
        maxZoom: 11,
        minOpacity: 0.2,
        radius: 15,
      }).addTo(map);
    }

    if (map._zoom >= 7) {
      featureCircle
        .attr("opacity", 1)
        .style("display", function (d) {
          if (
            d.location[0] < bounds_NE.lat &&
            d.location[0] > bounds_SW.lat &&
            d.location[1] < bounds_NE.lng &&
            d.location[1] > bounds_SW.lng
          ) {
            return "block";
          } else {
            return "none";
          }
        })
        .attr("fill", function (d) {
          return legendColorScale(d.LoanRange);
        })
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

  function doStuff(x, y) {
    //console.log(e.latlng);
    // coordinates in tile space
    //var x = e.layerPoint.x;
    //var y = e.layerPoint.y;
    //console.log([x, y]);

    // calculate point in xy space
    var pointXY = L.point(x, y);
    //console.log("Point in x,y space: " + pointXY);

    // convert to lat/lng space
    var pointlatlng = map.layerPointToLatLng(pointXY);
    // why doesn't this match e.latlng?
    //console.log("Point in lat,lng space: " + pointlatlng);

    var test = new L.LatLng(y, x);
    //console.log(" test: " + test);
    return [test.lat, test.lng];
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
