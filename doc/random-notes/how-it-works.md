

`inject-global-hook.js` content script is declared in the `manifest.json` to run as early as possible, and
injects a script into every page by addign a `script` tag with a code that creates `__SOLID_DEVTOOLS_GLOBAL_HOOK__` 
property on the window object, to announce to every page that Solid devtools is available.

`__SOLID_DEVTOOLS_GLOBAL_HOOK__` is an event emitter

Solid global initialization code checks for a presence of `__SOLID_DEVTOOLS_GLOBAL_HOOK__` global, and calls hook `registerSolidInstance()` method if detected,
which stores solid instance in the `solidInstance` hook property, and emits `solid-registered` hook event.


=== 

sessionStorage SESSION_STORAGE_SOLID_DEVTOOLS_ACTIVE_KEY

depending on its value, inject-global-hook injects either "small" or "big" hook

(making the following plan obsolete)

=== obsolete plan: 

Backend code: (see `initBackend` in react-devtools-shared/src/backend/index.js) when backend is created, it goes over the `registerSolidInstance` map and emits `solid-attached` event for each,
also, it subscribes to `solid-registered` event to emit `solid-attached` event each time a solid instance is registered after the backend was created.

?`solid-attached` creates `renderInterface` instance which is actually devtools backend - the hook has methods that are called from react
reconciler (like `onCommitFiberRoot`) which just call corresponding method on the renderer interface 
```
    const rendererInterface = rendererInterfaces.get(rendererID);
    if (rendererInterface != null) {
      rendererInterface.handleCommitFiberRoot(root, priorityLevel);
    }

```

=== also:

have hook types in a separate file

have a separate package with 'dist' containing .d.ts with hook types,
? AND the definition of the constant for a hook name
built from the extension sources
which can be imported in the solid sources if desired

? the package name is 'solid-devtools-api' ?

=== also:

hook attributes:

- hookType
    - big: so that devtools agent can introduce wrappers for tracking the component tree (when devtools is open)
    - small: only for detection of presence of solid on a page (to show proper icon on extension action item when devtools is closed)

- (not really an attribute of a hook, just an argument for registerSolidInstance hook method) solid build type (whether "_SOLID_DEV_" string is optimized away from solid sources or not)

    - development
    - production

- hook source (planned)
    - extension: injected by chrome extension 
    - standalone: (planned) created by solid-devtools-standalone-hook package (planned), included in the page code for enabling standalone devtools on a separate page (w/o chrome extension)

=== also: 

`devtools-agent` file has methods that are called directly from solid (which are no-ops if there's no devtools)

has method that registers solid instance 

~~has `wrapIfDevTools` for `createComponent` which calls hook methods before / after invoking the component, but only if there's a hook
and the devtools is active~~
That is, agent has `getComponentWrapper(updateWrapper: (newWrapper: DevtoolsComponentWrapper)): DevtoolsComponentWrapper`

meaining that it returns the appropriate wrapper for the circumstances (no-op for example),
and the caller provides a method to update the wrapper that the caller uses,
which will be called at appropriate moments by the agent or hook implementation (for example, when devtools window is closed).



`devtools-connector` file is for keeping tree structure on the page side while the devtools window is open

devtools tree window says:

Solid does not create data structures necessary for visualizing the component tree while the devtools window is not shown.

Refresh the page to see component tree here.
