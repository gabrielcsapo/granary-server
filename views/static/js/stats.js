//- TODO: need to be able to reuse this logic
$(function() {
    $.getJSON('/stats/creates_over_time', function(data) {

        console.log(data);

        var chart = new Highcharts.chart({
            chart: {
                renderTo: 'creates_over_time',
                zoomType: 'x'
            },
            title: {
                text: 'Creation rate over time (ms)',
                align: 'left',
                y: 15
            },
            xAxis: {
                type: 'datetime'
            },
            yAxis: {
                title: {
                    text: 'Create Time'
                }
            },
            legend: {
                enabled: false
            },
            credits: false,
            background: '#fff',
            series: [{
                type: 'area',
                name: 'time in ms',
                data: data
            }]
        });
    });

    $.getJSON('/stats/downloads_over_time', function(data) {

        var chart = new Highcharts.chart({
            chart: {
                renderTo: 'downloads_over_time',
                zoomType: 'x'
            },
            title: {
                text: 'Download rate over time',
                align: 'left',
                y: 15
            },
            xAxis: {
                type: 'datetime'
            },
            yAxis: {
                title: {
                    text: 'Download Time (ms)'
                }
            },
            legend: {
                enabled: false
            },
            credits: false,
            background: '#fff',
            series: [{
                type: 'area',
                name: 'time in ms',
                data: data
            }]
        });
    });

});


Highcharts.theme = {
    colors: ["#f45b5b", "#8085e9", "#8d4654", "#7798BF", "#aaeeee", "#ff0066", "#eeaaee",
        "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"
    ],
    chart: {
        background: '#fff'
    },
    title: {
        style: {
            color: 'black',
            fontSize: '16px',
            fontWeight: 'bold'
        }
    },
    subtitle: {
        style: {
            color: 'black'
        }
    },
    tooltip: {
        borderWidth: 0
    },
    legend: {
        itemStyle: {
            fontWeight: 'bold',
            fontSize: '13px'
        }
    },
    xAxis: {
        gridLineColor: '#fff',
        lineColor: '#fff',
        minorGridLineColor: '#fff',
        tickColor: '#fff',
        labels: {
            style: {
                color: '#fff'
            }
        }
    },
    yAxis: {
        gridLineColor: '#fff',
        lineColor: '#fff',
        minorGridLineColor: '#fff',
        tickColor: '#fff',
        labels: {
            style: {
                color: '#6e6e70'
            }
        }
    },
    navigator: {
        xAxis: {
            gridLineColor: '#fff'
        }
    },
    plotOptions: {
        series: {
            shadow: false
        },
        candlestick: {
            lineColor: '#fff'
        },
        map: {
            shadow: false
        }
    },
    background: '#fff',

};

Highcharts.setOptions(Highcharts.theme);
