var Node = require('basis.ui').Node;
var DataObject = require('basis.data').DataObject;
var Value = require('basis.data').Value;
var addHandler = require('basis.dom.event').addHandler;
var d3 = require('d3');

module.exports = Node.subclass({
    template: resource('./template/graph.tmpl'),
    autoDelegate: true,
    marginBottom: 10,
    updateGraphSize: function() {
        if (this.svg) {
            this.svg.attr('height', window.innerHeight - this.element.getBoundingClientRect().top - this.marginBottom);
        }
    },
    init: function() {
        Node.prototype.init.call(this);

        addHandler(window, 'resize', function() {
            this.updateGraphSize();
        }, this);

        this.svg = null;

        if (!this.groupsColor) {
            this.groupsColor = new DataObject();
        }

        var tooltip = new Node({
            container: document.body,
            template: resource('./template/tooltip.tmpl'),
            bottom: new Value({value: 0}),
            left: new Value({value: 0}),
            visible: new Value({value: false}),
            content: new Value({value: ''}),
            binding: {
                bottom: 'bottom',
                left: 'left',
                visible: 'visible',
                content: 'content'
            }
        });

        Value.query(this, 'data').link(this, function(graph) {
            basis.asap(function() {
                if (this.svg) {
                    this.svg.remove();
                }

                this.svg = d3.select(this.element).append('svg').attr('width', '100%');
                this.updateGraphSize();
                var width = this.svg.node().clientWidth;
                var height = parseInt(this.svg.attr('height'));
                var groupsColor = this.groupsColor.data;
                var dragging = false;

                var simulation = d3.forceSimulation()
                    .force('link', d3.forceLink().id(function(d) {
                        return d.id;
                    }))
                    .force('charge', d3.forceManyBody())
                    .force('center', d3.forceCenter(width / 2, height / 2));

                var color = d3.scaleOrdinal(d3.schemeCategory10);
                var link = this.svg.append('g')
                    .attr('class', 'links')
                    .selectAll('line')
                    .data(graph.links)
                    .enter().append('line')
                    .attr('stroke', '#999')
                    .attr('stroke-opacity', '0.6');

                var node = this.svg.append('g')
                    .attr('class', 'nodes')
                    .selectAll('circle')
                    .data(graph.nodes)
                    .enter().append('circle')
                    .attr('r', 5)
                    .attr('stroke-width', function(d) {
                        return d.main ? '2.5px' : '1.5px';
                    })
                    .attr('stroke', function(d) {
                        return d.main ? '#d62728' : '#fff';
                    })
                    .attr('fill', function(d) {
                        return color(groupsColor[d.group] || groupsColor.all);
                    })
                    .on('mouseover', function(sender) {
                        if (!dragging) {
                            tooltip.content.set(sender.name);
                            tooltip.visible.set(true);
                        }
                    })
                    .on('mousemove', function() {
                        if (!dragging) {
                            tooltip.bottom.set(window.innerHeight - event.pageY + 10);
                            tooltip.left.set(event.pageX - 10);
                        }
                    })
                    .on('mouseout', function() {
                        tooltip.visible.set(false);
                    })
                    .call(d3.drag()
                        .on('start', dragstarted)
                        .on('drag', dragged)
                        .on('end', dragended));

                simulation
                    .nodes(graph.nodes)
                    .on('tick', ticked);

                simulation.force('link')
                    .links(graph.links);

                function ticked() {
                    link
                        .attr('x1', function(d) {
                            return d.source.x;
                        })
                        .attr('y1', function(d) {
                            return d.source.y;
                        })
                        .attr('x2', function(d) {
                            return d.target.x;
                        })
                        .attr('y2', function(d) {
                            return d.target.y;
                        });

                    node
                        .attr('cx', function(d) {
                            return d.x;
                        })
                        .attr('cy', function(d) {
                            return d.y;
                        });
                }

                function dragstarted(d) {
                    if (!d3.event.active) {
                        simulation.alphaTarget(0.3).restart();
                    }
                    d.fx = d.x;
                    d.fy = d.y;
                    dragging = true;
                }

                function dragged(d) {
                    d.fx = d3.event.x;
                    d.fy = d3.event.y;
                }

                function dragended(d) {
                    if (!d3.event.active) {
                        simulation.alphaTarget(0);
                    }
                    d.fx = null;
                    d.fy = null;
                    dragging = false;
                }
            }, this);
        }.bind(this));
    }
});