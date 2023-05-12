import { injectable } from '@theia/core/shared/inversify';
import { JavaServiceInvokeViewWidget } from './java-service-invoke-view-widget';
import { AbstractViewContribution } from '@theia/core/lib/browser';
import { Widget } from '@phosphor/widgets';
import { FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser/frontend-application';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar'
import { JavaServiceCommands } from '../java-service-commands';
import { ServiceConfig } from '../../common/java-service-config';

const A_ELEM = 'a';
const HREF_ATTR = 'href';
const DOWNLOAD_ATTR = 'download';
const JSON_EXT = '.json';
const JSE_SRC_PATH = '/rest/jse/ui';

@injectable()
export class JavaServiceInvokeViewContribution extends AbstractViewContribution<JavaServiceInvokeViewWidget> implements FrontendApplicationContribution, TabBarToolbarContribution {
   initialize?(): void {
      // console.log('****JSE JavaServiceInvokeViewContribution initialize  ');
      // throw new Error('Method not implemented.');
   }
   configure?(app: FrontendApplication): import('@theia/core').MaybePromise<void> {
      // console.log('****JSE JavaServiceInvokeViewContribution configure  ');
      // console.log('****configure window.history:' + window.history.length);
      // console.log(location.href);

      // throw new Error('Method not implemented.');
   }
   onStart?(app: FrontendApplication): import('@theia/core').MaybePromise<void> {
      // console.log('****JSE JavaServiceInvokeViewContribution onStart  ');
      // console.log(location.href);
      this.registerEventListeners();

      // throw new Error('Method not implemented.');
   }

   protected registerEventListeners(): void {
      window.addEventListener('popstate', this.onBrowserPopstate, true);
   }

   unregisterEventListeners() {
      window.removeEventListener('popstate', this.onBrowserPopstate);
   }

   onBrowserPopstate(event) {

      // console.log('**********JavaServiceEditorWrapper:onPopstate:window.history:' + window.history.length);
      // console.log('******onPopstate');
      // console.log(location.href);

      //Work around to the problem where need to click twice to go back to the cards page
      //iframe src /rest/jse/ui gets added to the browser history
      if (1 < history.length) {
         var url = location.href;
         if (url && url.includes(JSE_SRC_PATH)) {
            // console.log('******has in URL rest/jse/ui');
            setTimeout(function () {
               // console.log('******call history.back');
               history.back();
            }, 100);
         }
      }
   }

   onWillStop?(app: FrontendApplication): boolean | import('@theia/core/lib/browser/frontend-application').OnWillStopAction {
      // throw new Error('Method not implemented.');
      // console.log('****JSE JavaServiceInvokeViewContribution onWillStop  ');
      this.unregisterEventListeners();
      return true;
   }

   onStop?(app: FrontendApplication): void {
      // console.log('****JSE JavaServiceInvokeViewContribution onStop  ');

      // throw new Error('Method not implemented.');
   }

   initializeLayout?(app: FrontendApplication): import('@theia/core').MaybePromise<void> {
      throw new Error('Method not implemented.');
   }

   onDidInitializeLayout?(app: FrontendApplication): import('@theia/core').MaybePromise<void> {
      // console.log('****JSE onDidInitializeLayout  ');

      // throw new Error('Method not implemented.');
   }

   constructor() {
      super({
         widgetId: JavaServiceInvokeViewWidget.ID,
         widgetName: JavaServiceInvokeViewWidget.LABEL,
         defaultWidgetOptions: { area: 'bottom' }
      });
      // console.log('****JSE JavaServiceInvokeViewContribution constructor  ');

   }

   registerToolbarItems(toolbar: TabBarToolbarRegistry): void {
      toolbar.registerItem({
         id: JavaServiceCommands.INFO_LAST_INVOCATION_VIEW.id,
         command: JavaServiceCommands.INFO_LAST_INVOCATION_VIEW.id,
         tooltip: JavaServiceCommands.INFO_LAST_INVOCATION_VIEW.label,
         priority: 0
      });

      toolbar.registerItem({
         id: JavaServiceCommands.DOWNLOAD_LAST_INVOCATION_VIEW.id,
         command: JavaServiceCommands.DOWNLOAD_LAST_INVOCATION_VIEW.id,
         tooltip: JavaServiceCommands.DOWNLOAD_LAST_INVOCATION_VIEW.label,
         priority: 0
      });

      toolbar.registerItem({
         id: JavaServiceCommands.CLOSE_LAST_INVOCATION_VIEW.id,
         command: JavaServiceCommands.CLOSE_LAST_INVOCATION_VIEW.id,
         tooltip: JavaServiceCommands.CLOSE_LAST_INVOCATION_VIEW.label,
         priority: 0
      });
   }

   withWidget(
      widget: Widget | undefined = this.tryGetWidget(),
      predicate: (output: JavaServiceInvokeViewWidget) => boolean = () => true): boolean | false {
      return widget instanceof JavaServiceInvokeViewWidget ? predicate(widget) : false;
   }

   resultsInfo() {
      alert('Information');
   }

   downloadResults() {
      const widget = this.tryGetWidget();
      const invokeResults = (widget as JavaServiceInvokeViewWidget).invokeResults;
      const downloadAnchorNode = document.createElement(A_ELEM);
      downloadAnchorNode.setAttribute(HREF_ATTR, invokeResults);
      downloadAnchorNode.setAttribute(DOWNLOAD_ATTR, ServiceConfig.javaServiceName + JSON_EXT);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
   }
}

