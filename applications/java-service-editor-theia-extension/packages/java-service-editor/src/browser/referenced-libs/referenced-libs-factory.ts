import { inject, injectable } from '@theia/core/shared/inversify';
import {
    codicon,
    ViewContainer,
    ViewContainerTitleOptions,
    WidgetFactory,
    WidgetManager
} from '@theia/core/lib/browser';
import { ReferencedLibsViewTreeWidget } from './referenced-libs-view-tree-widget';
import { REFERENCED_LIBS_DETAILS_ID } from './referenced-libs-details-widget';
import { REFERENCED_LIBS_VIEW_ID, REFERENCED_LIBS_CONTAINER_ID } from './referenced-libs-constants';

export const REFERENCED_LIBS_CONTAINER_TITLE_OPTIONS: ViewContainerTitleOptions = {
    label: ReferencedLibsViewTreeWidget.LABEL,
    iconClass: codicon('library'),
    closeable: true
};

@injectable()
export class ReferencedLibsFactory implements WidgetFactory {

    static ID = REFERENCED_LIBS_CONTAINER_ID;

    readonly id = ReferencedLibsFactory.ID;

    protected referencedLibsWidgetOptions: ViewContainer.Factory.WidgetOptions = {
        order: 0,
        canHide: false,
        initiallyCollapsed: false,
        weight: 19,
        disableDraggingToOtherContainers: true
    };

    protected detailsWidgetOptions: ViewContainer.Factory.WidgetOptions = {
        order: 0,
        canHide: true,
        initiallyCollapsed: true,
        disableDraggingToOtherContainers: true,
        weight: 90
    };

    @inject(ViewContainer.Factory)
    protected readonly viewContainerFactory: ViewContainer.Factory;
    @inject(WidgetManager) protected readonly widgetManager: WidgetManager;

    async createWidget(): Promise<ViewContainer> {
        const viewContainer = this.viewContainerFactory({
            id: REFERENCED_LIBS_CONTAINER_ID,
            progressLocationId: 'referenced-libs-view'
        });
        viewContainer.setTitleOptions(REFERENCED_LIBS_CONTAINER_TITLE_OPTIONS);
        const detailsWidget = await this.widgetManager.getOrCreateWidget(REFERENCED_LIBS_DETAILS_ID);
        const widget = await this.widgetManager.getOrCreateWidget(REFERENCED_LIBS_VIEW_ID);
        viewContainer.addWidget(widget, this.referencedLibsWidgetOptions);
        viewContainer.addWidget(detailsWidget, this.detailsWidgetOptions);
        return viewContainer;
    }
}
