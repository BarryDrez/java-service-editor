import { injectable, inject } from '@theia/core/shared/inversify';
import { ExpandableTreeNode } from '@theia/core/lib/browser/tree';
import { ReferencedLibsService } from './referenced-libs-service';
import { CompressedTreeModel } from '@theia/core/lib/browser';
import { MemberNode } from './referenced-libs-tree';

@injectable()
export class ReferencedLibsTreeModel extends CompressedTreeModel {
    @inject(ReferencedLibsService) protected readonly referencedLibsService: ReferencedLibsService;

    protected override handleExpansion(node: Readonly<ExpandableTreeNode>): void {
        if (MemberNode.is(node)) {
            if (node.member && node.member.children && node.member.children.length > 0) {
                this.referencedLibsService.memberNodeExpanded(node);
            }
        }
    }
}
