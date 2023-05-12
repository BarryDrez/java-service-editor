import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core';
import { injectable, ContainerModule } from '@theia/core/shared/inversify';
import { LocalizationContribution } from '@theia/core/lib/node/i18n/localization-contribution';
import { BackendApplicationContribution } from "@theia/core/lib/node";

import { InvokeBackendService, INVOKE_BACKEND_PATH } from '../common/protocol';
import { InvokeBackendServiceImpl } from './invoke-backend-service';

//import { Application } from "express";
//import { createProxyServer } from 'http-proxy';
import { JavaServiceLocalizationContribution } from './java-service-localization-contribution';
import { JavaServiceEndpoint } from './java-service-endpoint';

// (global as any).WebSocket = require('ws');

export default new ContainerModule(bind => {
    bind(InvokeBackendService).to(InvokeBackendServiceImpl).inSingletonScope()
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(INVOKE_BACKEND_PATH, () => {
            return ctx.container.get<InvokeBackendService>(InvokeBackendService);
        })
    ).inSingletonScope();
    // bind<BackendApplicationContribution>(BackendApplicationContribution).to(ProxyServer);

    bind(JavaServiceLocalizationContribution).toSelf().inSingletonScope();
    bind(LocalizationContribution).toService(JavaServiceLocalizationContribution);

    bind(JavaServiceEndpoint).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(JavaServiceEndpoint);
});



/**
 * Used to delegate all 'admin' related requests to Integration Server
 */
// @injectable()
// class ProxyServer implements BackendApplicationContribution {

//     configure?(app: Application) {
//         const apiProxy = createProxyServer();
//         app.all("/admin/*", function (req, res) {
//             apiProxy.web(req, res, { target: "http://usrscp65:5555" });
//         });
//     }
// }