

- ? background worker stops responding
    https://groups.google.com/a/chromium.org/g/chromium-extensions/c/LQ_VpMCpksw
    https://groups.google.com/a/chromium.org/g/chromium-extensions/c/lLb3EJzjw0o
    https://stackoverflow.com/questions/67883969/how-to-make-chrome-extension-active-permanent
    https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
    https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension/70003493#70003493

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

- with manifest v3, there's no way to make sure that injected (via script tag) script runs before any script on the page
    https://bugs.chromium.org/p/chromium/issues/detail?id=634381
    https://groups.google.com/a/chromium.org/g/chromium-extensions/c/eVZd_vOIryc
    https://bugs.chromium.org/p/chromium/issues/detail?id=1137396
    https://bugs.chromium.org/p/chromium/issues/detail?id=1054624
    
 ? need to split hook script into parts to make it faster ?


- extract changes to solid as patch-package patch

- add benchmark to examples
