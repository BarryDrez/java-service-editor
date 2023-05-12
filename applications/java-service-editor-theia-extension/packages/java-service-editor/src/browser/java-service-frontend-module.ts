import { ContainerModule, interfaces, Container } from '@theia/core/shared/inversify';

import {
    FrontendApplicationContribution, WebSocketConnectionProvider, ApplicationShell,
    KeybindingContribution, WidgetFactory, bindViewContribution
} from '@theia/core/lib/browser';
import { TabBarToolbarContribution } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { MonacoEditorFactory } from '@theia/monaco/lib/browser/monaco-editor-provider';
import { MonacoEditorModelFactory } from '@theia/monaco/lib/browser/monaco-text-model-service';


import { JavaServiceOutlineContribution } from './outline/java-service-outline-contribution';
import '../../src/browser/style/index.css';
import '../../src/browser/style/ut-icons.css';

import '@delite/dlt-icons/Font/css/dlt-icons-font.css';
import '@delite/dlt-components/css/delite.min.css';
import '@delite/dlt-icons/Font/css/dlt-icons-font.css';
import '@delite/dlt-fonts/roboto.css';
import '@builtioflow/origin-shared-components/node_modules/ngx-toastr/toastr.css';

import { InvokeBackendService, INVOKE_BACKEND_PATH } from '../common/protocol';
import { MonacoOutlineContribution } from '@theia/monaco/lib/browser/monaco-outline-contribution';
import { OutlineViewContribution } from '@theia/outline-view/lib/browser/outline-view-contribution';
import { FileNavigatorContribution } from '@theia/navigator/lib/browser/navigator-contribution';
import { JavaServiceOutlineViewContribution } from './outline/java-service-outline-view-contribution';
import { JavaServiceCommandContribution } from './java-service-command-contribution';
import { CommandContribution, MenuContribution } from '@theia/core';
import { SharedComponentsDialog } from './java-service-shared-components-dialog';
import { JavaServiceApplicationShell } from './java-service-shell';
import { JavaServiceActionBar } from './java-service-action-bar';
import { JavaServiceInvokeViewWidget } from './invoke-results/java-service-invoke-view-widget';
import { JavaServiceInvokeViewContribution } from './invoke-results/java-service-invoke-view-contribution';
import { ReferencedLibsViewTreeWidget } from './referenced-libs/referenced-libs-view-tree-widget';
import { REFERENCED_LIBS_VIEW_ID } from './referenced-libs/referenced-libs-constants';
import { ReferencedLibsWidgetViewContribution } from './referenced-libs/referenced-libs-view-contribution';
import { ReferencedLibsService } from './referenced-libs/referenced-libs-service';
import { ReferencedLibsFactory } from './referenced-libs/referenced-libs-factory';
import { createReferencedLibsTreeWidget } from './referenced-libs/referenced-libs-container';
import { ReferencedLibsDetailsWidget, REFERENCED_LIBS_DETAILS_ID } from './referenced-libs/referenced-libs-details-widget';
import { ReferencedLibsEditorFactory } from './referenced-libs/referenced-libs-editor-factory';
import { ReferencedLibsEditorModelFactory } from './referenced-libs/referenced-libs-editor-model-factory';
import { ReferencedLibsEditorProvider } from './referenced-libs/referenced-libs-editor-provider';

export default new ContainerModule((bind, unbind, isBound, rebind) => {

    const emptyWidget = new EmptyWidget();
    rebind(FileNavigatorContribution).toConstantValue({
        registerCommands: () => { },
        registerMenus: () => { },
        registerKeybindings: () => { },
        registerToolbarItems: () => { },
        openView: () => { return emptyWidget },
    } as any);

    bind(JavaServiceActionBar).toSelf();

    bind(JavaServiceApplicationShell).toSelf().inSingletonScope();
    rebind(ApplicationShell).to(JavaServiceApplicationShell).inSingletonScope();

    bind(SharedComponentsDialog).toSelf().inSingletonScope();

    bind(JavaServiceCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).to(JavaServiceCommandContribution).inSingletonScope();
    for (const identifier of [FrontendApplicationContribution, CommandContribution, MenuContribution, KeybindingContribution]) {
        bind(identifier).toService(JavaServiceCommandContribution);
    }

    bind(InvokeBackendService).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<InvokeBackendService>(INVOKE_BACKEND_PATH);
    }).inSingletonScope();

    bind(JavaServiceOutlineContribution).toSelf().inSingletonScope();
    rebind(MonacoOutlineContribution).toService(JavaServiceOutlineContribution);

    bind(JavaServiceOutlineViewContribution).toSelf().inSingletonScope();
    rebind(OutlineViewContribution).to(JavaServiceOutlineViewContribution).inSingletonScope();

    bindViewContribution(bind, JavaServiceInvokeViewContribution);
    bind(FrontendApplicationContribution).toService(JavaServiceInvokeViewContribution);
    bind(TabBarToolbarContribution).toService(JavaServiceInvokeViewContribution);
    bind(JavaServiceInvokeViewWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: JavaServiceInvokeViewWidget.ID,
        createWidget: () => ctx.container.get<JavaServiceInvokeViewWidget>(JavaServiceInvokeViewWidget)
    })).inSingletonScope();

    bind(ReferencedLibsEditorProvider).toSelf().inSingletonScope();

    bind(ReferencedLibsService).toSelf().inSingletonScope();

    bindViewContribution(bind, ReferencedLibsWidgetViewContribution);
    bind(FrontendApplicationContribution).toService(ReferencedLibsWidgetViewContribution);

    bind(ReferencedLibsEditorFactory).toSelf().inSingletonScope();
    bind(MonacoEditorFactory).toService(ReferencedLibsEditorFactory);
    bind(ReferencedLibsEditorModelFactory).toSelf().inSingletonScope();
    bind(MonacoEditorModelFactory).toService(ReferencedLibsEditorModelFactory);

    bind(ReferencedLibsViewTreeWidget).toDynamicValue(ctx =>
        createReferencedLibsTreeWidget(ctx.container)
    );
    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: REFERENCED_LIBS_VIEW_ID,
        createWidget: () => container.get(ReferencedLibsViewTreeWidget)
    })).inSingletonScope();

    bind(ReferencedLibsDetailsWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: REFERENCED_LIBS_DETAILS_ID,
        createWidget: () => ctx.container.get<ReferencedLibsDetailsWidget>(ReferencedLibsDetailsWidget)
    })).inSingletonScope();

    bind(ReferencedLibsFactory).toSelf().inSingletonScope();
    bind(WidgetFactory).toService(ReferencedLibsFactory);
});

class EmptyWidget {
    get parent() {
        return 'empty';
    }
}
