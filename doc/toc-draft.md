

### component tree

For devtools, the expectation is set by the react devtools - it must show component tree and allow
to go from an HTML element to the component that rendered that element, and back.

Solid components are just functions that run once, they return dom nodes and there's nothing left after that
providing any information about which nodes were created by which component, or which child components
were used to create parent's component content.

To recover that information, the approach is
- intercept component creation, and track which dom nodes were created by the component
- intercept insertions of dom nodes to the document tree, and infer the place of the component in the tree based on the point where 
the result of the component was inserted

link?: explain how interception is done (wrappers, effect on benchmark)

picture: components, dom nodes, two kinds of dom nodes (not all dom nodes have extra - the tree is sparse)

describe registry 

### channel

registry exists in the content script, there's no direct access to it from the devtools panel

so there's "registry mirror" that exists in the devtools panel and replicates the registry 

for replication, and for all other communication between the page and the devtools panel there's a 
communication channel

describe ids and maps

picture: page + registry <-- channel --> devtools panel + registry mirror

describe channel protocol

describe: "incremental" updates + "snapshot" to initalize registry mirror on reconnect