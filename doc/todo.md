
- bug when 'reload' can not create channel because port already exists on the devtools side, click on 'reload' has no effect
    steps?: 
        - reload devtools extension
        - close page
        - reopen page via 'reopen closed tab'
        - refresh page (NOT ctrl-shift-R)
        - open devtools, go to the components page - see the component tree
        - close devtools
        - refresh page (NOT ctrl-shift-R)
        - open devtools again, go to the components page - see "Reload" button which does not work


- bug: splitter code in components-panel is initialized when ref is undefined (? use callback for ref instead?)

- move 'debugger' button behind an option

- extract changes to solid as patch-package patch

- update solid submodules, rebase, ? separate solid-source branch from solid-devtools branch ?

- dark mode
