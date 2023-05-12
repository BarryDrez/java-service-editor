import {
   AbstractViewContribution,
   FrontendApplicationContribution,
   FrontendApplication,
   ViewContainer
} from '@theia/core/lib/browser';
import { injectable, inject } from 'inversify';
import { ReferencedLibsViewTreeWidget } from './referenced-libs-view-tree-widget';
import { Command, CommandRegistry, MenuModelRegistry } from '@theia/core';
import { Widget } from '@theia/core/lib/browser/widgets';
import { JavaServiceCommands } from '../java-service-commands';
import { ReferencedLibsService } from './referenced-libs-service';
import { ReferencedLibsDetailsWidget, REFERENCED_LIBS_DETAILS_ID } from './referenced-libs-details-widget';
import { REFERENCED_LIBS_VIEW_ID, REFERENCED_LIBS_CONTAINER_ID } from './referenced-libs-constants';

export const ReferencedLibsTreeWidgetCommand: Command = {
   id: 'referenced.libs'
};

@injectable()
export class ReferencedLibsWidgetViewContribution extends AbstractViewContribution<ReferencedLibsViewTreeWidget>
   implements FrontendApplicationContribution {

   @inject(ReferencedLibsService) protected readonly referencedLibsService: ReferencedLibsService;
   @inject(ReferencedLibsViewTreeWidget) protected readonly referencedLibsViewTreeWidget: ReferencedLibsViewTreeWidget;

   constructor() {
      super({
         viewContainerId: REFERENCED_LIBS_CONTAINER_ID,
         widgetId: REFERENCED_LIBS_VIEW_ID,
         widgetName: ReferencedLibsViewTreeWidget.LABEL,
         defaultWidgetOptions: {
            area: 'bottom',
            rank: 100
         },
         toggleCommandId: 'referencedLibsView:toggle'
      });
   }

   async initializeLayout(app: FrontendApplication): Promise<void> {
      await this.openView({ activate: false });
   }

   override registerCommands(commandRegistry: CommandRegistry): void {

      commandRegistry.registerCommand(JavaServiceCommands.SHOW_REFERENCED_LIBS_VIEW, {
         isEnabled: widget => true,
         isVisible: widget => true,
         execute: () => this.openView({
            toggle: false,
            activate: true
         })
      });

      commandRegistry.registerCommand(JavaServiceCommands.CLOSE_REFERENCED_LIBS_VIEW, {
         isEnabled: widget => true,
         isVisible: widget => true,
         execute: () => {
            this.closeView();
         }
      });

      commandRegistry.registerCommand(ReferencedLibsTreeWidgetCommand, {
         execute: () => super.openView({ activate: false, reveal: true })
      });

      commandRegistry.onDidExecuteCommand(e => {
         console.log(e.commandId);
         if (e.args && e.args.length > 0) {
            console.log(e.args);
         }
         if (e.commandId === 'setContext' && e.args && e.args.length === 2 &&
            e.args[0] === 'java:serverMode' && e.args[1] === 'Standard') {
            //When the ava project has been loaded by the Redhat plugin, create the view's root node
            setTimeout(() => {
               this.referencedLibsService.setProxyVisible();
            }, 1000);
         }
      });
      super.registerCommands(commandRegistry);
   }

   registerMenus(menus: MenuModelRegistry): void {
      super.registerMenus(menus);
   }

   /**
    * Determine the current widget
    */
   protected withTreeWidget<T>(widget: Widget | undefined = this.tryGetWidget(), cb: (widget: ReferencedLibsViewTreeWidget) => T): T | false {
      if (widget instanceof ReferencedLibsViewTreeWidget && widget.id === REFERENCED_LIBS_VIEW_ID) {
         return cb(widget);
      }
      return false;
   }

   protected withDetailsWidget<T>(widget: Widget, cb: (navigator: ReferencedLibsDetailsWidget) => T): T | false {
      if (widget instanceof ReferencedLibsDetailsWidget && widget.id === REFERENCED_LIBS_DETAILS_ID) {
         return cb(widget);
      }
      return false;
   }

   protected withViewContainerDetails<T>(widget: Widget, cb: (navigator: ViewContainer) => T): T | false {
      if (widget instanceof ViewContainer && (widget as ViewContainer).id === REFERENCED_LIBS_CONTAINER_ID) {
         return cb(widget);
      }
      return false;
   }
}
