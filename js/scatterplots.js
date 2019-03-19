let scatterplots = [];
let currentPlots = [];
let margin = { "top": 30, "bottom": 30, "right": 30, "left": 60 };

d3.selection.prototype.moveToFront =
    function() {
        return this.each(function(){this.parentNode.appendChild(this);});
    };

function setScatterplots(idx, xItem, yItem) {
    if (!scatterplots[idx]) {
        scatterplots[idx] = [];
    }
    let minmax = [
        [blazarMin[idx][xItem], blazarMax[idx][xItem]],
        [blazarMin[idx][yItem], blazarMax[idx][yItem]]
    ];
    scatterplots[idx].push(drawScatterplots('scatterplots', idx, blazarData[idx], xItem, yItem, minmax, timetubes[idx].getPlotColor()));
}

function drawScatterplots(id, idx, data, xItem, yItem, minmax, color) {
    let element = document.getElementById(id);

    let outerWidth = element.clientWidth * 0.8;//$(window).width() * 0.5;
    let outerHeight = $(window).height() * 0.5;//300;//element.clientHeight;//$(window).height() * 0.3;

    let width = outerWidth - margin.left - margin.right;
    let height = outerHeight - margin.top - margin.bottom;

    let sp = d3.select('#' + id)
        .append('svg')
        .attr('width', outerWidth)
        .attr('height', outerHeight);

    // Draw x axis
    let xScale = d3.scaleLinear()
        .domain([minmax[0][0], minmax[0][1]])
        .range([0, width]);
    let xLabel = d3.axisBottom(xScale)
        .ticks(10)
        .tickSize(-height);
    let xAxis = sp.append("g")
        .attr("class", "x_axis")
        .attr("transform", "translate(" + margin.left + ', ' + (margin.top + height) + ")")
        .call(xLabel);
    // Draw y axis
    let yScale = d3.scaleLinear()
        .domain([minmax[1][0], minmax[1][1]])
        .range([height, 0]);
    let yLabel = d3.axisLeft(yScale)
        .ticks(5)
        .tickSize(-width)
        .tickFormat(function (d) {
            return d.toExponential(0);
        });
    let yAxis = sp.append("g")
        .attr("class", "y_axis")
        .attr("transform", "translate(" + margin.left + ', ' + margin.top + ")")
        .call(yLabel);


    let tooltip = d3.select('#' + id)
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    let curLineH = [[0, margin.top], [width, margin.top]];
    let curLineV = [[margin.left, 0], [margin.left, height]];
    let line = d3.line()
        .x(function(d){ return d[0]; })
        .y(function(d){ return d[1]; });
    let lineH = sp.append('path')
        .attr('d', line(curLineH))
        .attr('stroke', 'orange')
        .attr("fill", "none")
        .style('opacity', 0);
    let lineV = sp.append('path')
        .attr('d', line(curLineV))
        .attr('stroke', 'orange')
        .attr("fill", "none")
        .style('opacity', 0);

    // Pan and zoom
    let zoom = d3.zoom()
        .scaleExtent([.5, 20])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    sp.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(zoom);

    // create a clipping region
    sp.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);
    // Draw data points
    let point_g = sp.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr('clip-path', 'url(#clip)')
        .classed('points_g', true);
    let points = point_g
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .select(function (d) {
            return (xItem in d && yItem in d) ? this: null;
        })
        .attr("cx", function(d) { return xScale(d[xItem]); })
        .attr("cy", function(d) { return yScale(d[yItem]); })
        .attr("fill", d3.rgb(color[0], color[1], color[2]))
        .attr('opacity', 0.7)
        .attr('stroke-width', 0.5)
        .attr('stroke', 'dimgray')
        .attr("r", 4)
        .on('mouseover', spMouseOver)
        .on('mouseout', spMouseOut)
        .on('click', spClick)
        .on('dblclick', spDblClick);

    let detailWidth = element.clientWidth * 0.2;
    let detailHeight = $(window).height() * 0.5;

    let detail = document.getElementById('scatter_detail');
    detail.style.width = detailWidth + 'px';
    detail.style.height = detailHeight + 'px';

    return [sp, lineH, lineV];

    function zoomed() {
        // create new scale ojects based on event
        let new_xScale = d3.event.transform.rescaleX(xScale);
        let new_yScale = d3.event.transform.rescaleY(yScale);
        // update axes
        xAxis.call(xLabel.scale(new_xScale));
        yAxis.call(yLabel.scale(new_yScale));
        points.data(data)
            .attr('cx', function(d) {return new_xScale(d[xItem])})
            .attr('cy', function(d) {return new_yScale(d[yItem])});
        if (currentPlots[idx]) {
            let d = currentPlots[idx].data()[0];
            let x = new_xScale(d[xItem]);
            let y = new_yScale(d[yItem]);

            lineH.transition()
                .duration(0)
                .attr('transform', "translate(" + margin.left + "," + y + ")");
            lineV.transition()
                .duration(0)
                .attr('transform', "translate(" + x + "," + margin.top + ")");
        }
    }
    function spMouseOver(d) {
        d3.select(this)
            .attr('stroke-width', 1)
            .attr('stroke', 'black');
        tooltip.transition()
            .duration(50)
            .style('opacity', 0.75);
        tooltip.html(
            '<i>' + xItem + '</i>' + ': ' + d[xItem] + '<br/>' +
            '<i>' + yItem + '</i>' + ': ' + d[yItem]
        )
            .style('left', (d3.event.pageX + 20) + 'px')
            .style('top', (d3.event.pageY - 30) + 'px');
    }
    function spMouseOut(d) {
        if (d3.select(this).style('fill') !== d3.color('red').toString()) {
            if (d['JD'] !== timetubes[idx].tube_group.position.z + blazarData[idx][0]['JD']) {
                d3.select(this)
                    .attr('stroke-width', 0.5)
                    .attr('stroke', 'dimgray');
            } else {
                d3.select(this)
                    .attr('stroke', 'orange')
                    .attr('stroke-width', 1);
            }
        }
        tooltip.transition()
            .duration(150)
            .style("opacity", 0);
    }
    function spClick(d) {
        let curColor = d3.color(d3.select(this).style('fill'));
        if (curColor.r === color[0] && curColor.g === color[1] && curColor.b === color[2]) {
            d3.selectAll('circle')
                .attr('fill', d3.rgb(color[0], color[1], color[2]))
                .attr('stroke-width', 0.5)
                .attr('stroke', 'dimgray');
            d3.select(this)
                .attr('fill', 'red')
                .attr('stroke-width', 1)
                .attr('stroke', 'black')
                .moveToFront();
            let datainfo = '<table class="table_values">';
            for  (let key in d) {
                datainfo += '<tr>' +
                    '<td class="label_values"><i>' +
                    key +
                    '</i></td>' +
                    '<td class="current_values">' +
                    d[key] +
                    '</td></tr>';
            }
            datainfo += '</table>';
            detail.innerHTML = datainfo;
        } else {
            d3.select(this)
                .attr('fill', d3.rgb(color[0], color[1], color[2]))
                .attr('stroke-width', 0.5)
                .attr('stroke', 'dimgray');
        }
    }
    function spDblClick(d, i) {
        let curColor = d3.color(d3.select(this).style('fill'));
        if (curColor.r === color[0] && curColor.g === color[1] && curColor.b === color[2]) {
            d3.selectAll('circle')
                .attr('fill', d3.rgb(color[0], color[1], color[2]))
                .attr('stroke-width', 0.5)
                .attr('stroke', 'dimgray');
            d3.select(this)
                .attr('fill', 'red')
                .attr('stroke-width', 1)
                .attr('stroke', 'black');
        } else {
            d3.select(this)
                .attr('fill', d3.rgb(color[0], color[1], color[2]))
                .attr('stroke-width', 0.5)
                .attr('stroke', 'dimgray');
        }
        timetubes[idx].searchTime(blazarData[idx][i]['JD']);
    }
}

function highlightCurrentPlot(idx, dst) {
    let JD = dst + blazarData[idx][0]['JD'];
    let sp = scatterplots[idx][0];
    let dataIdx;
    for (dataIdx = 0; dataIdx < blazarData[idx].length; dataIdx++) {
        if (JD === blazarData[idx][dataIdx]['JD'])
            break;
    }
    sp[0].selectAll('circle')
        .attr('stroke-width', 0.5)
        .attr('stroke', 'dimgray');

    let currentPlot = sp[0].selectAll('circle').filter(function (d) {
        return d['JD'] === JD;
    });
    currentPlots[idx] = currentPlot;
    currentPlot
        .attr('stroke', 'orange')
        .attr('stroke-width', 1)
        .moveToFront();

    sp[1].transition()
        .duration(0)
        .style('opacity', 0.75)
        .attr("transform","translate(" + margin.left + "," + (currentPlot.attr('cy')) + ")");
    sp[2].transition()
        .duration(0)
        .style('opacity', 0.75)
        .attr("transform","translate(" + (currentPlot.attr('cx')) + "," + margin.top + ")");
}

