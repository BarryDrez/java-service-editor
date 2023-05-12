import { injectable, inject } from '@theia/core/shared/inversify';
import { OutlineViewContribution, OUTLINE_WIDGET_FACTORY_ID } from '@theia/outline-view/lib/browser/outline-view-contribution';
import { MenuModelRegistry, CommandRegistry } from '@theia/core/lib/common';
import { OutlineViewWidget } from '@theia/outline-view/lib/browser/outline-view-widget';
import { JavaServiceContextMenu, OutlineRootContextMenu } from './java-service-outline-contribution';
import { JavaServiceCommands } from '../java-service-commands';
import { Widget } from '@phosphor/widgets';
import { nls } from '@theia/core/lib/common/nls';
import { TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';

@injectable()
export class JavaServiceOutlineViewContribution extends OutlineViewContribution {

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    constructor() {
        super();
    }

    registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        menus.registerMenuAction(JavaServiceContextMenu.IO_SIG, {
            commandId: JavaServiceCommands.INPUT_OUTPUT.id,
            label: nls.localize('action.bar.define.io.text', 'Define I/O'),
            order: '1'
        });
        menus.registerMenuAction(JavaServiceContextMenu.IO_SIG, {
            commandId: JavaServiceCommands.LOG_BUSINESS_DATA.id,
            label: nls.localize('action.bar.log.business.data.text', 'Log business data'),
            order: '2'
        });
        menus.registerMenuAction(JavaServiceContextMenu.INVOKE_JS, {
            commandId: JavaServiceCommands.RUN_JAVA_SERVICE.id,
            label: nls.localize('commands.run.java.service.command', 'Run Java service'),
            order: '3'
        });
        menus.registerMenuAction(JavaServiceContextMenu.INVOKE_JS, {
            commandId: JavaServiceCommands.DEBUG_JAVA_SERVICE.id,
            label: nls.localize('commands.debug.java.service.command', 'Debug Java service'),
            order: '4'
        });
        menus.registerMenuAction(JavaServiceContextMenu.DEL_JS, {
            commandId: JavaServiceCommands.DELETE_JAVA_SERVICE.id,
            label: nls.localize('action.bar.delete.text', 'Delete'),
            order: '5'
        });
        menus.registerMenuAction(JavaServiceContextMenu.EDIT_OUTLINE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_COPY.id,
            label: nls.localize('action.bar.copy.text', 'Copy {0}', nls.localize('action.bar.edit.java.service', 'Java service')),
            order: '1'
        });
        menus.registerMenuAction(JavaServiceContextMenu.EDIT_OUTLINE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_PASTE.id,
            label: nls.localize('action.bar.paste.text', 'Paste {0}', nls.localize('action.bar.edit.java.service', 'Java service')),
            order: '2'
        });
        menus.registerMenuAction(JavaServiceContextMenu.EDIT_OUTLINE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_DUPLICATE.id,
            label: nls.localize('action.bar.duplicate.text', 'Duplicate Java service'),
            order: '3'
        });

        menus.registerMenuAction(OutlineRootContextMenu.EDIT_OUTLINE_ROOT_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_PASTE.id,
            label: nls.localize('action.bar.paste.text', 'Paste {0}', nls.localize('action.bar.edit.java.service', 'Java service')),
            order: '1'
        });
    }

    async showOutlineView() {
        const model: Widget = await this.widget;
        if (!model.isVisible) {
            this.openView({ activate: false, reveal: true });
        }
    }

    async registerToolbarItems(toolbar: TabBarToolbarRegistry): Promise<void> {
        super.registerToolbarItems(toolbar);
        toolbar.registerItem({
            id: JavaServiceCommands.CLOSE_OUTLINE_VIEW.id,
            command: JavaServiceCommands.CLOSE_OUTLINE_VIEW.id,
            tooltip: JavaServiceCommands.CLOSE_OUTLINE_VIEW.label,
            priority: 0
        });
    }

    /**
     * Determine if the current widget is the `outline-view`.
     */
    withWidget<T>(widget: Widget | undefined = this.tryGetWidget(), cb: (widget: OutlineViewWidget) => T): T | false {
        if (widget instanceof OutlineViewWidget && widget.id === OUTLINE_WIDGET_FACTORY_ID) {
            return cb(widget);
        }
        return false;
    }
}
