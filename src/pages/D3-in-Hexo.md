---
title: D3 to Hexo
date: 2018-07-04 16:33:02
tags: ["d3js"]
---
D3.js is a popular package for data visualization. It provides great freedom for designer and data scientists to show data. This time, we are trying to add D3 to Hexo to write blog with nice visualization.

## Add javascript to Hexo

In fact, adding D3 to Hexo is just adding javascript code to markdown in Hexo. In the documentation of  Hexo, it tells us a way to add the html code using [raw](https://hexo.io/docs/tag-plugins.html#Raw):

```ejs
{% raw %}
content
{% endraw %}
```

## Add D3 to Hexo

Therefore, we just need to add D3 code in the middle.

```html
<div id="d3js-example-content"></div>  

<script src="https://d3js.org/d3.v4.min.js"></script>

<script>

let svg = d3.select("#d3js-example-content")
    .append("svg")
    .attr("width", "400")
    .attr("height", "400");
	
    ... ...
</script>
```

Here is a demo.

{% raw %}

<div id="d3js-example-content"></div>  

<script src="https://d3js.org/d3.v4.min.js"></script>
<script>

let width = 400;
let height = 400;

let svg = d3.select("#d3js-example-content")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

let padding = { left: 30, right: 30, top: 30, bottom: 20 };

let dataset = [10, 20, 30, 40, 33, 24, 12, 5];

let xScale = d3.scaleBand()
    .domain(d3.range(dataset.length))
    .rangeRound([0, width - padding.left - padding.right]);

let yScale = d3.scaleLinear()
    .domain([0, d3.max(dataset)])
    .range([height - padding.top - padding.bottom, 0]);

let xAxis = d3.axisBottom().scale(xScale);
let yAxis = d3.axisLeft().scale(yScale);

//矩形之间的空白
let rectPadding = 4;

//添加矩形元素
let rects = svg.selectAll(".MyRect")
    .data(dataset)
    .enter()
    .append("rect")
    .attr("class","MyRect")
    .attr("transform","translate(" + padding.left + "," + padding.top + ")")
    .attr("x", function(d,i){
        return xScale(i) + rectPadding/2;
    } )
    .attr("y",function(d){
        return yScale(d);
    })
    .attr("width", xScale.bandwidth() - rectPadding )
    .attr("height", function(d){
        return height - padding.top - padding.bottom - yScale(d);
    })
    .attr("fill","#0336FF")       //填充颜色不要写在CSS里
   .on("mouseover", function(d,i){
        d3.select(this)
            .attr("fill","#FF0266");
    })
    .on("touchenter", function(d,i){
        d3.select(this)
            .attr("fill","#FF0266");
    })
    .on("mouseout",function(d,i){
        d3.select(this)
            .transition()
            .duration(500)
            .attr("fill","#0336FF");
    })
    .on("touchleave",function(d,i){
        d3.select(this)
            .transition()
            .duration(500)
            .attr("fill","#0336FF");
    });

//添加文字元素
let texts = svg.selectAll(".MyText")
    .data(dataset)
    .enter()
    .append("text")
    .attr("class","MyText")
    .attr("transform","translate(" + padding.left + "," + padding.top + ")")
    .attr("x", function(d,i){
        return xScale(i);
    } )
    .attr("y",function(d){
        return yScale(d);
    })
    .attr("dx",function(){
        return (xScale.bandwidth() - rectPadding)/2;
    })
    .attr("dy",function(d){
        return -5;
    })
    .text(function(d){
        return d;
    });

//添加x轴
svg.append("g")
    .attr("class","axis")
    .attr("transform","translate(" + padding.left + "," + (height - padding.bottom) + ")")
    .call(xAxis);

//添加y轴
svg.append("g")
    .attr("class","axis")
    .attr("transform","translate(" + padding.left + "," + padding.top + ")")
    .call(yAxis);

</script>

{% endraw %}