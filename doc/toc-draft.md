

### intro

This is a work-in-progress to explore possible approaches for building devtools for solid

It requires modified version of solid, maintained here in the same monorepo - modifications to core solid code are described [here](-> add link)

It does not rely on the development mode provided by solid, and it does not (yet) include the existing [solid-debugger](-> add link). It has its own hook and wrappers, the reasons for that are:
- the ability to use devtools on a production site might turn out to be useful
- the expectation set by react devtools is that one can see the component tree without doing anything special for that in the user code
- when the devtools tab is not open, the wrappers are just no-op functions that return immediately, there seems to be [no impact on the benchmark](-> add link) in production mode even when the wrappers are always in place

The easiest way to try it is to clone the monorepo, follow [build instructions](-> add link) and run the examples provided in the same monorepo (add or list the examples)

[Video goes here]

### concepts

component tree 

[diagram goes here]

how to show it in the devtools panel

hook + registry (mention wrappers with link to detailed wrapper explanation)
channel
panel + registry mirror

[diagram goes here]

### wrappers

Detailed description of modifications to the solid code

### build instructions



==== below is an older variant
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
