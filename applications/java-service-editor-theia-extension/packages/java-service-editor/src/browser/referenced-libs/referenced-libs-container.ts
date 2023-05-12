import { Container, interfaces } from '@theia/core/shared/inversify';
import { ReferencedLibsTree } from './referenced-libs-tree';
import { ReferencedLibsTreeModel } from './referenced-libs-tree-model';
import { ReferencedLibsViewTreeWidget } from './referenced-libs-view-tree-widget';
import { createReferencedLibsTreeContainer } from './referenced-libs-tree-container';

export function createReferencedLibContainer(parent: interfaces.Container): Container {
    const child = createReferencedLibsTreeContainer(parent, {
        tree: ReferencedLibsTree,
        model: ReferencedLibsTreeModel,
        widget: ReferencedLibsViewTreeWidget
    });

    return child;
}

export function createReferencedLibsTreeWidget(parent: interfaces.Container): ReferencedLibsViewTreeWidget {
    const child = createReferencedLibContainer(parent).get(ReferencedLibsViewTreeWidget);
    child.setContainer(parent);
    return child;
}
