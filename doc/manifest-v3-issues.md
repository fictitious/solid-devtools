## no way to run content script before any other scripts on the page

This happens most often on pages built in production code - there's no component tab in devtools, or the component tree is empty.

The only workaround is to keep reloading the page, until the scripts are executed in the right order.

https://bugs.chromium.org/p/chromium/issues/detail?id=634381

https://groups.google.com/a/chromium.org/g/chromium-extensions/c/eVZd_vOIryc

https://bugs.chromium.org/p/chromium/issues/detail?id=1137396

https://bugs.chromium.org/p/chromium/issues/detail?id=1054624

## sometimes, background worker just stops permanently

and I see this when running chrome with --enable-logging=stderr:

    [2486:2486:0220/215658.335680:ERROR:service_worker_task_queue.cc(211)] DidStartWorkerFail efjddpiinknfifaidghhfffakhlkjilj: 5
    line 211 in that file has this
        // TODO(https://crbug/1062936): Needs more thought: extension would be in
        // perma-broken state after this as the registration wouldn't be stored if
        // this happens.
        LOG(ERROR)
            << "DidStartWorkerFail " << context_id.first.extension_id() << ": "
            << static_cast<std::underlying_type_t<blink::ServiceWorkerStatusCode>>(
                    status_code);

As they say in that comment, the devtools extension is unusable when this happens, you have to remove it and install again.

https://groups.google.com/a/chromium.org/g/chromium-extensions/c/LQ_VpMCpksw

https://groups.google.com/a/chromium.org/g/chromium-extensions/c/lLb3EJzjw0o

## background worker stops, even if it has open ports

Just as any other service worker

https://stackoverflow.com/questions/67883969/how-to-make-chrome-extension-active-permanent

https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension

This is solved in solid-devtools by reopening the port from the devtools page on disconnect, and restoring communication between registry and registry-mirror.

But when this happens, you may see that the component tree is reloaded for apparently no reason.
