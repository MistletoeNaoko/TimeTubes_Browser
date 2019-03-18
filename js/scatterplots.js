let scatterplots = [];
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
    // console.log(scatterplots[idx]);
    // scatterplots[idx][0].selectAll('circle').select(function (d, i) {
    //     console.log(d, i);
    // });
}

function drawScatterplots(id, idx, data, xItem, yItem, minmax, color) {
    let element = document.getElementById(id);

    let width = element.clientWidth * 0.8;//$(window).width() * 0.5;
    let height = $(window).height() * 0.5;//300;//element.clientHeight;//$(window).height() * 0.3;

    let sp = d3.select('#' + id).append('svg').attr('width', width).attr('height', height);

    let curLineH = [[margin.left, margin.top], [width - margin.right, margin.top]];
    let curLineV = [[margin.left, margin.top], [margin.left, height - margin.bottom]];
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

    let detailWidth = element.clientWidth * 0.2;
    let detailHeight = $(window).height() * 0.5;
    // let detail = d3.select('#scatter_detail').append('svg').attr('width', detailWidth).attr('height', detailHeight);
    // detail.append('rect')
    //     .attr('x', 0)
    //     .attr('y', 0)
    //     .attr('width', detailWidth)
    //     .attr('height', detailHeight)
    //     .attr('stroke', 'dimgray')
    //     .attr('fill', 'white');

    // let detail = d3.select('#scatter_detail')
    //     // .append('div')
    //     // .attr('class', 'scatter_detail_panel')
    //     .attr('width', detailWidth + 'px')
    //     .attr('height', detailHeight + 'px');

    let detail = document.getElementById('scatter_detail');
    detail.style.width = detailWidth + 'px';
    detail.style.height = detailHeight + 'px';

    let xScale = d3.scaleLinear()
        .domain([minmax[0][0], minmax[0][1]])
        .range([margin.left, width - margin.right]);
    let yScale = d3.scaleLinear()
        .domain([minmax[1][0], minmax[1][1]])
        .range([height - margin.bottom, margin.top]);
    let xLabel = d3.axisBottom(xScale)
        .ticks(10)
        .tickSize(-height + margin.bottom + margin.top);
    let yLabel = d3.axisLeft(yScale)
        .ticks(5)
        .tickSize(-width + margin.left + margin.right)
        .tickFormat(function (d) {
            return d.toExponential(0);
        });
    let tooltip = d3.select('#' + id)
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    // Label of x axis
    sp.append("g")
        .attr("class", "x_axis")
        .attr(
            "transform",
            "translate(" + [
                0,
                height - margin.bottom
            ].join(",") + ")"
        )
        .call(xLabel);

    // Label of y axis
    sp.append("g")
        .attr("class", "y_axis")
        .attr(
            "transform",
            "translate(" + [
                margin.left,
                0
            ].join(",") + ")"
        )
        .call(yLabel);

    // plots
    sp.append("g")
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
        .on('mouseover', function (d) {
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
        })
        .on('mouseout', function (d) {
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
        })
        .on('click', function (d) {
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
        })
        .on('dblclick', function (d, i) {
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
        });

    return [sp, lineH, lineV];
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
    currentPlot
        .attr('stroke', 'orange')
        .attr('stroke-width', 1)
        .moveToFront();
    console.log(currentPlot);

    sp[1].transition()
        .duration(0)
        .style('opacity', 0.75)
        .attr("transform","translate(" + 0 + "," + (currentPlot.attr('cy') - margin.top) + ")");
    sp[2].transition()
        .duration(0)
        .style('opacity', 0.75)
        .attr("transform","translate(" + (currentPlot.attr('cx') - margin.left) + "," + 0 + ")");
}