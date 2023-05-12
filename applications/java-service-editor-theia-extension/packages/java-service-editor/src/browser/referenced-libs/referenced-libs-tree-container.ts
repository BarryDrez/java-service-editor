import { interfaces, Container } from '@theia/core/shared/inversify';
import { CompressedExpansionService, CompressionToggle, createTreeContainer, TreeCompressionService, TreeContainerProps } from '@theia/core/lib/browser';
import { TreeImpl, CompressedTreeWidget, CompressedTreeModel } from '@theia/core/lib/browser';

const referencedLibsTreeDefaults: Partial<TreeContainerProps> = {
    tree: TreeImpl,
    model: CompressedTreeModel,
    widget: CompressedTreeWidget,
    expansionService: CompressedExpansionService,
};

export function createReferencedLibsTreeContainer(parent: interfaces.Container, overrides?: Partial<TreeContainerProps>): Container {
    const child = createTreeContainer(parent, { ...referencedLibsTreeDefaults, ...overrides });
    child.bind(CompressionToggle).toConstantValue({ compress: false });
    child.bind(TreeCompressionService).toSelf().inSingletonScope();

    return child;
}
